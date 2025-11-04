import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import Spinner from './common/Spinner';
import { DownloadIcon } from '../constants';
import { HistoryItem, VideoHistory } from '../types';
import { blobToBase64, base64ToBlob } from '../services/audioUtils';
import { handleGeminiError } from '../services/errorUtils';

type AspectRatio = '16:9' | '9:16';

const loadingMessages = [
    "Warming up the AI director...",
    "Rendering the first few frames...",
    "Compositing the digital scenes...",
    "Applying cinematic color grading...",
    "Adding special effects...",
    "Finalizing the video masterpiece...",
    "This can take a few minutes, good things take time!"
];

interface VideoGeneratorProps {
  historyItem?: HistoryItem;
  addToHistory: (item: { type: 'video-gen', data: VideoHistory }) => void;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ historyItem, addToHistory }) => {
  const [prompt, setPrompt] = useState<string>('A majestic lion roaring on a cliff at sunrise, epic cinematic style.');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [apiKeySelected, setApiKeySelected] = useState<boolean>(true);
  const [retryAfter, setRetryAfter] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Cleanup function to revoke the object URL when the component unmounts
    // or when the videoUrl changes to prevent memory leaks.
    const currentUrl = videoUrl;
    return () => {
      if (currentUrl && currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [videoUrl]);

  useEffect(() => {
    if (historyItem && historyItem.type === 'video-gen') {
      const data = historyItem.data as VideoHistory;
      setPrompt(data.prompt);
      setAspectRatio(data.aspectRatio as AspectRatio);
      
      if (data.videoBase64) {
        try {
            const videoBlob = base64ToBlob(data.videoBase64, 'video/mp4');
            const url = URL.createObjectURL(videoBlob);
            setVideoUrl(url);
        } catch (e) {
            console.error("Failed to decode or create video URL from history", e);
            setError("Could not load video from history.");
            setVideoUrl(null);
        }
      } else {
        setVideoUrl(null);
      }

      setError(null);
      setIsLoading(false);
    }
  }, [historyItem]);

  const checkApiKey = useCallback(async () => {
    // @ts-ignore - aistudio is available on the window
    if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
      setApiKeySelected(true);
      return true;
    }
    setApiKeySelected(false);
    return false;
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const handleSelectKey = async () => {
    // @ts-ignore - aistudio is available on the window
    if (window.aistudio) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setApiKeySelected(true);
    }
  };

  const pollOperation = async (operation: GenerateVideosOperation, ai: GoogleGenAI): Promise<GenerateVideosOperation> => {
    let currentOperation = operation;
    let messageIndex = 1;
    const pollInterval = 10000; // 10 seconds
    const maxPolls = 30; // 5 minute timeout (30 * 10s)
    let polls = 0;

    while (!currentOperation.done) {
      if (polls >= maxPolls) {
        throw new Error("Video generation timed out after 5 minutes.");
      }
      polls++;
      
      setLoadingMessage(loadingMessages[messageIndex % loadingMessages.length]);
      messageIndex++;
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      try {
        currentOperation = await ai.operations.getVideosOperation({ operation: currentOperation });
      } catch (e) {
          console.error("Polling failed:", e);
          // Don't throw, allow the loop to retry. The timeout will catch persistent failures.
      }
    }
    return currentOperation;
  };
  
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate a video.');
      return;
    }
    const hasKey = await checkApiKey();
    if (!hasKey || !process.env.API_KEY) {
        setError('Please select an API key to generate videos.');
        setApiKeySelected(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    setVideoUrl(null); // Revokes old URL via useEffect cleanup
    setLoadingMessage(loadingMessages[0]);
    setRetryAfter(0);
    if(timerRef.current) clearInterval(timerRef.current);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let initialOperation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio
        }
      });
      
      const finishedOperation = await pollOperation(initialOperation, ai);
      
      const downloadLink = finishedOperation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        setLoadingMessage("Downloading video...");
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) throw new Error(`Failed to download video: ${response.statusText}`);
        
        const videoBlob = await response.blob();
        const url = URL.createObjectURL(videoBlob);
        setVideoUrl(url);

        const videoBase64 = await blobToBase64(videoBlob);
        addToHistory({
            type: 'video-gen',
            data: { prompt, aspectRatio, videoBase64 }
        });
      } else {
        throw new Error('Video generation finished, but no download link was provided.');
      }
    } catch (e: any) {
      console.error(e);
      const { userMessage, shouldResetKey, retryDelay } = handleGeminiError(e);
      setError(userMessage);
      if (shouldResetKey) {
          setApiKeySelected(false);
      }
      if (retryDelay && retryDelay > 0) {
        setRetryAfter(retryDelay);
        timerRef.current = window.setInterval(() => {
          setRetryAfter(prev => {
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } finally {
      setIsLoading(false);
    }
  }, [prompt, aspectRatio, checkApiKey, addToHistory]);

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `datamind-video-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!apiKeySelected) {
    return (
        <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-brand-primary to-brand-secondary text-transparent bg-clip-text mb-4">
                AI Video Generator
            </h2>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold mb-2">API Key Required</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Video generation with Veo requires a project-linked API key. Please select your API key to continue.
                    For more information on billing, please visit the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">billing documentation</a>.
                </p>
                <button
                    onClick={handleSelectKey}
                    className="w-full text-white font-bold py-3 px-6 rounded-lg bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 shadow-lg"
                >
                    Select API Key
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-brand-primary to-brand-secondary text-transparent bg-clip-text">
          AI Video Generator
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Bring your stories to life with high-quality AI-generated video.</p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the video you want to create..."
          className="w-full h-24 p-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent transition resize-none mb-4"
        />
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <label className="block text-sm font-medium mb-1">Aspect Ratio</label>
            <div className="flex gap-2">
              {(['16:9', '9:16'] as AspectRatio[]).map(ratio => (
                  <button 
                      key={ratio} 
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 px-4 rounded-lg border-2 transition ${aspectRatio === ratio ? 'bg-brand-primary border-brand-primary text-white' : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-brand-primary'}`}
                  >
                      {ratio} {ratio === '16:9' ? '(Landscape)' : '(Portrait)'}
                  </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading || retryAfter > 0}
            className="w-full mt-2 md:mt-auto md:w-auto text-white font-bold py-3 px-6 rounded-lg bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl"
          >
            {isLoading ? <Spinner /> : (retryAfter > 0 ? `Retry in ${retryAfter}s` : 'Generate Video')}
          </button>
        </div>

        {error && <div className="mt-4 text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</div>}

        <div className="mt-6 aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 relative group">
          {isLoading && <div className="text-center p-4"><Spinner large /><p className="mt-4 text-gray-500">{loadingMessage}</p></div>}
          {!isLoading && videoUrl && <video src={videoUrl} controls autoPlay muted loop className="w-full h-full object-contain rounded-lg" />}
          {!isLoading && !videoUrl && <p className="text-gray-500 p-4 text-center">Your generated video will appear here.</p>}
           {!isLoading && videoUrl && (
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={handleDownload} className="p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition">
                    <DownloadIcon className="w-6 h-6"/>
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;

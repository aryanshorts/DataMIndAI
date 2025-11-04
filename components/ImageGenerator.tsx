import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import Spinner from './common/Spinner';
import { DownloadIcon } from '../constants';
import { HistoryItem, ImageHistory } from '../types';
import { handleGeminiError } from '../services/errorUtils';

type AspectRatio = '1:1' | '16:9' | '9:16';

interface ImageGeneratorProps {
  historyItem?: HistoryItem;
  addToHistory: (item: { type: 'image-gen', data: ImageHistory }) => void;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ historyItem, addToHistory }) => {
  const [prompt, setPrompt] = useState<string>('A photorealistic image of an astronaut riding a horse on Mars, cinematic lighting.');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number>(0);
  
  const timerRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (historyItem && historyItem.type === 'image-gen') {
      const data = historyItem.data as ImageHistory;
      setPrompt(data.prompt);
      setAspectRatio(data.aspectRatio as AspectRatio);
      setImageUrl(data.imageUrl);
      setError(null);
      setIsLoading(false);
    }
  }, [historyItem]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate an image.');
      return;
    }
    if (!process.env.API_KEY) {
      setError('API key is not configured.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setImageUrl(null);
    setRetryAfter(0);
    if(timerRef.current) clearInterval(timerRef.current);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: aspectRatio,
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        const url = `data:image/png;base64,${base64ImageBytes}`;
        setImageUrl(url);
        addToHistory({
          type: 'image-gen',
          data: { prompt, aspectRatio, imageUrl: url }
        });
      } else {
        throw new Error('No image data received from API.');
      }
    } catch (e) {
      console.error(e);
      const { userMessage, retryDelay } = handleGeminiError(e);
      setError(userMessage);
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
  }, [prompt, aspectRatio, addToHistory]);
  
  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `datamind-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-brand-primary to-brand-secondary text-transparent bg-clip-text">
          AI Image Generator
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Describe anything you can imagine and watch it come to life.</p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a detailed description..."
            className="w-full p-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent transition flex-grow"
          />
          <div className="flex flex-col md:flex-row gap-4 items-center">
             <div className="flex-grow">
                <label className="block text-sm font-medium mb-1">Aspect Ratio</label>
                <div className="flex gap-2">
                  {(['1:1', '16:9', '9:16'] as AspectRatio[]).map(ratio => (
                      <button 
                          key={ratio} 
                          onClick={() => setAspectRatio(ratio)}
                          className={`py-2 px-4 rounded-lg border-2 transition text-sm ${aspectRatio === ratio ? 'bg-brand-primary border-brand-primary text-white' : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-brand-primary'}`}
                      >
                          {ratio === '1:1' ? 'Square' : ratio === '16:9' ? 'Landscape' : 'Portrait'}
                      </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={isLoading || retryAfter > 0}
                className="w-full md:w-auto text-white font-bold py-3 px-6 rounded-lg bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl"
              >
                {isLoading ? <Spinner /> : (retryAfter > 0 ? `Retry in ${retryAfter}s` : 'Generate')}
              </button>
          </div>
        </div>

        {error && <div className="mt-4 text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</div>}

        <div className="mt-6 aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 relative group">
          {isLoading && <Spinner large />}
          {!isLoading && imageUrl && <img src={imageUrl} alt="Generated" className="w-full h-full object-contain rounded-lg" />}
          {!isLoading && !imageUrl && <p className="text-gray-500">Your generated image will appear here.</p>}
          {!isLoading && imageUrl && (
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

export default ImageGenerator;

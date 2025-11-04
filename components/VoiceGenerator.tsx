import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { VOICES, PlayIcon, PauseIcon, DownloadIcon } from '../constants';
import { decode, createWavBlob } from '../services/audioUtils';
import Waveform from './common/Waveform';
import Spinner from './common/Spinner';
import { HistoryItem, VoiceHistory } from '../types';
import { handleGeminiError } from '../services/errorUtils';

interface VoiceGeneratorProps {
  historyItem?: HistoryItem;
  addToHistory: (item: { type: 'voice', data: VoiceHistory }) => void;
}

const VoiceGenerator: React.FC<VoiceGeneratorProps> = ({ historyItem, addToHistory }) => {
  const [text, setText] = useState<string>('Hello, welcome to Datamind AI. Turn your words into realistic voices instantly.');
  const [selectedVoice, setSelectedVoice] = useState<string>(VOICES[0].value);
  const [speed, setSpeed] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [retryAfter, setRetryAfter] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Cleanup function to revoke the object URL when the component unmounts
    // or when the audioUrl changes to prevent memory leaks.
    const currentUrl = audioUrl;
    return () => {
      if (currentUrl && currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    if (historyItem && historyItem.type === 'voice') {
      const data = historyItem.data as VoiceHistory;
      setText(data.text);
      setSelectedVoice(data.voice);
      setSpeed(data.speed);

      if (data.audioBase64) {
        try {
          const audioBytes = decode(data.audioBase64);
          const wavBlob = createWavBlob(audioBytes, 24000, 1);
          const url = URL.createObjectURL(wavBlob);
          setAudioUrl(url);
        } catch (e) {
          console.error("Failed to decode or create audio URL from history", e);
          setError("Could not load audio from history.");
          setAudioUrl(null);
        }
      } else {
        setAudioUrl(null);
      }
      
      setError(null);
      setIsLoading(false);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
    }
  }, [historyItem]);
  
  const handlePlayPause = useCallback(() => {
    // Ensure audio element exists if we have a URL
    if (!audioRef.current && audioUrl) {
        const audio = new Audio(audioUrl);
        audio.onplay = () => setIsPlaying(true);
        audio.onpause = () => setIsPlaying(false);
        audio.onended = () => setIsPlaying(false);
        audioRef.current = audio;
    }

    if (!audioRef.current) return;

    // Toggle play/pause based on the isPlaying state
    if (isPlaying) {
        audioRef.current.pause();
    } else {
        audioRef.current.play().catch(e => {
            console.error("Error playing audio:", e);
            setError("Could not play the audio. Please try again.");
        });
    }
  }, [isPlaying, audioUrl]);


  const getSpeedPrefix = (currentSpeed: number): string => {
    if (currentSpeed <= 0.7) return 'Speak very slowly. ';
    if (currentSpeed < 1.0) return 'Speak slowly. ';
    if (currentSpeed >= 1.3) return 'Speak very quickly. ';
    if (currentSpeed > 1.0) return 'Speak quickly. ';
    return '';
  };

  const handleGenerate = useCallback(async () => {
    if (!text.trim()) {
      setError('Please enter some text to generate audio.');
      return;
    }
    if (!process.env.API_KEY) {
      setError('API key is not configured.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRetryAfter(0);
    if(timerRef.current) clearInterval(timerRef.current);
    
    setAudioUrl(null); // Revokes old URL via useEffect cleanup
    if(audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const speedPrefix = getSpeedPrefix(speed);
      const finalText = `${speedPrefix}Say in a clear, natural, and friendly voice: ${text}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: finalText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        addToHistory({
          type: 'voice',
          data: { text, voice: selectedVoice, speed, audioBase64: base64Audio }
        });

        // Create a playable URL from the generated data
        const audioBytes = decode(base64Audio);
        const wavBlob = createWavBlob(audioBytes, 24000, 1);
        const url = URL.createObjectURL(wavBlob);
        setAudioUrl(url);

      } else {
        throw new Error('No audio data received from API.');
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
  }, [text, selectedVoice, speed, addToHistory]);

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `datamind-voice-${selectedVoice.toLowerCase()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-brand-primary to-brand-secondary text-transparent bg-clip-text">
          AI Voice Generator
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Turn Your Words into Realistic Voices Instantly.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste your script here..."
          maxLength={3000}
          className="w-full h-40 p-4 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-shadow duration-300 resize-none"
        />
        <div className="text-right text-sm text-gray-500 mt-1">{text.length} / 3000</div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="voice-select" className="block text-sm font-medium mb-1">Voice Style</label>
            <select
              id="voice-select"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full p-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent transition"
            >
              <optgroup label="Standard Voices">
                {VOICES.map(voice => (
                  <option key={voice.value} value={voice.value}>{voice.name} ({voice.gender})</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label htmlFor="speed-slider" className="block text-sm font-medium mb-1">Speed ({speed.toFixed(1)}x)</label>
            <input
              id="speed-slider"
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full h-3 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer range-thumb"
            />
          </div>
        </div>
        
        <div className="mt-6">
           <button
              onClick={handleGenerate}
              disabled={isLoading || retryAfter > 0}
              className="w-full text-white font-bold py-3 px-4 rounded-lg bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl"
            >
              {isLoading ? <Spinner /> : (retryAfter > 0 ? `Try again in ${retryAfter}s` : 'Generate Voice')}
            </button>
        </div>

        {error && <div className="mt-4 text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</div>}

        <div className="mt-6">
            <h3 className="font-semibold mb-2">Preview</h3>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 flex flex-col items-center justify-center min-h-[160px]">
              <Waveform isPlaying={isPlaying} />
              {audioUrl && !isLoading && (
                  <div className="flex items-center space-x-4 mt-4">
                      <button onClick={handlePlayPause} className="flex items-center justify-center gap-2 font-semibold text-sm text-white py-2 px-4 rounded-lg bg-gray-500/50 hover:bg-gray-500/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                          {isPlaying ? 'Pause' : 'Play'}
                      </button>
                       <button onClick={handleDownload} className="flex items-center justify-center gap-2 font-semibold text-sm text-white py-2 px-4 rounded-lg bg-brand-primary/80 hover:bg-brand-primary transition-colors">
                          <DownloadIcon className="w-4 h-4" />
                          Download WAV
                      </button>
                  </div>
              )}
               {!audioUrl && !isLoading && <p className="text-gray-500">Your generated audio will appear here.</p>}
               {isLoading && <p className="text-gray-500 mt-4">Generating audio...</p>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceGenerator;

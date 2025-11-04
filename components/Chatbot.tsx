import React, { useState, useRef, useEffect, FormEvent, ChangeEvent } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse, Content, Modality, Part } from '@google/genai';
import Spinner from './common/Spinner';
import { PaperclipIcon, BookOpenIcon, GlobeAltIcon } from '../constants';
import { HistoryItem, ChatHistory, ChatMessage } from '../types';
import { blobToBase64 } from '../services/audioUtils';
import { handleGeminiError } from '../services/errorUtils';

interface ChatbotProps {
  historyItem?: HistoryItem;
  onNewChat: (item: { type: 'chatbot', data: ChatHistory }) => string;
  onUpdateChat: (id: string, messages: ChatMessage[], title: string, studyMode: boolean, researchMode: boolean) => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ historyItem, onNewChat, onUpdateChat }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [imageFile, setImageFile] = useState<{ file: File; base64: string; url: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [studyMode, setStudyMode] = useState<boolean>(false);
  const [researchMode, setResearchMode] = useState<boolean>(false);
  const [retryAfter, setRetryAfter] = useState<number>(0);
  
  const chatRef = useRef<Chat | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<number | null>(null);
  const currentChatId = useRef<string | null>(null);

  // Effect to load state from history and initialize chat session
  useEffect(() => {
    const data = historyItem?.data as ChatHistory;
    const initialMessages = data?.messages || [];
    const initialStudyMode = data?.studyMode || false;
    const initialResearchMode = data?.researchMode || false;
    
    setMessages(initialMessages);
    setStudyMode(initialStudyMode);
    setResearchMode(initialResearchMode);
    currentChatId.current = historyItem?.id || null;

    if (process.env.API_KEY) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let systemInstruction = 'You are Datamind AI, a friendly and helpful multimodal assistant.';
      if (initialStudyMode) {
        systemInstruction = 'You are a helpful and patient tutor. Explain concepts clearly and encourage learning.';
      }

      chatRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: initialMessages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        config: { 
          systemInstruction,
          ...(initialResearchMode && { tools: [{ googleSearch: {} }] })
        },
      });
    }
  }, [historyItem]);

  // Effect to re-create chat session when modes change mid-conversation
  useEffect(() => {
    // Only run for existing chats, not on the very first message.
    if (!currentChatId.current) return;
    
    const data = historyItem?.data as ChatHistory;
    // Check if modes have actually changed from what's saved
    if (data && (studyMode !== data.studyMode || researchMode !== data.researchMode)) {
      if (process.env.API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let systemInstruction = 'You are Datamind AI, a friendly and helpful multimodal assistant.';
        if (studyMode) {
          systemInstruction = 'You are a helpful and patient tutor. Explain concepts clearly and encourage learning.';
        }
        
        // Re-create the chat session with current messages and new modes
        chatRef.current = ai.chats.create({
          model: 'gemini-2.5-flash',
          history: messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          })),
          config: { 
            systemInstruction,
            ...(researchMode && { tools: [{ googleSearch: {} }] })
          },
        });
      }
    }
  }, [studyMode, researchMode]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Cleanup effect for the image preview URL and timer
  useEffect(() => {
    const currentUrl = imageFile?.url;
    return () => {
        if (currentUrl && currentUrl.startsWith('blob:')) {
            URL.revokeObjectURL(currentUrl);
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
    };
  }, [imageFile]);
  
  // Auto-resize textarea
  useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
          const maxHeight = 160; // 10rem or max-h-40 in tailwind
          textarea.style.height = 'auto'; // Reset height
          const newHeight = Math.min(textarea.scrollHeight, maxHeight);
          textarea.style.height = `${newHeight}px`;
      }
  }, [input]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await blobToBase64(file);
      const url = URL.createObjectURL(file);
      setImageFile({ file, base64, url });
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent new line on simple Enter
        handleSubmit(e as any);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || retryAfter > 0) return;
    if (!process.env.API_KEY) {
      setError('API key is not configured.');
      return;
    }

    setError(null);
    setRetryAfter(0);
    if(timerRef.current) clearInterval(timerRef.current);

    const currentInput = input;
    const currentImageFile = imageFile;
    setInput('');
    setImageFile(null);
    
    const userMessage: ChatMessage = { 
        role: 'user', 
        text: currentInput, 
        imageUrl: currentImageFile ? `data:${currentImageFile.file.type};base64,${currentImageFile.base64}` : undefined 
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let chatId = currentChatId.current;
      
      if (currentInput.trim().toLowerCase().startsWith('/create ')) {
        const imagePrompt = currentInput.trim().substring(8);
        const parts: Part[] = [{ text: imagePrompt }];
        if (currentImageFile) {
            parts.unshift({ inlineData: { mimeType: currentImageFile.file.type, data: currentImageFile.base64 } });
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: parts },
            config: { responseModalities: [Modality.IMAGE] },
        });

        let generatedImageUrl: string | undefined = undefined;
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
                break;
            }
        }

        if (generatedImageUrl) {
            const modelMessage: ChatMessage = { role: 'model', text: `Here is the image you requested for: "${imagePrompt}"`, imageUrl: generatedImageUrl };
            const finalMessages = [...newMessages, modelMessage];
            setMessages(finalMessages);
            if (chatId) {
                onUpdateChat(chatId, finalMessages, (historyItem.data as ChatHistory).title, studyMode, researchMode);
            } else {
                const chatTitle = "Image: " + imagePrompt.substring(0, 20) + '...';
                onNewChat({ type: 'chatbot', data: { title: chatTitle, studyMode, researchMode, messages: finalMessages } });
            }
        } else {
            throw new Error('Image generation failed to return an image.');
        }

      } else { 
        if (!chatRef.current) {
          throw new Error("Chat session not initialized.");
        }

        let response: GenerateContentResponse;
        if (currentImageFile) {
            const contentParts: Part[] = [
                { inlineData: { mimeType: currentImageFile.file.type, data: currentImageFile.base64 } },
                { text: currentInput }
            ];
            // Fix: Pass the `parts` array to `sendMessage`, not the entire `Content` object.
            response = await chatRef.current.sendMessage({ message: contentParts });
        } else {
            response = await chatRef.current.sendMessage({ message: currentInput });
        }
        
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources = groundingChunks?.map(chunk => chunk.web).filter(Boolean) as { uri: string, title: string }[];

        const modelMessage: ChatMessage = { role: 'model', text: response.text, sources };
        const finalMessages = [...newMessages, modelMessage];
        setMessages(finalMessages);
        
        if (chatId) {
            onUpdateChat(chatId, finalMessages, (historyItem.data as ChatHistory).title, studyMode, researchMode);
        } else {
            const chatTitle = currentInput.substring(0, 30) + (currentInput.length > 30 ? '...' : '');
            const newChatId = onNewChat({ type: 'chatbot', data: { title: chatTitle, studyMode, researchMode, messages: finalMessages }});
            currentChatId.current = newChatId;
        }
      }
    } catch (e) {
      console.error(e);
      const { userMessage, retryDelay } = handleGeminiError(e);
      setError(`Failed to get response: ${userMessage}`);
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
      setMessages(prev => prev.slice(0, prev.length - 1)); // remove user message on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="text-center mb-4">
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-brand-primary to-brand-secondary text-transparent bg-clip-text">
          AI Chatbot
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Chat with an AI that understands text and images.</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col flex-grow">
        <div className="flex-grow p-6 overflow-y-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
               <svg className="w-16 h-16 mb-4 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
              <p className="text-lg">Datamind AI</p>
              <p>How can I help you today?</p>
            </div>
          )}
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
              <div className={`max-w-xl p-3 rounded-2xl ${msg.role === 'user' ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                {msg.imageUrl && <img src={msg.imageUrl} alt="chat content" className="rounded-lg mb-2 max-w-xs" />}
                <p className="whitespace-pre-wrap">{msg.text}</p>
                 {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-2 border-t border-gray-300 dark:border-gray-600">
                    <h4 className="text-xs font-bold mb-1">Sources:</h4>
                    <ol className="list-decimal list-inside text-xs space-y-1">
                      {msg.sources.map((source, i) => (
                        <li key={i}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate block">{source.title}</a></li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="max-w-md p-3 rounded-2xl bg-gray-200 dark:bg-gray-700">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {error && <div className="p-4 text-red-500 bg-red-100 dark:bg-red-900/50">{error}</div>}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-start gap-4 mb-2">
            <button onClick={() => setStudyMode(s => !s)} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full transition ${studyMode ? 'bg-brand-secondary/20 text-brand-secondary' : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'}`}>
              <BookOpenIcon className="w-4 h-4"/> Study Mode
            </button>
            <button onClick={() => setResearchMode(r => !r)} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full transition ${researchMode ? 'bg-brand-primary/20 text-brand-primary' : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'}`}>
              <GlobeAltIcon className="w-4 h-4"/> Research
            </button>
          </div>
          {imageFile && (
            <div className="relative w-24 h-24 mb-2 p-1 border border-gray-300 rounded-lg">
              <img src={imageFile.url} alt="upload preview" className="w-full h-full object-cover rounded" />
              <button onClick={() => setImageFile(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold">&times;</button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 md:gap-4">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              aria-label="Attach image"
              disabled={retryAfter > 0}
            >
              <PaperclipIcon className="w-6 h-6 text-gray-600 dark:text-gray-300"/>
            </button>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={retryAfter > 0 ? `Please wait ${retryAfter}s to send another message.` : "Ask anything, or type /create <prompt> to generate an image."}
              className="w-full p-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent transition resize-none overflow-y-auto"
              disabled={retryAfter > 0}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || retryAfter > 0}
              className="text-white font-bold p-3 rounded-lg bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
              aria-label="Send message"
            >
              {isLoading ? <Spinner /> : 
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;

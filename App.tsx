
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import VoiceGenerator from './components/VoiceGenerator';
import ImageGenerator from './components/ImageGenerator';
import Chatbot from './components/Chatbot';
import VideoGenerator from './components/VideoGenerator';
import TodoManager from './components/TodoManager';
import HomePage from './components/HomePage';
import { Tool, HistoryItem, ChatMessage, ChatHistory, HistoryData, TodoItem, TodoHistory } from './types';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>('home');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('datamind-history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('datamind-history', JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save history to localStorage", error);
    }
  }, [history]);

  const createNewSession = (tool: Tool) => {
    setActiveTool(tool);
    setActiveHistoryId(null);
  };

  const loadHistoryItem = (id: string) => {
    const item = history.find(h => h.id === id);
    if (item) {
      setActiveTool(item.type);
      setActiveHistoryId(id);
    }
  };

  const handleSelectTool = (tool: Tool) => {
    if (tool === 'home') {
      setActiveTool('home');
      setActiveHistoryId(null);
      return;
    }

    const mostRecentItem = history.find(item => item.type === tool);
    if (mostRecentItem) {
      loadHistoryItem(mostRecentItem.id);
    } else {
      createNewSession(tool);
    }
  };

  const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const dataWithTitle: HistoryData = { ...item.data };

    if (!('title' in dataWithTitle) || !(dataWithTitle as { title: string }).title) {
        if (item.type === 'voice' && 'text' in item.data) {
            (dataWithTitle as any).title = `Voice: ${item.data.text.substring(0, 25)}...`;
        } else if ((item.type === 'image-gen' || item.type === 'video-gen') && 'prompt' in item.data) {
            (dataWithTitle as any).title = `${item.type === 'image-gen' ? 'Image' : 'Video'}: ${item.data.prompt.substring(0, 25)}...`;
        }
    }

    const newItem: HistoryItem = {
      ...item,
      data: dataWithTitle,
      id: `history-${Date.now()}`,
      timestamp: Date.now(),
    };
    setHistory(prev => [newItem, ...prev]);
    setActiveHistoryId(newItem.id);
    setActiveTool(newItem.type);
    return newItem.id;
  };
  
  const updateChatHistory = (id: string, messages: ChatMessage[], title?: string, studyMode?: boolean, researchMode?: boolean) => {
    setHistory(prev => prev.map(item => {
      if (item.id === id && item.type === 'chatbot') {
        const chatData = item.data as ChatHistory;
        const newTitle = title || chatData.title;
        const newStudyMode = typeof studyMode === 'boolean' ? studyMode : chatData.studyMode;
        const newResearchMode = typeof researchMode === 'boolean' ? researchMode : chatData.researchMode;
        return { ...item, data: { ...chatData, messages, title: newTitle, studyMode: newStudyMode, researchMode: newResearchMode } };
      }
      return item;
    }));
  };

  const updateTodoHistory = (id: string, tasks: TodoItem[], title?: string) => {
    setHistory(prev => prev.map(item => {
      if (item.id === id && item.type === 'todo') {
        const todoData = item.data as TodoHistory;
        const newTitle = title || todoData.title;
        return { ...item, data: { ...todoData, tasks, title: newTitle } };
      }
      return item;
    }));
  };
  
  const renderTool = () => {
    const activeHistoryItem = history.find(item => item.id === activeHistoryId);

    switch (activeTool) {
      case 'home':
        return <HomePage onSelectTool={handleSelectTool} />;
      case 'voice':
        return <VoiceGenerator key={activeHistoryId} historyItem={activeHistoryItem} addToHistory={addToHistory} />;
      case 'chatbot':
        return <Chatbot key={activeHistoryId} historyItem={activeHistoryItem} onNewChat={addToHistory} onUpdateChat={updateChatHistory} />;
      case 'image-gen':
        return <ImageGenerator key={activeHistoryId} historyItem={activeHistoryItem} addToHistory={addToHistory} />;
      case 'video-gen':
        return <VideoGenerator key={activeHistoryId} historyItem={activeHistoryItem} addToHistory={addToHistory} />;
      case 'todo':
        return <TodoManager key={activeHistoryId} historyItem={activeHistoryItem} onNewList={addToHistory} onUpdateList={updateTodoHistory} />;
      default:
         return <HomePage onSelectTool={handleSelectTool} />;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col font-sans transition-colors duration-300">
      <Header activeTool={activeTool} onSelectTool={handleSelectTool} />
      <div className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <main className="w-full">
          {renderTool()}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default App;
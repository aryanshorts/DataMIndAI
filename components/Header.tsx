import React, { useState, useEffect } from 'react';
import { Tool } from '../types';
import { SunIcon, MoonIcon } from '../constants';

interface HeaderProps {
  activeTool: Tool;
  onSelectTool: (tool: Tool) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTool, onSelectTool }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && prefersDark));
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const navItems: { id: Tool; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'chatbot', label: 'Chatbot' },
    { id: 'voice', label: 'Voice Generator' },
    { id: 'image-gen', label: 'Image Generator' },
    { id: 'video-gen', label: 'Video Generator' },
    { id: 'todo', label: 'To-Do List' },
  ];

  return (
    <header className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg sticky top-0 z-50 shadow-sm dark:shadow-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onSelectTool('home')}>
            <svg className="w-8 h-8 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-lg text-white p-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">
              Datamind AI
            </h1>
          </div>
          <div className="flex items-center">
             <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <SunIcon className="w-5 h-5 text-yellow-400" /> : <MoonIcon className="w-5 h-5 text-gray-700" />}
            </button>
          </div>
        </div>
        <nav className="flex items-center justify-center space-x-2 sm:space-x-4 md:space-x-6 overflow-x-auto pb-2 -mb-px">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectTool(item.id)}
              className={`px-3 py-2 text-sm md:text-base font-medium whitespace-nowrap rounded-md transition-all duration-300 ${
                activeTool === item.id
                  ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;
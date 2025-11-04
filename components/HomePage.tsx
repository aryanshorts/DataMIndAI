import React from 'react';
import { Tool } from '../types';
import { ChatIcon, VoiceIcon, ImageIcon, VideoGenIcon, ChecklistIcon } from '../constants';

interface HomePageProps {
  onSelectTool: (tool: Tool) => void;
}

const toolCards = [
    {
        id: 'chatbot',
        icon: ChatIcon,
        title: 'AI Chatbot',
        description: 'Engage in intelligent conversations, get answers, and even generate images with multimodal support.',
        color: 'from-blue-400 to-blue-600',
    },
    {
        id: 'voice',
        icon: VoiceIcon,
        title: 'Voice Generator',
        description: 'Transform your text into incredibly realistic, human-like speech with a variety of voice styles.',
        color: 'from-purple-400 to-purple-600',
    },
    {
        id: 'image-gen',
        icon: ImageIcon,
        title: 'Image Generator',
        description: 'Bring your imagination to life. Create stunning, high-quality images from simple text prompts.',
        color: 'from-green-400 to-green-600',
    },
    {
        id: 'video-gen',
        icon: VideoGenIcon,
        title: 'Video Generator',
        description: 'Produce dynamic, high-definition videos from text descriptions. Perfect for storytelling.',
        color: 'from-red-400 to-red-600',
    },
    {
        id: 'todo',
        icon: ChecklistIcon,
        title: 'Task Manager',
        description: 'Stay organized and boost your productivity with a simple yet powerful to-do list manager.',
        color: 'from-yellow-400 to-yellow-600',
    },
];

const HomePage: React.FC<HomePageProps> = ({ onSelectTool }) => {
  return (
    <div className="max-w-7xl mx-auto text-center">
      <div className="relative py-20 md:py-32 overflow-hidden">
        <div 
          className="absolute top-0 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: '0s' }}
        ></div>
        <div 
          className="absolute top-0 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: '5s' }}
        ></div>
        <div className="relative z-10">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">
                Welcome to Datamind AI
            </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Your all-in-one suite for creative AI tools. Generate voice, images, videos, and chat with a powerful multimodal assistant.
            </p>
            <button
                onClick={() => onSelectTool('chatbot')}
                className="mt-8 px-8 py-3 text-lg font-semibold text-white rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
                Get Started
            </button>
        </div>
      </div>

      <div className="py-16">
        <h2 className="text-3xl font-bold mb-12">Explore Our Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {toolCards.map((tool) => (
                <div 
                    key={tool.id} 
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center text-center transform hover:-translate-y-2 transition-transform duration-300"
                >
                    <div className={`p-4 rounded-full bg-gradient-to-br ${tool.color} text-white mb-4`}>
                        <tool.icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{tool.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 flex-grow mb-6">{tool.description}</p>
                    <button 
                        onClick={() => onSelectTool(tool.id as Tool)}
                        className="mt-auto font-semibold text-brand-primary dark:text-brand-secondary hover:underline"
                    >
                        Try Now &rarr;
                    </button>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;

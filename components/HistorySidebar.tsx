import React, { useState, KeyboardEvent } from 'react';
import { HistoryItem, Tool } from '../types';
import { ChatIcon, VoiceIcon, ImageIcon, VideoGenIcon, TrashIcon, PencilIcon, DownloadIcon, ChecklistIcon } from '../constants';

interface HistorySidebarProps {
  history: HistoryItem[];
  activeId: string | null;
  onSelectItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onRenameItem: (id: string, newTitle: string) => void;
  onDownloadItem: (id: string) => void;
}

const ToolIcon = ({ tool }: { tool: Tool }) => {
  switch (tool) {
    case 'chatbot': return <ChatIcon className="w-5 h-5" />;
    case 'voice': return <VoiceIcon className="w-5 h-5" />;
    case 'image-gen': return <ImageIcon className="w-5 h-5" />;
    case 'video-gen': return <VideoGenIcon className="w-5 h-5" />;
    case 'todo': return <ChecklistIcon className="w-5 h-5" />;
    default: return null;
  }
};

const getTitle = (item: HistoryItem): string => {
    const data = item.data as any;
    return data.title || "Untitled Session";
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, activeId, onSelectItem, onDeleteItem, onRenameItem, onDownloadItem }) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this session?')) {
        onDeleteItem(id);
    }
  }

  const handleRenameClick = (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    setRenamingId(item.id);
    setTitleInput(getTitle(item));
  }
  
  const handleDownloadClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDownloadItem(id);
  }

  const handleRenameSubmit = () => {
    if (renamingId && titleInput.trim()) {
        onRenameItem(renamingId, titleInput.trim());
    }
    setRenamingId(null);
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        handleRenameSubmit();
    } else if (e.key === 'Escape') {
        setRenamingId(null);
    }
  }
  
  return (
    <aside className="w-64 md:w-72 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full rounded-2xl shadow-lg">
      <div className="flex-grow overflow-y-auto p-2">
        <nav className="space-y-1">
          {history.map(item => (
            <div
              key={item.id}
              onClick={() => onSelectItem(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors group cursor-pointer ${
                activeId === item.id 
                  ? 'bg-brand-primary/10 text-brand-primary dark:bg-brand-secondary/20 dark:text-brand-secondary' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`}
            >
              <ToolIcon tool={item.type} />
              {renamingId === item.id ? (
                <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={handleKeyDown}
                    className="flex-grow bg-transparent focus:bg-white dark:focus:bg-gray-600 ring-1 ring-brand-primary rounded p-0.5 -m-0.5"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex-grow truncate">{getTitle(item)}</span>
              )}
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0">
                <button onClick={(e) => handleDownloadClick(e, item.id)} className="p-1 text-gray-400 hover:text-brand-primary" aria-label="Download session"><DownloadIcon className="w-4 h-4" /></button>
                <button onClick={(e) => handleRenameClick(e, item)} className="p-1 text-gray-400 hover:text-green-500" aria-label="Rename session"><PencilIcon className="w-4 h-4" /></button>
                <button onClick={(e) => handleDelete(e, item.id)} className="p-1 text-gray-400 hover:text-red-500" aria-label="Delete session"><TrashIcon className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default HistorySidebar;
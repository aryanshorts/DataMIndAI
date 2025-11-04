export type Tool = 'home' | 'voice' | 'chatbot' | 'image-gen' | 'video-gen' | 'todo';

export interface VoiceOption {
  name: string;
  value: string;
  gender: 'Male' | 'Female' | 'Narrator' | 'Custom';
}

// History Types
export interface VoiceHistory {
  title?: string;
  text: string;
  voice: string;
  speed: number;
  audioBase64: string;
}

export interface ImageHistory {
  title?: string;
  prompt: string;
  aspectRatio: string;
  imageUrl: string;
}

export interface VideoHistory {
  title?: string;
  prompt: string;
  aspectRatio: string;
  videoBase64: string;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  imageUrl?: string;
  sources?: { uri: string, title: string }[];
}

export interface ChatHistory {
  messages: ChatMessage[];
  title: string;
  studyMode: boolean;
  researchMode: boolean;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TodoHistory {
  title: string;
  tasks: TodoItem[];
}

export type HistoryData = VoiceHistory | ImageHistory | VideoHistory | ChatHistory | TodoHistory;

export interface HistoryItem {
  id: string;
  type: Tool;
  timestamp: number;
  data: HistoryData;
}
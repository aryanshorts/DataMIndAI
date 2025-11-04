import React, { useState, useEffect, useRef } from 'react';
import { HistoryItem, TodoHistory, TodoItem } from '../types';
import { PlusIcon, TrashIcon, PencilIcon } from '../constants';

interface TodoManagerProps {
  historyItem?: HistoryItem;
  onNewList: (item: { type: 'todo', data: TodoHistory }) => string;
  onUpdateList: (id: string, tasks: TodoItem[], title?: string) => void;
}

const TodoManager: React.FC<TodoManagerProps> = ({ historyItem, onNewList, onUpdateList }) => {
  const [tasks, setTasks] = useState<TodoItem[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  
  const currentListId = useRef<string | null>(null);

  useEffect(() => {
    if (historyItem && historyItem.type === 'todo') {
      const data = historyItem.data as TodoHistory;
      setTasks(data.tasks);
      currentListId.current = historyItem.id;
    } else {
      setTasks([]);
      currentListId.current = null;
    }
  }, [historyItem]);

  const handleUpdateHistory = (updatedTasks: TodoItem[]) => {
    if (currentListId.current) {
      onUpdateList(currentListId.current, updatedTasks);
    } else {
      const newId = onNewList({
        type: 'todo',
        data: { title: 'New To-Do List', tasks: updatedTasks }
      });
      currentListId.current = newId;
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask: TodoItem = {
      id: `task-${Date.now()}`,
      text: newTaskText.trim(),
      completed: false,
    };
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    setNewTaskText('');
    handleUpdateHistory(updatedTasks);
  };
  
  const handleToggleComplete = (taskId: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    handleUpdateHistory(updatedTasks);
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    setTasks(updatedTasks);
    handleUpdateHistory(updatedTasks);
  };

  const startEditing = (task: TodoItem) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
  };

  const handleEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId || !editingTaskText.trim()) {
        setEditingTaskId(null);
        return;
    };
    const updatedTasks = tasks.map(task =>
      task.id === editingTaskId ? { ...task, text: editingTaskText.trim() } : task
    );
    setTasks(updatedTasks);
    handleUpdateHistory(updatedTasks);
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-brand-primary to-brand-secondary text-transparent bg-clip-text">
          Task Manager
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Organize your day, one task at a time.</p>
      </div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleAddTask} className="flex gap-4 mb-6">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="Add a new task..."
            className="w-full p-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent transition"
          />
          <button type="submit" className="flex-shrink-0 text-white font-bold py-3 px-6 rounded-lg bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg" disabled={!newTaskText.trim()}>
            <PlusIcon className="w-5 h-5" />
            <span className="ml-2 hidden sm:inline">Add</span>
          </button>
        </form>
        <div className="space-y-3">
          {tasks.length > 0 ? tasks.map(task => (
            <div key={task.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center gap-4 group transition-all duration-300">
              {editingTaskId === task.id ? (
                 <form onSubmit={handleEditTask} className="flex-grow flex gap-2">
                    <input
                       type="text"
                       value={editingTaskText}
                       onChange={(e) => setEditingTaskText(e.target.value)}
                       className="w-full bg-white dark:bg-gray-600 border border-brand-primary rounded-md p-1"
                       autoFocus
                       onBlur={handleEditTask}
                    />
                 </form>
              ) : (
                <>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleComplete(task.id)}
                    className="h-5 w-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                  />
                  <span className={`flex-grow transition-colors ${task.completed ? 'line-through text-gray-500' : ''}`}>
                    {task.text}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditing(task)} className="p-2 text-gray-400 hover:text-green-500" aria-label="Edit task">
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-gray-400 hover:text-red-500" aria-label="Delete task">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )) : (
            <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p>No tasks yet. Add one to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodoManager;

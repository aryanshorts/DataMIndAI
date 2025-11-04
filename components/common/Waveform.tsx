
import React from 'react';

interface WaveformProps {
  isPlaying: boolean;
}

const Waveform: React.FC<WaveformProps> = ({ isPlaying }) => {
  const barClasses = "w-1 h-full bg-gradient-to-b from-brand-primary to-brand-secondary rounded-full origin-bottom";
  const animationClass = isPlaying ? 'animate-waveform-1' : 'animate-none';
  
  return (
    <div className="flex items-center justify-center space-x-1.5 h-16 w-full">
      <div className={`${barClasses} ${isPlaying ? 'animate-waveform-1' : ''}`} style={{ transform: 'scaleY(0.1)' }}></div>
      <div className={`${barClasses} ${isPlaying ? 'animate-waveform-2' : ''}`} style={{ transform: 'scaleY(0.1)' }}></div>
      <div className={`${barClasses} ${isPlaying ? 'animate-waveform-3' : ''}`} style={{ transform: 'scaleY(0.1)' }}></div>
      <div className={`${barClasses} ${isPlaying ? 'animate-waveform-4' : ''}`} style={{ transform: 'scaleY(0.1)' }}></div>
      <div className={`${barClasses} ${isPlaying ? 'animate-waveform-5' : ''}`} style={{ transform: 'scaleY(0.1)' }}></div>
      <div className={`${barClasses} ${isPlaying ? 'animate-waveform-2' : ''}`} style={{ transform: 'scaleY(0.1)' }}></div>
      <div className={`${barClasses} ${isPlaying ? 'animate-waveform-4' : ''}`} style={{ transform: 'scaleY(0.1)' }}></div>
      <div className={`${barClasses} ${isPlaying ? 'animate-waveform-1' : ''}`} style={{ transform: 'scaleY(0.1)' }}></div>
       <div className={`${barClasses} ${isPlaying ? 'animate-waveform-3' : ''}`} style={{ transform: 'scaleY(0.1)' }}></div>
      <div className={`${barClasses} ${isPlaying ? 'animate-waveform-5' : ''}`} style={{ transform: 'scaleY(0.1)' }}></div>
    </div>
  );
};

export default Waveform;

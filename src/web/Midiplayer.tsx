// MidiPlayer.tsx
import React, { useState, useEffect, useRef } from 'react';
//import { Midi } from '@tonejs/midi';
//import Soundfont from 'soundfont-player';

interface MidiPlayerProps {
  midiData: any;
  soundfontUrl: string;
}

const MidiPlayer: React.FC<MidiPlayerProps> = ({ midiData, soundfontUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioContext] = useState(new (window.AudioContext || (window as any).webkitAudioContext)());
  const [instrument, setInstrument] = useState<any>(null);
  const scheduledNotes = useRef<number[]>([]);

  useEffect(() => {
    //Soundfont.instrument(audioContext, soundfontUrl).then(setInstrument);
  }, [soundfontUrl]);

  const play = () => {
    if (!instrument) return;

    const startTime = audioContext.currentTime;
    midiData.tracks.forEach((track: any) => {
      track.notes.forEach((note:any) => {
        const id = window.setTimeout(() => {
          instrument.play(note.name, note.time, { 
            duration: note.duration,
            gain: note.velocity
          });
        }, note.time * 1000);
        scheduledNotes.current.push(id);
      });
    });
    setIsPlaying(true);
  };

  const stop = () => {
    scheduledNotes.current.forEach(id => clearTimeout(id));
    scheduledNotes.current = [];
    setIsPlaying(false);
    setCurrentTime(0);
  };

  return (
    <div className="player-container">
      <div className="controls">
        <button onClick={isPlaying ? stop : play}>
          {isPlaying ? 'Stop' : 'Play'}
        </button>
        <input
          type="range"
          min="0"
          max={midiData.duration}
          value={currentTime}
          onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
};

export default MidiPlayer;

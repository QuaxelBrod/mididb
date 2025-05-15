// App.tsx
import React, { useState } from 'react';
import MetadataView from './MetadataView';
//import { Midi } from '@tonejs/midi';
import MidiPlayer from './Midiplayer';


const MidiDB: React.FC = () => {
  const [midiData, setMidiData] = useState<any|null>(null);
  const [soundfontLoaded, setSoundfontLoaded] = useState(false);

  const loadMidiFile = async () => {
    const data = await window.electron.openMidiFile();
    if (data) {
      const midi = data;
      setMidiData(midi);
    }
  };

  return (
    <div className="app-container">
      <button onClick={loadMidiFile}>Open MIDI File</button>
      
      {midiData && (
        <div className="main-content">
          <div className="metadata-section">
            <MetadataView midiData={midiData} />
          </div>
          
          <div className="player-section">
            <MidiPlayer 
              midiData={midiData} 
              soundfontUrl="/soundfonts/acoustic_grand_piano-ogg.js" 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MidiDB;

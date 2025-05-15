// App.tsx
import React, { use, useState, useEffect } from 'react';
import MetadataView from './MetadataView';
//import { Midi } from '@tonejs/midi';
import MidiPlayer from './Midiplayer';


const MidiDB: React.FC = () => {
  const [midiData, setMidiData] = useState<ILoadMidiFile | null>(null);
  const [soundfont, setSoundfont] = useState<ArrayBuffer | null>(null);

  const loadMidiFile = async () => {
    const data = await window.electron.openMidiFile();
    if (data) {
      setMidiData(data); // data ist bereits ein ArrayBuffer
    }
  };

  // Beispiel in deiner Komponente
  const loadSoundfont = async () => {
    const arrayBuffer = await window.electron.loadSoundfont('alex_gm.sf2');
    // arrayBuffer ist jetzt ein ArrayBuffer und kann an MidiPlayer übergeben werden
    if (arrayBuffer) {
      setSoundfont(arrayBuffer);
    }
  };

  useEffect(
    () => {
      loadSoundfont();
    },
    []
  )


  return (
    <div className="app-container">
      <button onClick={loadMidiFile}>Open MIDI File</button>
      {/* <button onClick={loadSoundfont}>Load Soundfont</button> */}

      {midiData && (
        <div className="main-content">
          <div className="metadata-section">
            <MetadataView midiData={midiData} />
          </div>

          {soundfont && (
            <div className="player-section">
              <MidiPlayer
                midiData={midiData.data}
                soundfont={soundfont} // Hier den Soundfont-Pfad angeben
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MidiDB;

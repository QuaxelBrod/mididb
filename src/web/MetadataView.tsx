// MetadataView.tsx
import React from 'react';
//import { Midi } from '@tonejs/midi';

interface MetadataViewProps {
  midiData: any;
}

const MetadataView: React.FC<MetadataViewProps> = ({ midiData }) => {
  return (
    <div className="metadata-container">
      <h2>MIDI Metadata</h2>
      <div className="metadata-grid">
        <div>Track Count:</div>
        <div>{midiData.tracks.length}</div>
        <div>Duration:</div>
        <div>{midiData.duration.toFixed(2)}s</div>
        <div>Tempo:</div>
        <div>{midiData.header.tempos[0]?.bpm || 120} BPM</div>
      </div>
    </div>
  );
};

export default MetadataView;

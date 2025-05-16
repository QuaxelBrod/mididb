// App.tsx
import React, { use, useState, useEffect } from 'react';
import MetadataView from './MetadataView';
//import { Midi } from '@tonejs/midi';
import MidiPlayer from './Midiplayer';


const MidiDB: React.FC = () => {
  const [midiData, setMidiData] = useState<ILoadMidiFile | null>(null);
  const [musicLLM, setMusicLLM] = useState<IMusicLLM_softsearch_result | null>(null);
  const [musicbrainz, setMusicbrainz] = useState<IMusicbrainzResponse | null>(null);
  const [soundfont, setSoundfont] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMidiFile = async () => {
    setLoading(true);
    const data = await window.electron.openMidiFile();
    if (data) {
      setMidiData(data.midifile); // data ist bereits ein ArrayBuffer
      setMusicLLM(data.musicLLM);
      setMusicbrainz(data.musicbrainz);
    }
    setLoading(false);
  };

  const scanMidiDir = async () => {
    setLoading(true);
    const result = await window.electron.scanMidiDir();
    setLoading(false);
  }

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10rem', marginBottom: '1rem', marginLeft: 20 }}>
        <div>
          <button onClick={scanMidiDir}>Scan dir</button>
          <button onClick={loadMidiFile}>Open MIDI File</button>
        </div>
        {/* Player in der Titelleiste */}
        {soundfont && midiData && (
          <div className="player-section">
            <MidiPlayer
              midiData={midiData.data}
              soundfont={soundfont}
            />
          </div>
        )}
      </div>

      <div className="main-content"
        style={{
          display: 'flex',
          gap: '2rem',
          alignItems: 'flex-start'
        }}>
        {/* MIDI-Informationen */}
        {midiData && (
          <div className="metadata-section" style={{ flex: 1 }}>
            <h2>MIDI Informationen</h2>
            <MetadataView midiData={midiData} />
          </div>
        )}

        {/* LLM-Informationen */}
        {musicLLM && (
          <div className="music-llm-section" style={{ flex: 1 }}>
            <h2>Music LLM Result</h2>
            <div className="music-llm-result">
              <p>Text: {musicLLM.text}</p>
              <p>Artist: {musicLLM.artist}</p>
              <p>Title: {musicLLM.title}</p>
              <p>Release: {musicLLM.release}</p>
              <p>Album: {musicLLM.album}</p>
            </div>
          </div>
        )}

        {/* Musicbrainz-Informationen */}
        {musicbrainz && (
          <div className="musicbrainz-section" style={{ flex: 1 }}>
            <h2>Musicbrainz Result</h2>
            {musicbrainz.top.map((item, index) => (
              <div key={index} className="musicbrainz-result">
                <p>Artist: {item.artist}</p>
                <p>Title: {item.title}</p>
                <p>Release: {item.firstReleaseDate}</p>
                <p>Album: {item.album}</p>
              </div>
            ))}
            <hr />
            {musicbrainz.oldest && (
              <div className="musicbrainz-oldest">
                <h3>Oldest Release</h3>
                <p>Artist: {musicbrainz.oldest.artist}</p>
                <p>Title: {musicbrainz.oldest.title}</p>
                <p>Release: {musicbrainz.oldest.firstReleaseDate}</p>
                <p>Album: {musicbrainz.oldest.album}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="wait-screen" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div>
            <h2>Bitte warten...</h2>
            <div className="spinner" />
          </div>
        </div>
      )}
    </div>
  );
};

export default MidiDB;

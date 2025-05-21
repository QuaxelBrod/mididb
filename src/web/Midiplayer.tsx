// MidiPlayer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Synthetizer, Sequencer } from 'spessasynth_lib';
//import { Midi } from '@tonejs/midi';
//import Soundfont from 'soundfont-player';


interface MidiPlayerProps {
  midiData: { name: string, data: ArrayBuffer };
  soundfont: ArrayBuffer;
}

const MidiPlayer: React.FC<MidiPlayerProps> = ({ midiData, soundfont }) => {
  const synthRef = useRef<any>(null);
  const seqRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPause, setIsPaused] = useState(false);
  const [displayTime, setDisplayTime] = useState('0:00');

  // Soundfont und MIDI laden
  const loadSynth = async () => {

    // load the soundfont into an array buffer
    // let soundFontArrayBuffer = await fetch(soundfontUrl);
    // console.log("SoundFont has been loaded!");

    {
      //const midiFile = midiData.arrayBuffer();                        // get the file and convert to ArrayBuffer
      const context = new AudioContext();                                     // create an audioContext
      await context.audioWorklet.addModule(new URL(
        "./worklet_processor.min.js",
        import.meta.url
      )); // add the worklet
      const soundFontBuffer = soundfont; // resolve the promise to get ArrayBuffer
      const synth = new Synthetizer(context.destination, soundFontBuffer); // create the synthetizer
      const seq = new Sequencer([{ binary: midiData.data }], synth);       // create the sequencer
      seq.loop = false;
      seq.addOnSongEndedEvent(() => {
        seqRef.current.stop();
        setIsPlaying(false); // set the isPlaying state to false
        setDisplayTime('0:00'); // reset the display time
      }, "myplayer_ended");
      //seq.play();
      synthRef.current = synth; // store the synth in a ref
      seqRef.current = seq; // store the sequencer in a ref
      setIsPlaying(false); // set the isPlaying state to false
    }
  };

  const play = async () => {
    if (!seqRef.current) {
      await loadSynth(); // load the synth and sequencer
    }
    if (seqRef.current) {
      seqRef.current.play(true);
      setIsPlaying(true);
    }
  };

  const stop = () => {
    if (seqRef.current) {
      seqRef.current.stop();
      setIsPlaying(false);
    }
  };

  const pause = () => {
    if (synthRef.current) {
      if (isPlaying && !isPause) {
        seqRef.current.pause();
        setIsPaused(true);
      }
      else if (isPlaying && isPause) {
        seqRef.current.play();
        setIsPaused(false);
      }
    }
  };

  const currentTime = () => {
    if (seqRef.current) {
      const time = Math.floor(seqRef.current.currentTime);
      // sekunfen in Minuten und Sekunden umwandeln
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return '0:00';
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isPlaying) {
      interval = setInterval(() => {
        setDisplayTime(currentTime());
      }, 400);
    } else {
      setDisplayTime('0:00');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);


  // Initialisiere Synth und Sequencer neu, wenn midiData oder soundfont sich ändern
  useEffect(() => {
    stop();
    if (seqRef.current) {
      seqRef.current.loadNewSongList([{ binary: midiData.data }], false);
    }
    setIsPlaying(false);
    setDisplayTime('0:00');
    //play();
  }, [midiData, soundfont]);

  return (
    <div className="player-container">
      <div style={{
        width: '100%',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        borderBottom: '1px solid #ccc',
        marginBottom: 8,
        position: 'relative',
        height: 28 // oder passend zur Textgröße
      }}>
        <div style={{
          display: 'block',
          width: '100%',
          overflow: 'hidden',
          position: 'absolute',
          height: '100%',
        }}>
          <div
            style={{
              display: 'inline-block',
              whiteSpace: 'nowrap',
              animation: 'scroll-left 10s linear infinite',
              position: 'absolute',
              willChange: 'transform',
            }}
          >
            {midiData.name}
          </div>
          <style>
            {`
              @keyframes scroll-left {
                0% {
                  transform: translateX(100%);
                }
                100% {
                  transform: translateX(-100%);
                }
              }
            `}
          </style>
        </div>
      </div>
      <div className="controls">
        <button onClick={stop} disabled={!isPlaying}>Stop</button>
        <button onClick={play} disabled={isPlaying}>Play</button>
        <button onClick={pause} disabled={!isPlaying}>Pause</button>
        <br />
        <p>Seconds : {displayTime}</p>
      </div>
    </div>
  );
};

export default MidiPlayer;
// MidiPlayer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Synthetizer, Sequencer } from 'spessasynth_lib';
//import { Midi } from '@tonejs/midi';
//import Soundfont from 'soundfont-player';

const context = new AudioContext();
let audioContextLoaded = false;

(async () => {
    try {                                  // create an audioContext
        await context.audioWorklet.addModule(new URL(
            "./worklet_processor.min.js",
            import.meta.url
        )); // add the worklet
        audioContextLoaded = true; // set the flag to true
    }
    catch (error) {
        alert("Error loading worklet: " + error);
        console.error("Error loading worklet:", error);
        return;
    }
})();

interface MidiPlayerProps {
    midiData: { name: string, data: ArrayBuffer } | null; // MIDI-Daten als ArrayBuffer
    soundfont: ArrayBuffer | null; // Soundfont als ArrayBuffer
    onSoundfontChange?: (newSoundfont: ArrayBuffer) => void; // Neuer Prop für Soundfont-Änderungen
}

const MidiPlayer: React.FC<MidiPlayerProps> = ({ midiData, soundfont, onSoundfontChange }) => {
    const synthRef = useRef<any>(null);
    const seqRef = useRef<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPause, setIsPaused] = useState(false);
    const [displayTime, setDisplayTime] = useState('0:00');
    const [soundfontName, setSoundfontName] = useState<string>("Standard"); // Name des aktuellen Soundfonts
    const fileInputRef = useRef<HTMLInputElement>(null);



    // Soundfont und MIDI laden
    const loadSynth = async () => {
        if (!midiData || !soundfont) {
            // alert("MIDI data or soundfont not loaded yet. Please restart.");
            return;
        }
        //const midi = new Midi(midiData.data); // load the midi data
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

    };

    const play = async () => {
        if (!audioContextLoaded) {
            alert("AudioContext not loaded yet. Please load midi file and soundfont");
            return;
        }
        if (!seqRef.current) {
            await loadSynth(); // load the synth and sequencer
        }
        if (seqRef.current) {
            seqRef.current.play(true);
            setIsPlaying(true);
        };
    }

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


    // Neue Funktion für Soundfont-Upload
    const handleSoundfontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        // Stoppe die Wiedergabe, falls läuft
        if (isPlaying) {
            stop();
        }

        const file = files[0];
        setSoundfontName(file.name); // Namen des neuen Soundfonts speichern

        try {
            // Datei einlesen
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target && event.target.result) {
                    const newSoundfont = event.target.result as ArrayBuffer;

                    // Synth und Sequencer zerstören/zurücksetzen
                    if (seqRef.current) {
                        seqRef.current.stop();
                        seqRef.current = null;
                    }

                    if (synthRef.current) {
                        synthRef.current = null;
                    }

                    // Neuen Soundfont an Parent-Komponente weitergeben
                    if (onSoundfontChange) {
                        onSoundfontChange(newSoundfont);
                    }
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error("Fehler beim Laden des Soundfonts:", error);
        }
    };

    // Trigger file input click
    const openFileDialog = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
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
        if (seqRef.current && midiData && midiData.data) {
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
                        {midiData?.name || 'No MIDI file loaded'}
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
            <div style={{ fontSize: '12px', color: '#666', marginBottom: 8 }}>
                Soundfont: {soundfontName}
            </div>
            <div className="controls">
                <button onClick={stop} disabled={!isPlaying}>Stop</button>
                <button onClick={play} disabled={isPlaying || !midiData?.data}>Play</button>
                <button onClick={pause} disabled={!isPlaying}>Pause</button>
                <br />
                <p>Seconds : {displayTime}</p>
                {/* Soundfont Upload */}
                <div style={{ marginTop: 10 }}>
                    <button
                        onClick={openFileDialog}
                        title="Unterstützt .sf2-Dateien"
                    >
                        Eigenen Soundfont laden
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleSoundfontUpload}
                        accept=".sf2"
                        style={{ display: 'none' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default MidiPlayer;
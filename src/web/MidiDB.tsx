import React, { useState, useEffect, useRef } from 'react';
import MidiPlayer from './Midiplayer';
import MidiSearch, { MidiSearchResult } from './MidiSearch';
import { getTitleFromEntry, getArtistFromEntry } from '../utli';

// Extend the Window interface to include __USE__NODE__
declare global {
    interface Window {
        __USE__NODE__?: boolean;
        __BASE_PATH__?: string;
    }
}


type ViewMode = 'file' | 'search';

const MidiDB: React.FC = () => {
    const [rawMidiInformationData, setRawMidiInformationData] = useState<IMidiFileInformation | null>(null);
    const [view, setView] = useState<ViewMode>('file');
    const [midiData, setMidiData] = useState<ILoadMidiFile | null>(null);
    const [musicLLM, setMusicLLM] = useState<IMusicLLM_softsearch_result | null>(null);
    const [musicbrainz, setMusicbrainz] = useState<IMusicbrainzResponse | null>(null);
    const [soundfont, setSoundfont] = useState<ArrayBuffer | null>(null);
    const [loading, setLoading] = useState(false);
    const [redactedData, setredactedData] = useState<IMidiFileRedacted | null>(null);
    const [highlightState, setHighlightState] = useState<'success' | 'error' | null>(null);

    // Für Suchergebnis-Auswahl
    const [searchResult, setSearchResult] = useState<any>(null);

    const [searchResults, setSearchResults] = useState<MidiSearchResult[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchTotal, setSearchTotal] = useState(0);
    const [searchPage, setSearchPage] = useState(1);

    // midi Player
    // State für die aktuell abzuspielenden MIDI-Daten
    const [playerMidiData, setPlayerMidiData] = useState<{ name: string, data: ArrayBuffer } | null>(null);
    const [canScanDir, setCanScanDir] = useState(false);

    // Ref für den rechten Bereich
    const mainContentRef = useRef<HTMLDivElement>(null);

    // Beim Wechsel des Views nach "file" oder "search" nach oben scrollen
    useEffect(() => {
        if (mainContentRef.current) {
            mainContentRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
    }, [view]);

    useEffect(() => {
        const electronApi = (window as any).electron as typeof window.electron | undefined;
        setCanScanDir(!!electronApi?.scanMidiDir);
    }, []);

    const openAndSendMidiFile = async (): Promise<IMidiFileInformation | null> => {
        return new Promise<IMidiFileInformation | null>((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.midi,.mid,.kar';
            input.onchange = async (e: any) => {
                const file = e.target.files[0];
                if (!file) resolve(null);
                setLoading(true);
                const arrayBuffer = await file.arrayBuffer();

                // Sende die Datei an den Node-Server
                // setLoading(true);
                try {
                    const basePath = window.__BASE_PATH__ || '';
                    const apiUrl = (basePath ? basePath : '') + '/midi/openMidiFile';
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'X-Filename': encodeURIComponent(file.name)
                        },
                        body: arrayBuffer
                    });
                    if (!response.ok) {
                        alert('Fehler beim Senden der Datei: ' + response.statusText);
                        resolve(null);
                    }
                    const data = await response.json() as unknown as IMidiFileInformation;
                    if (data && data.midifile && data.midifile.data && typeof data.midifile.data === 'string') {
                        // Convert the Base64 string back to an ArrayBuffer
                        const binaryString = atob(data.midifile.data);
                        const bytes = new Uint8Array(binaryString.length);

                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }

                        data.midifile.data = bytes.buffer;
                    }                // Hier kannst du das Ergebnis weiterverarbeiten:
                    resolve(data as IMidiFileInformation);
                } catch (err) {
                    alert('Fehler beim Senden der Datei');
                    resolve(null);
                }
            };

            input.click();
        }
        );
    };

    const saveMidiFileToNode = async (midiData: IMidiFileInformation) => {
        return new Promise<boolean>(async (resolve) => {
            try {
                if (midiData && midiData.midifile && midiData.midifile.data) {
                    const uint8Array = new Uint8Array(midiData.midifile.data as ArrayBuffer);
                    let binaryString = '';
                    for (let i = 0; i < uint8Array.length; i++) {
                        binaryString += String.fromCharCode(uint8Array[i]);
                    }
                    midiData.midifile.data = btoa(binaryString);
                }

                const basePath = window.__BASE_PATH__ || '';
                const apiUrl = (basePath ? basePath : '') + '/midi/saveMidiFile';
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(midiData)
                });

                if (!response.ok) {
                    alert('Fehler beim Senden der Datei: ' + response.statusText);
                    resolve(false);
                    return;
                }
                const data = await response.json();
                resolve(data.success);
            } catch (err) {
                alert('Fehler beim Senden der Datei');
                resolve(false);
            }
        });
    };

    const loadMidiFile = async () => {
        let data: IMidiFileInformation | null = null;
        if (window.__USE__NODE__ === true) {
            // Node.js-Modus
            // show file open dialog from webpage

            // send midi to node and get IMidiFileInformation
            data = await openAndSendMidiFile();
        }
        else {
            setLoading(true);
            data = await window.electron.openMidiFile();
        }
        if (data) {
            setRawMidiInformationData(data);
            setMidiData(data.midifile);
            setredactedData(data.redacted || null);
            setMusicLLM(data.musicLLM);
            setMusicbrainz(data.musicbrainz);
            setSearchResult(null);
            setredactedData(data.redacted || null);
        }
        setLoading(false);
    };

    const saveMidiFile = async () => {
        setLoading(true);

        let data: boolean = false;
        if (window.__USE__NODE__ === true) {
            // Node.js-Modus
            // show file open dialog from webpage

            // send midi to node and get IMidiFileInformation
            data = await saveMidiFileToNode({
                midifile: midiData,
                musicLLM: musicLLM,
                musicbrainz: musicbrainz,
                validationState: 'reviewed',
                redacted: redactedData
            });
        }
        else {
            // Annahme: editData enthält die bearbeiteten Felder
            data = await window.electron.saveMidiFile({
                midifile: midiData,
                musicLLM: musicLLM,
                musicbrainz: musicbrainz,
                validationState: 'reviewed',
                redacted: redactedData
            });
        }
        setLoading(false);
        if (!data) {
            setHighlightState('error'); // Fehler -> Rot blinken
        } else {
            setHighlightState('success'); // Erfolg -> Grün blinken
        }

        // Highlight nach 1 Sekunde zurücksetzen
        setTimeout(() => setHighlightState(null), 1000);
    };

    const scanMidiDir = async () => {
        const electronApi = (window as any).electron as typeof window.electron | undefined;
        if (!electronApi?.scanMidiDir) {
            alert("Ordner-Scan ist nur in der Electron-App verfügbar.");
            return;
        }
        setLoading(true);
        await electronApi.scanMidiDir();
        setLoading(false);
    };

    const loadSoundfont = async () => {
        try {
            const arrayBuffer = await window.electron.loadSoundfont('alex_gm.sf2');
            if (typeof arrayBuffer === 'string') {
                // show popup and announce to install soundfont
                alert('Soundfont konnte nicht geladen werden. Bitte installieren Sie die Soundfont-Datei.\n' + arrayBuffer);
                console.error('Error loading soundfont:', arrayBuffer);
                return;
            }
            if (arrayBuffer) setSoundfont(arrayBuffer);
        }
        catch (error) {
            // show popup and announce to install soundfont
            alert('Soundfont konnte nicht geladen werden. Bitte installieren Sie die Soundfont-Datei.');
            console.error('Error loading soundfont:', error);
        }
    };

    const loadSoundfontFromServer = async () => {
        try {
            console.log('Lade Soundfont vom Server...');
            const basePath = window.__BASE_PATH__ || '';
            const apiUrl = (basePath ? basePath : '') + '/alex_gm.sf2';
            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`Fehler beim Laden der Soundfont: ${response.status} ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            console.log('Soundfont erfolgreich geladen');
            setSoundfont(arrayBuffer);
        } catch (error) {
            console.error('Fehler beim Laden der Soundfont vom Server:', error);
            alert('Soundfont konnte nicht vom Server geladen werden. Bitte prüfen Sie, ob die Datei im static-Ordner verfügbar ist.');
        }
    };

    useEffect(() => {
        if (window.__USE__NODE__ === true) {
            // show popup and announce to install soundfont
            loadSoundfontFromServer();
            // alert('Die Anwendung läuft im Node.js-Modus. Bitte laden Sie eine lokale Soundfont-Datei.');
        }
        else {
            loadSoundfont();
        }
    }, []);

    const handlePlayMidi = (data: { name: string, data: ArrayBuffer } | null) => {
        setPlayerMidiData(data);
    };

    // Handler für bearbeitbare Felder
    const handleredactedChange = (field: string, value: any) => {
        setredactedData(prev => {
            // Wenn redactedData null ist, neues Objekt anlegen
            if (!prev) {
                return { [field]: value } as IMidiFileRedacted;
            }
            // Sonst Feld aktualisieren
            return { ...prev, [field]: value };
        });

    };

    // Handler für Auswahl aus Suchergebnis
    const handleSelectSearchResult = (result: any) => {
        setRawMidiInformationData(result);
        setMidiData(result.midifile);
        setredactedData(result.redacted || null);
        setMusicLLM(result.musicLLM);
        setMusicbrainz(result.musicbrainz);
        setSearchResult(result);
        setView('file');
    };

    function loadMidiFileByHashFromNode(hash: string): IMidiFileInformation | PromiseLike<IMidiFileInformation | null> | null {
        return new Promise<IMidiFileInformation | null>(async (resolve) => {
            // Sende die Datei an den Node-Server
            // setLoading(true);
            // setLoading(true);
            try {
                const basePath = window.__BASE_PATH__ || '';
                const apiUrl = (basePath ? basePath : '') + '/midi/getMidiFileByHash';
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ hash: hash })
                });
                if (!response.ok) {
                    alert('Fehler beim laden der Datei: ' + response.statusText);
                    resolve(null);
                }
                const data = await response.json() as unknown as IMidiFileInformation;
                // decode Base64 string to ArrayBuffer
                if (data && data.midifile && data.midifile.data && typeof data.midifile.data === 'string') {
                    // Convert the Base64 string back to an ArrayBuffer
                    const binaryString = atob(data.midifile.data);
                    const bytes = new Uint8Array(binaryString.length);

                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }

                    data.midifile.data = bytes.buffer;
                }
                // Hier kannst du das Ergebnis weiterverarbeiten:
                resolve(data);
            } catch (err) {
                alert('Fehler beim laden der Datei');
                resolve(null);
            }
        }
        );
    }

    return (
        <div
            className="app-container"
            style={{
                display: 'flex',
                height: '100vh',
                width: '100vw', // nimmt die volle Breite ein
                margin: 0,
                padding: 0,
                boxSizing: 'border-box'
            }}
        >
            {/* Linker Bereich: Navigation */}
            <div
                style={{
                    width: 220,
                    background: '#f5f5f5',
                    padding: 20,
                    paddingLeft: 0, // kein linker Abstand
                    borderRight: '1px solid #ddd',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    minHeight: '100vh', // volle Höhe
                    boxSizing: 'border-box'
                }}
            >
                <button onClick={() => setView('file')} style={{ fontWeight: view === 'file' ? 'bold' : undefined }}>
                    Dateiansicht
                </button>
                <button onClick={() => setView('search')} style={{ fontWeight: view === 'search' ? 'bold' : undefined }}>
                    Datenbank Suche
                </button>
                {canScanDir && (
                    <button onClick={scanMidiDir}>Scan dir</button>
                )}
                <br />
                <br />
                <hr />
                <br />
                <div style={{ display: 'fixed', alignItems: 'center', gap: '2rem', marginBottom: 24 }}>
                    {/* {soundfont && playerMidiData && ( */}
                    <MidiPlayer
                        midiData={playerMidiData}
                        soundfont={soundfont}
                        onSoundfontChange={(newSoundfont) => setSoundfont(newSoundfont)}
                    />
                    {/* )} */}
                </div>
            </div>

            {/* Rechter Bereich: Dynamisch */}
            <div
                className="main-content"
                ref={mainContentRef}
                style={{
                    flex: 1,
                    padding: 32,
                    overflow: 'auto',
                    minHeight: '100vh',
                    boxSizing: 'border-box',

                }}
            >
                {/* File View - immer rendern, nur Sichtbarkeit ändern */}
                <div style={{ display: view === 'file' ? 'block' : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: 16 }}>
                        <div style={{ flex: 2, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                            <div>
                                <button onClick={loadMidiFile}>Open MIDI File from Disk</button>
                            </div>
                            <br />
                            <button disabled={midiData ? false : true} onClick={() => {
                                if (midiData?.data) handlePlayMidi({ name: (redactedData?.title ? redactedData.title : (midiData.fileName ? midiData.fileName.join(", ") : "unbekannt")), data: midiData.data as ArrayBuffer });
                            }}>
                                In Player laden
                            </button>
                            <button
                                disabled={!midiData?.data}
                                onClick={() => {
                                    if (rawMidiInformationData && midiData?.data) {
                                        // Erstelle Dateinamen aus Artist und Title
                                        const artist = redactedData?.artist || getArtistFromEntry(rawMidiInformationData) || "unknown";
                                        const title = redactedData?.title || getTitleFromEntry(rawMidiInformationData) || "untitled";
                                        const fileName = `${artist} - ${title}.mid`;

                                        // Erstelle Blob und Download-Link
                                        const blob = new Blob([midiData.data], { type: 'audio/midi' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = fileName;
                                        document.body.appendChild(a);
                                        a.click();

                                        // Cleanup
                                        setTimeout(() => {
                                            document.body.removeChild(a);
                                            URL.revokeObjectURL(url);
                                        }, 100);
                                    }
                                }}
                            >
                                MIDI herunterladen
                            </button>
                            <div>
                                {midiData && (
                                    <div className="metadata-section" style={{ marginBottom: 24 }}>
                                        <h2>MIDI Informationen aus der Datei</h2>
                                        <div>
                                            <p> Dateiname: {midiData.fileName} </p>
                                            <p> Verzeichnis: {midiData.fileDir}</p>
                                            <p> Tempo: {midiData.midiParser?.tempo?.join(", ")}</p>
                                            <p> Signature: {midiData.midiParser?.signature?.join(", ")}</p>
                                            <p><label>
                                                Lyrics:
                                                <textarea
                                                    rows={5}
                                                    readOnly
                                                    value={midiData.midiParser?.lyrics?.join("") ?? ''}
                                                />
                                            </label>
                                            </p>
                                            <p>
                                                <label>
                                                    Text:
                                                    <textarea
                                                        rows={5}
                                                        readOnly
                                                        value={midiData.midiParser?.text?.join("") ?? ''}
                                                    />
                                                </label>
                                            </p>
                                            <p>
                                                <label>
                                                    Copyright:
                                                    <textarea
                                                        rows={5}
                                                        readOnly
                                                        value={midiData.midiParser?.copyrightNotice?.join(", ") ?? ''}
                                                    />
                                                </label>
                                            </p>
                                        </div>
                                        {/* <button onClick={saveMidiFile} style={{ marginTop: 16 }}>Speichern</button> */}
                                    </div>
                                )}
                                {musicLLM && (
                                    <div className="music-llm-section" style={{ marginBottom: 24 }}>
                                        <h2>Music LLM Result</h2>
                                        <div>
                                            <p>
                                                Text: {musicLLM.text}
                                                <button
                                                    onClick={() => {
                                                        if (musicLLM.text) {
                                                            navigator.clipboard.writeText(musicLLM.text);
                                                        }
                                                    }}
                                                    style={{ marginLeft: 8 }}
                                                >
                                                    Kopieren
                                                </button>
                                            </p>
                                            <p>
                                                Artist: {musicLLM.artist}
                                                <button
                                                    onClick={() => {
                                                        if (musicLLM.artist) {
                                                            navigator.clipboard.writeText(musicLLM.artist);
                                                        }
                                                    }}
                                                    style={{ marginLeft: 8 }}
                                                >
                                                    Kopieren
                                                </button>
                                            </p>
                                            <p>
                                                Title: {musicLLM.title}
                                                <button
                                                    onClick={() => {
                                                        if (musicLLM.title) {
                                                            navigator.clipboard.writeText(musicLLM.title);
                                                        }
                                                    }}
                                                    style={{ marginLeft: 8 }}
                                                >
                                                    Kopieren
                                                </button>
                                            </p>
                                            <p>
                                                Release: {musicLLM.release}
                                                <button
                                                    onClick={() => {
                                                        if (musicLLM.release) {
                                                            navigator.clipboard.writeText(musicLLM.release);
                                                        }
                                                    }}
                                                    style={{ marginLeft: 8 }}
                                                >
                                                    Kopieren
                                                </button>
                                            </p>
                                            <p>
                                                Album: {musicLLM.album}
                                                <button
                                                    onClick={() => {
                                                        if (musicLLM.album) {
                                                            navigator.clipboard.writeText(musicLLM.album);
                                                        }
                                                    }}
                                                    style={{ marginLeft: 8 }}
                                                >
                                                    Kopieren
                                                </button>
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setMusicLLM(null)}
                                            style={{ marginLeft: 8, color: 'red' }}
                                        >
                                            MusicLLM löschen
                                        </button>

                                    </div>
                                )}
                                {musicbrainz && (
                                    <div className="musicbrainz-section">
                                        <h2>Musicbrainz Result</h2>
                                        {musicbrainz.top && musicbrainz.top.map((item, index) => (
                                            <div key={index} style={{ position: 'relative', paddingRight: 32 }}>
                                                <p>
                                                    Artist: {item.artist}
                                                    <button
                                                        onClick={() => {
                                                            if (item.artist) {
                                                                navigator.clipboard.writeText(item.artist);
                                                            }
                                                        }}
                                                        style={{ marginLeft: 8 }}
                                                    >
                                                        Kopieren
                                                    </button>
                                                </p>
                                                <p>
                                                    Title: {item.title}
                                                    <button
                                                        onClick={() => {
                                                            if (item.title) {
                                                                navigator.clipboard.writeText(item.title);
                                                            }
                                                        }}
                                                        style={{ marginLeft: 8 }}
                                                    >
                                                        Kopieren
                                                    </button>
                                                </p>
                                                <p>
                                                    Release: {item.firstReleaseDate}
                                                    <button
                                                        onClick={() => {
                                                            if (item.firstReleaseDate) {
                                                                navigator.clipboard.writeText(item.firstReleaseDate);
                                                            }
                                                        }}
                                                        style={{ marginLeft: 8 }}
                                                    >
                                                        Kopieren
                                                    </button>
                                                </p>
                                                <p>
                                                    Album: {item.album}
                                                    <button
                                                        onClick={() => {
                                                            if (item.album) {
                                                                navigator.clipboard.writeText(item.album);
                                                            }
                                                        }}
                                                        style={{ marginLeft: 8 }}
                                                    >
                                                        Kopieren
                                                    </button>
                                                </p>
                                                <p>
                                                    Tags: {item.tags && item.tags.map(tag => tag.name).join(', ')}
                                                    <button
                                                        onClick={() => {
                                                            if (item.tags) {
                                                                const tagString = item.tags.map(tag => tag.name).join(', ');
                                                                navigator.clipboard.writeText(tagString);

                                                                // Also add to redacted tags
                                                                const currentTags = Array.isArray(redactedData?.tags) ? [...redactedData!.tags] : [];
                                                                const newTagsToAdd = item.tags.filter(t => !currentTags.some(ct => ct.name === t.name));

                                                                if (newTagsToAdd.length > 0) {
                                                                    const mergedTags = [
                                                                        ...currentTags,
                                                                        ...newTagsToAdd.map(t => ({ name: t.name }))
                                                                    ];
                                                                    handleredactedChange('tags', mergedTags);
                                                                }
                                                            }
                                                        }}
                                                        style={{ marginLeft: 8 }}
                                                    >
                                                        Kopieren
                                                    </button>
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newTop = [...(musicbrainz.top ?? [])];
                                                        newTop.splice(index, 1);
                                                        setMusicbrainz({ ...musicbrainz, top: newTop });
                                                    }}
                                                    style={{ color: 'red', position: 'absolute', top: 0, right: 0 }}
                                                >
                                                    ×
                                                </button>
                                                <hr />
                                            </div>
                                        ))}
                                        <hr />
                                        {musicbrainz.oldest && (
                                            <div style={{ position: 'relative', paddingRight: 32 }}>
                                                <h3>Oldest Release</h3>
                                                <p>
                                                    Artist: {musicbrainz.oldest.artist}
                                                    <button
                                                        onClick={() => {
                                                            if (musicbrainz.oldest && musicbrainz.oldest.artist) {
                                                                navigator.clipboard.writeText(musicbrainz.oldest.artist);
                                                            }
                                                        }}
                                                        style={{ marginLeft: 8 }}
                                                    >
                                                        Kopieren
                                                    </button>
                                                </p>
                                                <p>
                                                    Title: {musicbrainz.oldest.title}
                                                    <button
                                                        onClick={() => {
                                                            if (musicbrainz.oldest && musicbrainz.oldest.title) {
                                                                navigator.clipboard.writeText(musicbrainz.oldest.title);
                                                            }
                                                        }}
                                                        style={{ marginLeft: 8 }}
                                                    >
                                                        Kopieren
                                                    </button>
                                                </p>
                                                <p>
                                                    Release: {musicbrainz.oldest.firstReleaseDate}
                                                    <button
                                                        onClick={() => {
                                                            if (musicbrainz.oldest && musicbrainz.oldest.firstReleaseDate) {
                                                                navigator.clipboard.writeText(musicbrainz.oldest.firstReleaseDate);
                                                            }
                                                        }}
                                                        style={{ marginLeft: 8 }}
                                                    >
                                                        Kopieren
                                                    </button>
                                                </p>
                                                <p>
                                                    Album: {musicbrainz.oldest?.album}
                                                    <button
                                                        onClick={() => {
                                                            if (musicbrainz.oldest && musicbrainz.oldest.album) {
                                                                navigator.clipboard.writeText(musicbrainz.oldest.album);
                                                            }
                                                        }}
                                                        style={{ marginLeft: 8 }}
                                                    >
                                                        Kopieren
                                                    </button>
                                                </p>
                                                <p>
                                                    Tags: {musicbrainz.oldest && musicbrainz.oldest.tags && musicbrainz.oldest.tags.map(tag => tag.name).join(', ')}
                                                    <button
                                                        onClick={() => {
                                                            if (musicbrainz.oldest && musicbrainz.oldest.tags) {
                                                                const tags = musicbrainz.oldest.tags;
                                                                const tagString = tags.map(tag => tag.name).join(', ');
                                                                navigator.clipboard.writeText(tagString);

                                                                // Also add to redacted tags
                                                                const currentTags = Array.isArray(redactedData?.tags) ? [...redactedData!.tags] : [];
                                                                const newTagsToAdd = tags.filter((t: any) => !currentTags.some(ct => ct.name === t.name));

                                                                if (newTagsToAdd.length > 0) {
                                                                    const mergedTags = [
                                                                        ...currentTags,
                                                                        ...newTagsToAdd.map((t: any) => ({ name: t.name }))
                                                                    ];
                                                                    handleredactedChange('tags', mergedTags);
                                                                }
                                                            }
                                                        }}
                                                        style={{ marginLeft: 8 }}
                                                    >
                                                        Kopieren
                                                    </button>
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMusicbrainz({ ...musicbrainz, oldest: null });
                                                    }}
                                                    style={{ color: 'red', position: 'absolute', top: 0, right: 0 }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ flex: 1, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                            <h2 className={highlightState === 'success' ? 'blink-success' : highlightState === 'error' ? 'blink-error' : ''}>
                                Redaktionierte Informationen
                            </h2>
                            <form style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {/* speichern button */}
                                <button
                                    type="button"
                                    onClick={saveMidiFile}
                                    disabled={!redactedData || loading}
                                    style={{ marginBottom: 16 }}
                                >
                                    Speichern
                                </button>
                                <label>
                                    Title:
                                    <input
                                        type="text"
                                        value={redactedData?.title ?? ''}
                                        onChange={e => handleredactedChange('title', e.target.value)}
                                    />
                                </label>
                                <label>
                                    Artist:
                                    <input
                                        type="text"
                                        value={redactedData?.artist ?? ''}
                                        onChange={e => handleredactedChange('artist', e.target.value)}
                                    />
                                </label>

                                <label>
                                    Album:
                                    <input
                                        type="text"
                                        value={redactedData?.album ?? ''}
                                        onChange={e => handleredactedChange('album', e.target.value)}
                                    />
                                </label>
                                <label>
                                    Release:
                                    <input
                                        type="text"
                                        value={redactedData?.release ?? ''}
                                        onChange={e => handleredactedChange('release', e.target.value)}
                                    />
                                </label>
                                <label>
                                    Tags:
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {(Array.isArray(redactedData?.tags) ? redactedData!.tags : []).map((tag, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <input
                                                    type="text"
                                                    value={tag.name}
                                                    onChange={e => {
                                                        const newTags = Array.isArray(redactedData?.tags) ? [...redactedData!.tags] : [];
                                                        newTags[idx] = { name: e.target.value };
                                                        handleredactedChange('tags', newTags);
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newTags = Array.isArray(redactedData?.tags) ? [...redactedData!.tags] : [];
                                                        newTags.splice(idx, 1);
                                                        handleredactedChange('tags', newTags);
                                                    }}
                                                    style={{ color: 'red', fontWeight: 'bold' }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newTags = Array.isArray(redactedData?.tags) ? [...redactedData!.tags] : [];
                                                newTags.push({ name: '' });
                                                handleredactedChange('tags', newTags);
                                            }}
                                            style={{ marginTop: 4 }}
                                        >
                                            + Tag hinzufügen
                                        </button>
                                    </div>
                                </label>
                                <label>
                                    Text:
                                    <textarea
                                        value={redactedData?.text ?? ''}
                                        onChange={e => handleredactedChange('text', e.target.value)}
                                        rows={3}
                                    />
                                </label>

                                <label>
                                    Note:
                                    <input
                                        type="text"
                                        value={redactedData?.note ?? ''}
                                        onChange={e => handleredactedChange('note', e.target.value)}
                                    />
                                </label>
                                <label>
                                    Tempo:
                                    <input
                                        type="number"
                                        value={redactedData?.tempo ?? midiData?.midiParser?.tempo[0] ?? ''}
                                        onChange={e => handleredactedChange('tempo', e.target.value ? Number(e.target.value) : undefined)}
                                    />
                                </label>
                                <label>
                                    Signature:
                                    <input
                                        type="text"
                                        value={redactedData?.signature ?? midiData?.midiParser?.signature[0] ?? ''}
                                        onChange={e => handleredactedChange('signature', e.target.value)}
                                    />
                                </label>
                            </form>
                        </div>
                    </div>
                </div>


                {/* Search View - immer rendern, nur Sichtbarkeit ändern */}
                <div style={{ display: view === 'search' ? 'block' : 'none' }}>

                    <MidiSearch
                        onPlay={async (hash: string) => {
                            // Hole das Dokument aus der DB und zeige es wie beim Datei-Laden
                            setLoading(true);
                            let result: IMidiFileInformation | null = null;
                            if (window.__USE__NODE__ === true) {
                                // Node.js-Modus
                                result = await loadMidiFileByHashFromNode(hash);
                            }
                            else {
                                // hole das Dokument aus der DB
                                result = await window.electron.getMidiFileByHash(hash);
                            }
                            if (result && result.midifile && result.midifile.data) {
                                // handleSelectSearchResult(result);
                                setSearchResult(result);
                                handlePlayMidi({ name: getTitleFromEntry(result) + " -- " + getArtistFromEntry(result), data: result.midifile.data as ArrayBuffer });
                            }
                            setLoading(false);
                        }}
                        onSelect={async (hash: string) => {
                            // Hole das Dokument aus der DB und zeige es wie beim Datei-Laden
                            setLoading(true);
                            let result: IMidiFileInformation | null = null;
                            if (window.__USE__NODE__ === true) {
                                // Node.js-Modus
                                result = await loadMidiFileByHashFromNode(hash);
                            }
                            else {
                                // hole das Dokument aus der DB
                                result = await window.electron.getMidiFileByHash(hash);
                            }
                            if (result) {
                                handleSelectSearchResult(result);
                            }
                            setLoading(false);
                        }}
                        selectedHash={searchResult?.midifile?.hash}
                        results={searchResults}
                        setResults={setSearchResults}
                        query={searchQuery}
                        setQuery={setSearchQuery}
                        total={searchTotal}
                        setTotal={setSearchTotal}
                        page={searchPage}
                        setPage={setSearchPage}
                    />
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
        </div>
    );
};

export default MidiDB;

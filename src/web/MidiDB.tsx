import React, { useState, useEffect, useRef } from 'react';
import MetadataView from './MetadataView';
import MidiPlayer from './Midiplayer';
import MidiSearch, { MidiSearchResult } from './MidiSearch';
import { getTitleFromEntry, getArtistFromEntry } from '../utli';


type ViewMode = 'file' | 'search';

const MidiDB: React.FC = () => {
    const [view, setView] = useState<ViewMode>('file');
    const [midiData, setMidiData] = useState<ILoadMidiFile | null>(null);
    const [musicLLM, setMusicLLM] = useState<IMusicLLM_softsearch_result | null>(null);
    const [musicbrainz, setMusicbrainz] = useState<IMusicbrainzResponse | null>(null);
    const [soundfont, setSoundfont] = useState<ArrayBuffer | null>(null);
    const [loading, setLoading] = useState(false);
    const [redactedData, setredactedData] = useState<IMidiFileRedacted | null>(null);

    // Für Suchergebnis-Auswahl
    const [searchResult, setSearchResult] = useState<any>(null);

    const [searchResults, setSearchResults] = useState<MidiSearchResult[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchTotal, setSearchTotal] = useState(0);
    const [searchPage, setSearchPage] = useState(1);

    // midi Player
    // State für die aktuell abzuspielenden MIDI-Daten
    const [playerMidiData, setPlayerMidiData] = useState<{ name: string, data: ArrayBuffer } | null>(null);

       // Ref für den rechten Bereich
    const mainContentRef = useRef<HTMLDivElement>(null);

    // Beim Wechsel des Views nach "file" oder "search" nach oben scrollen
    useEffect(() => {
        if (mainContentRef.current) {
            mainContentRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
    }, [view]);


    const loadMidiFile = async () => {
        setLoading(true);
        const data = await window.electron.openMidiFile();
        if (data) {
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
        // Annahme: editData enthält die bearbeiteten Felder
        let data = await window.electron.saveMidiFile({
            midifile: midiData,
            musicLLM: musicLLM,
            musicbrainz: musicbrainz,
            validationState: 'reviewed',
            redacted: redactedData
        });
        if (data) {
            setMidiData(data.midifile);
            setredactedData(data.redacted || null);
            setMusicLLM(data.musicLLM);
            setMusicbrainz(data.musicbrainz);
            setSearchResult(null);
        }
        setLoading(false);
        alert('Gespeichert!');
    };

    const scanMidiDir = async () => {
        setLoading(true);
        await window.electron.scanMidiDir();
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

    useEffect(() => { loadSoundfont(); }, []);

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
        setMidiData(result.midifile);
        setredactedData(result.redacted || null);
        setMusicLLM(result.musicLLM);
        setMusicbrainz(result.musicbrainz);
        setSearchResult(result);
        setView('file');
    };

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
                <button onClick={scanMidiDir}>Scan dir</button>
                <br />
                <br />
                <hr />
                <br />
                <div style={{ display: 'fixed', alignItems: 'center', gap: '2rem', marginBottom: 24 }}>
                    {soundfont && playerMidiData && (
                        <MidiPlayer midiData={playerMidiData} soundfont={soundfont} />
                    )}
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
                {view === 'file' && (
                    <div style={{ display: 'flex', flexDirection: 'row', gap: 16 }}>
                        <div style={{ flex: 2, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                            <div>
                                <button onClick={loadMidiFile}>Open MIDI File from Disk</button>
                            </div>
                            <br/>
                            <button disabled={midiData ? false : true} onClick={() => {
                                if (midiData?.data) handlePlayMidi({ name: (redactedData?.title ? redactedData.title: (midiData.fileName? midiData.fileName.join(", "):"unbekannt")), data: midiData.data });
                            }}>
                                In Player laden
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
                                                    value={midiData.midiParser?.lyrics?.join(", ") ?? ''}
                                                />
                                            </label>
                                            </p>
                                            <p>
                                                <label>
                                                    Text:
                                                    <textarea
                                                        rows={5}
                                                        readOnly
                                                        value={midiData.midiParser?.text?.join(", ") ?? ''}
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
                                            <p>Text: {musicLLM.text}</p>
                                            <p>Artist: {musicLLM.artist}</p>
                                            <p>Title: {musicLLM.title}</p>
                                            <p>Release: {musicLLM.release}</p>
                                            <p>Album: {musicLLM.album}</p>
                                            <button
                                                type="button"
                                                onClick={() => setMusicLLM(null)}
                                                style={{ marginTop: 8, color: 'red' }}
                                            >
                                                MusicLLM löschen
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {musicbrainz && (
                                    <div className="musicbrainz-section">
                                        <h2>Musicbrainz Result</h2>
                                        {musicbrainz.top && musicbrainz.top.map((item, index) => (
                                            <div key={index} style={{ position: 'relative', paddingRight: 32 }}>
                                                <p>Artist: {item.artist}</p>
                                                <p>Title: {item.title}</p>
                                                <p>Release: {item.firstReleaseDate}</p>
                                                <p>Album: {item.album}</p>
                                                <p>Tags: {item.tags && item.tags.map(tag => tag.name).join(', ')}</p>
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
                                                <p>Artist: {musicbrainz.oldest.artist}</p>
                                                <p>Title: {musicbrainz.oldest.title}</p>
                                                <p>Release: {musicbrainz.oldest.firstReleaseDate}</p>
                                                <p>Album: {musicbrainz.oldest.album}</p>
                                                <p>Tags: {musicbrainz.oldest.tags && musicbrainz.oldest.tags.map(tag => tag.name).join(', ')}</p>
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
                            <h2>Redaktionierte Informationen</h2>
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
                                        value={redactedData?.tempo ?? ''}
                                        onChange={e => handleredactedChange('tempo', e.target.value ? Number(e.target.value) : undefined)}
                                    />
                                </label>
                                <label>
                                    Signature:
                                    <input
                                        type="text"
                                        value={redactedData?.signature ?? ''}
                                        onChange={e => handleredactedChange('signature', e.target.value)}
                                    />
                                </label>
                            </form>
                        </div>
                    </div>
                )}

                {view === 'search' && (

                    <MidiSearch
                        onPlay={async (hash: string) => {
                            // Hole das Dokument aus der DB und zeige es wie beim Datei-Laden
                            setLoading(true);
                            const result = await window.electron.getMidiFileByHash(hash);
                            if (result && result.midifile && result.midifile.data) {
                                // handleSelectSearchResult(result);
                                setSearchResult(result);
                                handlePlayMidi({ name: getTitleFromEntry(result) + " -- " + getArtistFromEntry(result), data: result.midifile.data });
                            }
                            setLoading(false);
                        }}
                        onSelect={async (hash: string) => {
                            // Hole das Dokument aus der DB und zeige es wie beim Datei-Laden
                            setLoading(true);
                            const result = await window.electron.getMidiFileByHash(hash);
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
                )}

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
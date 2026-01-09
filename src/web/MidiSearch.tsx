import React, { useState, useEffect, useRef } from 'react';

// Extend the Window interface to include __USE__NODE__
declare global {
    interface Window {
        __USE__NODE__?: boolean;
        __BASE_PATH__?: string;
    }
}

export interface MidiSearchResult {

    title: string | string[];
    artist: string | string[];
    hash: string;
    redacted: boolean;
}

export interface SearchMidiDocumentsResult {
    docs: Array<MidiSearchResult>;
    total: number;
};

interface MidiSearchProps {
    onPlay: (midiHash: string) => void;
    onSelect: (midiHash: string) => void;
    selectedHash?: string;
    results: MidiSearchResult[];
    setResults: (results: MidiSearchResult[]) => void;
    query: string;
    setQuery: (query: string) => void;
    total: number;
    setTotal: (total: number) => void;
    page: number;
    setPage: (page: number) => void;
}


const MidiSearch: React.FC<MidiSearchProps> = ({
    onPlay,
    onSelect,
    selectedHash,
    results,
    setResults,
    query,
    setQuery,
    total,
    setTotal,
    page,
    setPage,
}) => {

    const [inputValue, setInputValue] = useState(query); // Lokaler State für das Input-Feld
    const [loading, setLoading] = useState(false);
    const pageSize = 10000;

    // Ref für die ausgewählte Zeile
    const selectedRowRef = useRef<HTMLTableRowElement>(null);

    /**
     * Builds a MongoDB query based on the input string.
     * - If input looks like a MongoDB ObjectId (24 hex chars), search by _id
     * - If input looks like a SHA256 hash (64 hex chars), search by midifile.hash
     * - Otherwise, perform a text search
     */
    function buildSearchQuery(input: string): any {
        const trimmed = input.trim();

        // Check if it's a MongoDB ObjectId (24 hex characters)
        if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
            return { _id: trimmed };
        }

        // Check if it's a SHA256 hash (64 hex characters)
        if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
            return { 'midifile.hash': trimmed };
        }

        // Default: text search
        const searchString = trimmed
            .split(/\s+/)
            .filter(Boolean)
            .map(word => `"${word}"`)
            .join(' ');

        return { $text: { $search: searchString } };
    }

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        const skip = (page - 1) * pageSize;
        const searchQuery = buildSearchQuery(query);
        let res: SearchMidiDocumentsResult = { docs: [], total: 0 };
        if (window.__USE__NODE__) {
            // node load
            res = await searchMidiDocumentsNode(searchQuery, skip, pageSize);
        }
        else {
            // electron load
            res = await window.electron.searchMidiDocuments(searchQuery, skip, pageSize);
        }
        setResults(res.docs || []);
        setTotal(res.total || 0);
        setLoading(false);
    };

    useEffect(() => {
        if (query) {
            setLoading(true);
            const skip = 0; //(page - 1) * pageSize;
            const searchQuery = buildSearchQuery(query);

            if (window.__USE__NODE__) {
                // node load
                searchMidiDocumentsNode(searchQuery, skip, pageSize)
                    .then((res: SearchMidiDocumentsResult) => {
                        setResults(res.docs || []);
                        setTotal(res.total || 0);
                    })
                    .finally(() => setLoading(false));
            }
            else {
                // electron load
                window.electron.searchMidiDocuments(searchQuery, skip, pageSize)
                    .then((res: SearchMidiDocumentsResult) => {
                        setResults(res.docs || []);
                        setTotal(res.total || 0);
                    })
                    .finally(() => setLoading(false));
            }

        }
        // eslint-disable-next-line
    }, [page, query]);

    // Nach Rendern zu ausgewählter Zeile scrollen
    useEffect(() => {
        if (selectedRowRef.current) {
            selectedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [results, selectedHash]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setQuery(inputValue); // setQuery wird erst nach 2 Sekunden ohne Änderungen aufgerufen
        }, 2000);

        return () => clearTimeout(timer); // Timer zurücksetzen, wenn sich inputValue ändert
    }, [inputValue, setQuery]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    return (
        <div>
            <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder="Suche nach Artist, Titel, etc."
                    style={{ width: 300, marginRight: 8 }}
                />
                {/* <button type="submit" disabled={loading}>Suchen</button> */}
            </form>
            {loading && <div>Suche läuft...</div>}
            {!loading && results.length === 0 && <div>Keine Ergebnisse.</div>}
            {!loading && results.length > 0 && (
                <div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #bbb' }}>
                        <thead>
                            <tr>
                                <th style={{ border: '1px solid #bbb', background: '#f8f8f8' }}>Title</th>
                                <th style={{ border: '1px solid #bbb', background: '#f8f8f8' }}>Artist</th>
                                <th style={{ border: '1px solid #bbb', background: '#f8f8f8' }}>Redaktioniert</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((res, idx) => (
                                <tr
                                    key={res.hash}
                                    ref={selectedHash === res.hash ? selectedRowRef : undefined}
                                    style={{
                                        background: selectedHash === res.hash
                                            ? (res.redacted ? '#e0f7fa' : '#e0f7fa')
                                            : res.redacted
                                                ? 'lightgreen'
                                                : idx % 2 === 0
                                                    ? '#fff'
                                                    : '#f4f4f4'
                                    }}
                                    onClick={() => onSelect(res.hash)}
                                >
                                    <td>{Array.isArray(res.title) ? res.title.join(', ') : res.title}</td>
                                    <td>{Array.isArray(res.artist) ? res.artist.join(', ') : res.artist}</td>
                                    <td>
                                        {res.redacted ? 'ja' : 'Nein'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{ marginTop: 12 }}>
                        {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => (
                            <button
                                key={i}
                                onClick={() => handlePageChange(i + 1)}
                                disabled={page === i + 1}
                                style={{ marginRight: 4 }}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MidiSearch;

async function searchMidiDocumentsNode(arg0: { $text: { $search: string; }; }, skip: number, pageSize: number): Promise<SearchMidiDocumentsResult> {
    try {
        const basePath = window.__BASE_PATH__ || '';
        const apiUrl = (basePath ? basePath : '') + '/midi/searchMidiDocuments';
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: arg0,
                skip: skip,
                limit: pageSize
            })
        });

        if (!response.ok) {
            console.error('Fehler bei der Suche:', response.statusText);
            return { docs: [], total: 0 };
        }

        const data = await response.json();
        return data as SearchMidiDocumentsResult;
    } catch (err) {
        console.error('Fehler bei der Suche:', err);
        return { docs: [], total: 0 };
    }
}
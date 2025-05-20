import React, { useState, useEffect, useRef } from 'react';

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

    const [loading, setLoading] = useState(false);
    const pageSize = 10000;

    // Ref für die ausgewählte Zeile
    const selectedRowRef = useRef<HTMLTableRowElement>(null);

    /**
     * Builds a search string by splitting the input on whitespace, filtering out empty strings,
     * wrapping each word in double quotes, and joining them with spaces.
     *
     * @param input - The input string to process.
     * @returns A string where each word from the input is wrapped in double quotes and separated by spaces.
     */
    function buildAndSearchString(input: string) {
        return input
            .split(/\s+/)
            .filter(Boolean)
            .map(word => `"${word}"`)
            .join(' ');
    }

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        const skip = (page - 1) * pageSize;
        const searchString = buildAndSearchString(query);
        const res = await window.electron.searchMidiDocuments({ $text: { $search: searchString } }, skip, pageSize);
        setResults(res.docs || []);
        setTotal(res.total || 0);
        setLoading(false);
    };

    useEffect(() => {
        if (query) {
            setLoading(true);
            const skip = 0; //(page - 1) * pageSize;
            const searchString = buildAndSearchString(query);

            window.electron.searchMidiDocuments({ $text: { $search: searchString } }, skip, pageSize)
                .then((res: SearchMidiDocumentsResult) => {
                    setResults(res.docs || []);
                    setTotal(res.total || 0);
                })
                .finally(() => setLoading(false));
        }
        // eslint-disable-next-line
    }, [page, query]);

    // Nach Rendern zu ausgewählter Zeile scrollen
    useEffect(() => {
        if (selectedRowRef.current) {
            selectedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [results, selectedHash]);



    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    return (
        <div>
            <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Suche nach Artist, Titel, etc."
                    style={{ width: 300, marginRight: 8 }}
                />
                <button type="submit" disabled={loading}>Suchen</button>
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
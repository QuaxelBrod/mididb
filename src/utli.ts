export function getTitleFromEntry(entry: IMidiFileInformation): Array<string> {
    if (!entry) {
        return [];
    }
    let title: Array<string> = [];
    if (entry.musicbrainz && entry.musicbrainz.top && entry.musicbrainz.top.length > 0) {
        for (let i = 0; i < entry.musicbrainz.top.length; i++) {
            const t = entry.musicbrainz.top[i].title;
            if (typeof t === "string" && t.length > 0) {
                title.push(t);
            }
        }
    }
    else if (entry.musicLLM && entry.musicLLM.title) {
        title.push(entry.musicLLM.title);
    }
    else if (entry.midifile && entry.midifile.fileName && entry.midifile.fileName.length > 0) {
        for (let i = 0; i < entry.midifile.fileName.length; i++) {
            title.push(entry.midifile.fileName[i]);
        }
    }
    return title;
}

export function getArtistFromEntry(entry: IMidiFileInformation): Array<string> {
    if (!entry) {
        return [];
    }
    let artist: Array<string> = [];
    if (entry.musicbrainz && entry.musicbrainz.top && entry.musicbrainz.top.length > 0) {
        for (let i = 0; i < entry.musicbrainz.top.length; i++) {
            const t = entry.musicbrainz.top[i].artist;
            if (typeof t === "string" && t.length > 0) {
                artist.push(t);
            }
        }
    }
    else if (entry.musicLLM && entry.musicLLM.artist) {
        artist.push(entry.musicLLM.artist);
    }

    return artist;
}
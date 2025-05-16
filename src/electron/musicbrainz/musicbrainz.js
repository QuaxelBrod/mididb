import { MusicBrainzApi } from 'musicbrainz-api';


const config = {
    // Optional: MusicBrainz bot account credentials
    botAccount: {
        username: 'myUserName_bot',
        password: 'myPassword',
    },

    // Optional: API base URL (default: 'https://musicbrainz.org')
    //baseUrl: 'http://127.0.0.1:5000',

    // Required: Application details
    appName: 'private-midi-archive',
    appVersion: '0.1.0',
    appMail: 'user@mail.org',

    // Optional: Disable rate limiting (default: false)
    disableRateLimiting: false,
};

const mbApi = new MusicBrainzApi(config);

function getTopNArtists_1(list, n = 3) {
    if (!Array.isArray(list) || list.length === 0) return [];

    const countMap = {};
    for (const entry of list) {
        if (!entry.artist) continue;
        countMap[entry.artist] = (countMap[entry.artist] || 0) + 1;
    }

    // Erzeuge sortierte Liste mit Artist und Count
    return Object.entries(countMap)
        .map(([artist, count]) => ({ artist, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, n);
}

function getTopNArtists_2(list, n = 3) {
    if (!Array.isArray(list) || list.length === 0) return [];

    const artistMap = {};
    for (const entry of list) {
        if (!entry.artist) continue;
        if (!artistMap[entry.artist]) {
            artistMap[entry.artist] = {
                artist: entry.artist,
                artistId: entry.artistId || null,
                count: 1,
                firstReleaseDate: entry.firstReleaseDate || null
            };
        } else {
            artistMap[entry.artist].count += 1;
            // Vergleiche und setze das früheste Release-Datum
            if (
                entry.firstReleaseDate &&
                (!artistMap[entry.artist].firstReleaseDate ||
                    entry.firstReleaseDate < artistMap[entry.artist].firstReleaseDate)
            ) {
                artistMap[entry.artist].firstReleaseDate = entry.firstReleaseDate;
            }
        }
    }

    // Sortiere nach Häufigkeit absteigend und gib die Top-N Artists zurück
    return Object.values(artistMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, n);
}

function getTopNArtistsWithOldest(list, n = 3) {
    if (!Array.isArray(list) || list.length === 0) return { top: [], oldest: null };

    const artistMap = {};
    for (const entry of list) {
        if (!entry.artist) continue;
        if (!artistMap[entry.artist]) {
            artistMap[entry.artist] = {
                artist: entry.artist,
                artistId: entry.artistId || null,
                count: 1,
                firstReleaseDate: entry.firstReleaseDate || null
            };
        } else {
            artistMap[entry.artist].count += 1;
            // Vergleiche und setze das früheste Release-Datum
            if (
                entry.firstReleaseDate &&
                (!artistMap[entry.artist].firstReleaseDate ||
                    entry.firstReleaseDate < artistMap[entry.artist].firstReleaseDate)
            ) {
                artistMap[entry.artist].firstReleaseDate = entry.firstReleaseDate;
            }
        }
    }

    const sorted = Object.values(artistMap).sort((a, b) => b.count - a.count);
    const top = sorted.slice(0, n);

    // Finde den Eintrag mit dem ältesten (kleinsten) firstReleaseDate
    const withDate = Object.values(artistMap).filter(a => a.firstReleaseDate);
    let oldest = null;
    if (withDate.length > 0) {
        oldest = withDate.reduce((min, curr) =>
            curr.firstReleaseDate < min.firstReleaseDate ? curr : min
        );
    }

    return { top, oldest };
}

function extractTitleArtistScore(json) {
    if (!json || !Array.isArray(json.recordings)) return [];

    return json.recordings.map(rec => {
        // Erster Artist-Name und Artist-ID aus artist-credit
        let artist = "Unknown";
        let artistId = null;
        if (rec["artist-credit"] && rec["artist-credit"].length > 0) {
            if (rec["artist-credit"][0].artist) {
                artist = rec["artist-credit"][0].artist.name;
                artistId = rec["artist-credit"][0].artist.id;
            } else {
                artist = rec["artist-credit"][0].name;
            }
        }

        return {
            title: rec.title,
            artist: artist,
            artistId: artistId,
            score: rec.score,
            firstReleaseDate: rec["first-release-date"] || null,
        };
    });
}

(async () => {

    // let result = await mbApi.lookup('artist', 'ab2528d9-719f-4261-8098-21849222a0f2', ['recordings']);
    //console.log(result);

    let result = await mbApi.search('recording', {
        query: 'Bohemian Rhapsody',
        limit: 100
    });

    const list = extractTitleArtistScore(result);
    console.log(getTopNArtistsWithOldest(list, 3));



})();

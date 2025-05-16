import { MusicBrainzApi } from 'musicbrainz-api';
import { title } from 'process';


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

function getTopNArtists_1(list: any, n = 3) {
    if (!Array.isArray(list) || list.length === 0) return [];

    const countMap: any = {};
    for (const entry of list) {
        if (!entry.artist) continue;
        countMap[entry.artist] = (countMap[entry.artist] || 0) + 1;
    }

    // Erzeuge sortierte Liste mit Artist und Count
    return Object.entries(countMap)
        .map(([artist, count]) => ({ artist, count }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, n);
}

function getTopNArtists_2(list: any, n = 3) {
    if (!Array.isArray(list) || list.length === 0) return [];

    const artistMap: any = {};
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
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, n);
}

function getTopNArtistsWithOldest(list: any, n = 3) {
    if (!Array.isArray(list) || list.length === 0) return { top: [], oldest: null };

    const artistMap: any = {};
    for (const entry of list) {
        if (!entry.artist) continue;
        if (!artistMap[entry.artist]) {
            artistMap[entry.artist] = {
                title: entry.title,
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

    const sorted = Object.values(artistMap).sort((a: any, b: any) => b.count - a.count);
    const top = sorted.slice(0, n);

    // Finde den Eintrag mit dem ältesten (kleinsten) firstReleaseDate
    const withDate = Object.values(artistMap).filter((a: any) => a.firstReleaseDate);
    let oldest = null;
    if (withDate.length > 0) {
        oldest = withDate.reduce((min: any, curr: any) =>
            curr.firstReleaseDate < min.firstReleaseDate ? curr : min
        );
    }

    return { top, oldest };
}

function extractTitleArtistScore(json: any) {
    if (!json || !Array.isArray(json.recordings)) return [];

    return json.recordings.map((rec: any) => {
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


export async function getTopListForParams(params: IMusicbrainzRequestParams, n = 3) {
    if (!params || !params.title) return [];

    let query_string_array: Array<string> = [];
    if (params.title) {
        query_string_array.push(`recording:"${params.title}"`);
    }
    if (params.artist) {
        query_string_array.push(`artist:"${params.artist}"`);
    }
    if (params.release) {
        query_string_array.push(`release:"${params.release}"`);
    }
    if (params.album) {
        query_string_array.push(`album:"${params.album}"`);
    }
    if (query_string_array.length === 0) return [];
    
    let query_string = query_string_array.join(' AND ').trim();
    console.log('query_string:', query_string);
    const result = await mbApi.search('recording', {
        query: query_string,
        limit: 100
    });

    const list = extractTitleArtistScore(result);
    let ret: any = getTopNArtistsWithOldest(list, n);
    return ret;
}

// (async () => {

//     // let result = await mbApi.lookup('artist', 'ab2528d9-719f-4261-8098-21849222a0f2', ['recordings']);
//     //console.log(result);

//     let result = await mbApi.search('recording', {
//         query: 'Bohemian Rhapsody',
//         limit: 100
//     });

//     const list = extractTitleArtistScore(result);
//     console.log(getTopNArtistsWithOldest(list, 3));



// })();

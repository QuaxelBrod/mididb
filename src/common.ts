import * as fs from 'fs';
import * as path from 'path';
import { MidiFile } from './electron/midifile';
import MusicLLMinstance from './electron/ollama/ollama';
import { getLLMUserPrompt } from './electron/ollama/llm_prompt_builder';
import { getTopListForParams } from './electron/musicbrainz/musicbrainz';
import { getDbEntryForHash, initMongo, saveMidiDocument, searchMidiDocuments } from './electron/mongo/mongo';
import { IDBMidiDocument } from './electron/mongo/global';
import { SearchMidiDocumentsResult } from './web/MidiSearch';



async function parseWithOLLAMA(midiFile: ILoadMidiFile, additionalPrompt: string = ""): Promise<IMusicLLM_softsearch_result | null> {
    // check data with ollama
    let musicllm = null;
    if (midiFile) {
        //const start = Date.now();
        musicllm = await MusicLLMinstance.soft_search(getLLMUserPrompt(midiFile, additionalPrompt));
        //const duration = Date.now() - start;
        //console.log(`MusicLLMinstance.soft_search Dauer: ${duration} ms`);
        // musicllm = await MusicLLMinstance.soft_search(getLLMUserPrompt(midifile.toJSON()));
    }
    return musicllm;
}

async function parseOnMusicbrainz(musicllm: IMusicLLM_softsearch_result | null, midifile: ILoadMidiFile | null): Promise<IMusicbrainzResponse | null> {

    // check data with ollama
    if (midifile) {
        //const start = Date.now();
        musicllm = await MusicLLMinstance.soft_search(getLLMUserPrompt(midifile));
        //const duration = Date.now() - start;
        //console.log(`MusicLLMinstance.soft_search Dauer: ${duration} ms`);
        // musicllm = await MusicLLMinstance.soft_search(getLLMUserPrompt(midifile.toJSON()));
    }

    //const start = Date.now();
    // musicbrainz lookup
    let musicbrainz = await getTopListForParams({
        title: musicllm?.title ? musicllm.title : (midifile?.fileName ? midifile?.fileName[0] : ""),
        artist: musicllm?.artist ? musicllm.artist : null,
        release: musicllm?.release ? musicllm.release : null,
        album: musicllm?.album ? musicllm.album : null
    }, 3);
    //const duration = Date.now() - start;
    //console.log(`getTopListForParams Dauer: ${duration} ms`);
    //console.log('musicbrainz:', musicbrainz);
    return musicbrainz;
}


export function validationStateMidiFile(midiFileInformation: IMidiFileInformation): IMidiFileInformation {
    if (midiFileInformation.musicLLM
        && midiFileInformation.musicbrainz
        && midiFileInformation.musicbrainz.top
        && midiFileInformation.musicbrainz.top.length > 0) {
        midiFileInformation.validationState = 'open';
    }
    else if (!midiFileInformation.musicLLM
        || !midiFileInformation.musicbrainz
        || !midiFileInformation.musicbrainz.top
        || midiFileInformation.musicbrainz.top.length === 0) {
        midiFileInformation.validationState = 'review';
    }
    return midiFileInformation;
}


export async function get_midi_file_by_hash(hash: string): Promise<IMidiFileInformation | null> {
    //console.log('get-midi-file-by-hash:', hash);
    let db_document: IDBMidiDocument | null = await getDbEntryForHash(hash);
    if (db_document) {
        //console.log('get-midi-file-by-hash:', db_document);
        let ret: IMidiFileInformation = {
            midifile: db_document.midifile,
            musicLLM: db_document.musicLLM,
            musicbrainz: db_document.musicbrainz,
            validationState: db_document.validationState
        };
        //console.log('get-midi-file-by-hash:', ret);
        return ret;
    }
    else {
        console.log('get-midi-file-by-hash: not found');
        return null;
    }
};

export async function save_midi_file(midi: IMidiFileInformation): Promise<void> {
    //console.log('save-midi-file:', midi);
    if (midi) {
        try {
            let db_document: IDBMidiDocument = midi as IDBMidiDocument;
            await saveMidiDocument(db_document);
        }
        catch (err) {
            console.error('Fehler beim Speichern der MIDI-Datei:', err);
        }
    }
};

export async function read_midi_file(filePath: string): Promise<IMidiFileInformation | null> {
    if (filePath) {
        let midifile = <ILoadMidiFile>MidiFile.openMidiFile(filePath)?.toJSON();
        let ret: IMidiFileInformation = {
            midifile: midifile,
            musicLLM: null,
            musicbrainz: null,
            validationState: 'open'
        };
        return ret;
    }
    return null;
}

export async function parse_midi_file(midiData: ArrayBuffer | null, fileName: string = "<unknown>", filePaths: string = ""): Promise<IMidiFileInformation | null> {
    try {
        if (midiData) {
            let ret: IMidiFileInformation = {
                midifile: null,
                musicLLM: null,
                musicbrainz: null,
                validationState: 'open'
            };
            ret.midifile = (MidiFile.parseMidiData(midiData))?.toJSON() || null;
            if (ret.midifile === null) {
                return null; // hash already in db
            }
            ret.midifile.fileName = [fileName];
            ret.midifile.filePath = filePaths;

            return ret;
        }
    }
    catch (err) {
        console.error('Fehler beim Parsen der MIDI-Daten:', err);
        return null
    }
    return null;
}


export async function get_midi_from_db(midi_info: IMidiFileInformation | null): Promise<IMidiFileInformation | null> {
    try {
        if (midi_info && midi_info.midifile) {
            //console.log('ret:', JSON.stringify(ret));
            let db_document: IDBMidiDocument | null = midi_info.midifile ? await getDbEntryForHash(midi_info.midifile.hash) : null;
            // check if name is in db entry
            if (db_document && db_document.midifile.fileName) {
                let f_name_to_search = midi_info.midifile.fileName ? midi_info.midifile.fileName[0] : "";
                let fileNames = db_document.midifile.fileName;
                if (fileNames.includes(f_name_to_search)) {
                    // f_name_to_search ist bereits vorhanden
                    return db_document as IMidiFileInformation; // hash already in db
                }
                else {
                    midi_info.midifile.fileName = [...fileNames, f_name_to_search];
                }
            }
            return midi_info; // hash already in db
        }
    }
    catch (err) {
        console.error('Fehler beim Laden der MIDI-Datei:', err);
    }
    return null;
}

export async function load_llm_for_midi_file(midi_info: IMidiFileInformation | null, additionalPrompt: string = ""): Promise<IMidiFileInformation | null> {
    try {
        if (midi_info && midi_info.midifile) {
            midi_info.musicLLM = await parseWithOLLAMA(midi_info.midifile, additionalPrompt);
        }
        return midi_info;
    }
    catch (err) {
        console.error('Fehler beim Laden der MIDI-Datei:', err);
    }
    return null;
}

export async function load_brainz_for_midi_file(midi_info: IMidiFileInformation | null): Promise<IMidiFileInformation | null> {
    try {
        if (midi_info && midi_info.midifile) {
            midi_info.musicbrainz = await parseOnMusicbrainz(midi_info.musicLLM, midi_info.midifile);
        }
        return midi_info;
    }
    catch (err) {
        console.error('Fehler beim Laden der MIDI-Daten:', err);
    }
    return null;
}

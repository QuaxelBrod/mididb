import { MidiParser } from "../midi_parser";
import * as fs from "fs";
import path from "path";
import crypto from "crypto";


export class MidiFile {

    filePath: string;
    fileName: string;
    fullPath: string;
    fileDir: string;
    fileExt: string;
    midiData: ArrayBuffer | null;
    midiParser: IMidiParser | null;
    hash: string | null;

    constructor() {
        this.filePath = "";
        this.fileName = "";
        this.fullPath = "";
        this.fileDir = "";
        this.fileExt = "";
        this.midiData = null;
        this.midiParser = null;
        this.hash = null;
    }

    setDataHash(): string | null {
        if (!this.midiData) return null;
        // ArrayBuffer zu Buffer konvertieren
        const buffer = Buffer.from(this.midiData as ArrayBuffer);
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        this.hash = hash;
        return hash;
    }


    static parseMidiData(midiData: ArrayBuffer): MidiFile | null {
        try {
            if (midiData) {
                let ret = new MidiFile();
                ret.midiData = midiData;
                ret.setDataHash();
                ret.midiParser = new MidiParser(new Uint8Array(midiData)).toJson();
                return ret;
            }
        } catch (err) {
            console.error('Fehler beim Parsen der MIDI-Daten:', err);
        }
        return null;
    }

    static openMidiFile(midi_path: string): MidiFile | null {
        try {
            if (midi_path) {
                let  midiRawData = fs.readFileSync(midi_path);
                let ret = new MidiFile();
                ret.filePath = midi_path;
                ret.fileName = path.basename(midi_path, path.extname(midi_path));
                ret.fullPath = path.dirname(midi_path);
                ret.fileDir = path.basename(ret.fullPath);
                ret.fileExt = path.extname(midi_path);
                ret.midiData = midiRawData.buffer.slice(
                    midiRawData.byteOffset,
                    midiRawData.byteOffset + midiRawData.byteLength
                );
                ret.setDataHash();
                ret.midiParser = new MidiParser(new Uint8Array(midiRawData)).toJson();
                return ret;
            }
        } catch (err) {
            console.error('Fehler beim Laden der MIDI-Datei:', err);
        }
        return null;
    }


    toJSON(): ILoadMidiFile {
        return {
            filePath: this.filePath,
            fileName: [this.fileName],
            fileDir: this.fileDir,
            fileExt: this.fileExt,
            data: this.midiData,
            hash: this.hash,
            midiParser: this.midiParser,  // Hier wird midiParser serialisiert
        };
    }
}
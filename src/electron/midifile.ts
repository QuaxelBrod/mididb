import { MidiParser } from "../midi_parser";
import * as fs from "fs";
import path from "path";


export class MidiFile {

    filePath: string;
    fileName: string;
    fileDir: string;
    fileExt: string;
    midiData: ArrayBuffer | null;
    midiParser: IMidiParser | null;

    constructor() {
        this.filePath = "";
        this.fileName = "";
        this.fileDir = "";
        this.fileExt = "";
        this.midiData = null;
        this.midiParser = null;
    }

    static openMidiFile(midi_path: string): MidiFile | null {
        try {
            if (midi_path) {
                let  midiRawData = fs.readFileSync(midi_path);
                let ret = new MidiFile();
                ret.filePath = midi_path;
                ret.fileName = path.basename(midi_path);
                ret.fileDir = path.dirname(midi_path);
                ret.fileExt = path.extname(midi_path);
                ret.midiData = midiRawData.buffer.slice(
                    midiRawData.byteOffset,
                    midiRawData.byteOffset + midiRawData.byteLength
                );
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
            fileName: this.fileName,
            fileDir: this.fileDir,
            fileExt: this.fileExt,
            data: this.midiData,
            midiParser: this.midiParser,  // Hier wird midiParser serialisiert
        };
    }
}
// midi_parser_class.ts
// inspired by from https://github.com/carter-thaxton/midi-file/blob/master/lib/midi-parser.js

type MidiHeader = {
    format: number;
    numTracks: number;
    ticksPerBeat?: number;
    framesPerSecond?: number;
    ticksPerFrame?: number;
};

type MidiEvent = Record<string, any>;

type MidiTrack = MidiEvent[];


// Berechnung der Beats per Minute (BPM) aus setTempo-Mikrosekunden
function calculateBPM(setTempoMicroseconds:number): number {
  return Math.floor(60000000 / setTempoMicroseconds);
}

// Umwandlung der MIDI-Time-Signature-Daten in lesbare Taktart
function calculateTimeSignature(numerator:number, denominatorPower:number): string {
  const denominator = 2 ** denominatorPower;
  return `${numerator}/${denominator}`;
}

export class MidiParser {
    // data: Uint8Array;
    header: MidiHeader | null = null;
    tracks: MidiTrack[] = [];

    copyrightNotice: Array<string> = [];
    trackName: Array<string> = [];
    instrumentName: Array<string> = [];
    lyrics: Array<string> = [];
    text: Array<string> = [];
    tempo: Array<number> = [];
    signature: Array<string> = [];

    constructor(data: Uint8Array | null) {
        if (data === null) 
            throw new Error('MidiParser: No data provides');
        
        //this.data = data;
        this.parse(data);
        data = null
    }

    toJson() {
        return {
            header: this.header,
            tracks: [],
            copyrightNotice: this.copyrightNotice,
            trackName: this.trackName,
            instrumentName: this.instrumentName,
            lyrics: this.lyrics,
            text: this.text,
            tempo: this.tempo,
            signature: this.signature,
        };
    }


    private parse(data: Uint8Array) {
        const p = new Parser(data);

        const headerChunk = p.readChunk();
        if (headerChunk.id !== 'MThd') {
            throw new Error(`Bad MIDI file. Expected 'MThd', got: '${headerChunk.id}'`);
        }
        this.header = this.parseHeader(headerChunk.data);

        this.tracks = [];
        for (let i = 0; !p.eof() && i < this.header.numTracks; i++) {
            const trackChunk = p.readChunk();
            if (trackChunk.id !== 'MTrk') {
                throw new Error(`Bad MIDI file. Expected 'MTrk', got: '${trackChunk.id}'`);
            }
            const track = this.parseTrack(trackChunk.data);
            this.tracks.push(track);
        }
    }

    private parseHeader(data: Uint8Array): MidiHeader {
        const p = new Parser(data);
        const format = p.readUInt16();
        const numTracks = p.readUInt16();
        const timeDivision = p.readUInt16();
        const result: MidiHeader = { format, numTracks };
        if (timeDivision & 0x8000) {
            result.framesPerSecond = 0x100 - (timeDivision >> 8);
            result.ticksPerFrame = timeDivision & 0xFF;
        } else {
            result.ticksPerBeat = timeDivision;
        }
        return result;
    }

    private parseTrack(data: Uint8Array): MidiTrack {
        const p = new Parser(data);
        const events: MidiTrack = [];
        let lastEventTypeByte: number | null = null;

        while (!p.eof()) {
            const event: any = {};
            event.deltaTime = p.readVarInt();
            let eventTypeByte = p.readUInt8();

            if ((eventTypeByte & 0xf0) === 0xf0) {
                // system / meta event
                if (eventTypeByte === 0xff) {
                    // meta event
                    event.meta = true;
                    const metatypeByte = p.readUInt8();
                    const length = p.readVarInt();

                    switch (metatypeByte) {
                        case 0x00:
                            event.type = 'sequenceNumber';
                            if (length !== 2) throw new Error('Expected length for sequenceNumber event is 2');
                            event.number = p.readUInt16();
                            break;
                        case 0x01:
                            event.type = 'text';
                            event.text = p.readString(length);
                            this.text.push(event.text);
                            break;
                        case 0x02:
                            event.type = 'copyrightNotice';
                            event.text = p.readString(length);
                            this.copyrightNotice.push(event.text);
                            break;
                        case 0x03:
                            event.type = 'trackName';
                            event.text = p.readString(length);
                            this.trackName.push(event.text);
                            break;
                        case 0x04:
                            event.type = 'instrumentName';
                            event.text = p.readString(length);
                            this.instrumentName.push(event.text);
                            break;
                        case 0x05:
                            event.type = 'lyrics';
                            event.text = p.readString(length);
                            this.lyrics.push(event.text);
                            break;
                        case 0x06:
                            event.type = 'marker';
                            event.text = p.readString(length);
                            break;
                        case 0x07:
                            event.type = 'cuePoint';
                            event.text = p.readString(length);
                            break;
                        case 0x20:
                            event.type = 'channelPrefix';
                            if (length !== 1) throw new Error('Expected length for channelPrefix event is 1');
                            event.channel = p.readUInt8();
                            break;
                        case 0x21:
                            event.type = 'portPrefix';
                            if (length !== 1) throw new Error('Expected length for portPrefix event is 1');
                            event.port = p.readUInt8();
                            break;
                        case 0x2f:
                            event.type = 'endOfTrack';
                            if (length !== 0) throw new Error('Expected length for endOfTrack event is 0');
                            break;
                        case 0x51:
                            event.type = 'setTempo';
                            if (length !== 3) throw new Error('Expected length for setTempo event is 3');
                            event.microsecondsPerBeat = p.readUInt24();
                            event.bpm = calculateBPM(event.microsecondsPerBeat);
                            this.tempo.push(event.bpm);
                            break;
                        case 0x54:
                            event.type = 'smpteOffset';
                            if (length !== 5) throw new Error('Expected length for smpteOffset event is 5');
                            const hourByte = p.readUInt8();
                            const FRAME_RATES: Record<number, number> = { 0x00: 24, 0x20: 25, 0x40: 29, 0x60: 30 };
                            event.frameRate = FRAME_RATES[hourByte & 0x60];
                            event.hour = hourByte & 0x1f;
                            event.min = p.readUInt8();
                            event.sec = p.readUInt8();
                            event.frame = p.readUInt8();
                            event.subFrame = p.readUInt8();
                            break;
                        case 0x58:
                            event.type = 'timeSignature';
                            if (length !== 2 && length !== 4) throw new Error('Expected length for timeSignature event is 4 or 2');
                            event.numerator = p.readUInt8();
                            event.denominator = 1 << p.readUInt8();
                            if (length === 4) {
                                event.metronome = p.readUInt8();
                                event.thirtyseconds = p.readUInt8();
                            } else {
                                event.metronome = 0x24;
                                event.thirtyseconds = 0x08;
                            }
                            event.signature = calculateTimeSignature(event.numerator, Math.log2(event.denominator));
                            this.signature.push(event.signature);
                            break;
                        case 0x59:
                            event.type = 'keySignature';
                            if (length !== 2) throw new Error('Expected length for keySignature event is 2');
                            event.key = p.readInt8();
                            event.scale = p.readUInt8();
                            break;
                        case 0x7f:
                            event.type = 'sequencerSpecific';
                            event.data = p.readBytes(length);
                            break;
                        default:
                            event.type = 'unknownMeta';
                            event.data = p.readBytes(length);
                            event.metatypeByte = metatypeByte;
                            break;
                    }
                } else if (eventTypeByte === 0xf0 || eventTypeByte === 0xf7) {
                    event.type = eventTypeByte === 0xf0 ? 'sysEx' : 'endSysEx';
                    const length = p.readVarInt();
                    event.data = p.readBytes(length);
                } else {
                    throw new Error(`Unrecognised MIDI event type byte: ${eventTypeByte}`);
                }
            } else {
                // channel event
                let param1: number;
                if ((eventTypeByte & 0x80) === 0) {
                    // running status
                    if (lastEventTypeByte === null) throw new Error('Running status byte encountered before status byte');
                    param1 = eventTypeByte;
                    eventTypeByte = lastEventTypeByte;
                    event.running = true;
                } else {
                    param1 = p.readUInt8();
                    lastEventTypeByte = eventTypeByte;
                }

                const eventType = eventTypeByte >> 4;
                event.channel = eventTypeByte & 0x0f;

                switch (eventType) {
                    case 0x08:
                        event.type = 'noteOff';
                        event.noteNumber = param1;
                        event.velocity = p.readUInt8();
                        break;
                    case 0x09:
                        const velocity = p.readUInt8();
                        event.type = velocity === 0 ? 'noteOff' : 'noteOn';
                        event.noteNumber = param1;
                        event.velocity = velocity;
                        if (velocity === 0) event.byte9 = true;
                        break;
                    case 0x0a:
                        event.type = 'noteAftertouch';
                        event.noteNumber = param1;
                        event.amount = p.readUInt8();
                        break;
                    case 0x0b:
                        event.type = 'controller';
                        event.controllerType = param1;
                        event.value = p.readUInt8();
                        break;
                    case 0x0c:
                        event.type = 'programChange';
                        event.programNumber = param1;
                        break;
                    case 0x0d:
                        event.type = 'channelAftertouch';
                        event.amount = param1;
                        break;
                    case 0x0e:
                        event.type = 'pitchBend';
                        event.value = (param1 + (p.readUInt8() << 7)) - 0x2000;
                        break;
                    default:
                        throw new Error(`Unrecognised MIDI event type: ${eventType}`);
                }
            }
            events.push(event);
        }
        return events;
    }
}

// Hilfsklasse Parser (aus deinem Code übernommen)
class Parser {
    buffer: Uint8Array;
    bufferLen: number;
    pos: number;

    constructor(data: Uint8Array) {
        this.buffer = data;
        this.bufferLen = this.buffer.length;
        this.pos = 0;
    }
    eof() { return this.pos >= this.bufferLen; }
    readUInt8() { return this.buffer[this.pos++]; }
    readInt8() { const u = this.readUInt8(); return u & 0x80 ? u - 0x100 : u; }
    readUInt16() { return (this.readUInt8() << 8) + this.readUInt8(); }
    readInt16() { const u = this.readUInt16(); return u & 0x8000 ? u - 0x10000 : u; }
    readUInt24() { return (this.readUInt8() << 16) + (this.readUInt8() << 8) + this.readUInt8(); }
    readInt24() { const u = this.readUInt24(); return u & 0x800000 ? u - 0x1000000 : u; }
    readUInt32() { return (this.readUInt8() << 24) + (this.readUInt8() << 16) + (this.readUInt8() << 8) + this.readUInt8(); }
    readBytes(len: number) { const bytes = this.buffer.slice(this.pos, this.pos + len); this.pos += len; return bytes; }
    readString(len: number) { return String.fromCharCode(...this.readBytes(len)); }
    readVarInt() {
        let result = 0;
        while (!this.eof()) {
            const b = this.readUInt8();
            if (b & 0x80) {
                result += (b & 0x7f);
                result <<= 7;
            } else {
                return result + b;
            }
        }
        return result; // premature eof
    }
    readChunk() {
        const id = this.readString(4);
        const length = this.readUInt32();
        const data = this.readBytes(length);
        return { id, length, data };
    }
}

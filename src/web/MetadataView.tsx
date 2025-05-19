// MetadataView.tsx
import React, { use, useEffect, useState } from 'react';
import { MidiParser } from "../midi_parser"
//import { Midi } from '@tonejs/midi';

interface MetadataViewProps {
    midiData: ILoadMidiFile;
}

const MetadataView: React.FC<MetadataViewProps> = ({ midiData }) => {
    const [midiParser, setMidiParser] = useState<any>(null);

    useEffect(() => {
        if (midiData.midiParser) {
            setMidiParser(midiData.midiParser);
        }
    }, [midiData]);


    return (
        <div className="metadata-container">
            <h2>MIDI Metadata</h2>
            <div className="metadata-grid">
                <div>File Path:</div>
                <div>{midiData.filePath}</div>

                <div>File Name:</div>
                <div>{midiData.fileName.join(", ")}</div>
                <div>File Directory:</div>
                <div>{midiData.fileDir}</div>
                <div>File Extension:</div>
                <div>{midiData.fileExt}</div>
                <hr />

                <div>Copyright Notice:</div>
                <div>{midiParser && midiParser.copyrightNotice?.join(', ')}</div>
                <div>Track Name:</div>
                <div>{midiParser && midiParser.trackName?.join(', ')}</div>
                <div>Instrument Name:</div>
                <div>{midiParser && midiParser.instrumentName?.join(', ')}</div>
                <div>Lyrics:</div>
                <div>{midiParser && midiParser.lyrics?.join(', ')}</div>
                <div>Text:</div>
                <div>{midiParser && midiParser.text?.join(', ')}</div>
                <div>Tempo:</div>
                <div>{midiParser && midiParser.tempo?.join(', ')}</div>
                <div>Signature:</div>
                <div>{midiParser && midiParser.signature?.join(', ')}</div>

                <hr />
                <div>parser Header</div>
                <textarea
                    className="parser-header"
                    readOnly
                    value={midiParser && midiParser.header ? JSON.stringify(midiParser.header, null, 2) : ""}
                    rows={10}
                />
                <div>parser Tracks</div>
                <textarea
                    className="parser-header"
                    readOnly
                    rows={10}
                    value={midiParser && midiParser.tracks ? JSON.stringify(midiParser.tracks, null, 2) : ""}
                />

            </div>
        </div>
    );
};

export default MetadataView;

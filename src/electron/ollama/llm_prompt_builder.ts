import fs from 'fs';

const instruments = fs.readFileSync("./src/electron/ollama/instruments.txt", "utf-8");
const instrumentList = instruments.split('\n').map(line => line.trim().toLowerCase());

export function getLLMUserPrompt(midifile: ILoadMidiFile): string {
    let prompt = "Wich song you would choose with this information:\n";
    prompt += `Song has this file names: ${midifile.fileName.join(", ")}\n`;
    prompt += `Song is from that directory: ${midifile.fileDir}\n`;
    if (midifile.midiParser != null) {
        if (midifile.midiParser.copyrightNotice?.length > 0) {
            prompt += `Song has this copyright notice: ${midifile.midiParser.copyrightNotice.join(", ")}\n`;
        }
        if (midifile.midiParser.trackName?.length > 0) {
            const filteredTrackNames = midifile.midiParser.trackName.filter((name: string) => !instrumentList.includes(name.toLocaleLowerCase()));
            if (filteredTrackNames.length > 0) {
                prompt += `Song has this additional text (wich may be instruments): ${midifile.midiParser.trackName.join(", ")}\n`;
            }
        }
        if (midifile.midiParser.lyrics?.length > 0) {
            prompt += `Song has this lyrics: ${midifile.midiParser.lyrics.join(" ")}\n`;
        }
    }
    const regex = /[\w.-]+@[\w.-]+\.[A-Z|a-z]{2,}/g; // Regulärer Ausdruck für E-Mail-Adressen
    prompt = prompt.replace(regex, '');
    return prompt;
}


export function getLLMUserPrompt(midifile: ILoadMidiFile): string {
    let prompt = "Wich song you would choose with this information:\n";
    prompt += `Song has this file name: ${midifile.fileName}\n`;
    prompt += `Song is from that directory: ${midifile.fileDir}\n`;
    if (midifile.midiParser != null) {
        if (midifile.midiParser.copyrightNotice?.length > 0) {
            prompt += `Song has this copyright notice: ${midifile.midiParser.copyrightNotice.join(", ")}\n`;
        }
        if (midifile.midiParser.trackName?.length > 0) {
            prompt += `Song has this track name: ${midifile.midiParser.trackName.join(", ")}\n`;
        }
        if (midifile.midiParser.lyrics?.length > 0) {
            prompt += `Song has this lyrics: ${midifile.midiParser.lyrics.join(", ")}\n`;
        }
    }
    const regex = /[\w.-]+@[\w.-]+\.[A-Z|a-z]{2,}/g; // Regulärer Ausdruck für E-Mail-Adressen
    prompt = prompt.replace(regex, '');
    return prompt;
}
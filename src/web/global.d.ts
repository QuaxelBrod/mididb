export { };

declare global {

  interface IMidiParser {
    header: MidiHeader | null = null;
    tracks: MidiTrack[] = [];

    copyrightNotice: Array<string> = [];
    trackName: Array<string> = [];
    instrumentName: Array<string> = [];
    lyrics: Array<string> = [];
    text: Array<string> = [];
    tempo: Array<number> = [];
    signature: Array<string> = [];
  }


  interface ILoadMidiFile {
    filePath: string,
    fileName: string,
    fileDir: string,
    fileExt: string,
    data: ArrayBuffer | null,
    midiParser: IMidiParser | null;
  };

  interface Window {
    electron: {
      openMidiFile: () => Promise<ILoadMidiFile>;
      loadSoundfont: (path: string) => Promise<ArrayBuffer>;
    };
  }
}

export { };

declare global {
  interface IMusicLLM_softsearch_result {
    artist?: string,
    title?: string,
    release?: string,
    album?: string,
    text?: string
}

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
    hash: string | null,
    midiParser: IMidiParser | null;
  };

  interface IMidiFileInformation {
    midifile: ILoadMidiFile | null;
    musicLLM: IMusicLLM_softsearch_result | null;
  }

  interface Window {
    electron: {
      openMidiFile: () => Promise<IMidiFileInformation>;
      loadSoundfont: (path: string) => Promise<ArrayBuffer>;
    };
  }
}

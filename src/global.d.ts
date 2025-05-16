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

  interface IMusicbrainzRequestParams {
    artist?: string | null;
    title?: string | null;
    release?: string | null;
    album?: string | null;
  }

  interface IMusicbrainzResponseEntry {
    title?: string | null;
    titleId?: string | null;
    artist?: string | null;
    artistId?: string | null;
    firstReleaseDate?: string | null;
    album?: string | null;
    text?: string | null;
    tags?: Array<{name:string, count:number}> | null;
  }

  interface IMusicbrainzResponse {
    top: Array<IMusicbrainzResponseEntry>;
    oldest: IMusicbrainzResponseEntry;
  }

  interface IMidiFileInformation {
    midifile: ILoadMidiFile | null;
    musicLLM: IMusicLLM_softsearch_result | null;
    musicbrainz: IMusicbrainzResponse | null;
  }


  interface Window {
    electron: {
      openMidiFile: () => Promise<IMidiFileInformation>;
      scanMidiDir: () => Promise<boolean>,
      loadSoundfont: (path: string) => Promise<ArrayBuffer>;
    };
  }
}

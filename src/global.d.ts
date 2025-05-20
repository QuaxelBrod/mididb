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
    filePath: string | null,
    fileName: Array<string> | null,
    fileDir: string | null,
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
    top: Array<IMusicbrainzResponseEntry> | null;
    oldest: IMusicbrainzResponseEntry | null;
  }

  interface IMidiFileRedacted {
    title?: string;
    artist?: string;
    release?: string;
    album?: string;
    text?: string;
    tags?: Array<{
      name: string;
    }>;
    note?: string;
    tempo?: number;
    signature?: string;
  }

  interface IMidiFileInformation {
    validationState: string;
    midifile: ILoadMidiFile | null;
    musicLLM: IMusicLLM_softsearch_result | null;
    musicbrainz: IMusicbrainzResponse | null;
    redacted?: IMidiFileRedacted | null;
  }


  interface Window {
    electron: {
      searchMidiDocuments(arg0: { $text: { $search: string; }}, $skip: number, $limit: number) : SearchMidiDocumentsResult;
      getMidiFileByHash(hash: string): Promise<IMidiFileInformation>;
      openMidiFile: () => Promise<IMidiFileInformation>;
      saveMidiFile: (midifile: IMidiFileInformation) => Promise<IMidiFileInformation>;
      scanMidiDir: () => Promise<boolean>,
      loadSoundfont: (path: string) => Promise<ArrayBuffer>;
    };
  }
}

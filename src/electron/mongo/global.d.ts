export interface IDBMidiDocument {
  redacted?: {
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
  validationState: string;
  midifile: {
    filePath: string | null;
    fileName: Array<string> | null;
    fileDir: string | null;
    fileExt: string;
    data: any;
    hash: string;
    midiParser: {
      header: {
        format: number;
        numTracks: number;
        ticksPerBeat: number;
      };
      tracks: any[];
      copyrightNotice: string[];
      trackName: string[];
      instrumentName: string[];
      lyrics: string[];
      text: string[];
      tempo: number[];
      signature: string[];
    };
  };
  musicLLM: {
    artist: string;
    title: string;
    release: string;
    album: string;
  } | null;
  musicbrainz: {
    top: Array<{
      title: string;
      titleId: string;
      artist: string;
      artistId: string;
      count: number;
      firstReleaseDate: string;
      tags: Array<{
        name: string;
        count: number;
      }>;
    }>;
    oldest: {
      title: string;
      titleId: string;
      artist: string;
      artistId: string;
      count: number;
      firstReleaseDate: string;
      tags: Array<{
        name: string;
        count: number;
      }>;
    } | null;
  } | null;
}
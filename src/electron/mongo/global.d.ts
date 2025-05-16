export interface IDBMidiDocument {
  midifile: {
    filePath: string;
    fileName: string;
    fileDir: string;
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
  };
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
    };
  };
}
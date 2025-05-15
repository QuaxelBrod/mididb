export { };

declare global {
  interface ILoadMidiFile {
    filePath: string,
    fileName: string,
    fileDir: string,
    fileExt: string,
    data: ArrayBuffer
  };

  interface Window {
    electron: {
      openMidiFile: () => Promise<ILoadMidiFile>;
      loadSoundfont: (path: string) => Promise<ArrayBuffer>;
    };
  }
}

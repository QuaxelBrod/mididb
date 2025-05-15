export {};

declare global {
  interface Window {
    electron: {
      openMidiFile: () => Promise<ArrayBuffer>;
      loadSoundfont: (path: string) => Promise<void>;
    };
  }
}
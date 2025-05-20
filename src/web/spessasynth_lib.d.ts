declare module 'spessasynth_lib' {
  export class Synthetizer {
    constructor(destination: AudioNode, soundFontArrayBuffer: ArrayBuffer);
  }

  export class Sequencer {
    addOnSongEndedEvent(arg0: () => void, arg1: string) {
      throw new Error('Method not implemented.');
    }
    loop: boolean;
    constructor(midiFiles: { binary: ArrayBuffer }[], synth: Synthetizer);
    play(): void;
    stop(): void;
  }
}
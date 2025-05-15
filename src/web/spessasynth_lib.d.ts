declare module 'spessasynth_lib' {
  export class Synthetizer {
    constructor(destination: AudioNode, soundFontArrayBuffer: ArrayBuffer);
  }

  export class Sequencer {
    constructor(midiFiles: { binary: ArrayBuffer }[], synth: Synthetizer);
    play(): void;
    stop(): void;
  }
}
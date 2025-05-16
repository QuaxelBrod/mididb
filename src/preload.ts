// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  openMidiFile: () => ipcRenderer.invoke('open-midi-file'),
  scanMidiDir: () => ipcRenderer.invoke('start-scan-dir'),
  loadSoundfont: (name: string) => ipcRenderer.invoke('load-soundfont', name),
});

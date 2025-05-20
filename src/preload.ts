// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  searchMidiDocuments: (arg0: { 'query':string},$skip: number, $limit: number) => ipcRenderer.invoke('search-midi-document', arg0, $skip, $limit),
  getMidiFileByHash: (hash: string) => ipcRenderer.invoke('get-midi-document-by-hash', hash),
  openMidiFile: () => ipcRenderer.invoke('open-midi-file'),
  saveMidiFile: (midi: IMidiFileInformation) => ipcRenderer.invoke('save-midi-file', midi),
  scanMidiDir: () => ipcRenderer.invoke('start-scan-dir'),
  loadSoundfont: (name: string) => ipcRenderer.invoke('load-soundfont', name),
});

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectInpFiles:    () => ipcRenderer.invoke('select-inp-files'),
  selectPhaseBinary: () => ipcRenderer.invoke('select-phase-binary'),
  autoDetectPhase:   () => ipcRenderer.invoke('auto-detect-phase'),
  runPhase:          (payload) => ipcRenderer.invoke('run-phase', payload),
  stopPhase:         () => ipcRenderer.invoke('stop-phase'),
  getAppVersion:     () => ipcRenderer.invoke('get-app-version'),

  // Live events with proper cleanup functions
  onPhaseProgress: (cb) => {
    const handler = (_e, data) => cb?.(data);
    ipcRenderer.on('phase-progress', handler);
    return () => ipcRenderer.removeListener('phase-progress', handler);
  },
  
  onPhaseOutput: (cb) => {
    const handler = (_e, text) => cb?.(text);
    ipcRenderer.on('phase-output', handler);
    return () => ipcRenderer.removeListener('phase-output', handler);
  },
  
  onPhaseError: (cb) => {
    const handler = (_e, text) => cb?.(text);
    ipcRenderer.on('phase-error', handler);
    return () => ipcRenderer.removeListener('phase-error', handler);
  }
});
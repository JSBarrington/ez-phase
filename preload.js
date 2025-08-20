const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectPhaseBinary: () => ipcRenderer.invoke('select-phase-binary'),
  autoDetectPhase: () => ipcRenderer.invoke('auto-detect-phase'),
  runPhase: (config) => ipcRenderer.invoke('run-phase', config),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Real-time output listeners
  onPhaseOutput: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('phase-output', subscription);
    
    // Return cleanup function
    return () => ipcRenderer.removeListener('phase-output', subscription);
  },
  
  onPhaseError: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('phase-error', subscription);
    
    // Return cleanup function
    return () => ipcRenderer.removeListener('phase-error', subscription);
  },
  
  onPhaseProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('phase-progress', subscription);
    
    // Return cleanup function
    return () => ipcRenderer.removeListener('phase-progress', subscription);
  }
});
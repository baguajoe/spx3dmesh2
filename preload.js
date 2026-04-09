const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File system
  readFile:       (path)            => ipcRenderer.invoke('fs:readFile', path),
  writeFile:      (path, data)      => ipcRenderer.invoke('fs:writeFile', path, data),
  showSaveDialog: (options)         => ipcRenderer.invoke('fs:showSaveDialog', options),
  showOpenDialog: (options)         => ipcRenderer.invoke('fs:showOpenDialog', options),

  // Python
  runPython:      (code)            => ipcRenderer.invoke('python:run', code),
  runPythonFile:  (path)            => ipcRenderer.invoke('python:runFile', path),
  checkPython:    ()                => ipcRenderer.invoke('python:check'),

  // System
  systemInfo:     ()                => ipcRenderer.invoke('system:info'),

  // Menu events (renderer listens)
  onMenuEvent: (channel, cb) => {
    const valid = [
      'menu:save','menu:export-glb','menu:export-bvh',
      'menu:undo','menu:redo','menu:render-start','menu:render-preview',
      'menu:mesh-script','menu:collaborate','menu:python-console',
      'file:opened','script:run',
    ];
    if (valid.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => cb(...args));
    }
  },
  removeMenuListener: (channel) => ipcRenderer.removeAllListeners(channel),

  // Platform
  platform: process.platform,
  isElectron: true,
});

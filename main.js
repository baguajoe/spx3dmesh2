const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path  = require('path');
const fs    = require('fs');
const { spawn, execFile } = require('child_process');

const isDev  = process.env.NODE_ENV === 'development';
const isElec = process.env.ELECTRON === 'true' || !isDev;

let mainWindow = null;
let pythonProcess = null;

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1440,
    height: 900,
    minWidth:  1024,
    minHeight: 600,
    frame: true,
    backgroundColor: '#06060f',
    icon: path.join(__dirname, 'public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // allow local file loads (GLB, BVH, etc.)
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
  buildMenu();
}

// ── Menu ──────────────────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Open GLB/GLTF…', accelerator: 'CmdOrCtrl+O', click: () => openFile(['glb','gltf']) },
        { label: 'Open BVH…',      accelerator: 'CmdOrCtrl+Shift+O', click: () => openFile(['bvh']) },
        { type: 'separator' },
        { label: 'Save Scene…',    accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu:save') },
        { label: 'Export GLB…',    accelerator: 'CmdOrCtrl+E', click: () => mainWindow?.webContents.send('menu:export-glb') },
        { label: 'Export BVH…',    click: () => mainWindow?.webContents.send('menu:export-bvh') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => mainWindow?.webContents.send('menu:undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => mainWindow?.webContents.send('menu:redo') },
        { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Mesh Script', accelerator: 'CmdOrCtrl+`', click: () => mainWindow?.webContents.send('menu:mesh-script') },
        { label: 'Toggle Collaborate',  click: () => mainWindow?.webContents.send('menu:collaborate') },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'resetZoom' },
        ...(isDev ? [{ type: 'separator' }, { role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Render',
      submenu: [
        { label: 'Start Render',    accelerator: 'F12', click: () => mainWindow?.webContents.send('menu:render-start') },
        { label: 'Viewport Render', accelerator: 'F11', click: () => mainWindow?.webContents.send('menu:render-preview') },
      ],
    },
    {
      label: 'Script',
      submenu: [
        { label: 'Open Mesh Script', accelerator: 'CmdOrCtrl+`', click: () => mainWindow?.webContents.send('menu:mesh-script') },
        { label: 'Run Script File…', click: () => openScriptFile() },
        { type: 'separator' },
        { label: 'Python Console',   click: () => mainWindow?.webContents.send('menu:python-console') },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Documentation', click: () => shell.openExternal('https://github.com/baguajoe/spx3dmesh2') },
        { label: 'About SPX Mesh Editor', click: () => showAbout() },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── File dialogs ──────────────────────────────────────────────────────────────
async function openFile(extensions) {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: '3D Files', extensions }],
    properties: ['openFile'],
  });
  if (!result.canceled && result.filePaths[0]) {
    const filePath = result.filePaths[0];
    const data = fs.readFileSync(filePath);
    mainWindow?.webContents.send('file:opened', {
      path: filePath,
      name: path.basename(filePath),
      ext:  path.extname(filePath).slice(1).toLowerCase(),
      data: data.toString('base64'),
    });
  }
}

async function openScriptFile() {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'Scripts', extensions: ['js', 'py'] }],
    properties: ['openFile'],
  });
  if (!result.canceled && result.filePaths[0]) {
    const code = fs.readFileSync(result.filePaths[0], 'utf8');
    const ext  = path.extname(result.filePaths[0]).slice(1);
    mainWindow?.webContents.send('script:run', { code, lang: ext === 'py' ? 'python' : 'js' });
  }
}

function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'SPX Mesh Editor',
    message: 'SPX Mesh Editor',
    detail: 'Version 1.0.0\nBy Eye Forge Studios LLC\n\nBuilt on Three.js + Electron\n69 systems · 616 exported functions',
  });
}

// ── IPC: File System ──────────────────────────────────────────────────────────
ipcMain.handle('fs:readFile', async (_, filePath) => {
  try { return { ok: true, data: fs.readFileSync(filePath).toString('base64') }; }
  catch(e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('fs:writeFile', async (_, filePath, data) => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('fs:showSaveDialog', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('fs:showOpenDialog', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// ── IPC: Python Script Bridge ─────────────────────────────────────────────────
ipcMain.handle('python:run', async (_, code) => {
  return new Promise((resolve) => {
    // Find python3 or python
    const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
    const proc = spawn(pythonBin, ['-c', code], {
      timeout: 30000,
      env: { ...process.env },
    });

    let stdout = '', stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', (code) => {
      resolve({ ok: code === 0, stdout, stderr, exitCode: code });
    });
    proc.on('error', (e) => {
      resolve({ ok: false, stdout: '', stderr: e.message, exitCode: -1 });
    });
  });
});

ipcMain.handle('python:runFile', async (_, filePath) => {
  return new Promise((resolve) => {
    const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
    const proc = spawn(pythonBin, [filePath], { timeout: 60000 });
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', (code) => resolve({ ok: code === 0, stdout, stderr, exitCode: code }));
    proc.on('error', (e) => resolve({ ok: false, stdout: '', stderr: e.message, exitCode: -1 }));
  });
});

ipcMain.handle('python:check', async () => {
  return new Promise((resolve) => {
    const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
    const proc = spawn(pythonBin, ['--version']);
    let version = '';
    proc.stdout.on('data', d => { version += d.toString(); });
    proc.stderr.on('data', d => { version += d.toString(); });
    proc.on('close', (code) => resolve({ available: code === 0, version: version.trim() }));
    proc.on('error', () => resolve({ available: false, version: '' }));
  });
});

// ── IPC: GPU/System info ──────────────────────────────────────────────────────
ipcMain.handle('system:info', async () => {
  const os = require('os');
  return {
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus().length,
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
  };
});

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  if (pythonProcess) pythonProcess.kill();
});

// ── 3D→2D Render export handlers ─────────────────────────────────────────
const { ipcMain: _ipcMain2, dialog: _dialog2 } = require('electron');
const _fs2   = require('fs');
const _path2 = require('path');

_ipcMain2.handle('render:save-image', async (event, { dataURL, filePath }) => {
  try {
    const base64 = dataURL.replace(/^data:image\/\w+;base64,/, '');
    const buf = Buffer.from(base64, 'base64');
    _fs2.writeFileSync(filePath, buf);
    return { ok: true, filePath };
  } catch(e) {
    return { ok: false, error: e.message };
  }
});

_ipcMain2.handle('render:export-video', async (event, { frames, fps, style }) => {
  try {
    const tmpDir = _path2.join(require('os').tmpdir(), 'spx_render_' + Date.now());
    _fs2.mkdirSync(tmpDir, { recursive: true });
    // Write frames
    frames.forEach((dataURL, i) => {
      const base64 = dataURL.replace(/^data:image\/\w+;base64,/, '');
      const buf = Buffer.from(base64, 'base64');
      _fs2.writeFileSync(_path2.join(tmpDir, `frame_${String(i).padStart(4,'0')}.jpg`), buf);
    });
    // Try FFmpeg
    const { execSync } = require('child_process');
    const outputPath = _path2.join(require('os').homedir(), `spx_${style}_${Date.now()}.mp4`);
    try {
      execSync(`ffmpeg -framerate ${fps} -i "${_path2.join(tmpDir, 'frame_%04d.jpg')}" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`, { timeout: 60000 });
      return { ok: true, outputPath };
    } catch(ffErr) {
      return { ok: false, error: 'FFmpeg not found — install FFmpeg for video export', framesDir: tmpDir };
    }
  } catch(e) {
    return { ok: false, error: e.message };
  }
});

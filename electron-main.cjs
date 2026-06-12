const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const http = require('http');

let serverProcess = null;
let mainWindow = null;
const PORT = process.env.PORT || 3000;

function startBackend() {
  // In development, we can run the TS server or CJS server depending on target files.
  // In packaged production, it will always be dist/server.cjs.
  const serverPath = path.join(__dirname, 'dist', 'server.cjs');
  console.log('[Electron Main] Starting Express server.ts / server.cjs at:', serverPath);
  
  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: PORT.toString()
    },
    silent: false
  });

  serverProcess.on('exit', (code, signal) => {
    console.log(`[Electron Main] Express server exited with code ${code} and signal ${signal}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'AI Manga Translator - Trình Dịch Truyện Tranh Thông Minh',
    show: false, // Don't show immediately to prevent flicker
    backgroundColor: '#ffffff'
  });

  // Hide default menu bar for slick, app-like appearance
  mainWindow.setMenuBarVisibility(false);
  
  const url = `http://localhost:${PORT}`;
  
  // Custom polling hook to load page only once Express server is online
  function loadPageWhenOnline() {
    const req = http.get(`${url}/api/health`, (res) => {
      if (res.statusCode === 200) {
        mainWindow.loadURL(url);
        mainWindow.once('ready-to-show', () => {
          mainWindow.show();
          console.log('[Electron Main] Connected to back-end services successfully.');
        });
      } else {
        setTimeout(loadPageWhenOnline, 150);
      }
    });

    req.on('error', () => {
      setTimeout(loadPageWhenOnline, 150);
    });
  }

  loadPageWhenOnline();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Run background server
  startBackend();
  // Build main render frame
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('[Electron Main] Windows closed. Cleaning up server processes...');
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

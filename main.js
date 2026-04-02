const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow;

// Detection for packaged state and browser paths
const isPackaged = app.isPackaged;
if (isPackaged) {
  process.env.PUPPETEER_EXECUTABLE_PATH = path.join(
    process.resourcesPath,
    '.cache',
    'puppeteer',
    'chrome',
    'win64-145.0.7632.77',
    'chrome-win64',
    'chrome.exe'
  );
}

// Start the Express server
const PORT = 3015;
process.env.PORT = PORT;
try {
  require(path.join(__dirname, 'server.js'));
  console.log(`Integrated server started on port ${PORT}`);
} catch (err) {
  console.error('Failed to start integrated server:', err);
}

// Poll until the server is actually ready, then load the URL
// This fixes white screen on slow client machines
function waitForServer(url, retries, interval, callback) {
  http.get(url, (res) => {
    // Server is up!
    callback(null);
  }).on('error', (err) => {
    if (retries <= 0) {
      callback(new Error('Server did not start in time'));
      return;
    }
    setTimeout(() => waitForServer(url, retries - 1, interval, callback), interval);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    title: "Bank PDF Pro (Desktop)",
    icon: path.join(__dirname, 'pdf-modifier-ui', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Show a loading message while waiting for server
  mainWindow.loadURL('data:text/html,<html><body style="background:#0f0f1a;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:Arial"><div style="text-align:center;color:#a78bfa"><div style="font-size:2rem;margin-bottom:12px">⏳</div><div style="font-size:1.1rem;font-weight:600">Starting Bank PDF Pro...</div><div style="font-size:0.8rem;color:rgba(255,255,255,0.4);margin-top:8px">Please wait a moment</div></div></body></html>');

  // Poll every 300ms, up to 100 times (30 seconds max) for the server to be ready
  waitForServer(`http://localhost:${PORT}`, 100, 300, (err) => {
    if (err) {
      console.error('Server timeout:', err.message);
      mainWindow && mainWindow.loadURL(`data:text/html,<html><body style="background:#0f0f1a;color:#f87171;font-family:Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><div style="font-size:2rem">❌</div><div style="margin-top:10px">Server failed to start.<br>Please restart the application.</div></div></body></html>`);
      return;
    }
    console.log(`[main] Server ready on port ${PORT} — loading app`);
    mainWindow && mainWindow.loadURL(`http://localhost:${PORT}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

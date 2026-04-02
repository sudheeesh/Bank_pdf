const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Detection for packaged state and browser paths
const isPackaged = app.isPackaged;
if (isPackaged) {
  // Point to the bundled Chrome inside Electron's resources
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

// Initialize the Express server immediately as part of the main process
// This is faster than spawn and much more reliable for distributed apps
try {
  // Ensure we use a unique port to avoid conflicts with your rental website
  const PORT = 3015;
  process.env.PORT = PORT;
  
  // Start the server
  require(path.join(__dirname, 'server.js'));
  console.log(`Integrated server started on port ${PORT}`);
} catch (err) {
  console.error('Failed to start integrated server:', err);
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

  // Load immediately since server is now started in-process
  // Add a small delay to ensure Express has bound to the port
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3015');
  }, 500);

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

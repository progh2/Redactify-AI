const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Redactify AI - Desktop PDF PII Redactor',
    icon: path.join(__dirname, '../public/favicon.svg'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  const distPath = path.join(__dirname, '../dist/index.html');

  // Load standalone dist/index.html if built, or fallback to dev server URL
  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(distPath);
  }

  // Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

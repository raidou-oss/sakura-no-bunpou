// 桜の文法 — application de bureau : le site dans une fenêtre Chromium (Electron), rien d'autre.
const { app, BrowserWindow, shell, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');

const HOME = 'https://raidou-oss.github.io/sakura-no-bunpou/';
const OK_HOSTS = ['raidou-oss.github.io'];
const NIGHT = '#040A22';

// Fluidité : rendu GPU, pas de ralentissement des animations quand la fenêtre est derrière une autre
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');   // SFX et voix japonaise

if (!app.requestSingleInstanceLock()) app.quit();

const stateFile = () => path.join(app.getPath('userData'), 'window.json');
const loadState = () => { try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch { return { width: 1360, height: 860 }; } };

let win;
function create() {
  const st = loadState();
  win = new BrowserWindow({
    width: st.width, height: st.height, x: st.x, y: st.y, minWidth: 380, minHeight: 560,
    title: '桜の文法', backgroundColor: NIGHT, show: false, autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: false, backgroundThrottling: true },
  });
  if (st.max) win.maximize();
  win.once('ready-to-show', () => win.show());   // pas de flash blanc
  win.on('close', () => {
    try { fs.writeFileSync(stateFile(), JSON.stringify({ ...win.getNormalBounds(), max: win.isMaximized() })); } catch {}
  });

  const internal = url => { try { const u = new URL(url); return OK_HOSTS.includes(u.host) || u.host.endsWith('supabase.co'); } catch { return false; } };
  win.webContents.setWindowOpenHandler(({ url }) => { if (!internal(url)) shell.openExternal(url); return { action: internal(url) ? 'allow' : 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!internal(url)) { e.preventDefault(); shell.openExternal(url); } });
  win.webContents.on('did-fail-load', (e, code, desc, url, isMain) => { if (isMain && code !== -3) win.loadFile(path.join(__dirname, 'offline.html')); });
  // Raccourcis : F5 / Ctrl+R recharger, F11 plein écran, Ctrl +/- zoom, Alt+← retour
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    const mod = i.control || i.meta;
    if (i.key === 'F5' || (mod && i.key.toLowerCase() === 'r')) { win.webContents.reload(); e.preventDefault(); }
    else if (i.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (mod && (i.key === '=' || i.key === '+')) { win.webContents.setZoomLevel(win.webContents.getZoomLevel() + 0.5); e.preventDefault(); }
    else if (mod && i.key === '-') { win.webContents.setZoomLevel(win.webContents.getZoomLevel() - 0.5); e.preventDefault(); }
    else if (mod && i.key === '0') { win.webContents.setZoomLevel(0); e.preventDefault(); }
    else if (i.alt && i.key === 'ArrowLeft' && win.webContents.navigationHistory.canGoBack()) { win.webContents.navigationHistory.goBack(); e.preventDefault(); }
  });
  win.loadURL(HOME);
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  // Menu minimal (indispensable sur Mac pour copier/coller et quitter)
  Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([
    { role: 'appMenu' }, { role: 'editMenu' },
    { label: 'Affichage', submenu: [{ role: 'reload', label: 'Recharger' }, { role: 'togglefullscreen', label: 'Plein écran' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
    { role: 'windowMenu' },
  ]) : null);
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['media', 'notifications', 'clipboard-sanitized-write', 'fullscreen'].includes(perm)));
  create();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) create(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

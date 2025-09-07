// main.js – EZ-PHASE v1.1.0 with enhanced process management
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { spawn } = require('child_process');
const os = require('os');

let mainWindow;
let currentPhaseProcess = null; // Track current process for stopping

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  });

  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  if (process.env.NODE_ENV === 'development') mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (currentPhaseProcess) {
    try {
      process.kill(-currentPhaseProcess.pid, 'SIGKILL');
    } catch (e) {
      console.log('Error killing process on exit:', e.message);
    }
  }
  if (process.platform !== 'darwin') app.quit();
});

// ---------- Utilities ----------
function isExecutable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK | fs.constants.X_OK);
    return true;
  } catch { return false; }
}

function generateRandomSeed() {
  return Math.floor(Math.random() * 999999) + 1;
}

// ---------- IPC Handlers ----------
ipcMain.handle('select-inp-files', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    title: 'Select PHASE input files',
    filters: [{ name: 'PHASE Input Files', extensions: ['inp'] }]
  });
  
  if (result.canceled || !result.filePaths?.length) return null;

  return Promise.all(
    result.filePaths.map(async (filePath) => {
      const name = path.basename(filePath);
      try {
        const st = await fsp.stat(filePath);
        return { name, path: filePath, size: st.size };
      } catch {
        return { name, path: filePath, size: 0 };
      }
    })
  );
});

ipcMain.handle('select-phase-binary', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Select PHASE binary executable',
    filters: [{ name: 'All Files', extensions: ['*'] }],
  });
  if (result.canceled || !result.filePaths?.length) return null;
  const selectedPath = result.filePaths[0];
  if (!isExecutable(selectedPath) && process.platform !== 'win32') {
    try {
      await fsp.chmod(selectedPath, 0o755);
    } catch (e) { 
      console.warn('Could not make file executable:', e.message); 
    }
  }
  return selectedPath;
});

ipcMain.handle('run-phase', async (_evt, config) => {
  try { 
    return await executePhase(config); 
  } catch (err) { 
    console.error('PHASE execution error:', err); 
    throw err; 
  }
});

ipcMain.handle('stop-phase', async () => {
  if (currentPhaseProcess && !currentPhaseProcess.killed) {
    try {
      process.kill(-currentPhaseProcess.pid, 'SIGTERM');
      currentPhaseProcess = null;
      return { success: true, message: 'PHASE process stopped' };
    } catch (error) {
      console.error('Failed to kill process group:', error);
      return { success: false, error: error.message };
    }
  }
  return { success: false, message: 'No active process to stop.' };
});

async function executePhase(config) {
  const { files, phaseBinaryPath } = config;
  const firstFilePath = files[0].path || files[0].name;
  const outputDir = path.join(path.dirname(firstFilePath), 'ez_phase_output');
  await fsp.mkdir(outputDir, { recursive: true });

  const scriptPath = path.join(outputDir, 'run_phase.sh');
  const scriptContent = generatePhaseScript(config, outputDir);
  await fsp.writeFile(scriptPath, scriptContent, { mode: 0o755 });

  return new Promise((resolve, reject) => {
    currentPhaseProcess = spawn('bash', [scriptPath], { cwd: path.dirname(firstFilePath), stdio: ['ignore', 'pipe', 'pipe'], detached: true });

    let output = '';
    currentPhaseProcess.stdout.on('data', (buf) => {
      const chunk = buf.toString();
      output += chunk;
      mainWindow?.webContents?.send('phase-output', chunk);
    });

    currentPhaseProcess.stderr.on('data', (buf) => mainWindow?.webContents?.send('phase-error', buf.toString()));

    currentPhaseProcess.on('close', (code) => {
      currentPhaseProcess = null;
      if (code === 0) {
        resolve({ success: true, outputDirectory: outputDir, processedFiles: files.length });
      } else {
        reject(new Error(`Process exited with code ${code}. Check the log file in the output directory for details.`));
      }
    });

    currentPhaseProcess.on('error', (e) => {
      currentPhaseProcess = null;
      reject(e);
    });
  });
}

// RESTORED ORIGINAL, DEPENDENCY-FREE SCRIPT LOGIC
function generatePhaseScript(config, outputDir) {
  const { files, phaseBinaryPath, iterations = 100, burnin = 100, thinning = 1, outputPrefix = 'phase_output', advancedArgs = [], options = {}, randomSeed, parallel = 4 } = config;
  const logFile = path.join(outputDir, 'phase_execution.log');
  const baseSeed = randomSeed ? randomSeed : generateRandomSeed();

  const allArgs = [...advancedArgs];
  if (options.verbose) allArgs.push('-v');
  if (options.saveAll) allArgs.push('-F');
  const optionsString = allArgs.join(' ');

  let script = `#!/bin/bash
set -e
LOG_FILE="${logFile}"
: > "$LOG_FILE"
echo "=== EZ-PHASE Execution Log ===" >> "$LOG_FILE"

`;
  
  let job_count = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = file.path || file.name;
    const base_name = path.basename(filePath, '.inp');
    const out_file = path.join(outputDir, `${outputPrefix}_${base_name}.out`);
    const seed = parseInt(baseSeed) + i;

    script += `"${phaseBinaryPath}" ${optionsString} -S${seed} "${filePath}" "${out_file}" ${iterations} ${thinning} ${burnin} >> "$LOG_FILE" 2>&1 &\n`;

    job_count++;
    if (job_count % parallel === 0) {
      script += `wait\n`;
    }
  }

  script += `wait\necho "All jobs complete." >> "$LOG_FILE"\n`;
  return script;
}


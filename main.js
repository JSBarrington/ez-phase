// main.js – EZ-PHASE Final Build
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
      // Kill the entire process group on exit
      process.kill(-currentPhaseProcess.pid, 'SIGKILL');
    } catch (e) {
      // Ignore errors if the process is already gone
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
    filters: [{ name: 'PHASE Input Files', extensions: ['inp'] }, { name: 'All Files', extensions: ['*'] }]
  });
  if (result.canceled || !result.filePaths?.length) return null;
  try {
    return await Promise.all(
      result.filePaths.map(async (filePath) => {
        const name = path.basename(filePath);
        const st = await fsp.stat(filePath);
        return { name, path: filePath, size: st.size };
      })
    );
  } catch (err) {
    console.error('Error processing selected files:', err);
    return null;
  }
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
    await validateConfig(config);
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
      return { success: true, message: 'PHASE process signaled to stop.' };
    } catch (error) {
      console.error('Failed to kill process group:', error);
      return { success: false, error: error.message };
    }
  }
  return { success: false, message: 'No active process to stop.' };
});

async function validateConfig(config) {
  const { files, phaseBinaryPath } = config;
  if (!phaseBinaryPath) throw new Error('PHASE binary path not specified');
  try { await fsp.access(phaseBinaryPath); } catch { throw new Error(`PHASE binary not found at: ${phaseBinaryPath}`); }
  if (!isExecutable(phaseBinaryPath)) throw new Error(`PHASE binary is not executable: ${phaseBinaryPath}`);
  if (!files || !files.length) throw new Error('No input files specified');
  for (const file of files) {
    const filePath = file.path || file.name;
    if (!filePath) throw new Error('Invalid file object - missing path');
    try { await fsp.access(filePath); } catch { throw new Error(`Input file not found: ${filePath}`); }
  }
}

async function executePhase(config) {
  const { files, phaseBinaryPath, parallel = 4, randomSeed, iterations = 100, burnin = 100, thinning = 1, outputPrefix = 'phase_output', advancedArgs = [], options = {} } = config;
  const parallelNum = parseInt(parallel) || 4;
  const actualParallel = parallel === 'auto' || parallelNum === 0 ? os.cpus().length : Math.min(parallelNum, os.cpus().length);
  const firstFilePath = files[0].path || files[0].name;
  const outputDir = path.join(path.dirname(firstFilePath), 'ez_phase_output');
  await fsp.mkdir(outputDir, { recursive: true });

  const scriptPath = path.join(outputDir, 'run_phase.sh');
  const scriptContent = generatePhaseScript({ files, phaseBinaryPath, outputDir, outputPrefix, iterations, burnin, thinning, advancedArgs, options, randomSeed, parallel: actualParallel });
  await fsp.writeFile(scriptPath, scriptContent, { mode: 0o755 });

  return new Promise((resolve, reject) => {
    currentPhaseProcess = spawn('bash', [scriptPath], { cwd: outputDir, stdio: ['ignore', 'pipe', 'pipe'], detached: true });

    let successCount = 0;
    const totalJobs = files.length * actualParallel;

    currentPhaseProcess.stdout.on('data', (buf) => {
      const chunk = buf.toString();
      if (chunk.includes('SUCCESS:')) {
        successCount++;
        const progress = Math.min(100, Math.round((successCount / totalJobs) * 100));
        mainWindow?.webContents?.send('phase-progress', { progress, processedFiles: successCount, totalFiles: totalJobs });
      }
      mainWindow?.webContents?.send('phase-output', chunk);
    });

    currentPhaseProcess.stderr.on('data', (buf) => mainWindow?.webContents?.send('phase-error', buf.toString()));

    currentPhaseProcess.on('close', (code) => {
      fsp.unlink(scriptPath).catch(() => { });
      currentPhaseProcess = null;
      if (code === 0) {
        resolve({ success: true, outputDirectory: outputDir, processedFiles: totalJobs });
      } else {
        reject(new Error(`Process exited with a non-zero code. Please check the log file in the output directory for details.`));
      }
    });

    currentPhaseProcess.on('error', (e) => {
      currentPhaseProcess = null;
      reject(e);
    });
  });
}

// RESTORED ORIGINAL, ELEGANT, AND DEPENDENCY-FREE SCRIPT LOGIC
function generatePhaseScript(cfg) {
  const { files, phaseBinaryPath, outputDir, outputPrefix, iterations, burnin, thinning, advancedArgs = [], options = {}, randomSeed, parallel = 4 } = cfg;
  const logFile = path.join(outputDir, 'phase_execution.log');
  const baseSeed = Number.isFinite(randomSeed) ? randomSeed : generateRandomSeed();

  let script = `#!/bin/bash
set -e
LOG_FILE="${logFile}"
: > "$LOG_FILE"
echo "=== EZ-PHASE Execution Log ===" >> "$LOG_FILE"
echo "Timestamp: $(date)" >> "$LOG_FILE"
echo "================================" >> "$LOG_FILE"

job_count=0
`;

  const allArgs = [...advancedArgs];
  if (options.verbose) allArgs.push('-v');
  if (options.saveAll) allArgs.push('-F');
  const optionsString = allArgs.join(' ');

  for (const file of files) {
    const filePath = file.path || file.name;
    const baseName = path.basename(filePath, '.inp');
    const seedsForFile = Array.from({ length: parallel }, (_, i) => baseSeed + i);

    for (const seed of seedsForFile) {
      const outputFilePath = path.join(outputDir, `${outputPrefix}_${baseName}_seed${seed}.out`);
      const command = `"${phaseBinaryPath}" -S${seed} ${optionsString} "${filePath}" "${outputFilePath}" ${iterations} ${thinning} ${burnin}`;

      script += `
(
  echo "Processing: ${baseName} with seed ${seed}"
  if ${command} >> "${logFile}" 2>&1; then
    echo "SUCCESS: ${baseName} with seed ${seed}"
  else
    echo "ERROR: ${baseName} with seed ${seed}. See log for details."
  fi
) &
job_count=$((job_count + 1))
if [ $((job_count % ${parallel})) -eq 0 ]; then
  wait
fi
`;
    }
  }

  script += `
wait
echo "All jobs completed."
`;
  return script;
}

// App version
ipcMain.handle('get-app-version', () => app.getVersion());

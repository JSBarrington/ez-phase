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
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  });

  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  if (process.env.NODE_ENV === 'development') mainWindow.webContents.openDevTools();

  // Sanity log that preload exists
  try {
    const p = path.join(__dirname, 'preload.js');
    console.log('Preload exists?', fs.existsSync(p), p);
  } catch {}
}

app.whenReady().then(() => {
  // macOS Dock icon
  if (process.platform === 'darwin') {
    const iconPath = path.join(__dirname, 'assets', 'icon.icns');
    try { app.dock.setIcon(iconPath); } catch {}
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Clean up any running processes
  if (currentPhaseProcess) {
    try {
      currentPhaseProcess.kill('SIGTERM');
    } catch (e) {
      console.log('Error killing process:', e.message);
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

// ---------- IPC: Pick individual .inp files ----------
ipcMain.handle('select-inp-files', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    title: 'Select PHASE input files',
    filters: [
      { name: 'PHASE Input Files', extensions: ['inp'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (result.canceled || !result.filePaths?.length) return null;

  try {
    const filesWithStats = await Promise.all(
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

    return filesWithStats;
  } catch (err) {
    console.error('Error processing selected files:', err);
    return null;
  }
});

// ---------- IPC: Pick PHASE binary ----------
ipcMain.handle('select-phase-binary', async () => {
  if (!mainWindow) return null;
  const filters = [];
  if (process.platform === 'win32') filters.push({ name: 'Executable', extensions: ['exe'] });
  filters.push({ name: 'All Files', extensions: ['*'] });

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Select PHASE binary executable',
    filters,
  });
  if (result.canceled || !result.filePaths?.length) return null;

  const selectedPath = result.filePaths[0];
  
  // Make executable if needed (Unix/Mac)
  if (!isExecutable(selectedPath) && process.platform !== 'win32') {
    try {
      await fsp.chmod(selectedPath, 0o755);
      console.log('Made PHASE binary executable');
    } catch (e) { 
      console.warn('Could not make file executable:', e.message); 
    }
  }
  
  console.log('Selected PHASE binary:', selectedPath);
  return selectedPath;
});

// ---------- IPC: Auto-detect PHASE binary ----------
ipcMain.handle('auto-detect-phase', async () => {
  const commonLocations = [
    '/usr/local/bin/phase',
    '/usr/local/bin/PHASE',
    '/usr/bin/phase',
    '/usr/bin/PHASE',
    path.join(process.env.HOME || '', 'Desktop', 'PHASE'),
    path.join(process.env.HOME || '', 'Desktop', 'phase'),
    path.join(process.env.HOME || '', 'Downloads', 'PHASE'),
    path.join(process.env.HOME || '', 'Downloads', 'phase'),
    // Windows common locations
    'C:\\Program Files\\PHASE\\PHASE.exe',
    'C:\\Program Files (x86)\\PHASE\\PHASE.exe',
    path.join(process.env.USERPROFILE || '', 'Desktop', 'PHASE.exe'),
    path.join(process.env.USERPROFILE || '', 'Downloads', 'PHASE.exe'),
  ];

  const foundLocations = [];
  
  for (const location of commonLocations) {
    try {
      await fsp.access(location, fs.constants.F_OK);
      if (isExecutable(location)) {
        foundLocations.push(location);
      }
    } catch {
      // Location doesn't exist, continue
    }
  }

  return foundLocations;
});

// ---------- Validation before run ----------
async function validateConfig(config) {
  const { files, phaseBinaryPath } = config;
  
  if (!phaseBinaryPath) throw new Error('PHASE binary path not specified');
  try { 
    await fsp.access(phaseBinaryPath); 
  } catch { 
    throw new Error(`PHASE binary not found at: ${phaseBinaryPath}`); 
  }
  if (!isExecutable(phaseBinaryPath)) {
    throw new Error(`PHASE binary is not executable: ${phaseBinaryPath}`);
  }

  if (!files || !files.length) throw new Error('No input files specified');
  
  for (const file of files) {
    const filePath = file.path || file.name;
    if (!filePath) throw new Error('Invalid file object - missing path');
    try { 
      await fsp.access(filePath); 
    } catch { 
      throw new Error(`Input file not found: ${filePath}`); 
    }
  }
}

// ---------- Build and run ----------
ipcMain.handle('run-phase', async (_evt, config) => {
  console.log('Starting PHASE with config:', config);
  try { 
    await validateConfig(config); 
    return await executePhase(config); 
  } catch (err) { 
    console.error('PHASE execution error:', err); 
    throw err; 
  }
});

// ---------- Stop PHASE process ----------
ipcMain.handle('stop-phase', async () => {
  if (currentPhaseProcess) {
    try {
      console.log('Attempting to stop PHASE process...');
      
      // Kill the process group (handles child processes too)
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', currentPhaseProcess.pid, '/f', '/t']);
      } else {
        process.kill(-currentPhaseProcess.pid, 'SIGTERM');
      }
      
      // Force kill after 3 seconds if still running
      setTimeout(() => {
        if (currentPhaseProcess && !currentPhaseProcess.killed) {
          console.log('Force killing PHASE process...');
          try {
            if (process.platform === 'win32') {
              spawn('taskkill', ['/pid', currentPhaseProcess.pid, '/f', '/t']);
            } else {
              process.kill(-currentPhaseProcess.pid, 'SIGKILL');
            }
          } catch (e) {
            console.log('Force kill error:', e.message);
          }
        }
      }, 3000);
      
      currentPhaseProcess = null;
      return { success: true, message: 'PHASE process stopped' };
    } catch (error) {
      console.error('Error stopping PHASE process:', error);
      currentPhaseProcess = null;
      return { success: false, error: error.message };
    }
  }
  return { success: false, message: 'No PHASE process running' };
});

async function executePhase(config) {
  const {
    files,
    phaseBinaryPath,
    parallel = 4,
    randomSeed,
    iterations = 100,
    burnin = 100,
    thinning = 1,
    outputPrefix = 'phase_output',
    advancedArgs = [],
    options = {},
  } = config;

  // Determine actual parallel count HERE - handle string/number conversion
  const parallelNum = parseInt(parallel) || 4;
  const actualParallel = parallel === 'auto' || parallelNum === 0 ? 
    Math.min(files.length, os.cpus().length) : 
    Math.min(parallelNum, 8);

  // Create output directory based on first file's location
  const firstFile = files[0];
  const firstFilePath = firstFile.path || firstFile.name;
  const outputDir = path.join(path.dirname(firstFilePath), 'ez_phase_output');
  
  try { 
    await fsp.mkdir(outputDir, { recursive: true }); 
  } catch (e) { 
    console.warn('Could not create output directory:', e.message); 
  }

  const scriptPath = path.join(outputDir, 'run_phase.sh');
  const scriptContent = generatePhaseScript({
    files, phaseBinaryPath, outputDir, outputPrefix,
    iterations, burnin, thinning, advancedArgs, options, randomSeed, 
    parallel: actualParallel,  // ← Pass the calculated value
  });

  console.log('Writing execution script to:', scriptPath);
  await fsp.writeFile(scriptPath, scriptContent, { mode: 0o755 });

  return new Promise((resolve, reject) => {
    console.log('Executing PHASE script…');
    currentPhaseProcess = spawn('bash', [scriptPath], { 
      cwd: path.dirname(firstFilePath), 
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true  // Create new process group for easier cleanup
    });

    let output = '';
    let errors = '';
    let processedFiles = 0;
    const totalFiles = files.length * actualParallel;

    currentPhaseProcess.stdout.on('data', (buf) => {
      const chunk = buf.toString();
      output += chunk;
      if (chunk.includes('Processing:')) {
        processedFiles++;
        const progress = Math.max(0, Math.min(100, Math.round((processedFiles / totalFiles) * 100)));
        mainWindow?.webContents?.send('phase-progress', { progress, processedFiles, totalFiles });
      }
      mainWindow?.webContents?.send('phase-output', chunk);
    });

    currentPhaseProcess.stderr.on('data', (buf) => {
      const chunk = buf.toString();
      errors += chunk;
      mainWindow?.webContents?.send('phase-error', chunk);
    });

    currentPhaseProcess.on('close', async (code) => {
      try { 
        await fsp.unlink(scriptPath); 
      } catch {}
      
      currentPhaseProcess = null; // Clear the reference
      
      if (code === 0) {
        resolve({ 
          success: true, 
          output, 
          errors, 
          outputDirectory: outputDir, 
          processedFiles: totalFiles
        });
      } else {
        reject({ 
          success: false, 
          output, 
          errors, 
          code, 
          message: `Process exited with code ${code}` 
        });
      }
    });

    currentPhaseProcess.on('error', (e) => {
      currentPhaseProcess = null; // Clear the reference
      reject({ 
        success: false, 
        message: e.message, 
        error: String(e) 
      });
    });
  });
}

function generatePhaseScript(cfg) {
  const { files, phaseBinaryPath, outputDir, outputPrefix, iterations, burnin, thinning, 
          advancedArgs = [], options = {}, randomSeed, parallel = 4 } = cfg;

  const logFile = path.join(outputDir, 'phase_execution.log');
  const base = Number.isFinite(randomSeed) ? randomSeed : generateRandomSeed();

  // Use the parallel value passed in (already calculated)
  const actualParallel = parallel;

  let script = `#!/bin/bash
set -euo pipefail

echo "=== EZ-PHASE Execution Log ==="
echo "Timestamp: $(date)"
echo "Output Directory: ${outputDir}"
echo "PHASE Binary: ${phaseBinaryPath}"
echo "Files to process: ${files.map(f => path.basename(f.path || f.name)).join(' ')}"
echo "Parallel processes: ${actualParallel}"
echo "================================"

LOG_FILE="${logFile}"
: > "$LOG_FILE"

# Verify PHASE binary
if [ ! -f "${phaseBinaryPath}" ]; then
  echo "ERROR: PHASE binary not found at: ${phaseBinaryPath}" | tee -a "$LOG_FILE"
  exit 1
fi
if [ ! -x "${phaseBinaryPath}" ]; then
  chmod +x "${phaseBinaryPath}" || true
fi

run_phase_file() {
  local inp_file="$1"
  local seed="$2"
  local base_name
  base_name="$(basename "$inp_file" .inp)"
  local out_file="${outputDir}/${outputPrefix}_\${base_name}_seed\${seed}.out"

  echo "Processing: $inp_file with seed $seed" | tee -a "$LOG_FILE"
  echo "Output: $out_file" | tee -a "$LOG_FILE"

  local cmd="${phaseBinaryPath}"
  cmd="$cmd ${advancedArgs.join(' ')}"
  cmd="$cmd -S\${seed}"
  cmd="$cmd \"$inp_file\" \"$out_file\" ${iterations} ${thinning} ${burnin}"
  ${options.verbose ? 'cmd="$cmd -v"' : ''}
  ${options.saveAll ? 'cmd="$cmd -F"' : ''}

  echo "Command: $cmd" | tee -a "$LOG_FILE"
  if eval "$cmd" >> "$LOG_FILE" 2>&1; then
    echo "SUCCESS: $base_name seed $seed" | tee -a "$LOG_FILE"
    return 0
  else
    echo "FAILED: $base_name seed $seed" | tee -a "$LOG_FILE"
    return 1
  fi
}

success_count=0
total_jobs=0
`;

  for (const file of files) {
    const filePath = file.path || file.name;
    const fileName = path.basename(filePath);
    const seedsForFile = Array.from({length: actualParallel}, (_, i) => 
      (Number.isFinite(randomSeed) ? randomSeed : base) + i
    );
    
    script += `
# ----- ${fileName} -----
if [ -f "${filePath}" ]; then
  echo "=== Processing ${fileName} with ${actualParallel} parallel jobs ===" | tee -a "$LOG_FILE"
  ${seedsForFile.map(seed => `
  total_jobs=$((total_jobs + 1))
  run_phase_file "${filePath}" "${seed}" &`).join('\n')}
  wait
  success_count=$((success_count + ${actualParallel}))
else
  echo "WARNING: File not found: ${filePath}" | tee -a "$LOG_FILE"
fi

`;
  }

  script += `
echo ""
echo "=== EXECUTION COMPLETE ===" | tee -a "$LOG_FILE"
echo "Total jobs: $total_jobs" | tee -a "$LOG_FILE"
echo "Successful: $success_count" | tee -a "$LOG_FILE"
echo "Failed: $((total_jobs - success_count))" | tee -a "$LOG_FILE"
echo "Output directory: ${outputDir}" | tee -a "$LOG_FILE"
echo "Log file: $LOG_FILE" | tee -a "$LOG_FILE"

[ "$success_count" -eq "$total_jobs" ]
`;

  return script;
}

// App version
ipcMain.handle('get-app-version', () => app.getVersion());
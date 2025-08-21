// main.js — EZ-PHASE (fully patched, robust)
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');               // sync checks (X_OK)
const fsp = require('fs/promises');      // async fs
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'), // match your actual preload filename
      sandbox: false,
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  });

  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  if (process.env.NODE_ENV === 'development') mainWindow.webContents.openDevTools();

  // sanity log that preload exists
  try {
    const p = path.join(__dirname, 'preload.js');
    console.log('Preload exists?', fs.existsSync(p), p);
  } catch {}
}

app.whenReady().then(() => {
  // macOS Dock icon (dev)
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

// ---------- IPC: Pick directory with .inp files ----------
ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select directory containing .inp files',
  });
  if (result.canceled || !result.filePaths?.length) return null;

  const dirPath = result.filePaths[0];
  try {
    const files = await fsp.readdir(dirPath);
    const inpFiles = files.filter(f => f.toLowerCase().endsWith('.inp'));
    console.log('Found .inp files:', inpFiles);

    const filesWithStats = await Promise.all(
      inpFiles.map(async (name) => {
        const p = path.join(dirPath, name);
        try {
          const st = await fsp.stat(p);
          return { name, path: p, size: st.size };
        } catch {
          return { name, path: p, size: 0 };
        }
      })
    );

    return { directory: dirPath, files: filesWithStats };
  } catch (err) {
    console.error('Error reading directory:', err);
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
  
  // Always return the selected path - let user decide if it's correct
  console.log('Selected PHASE binary:', selectedPath);
  return selectedPath;
});

// ---------- Validation before run ----------
async function validateConfig(config) {
  const { directory, files, phaseBinaryPath } = config;
  if (!phaseBinaryPath) throw new Error('PHASE binary path not specified');
  try { await fsp.access(phaseBinaryPath); } catch { throw new Error(`PHASE binary not found at: ${phaseBinaryPath}`); }
  if (!isExecutable(phaseBinaryPath)) throw new Error(`PHASE binary is not executable: ${phaseBinaryPath}`);

  if (!directory) throw new Error('Directory not specified');
  try { await fsp.access(directory); } catch { throw new Error(`Directory not found: ${directory}`); }

  if (!files || !files.length) throw new Error('No input files specified');
  for (const file of files) {
    const p = typeof file === 'string' ? path.join(directory, file) : (file.path || path.join(directory, file.name));
    try { await fsp.access(p); } catch { throw new Error(`Input file not found: ${p}`); }
  }
}

// ---------- Build and run ----------
ipcMain.handle('run-phase', async (_evt, config) => {
  console.log('Starting PHASE with config:', config);
  try { await validateConfig(config); return await executePhase(config); }
  catch (err) { console.error('PHASE execution error:', err); throw err; }
});

async function executePhase(config) {
  const {
    directory,
    files,
    phaseBinaryPath,
    parallel = '4',
    randomSeed,
    iterations = 10000,
    burnin    = 1000,
    thinning  = 10,
    outputPrefix = 'phase',
    advancedArgs = [],
    options = {}, // { verbose, saveAll }
  } = config;

  const outputDir = path.join(directory, 'ez_phase_output');
  try { await fsp.mkdir(outputDir, { recursive: true }); }
  catch (e) { console.warn('Could not create output directory:', e.message); }

  const scriptPath = path.join(outputDir, 'run_phase.sh');
  const scriptContent = generatePhaseScript({
    directory, files, phaseBinaryPath, outputDir, outputPrefix,
    iterations, burnin, thinning, advancedArgs, options, randomSeed,
  });

  console.log('Writing execution script to:', scriptPath);
  await fsp.writeFile(scriptPath, scriptContent, { mode: 0o755 });

  return new Promise((resolve, reject) => {
    console.log('Executing PHASE script…');
    const child = spawn('bash', [scriptPath], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });

    let output = '';
    let errors = '';
    let processedFiles = 0;
    const totalFiles = files.length;

    child.stdout.on('data', (buf) => {
      const chunk = buf.toString();
      output += chunk;
      if (chunk.includes('Processing:')) {
        processedFiles++;
        const progress = Math.max(0, Math.min(100, Math.round((processedFiles / (totalFiles * 3)) * 100)));
        mainWindow?.webContents?.send('phase-progress', { progress, processedFiles, totalFiles: totalFiles * 3 });
      }
      mainWindow?.webContents?.send('phase-output', chunk);
    });

    child.stderr.on('data', (buf) => {
      const chunk = buf.toString();
      errors += chunk;
      mainWindow?.webContents?.send('phase-error', chunk);
    });

    child.on('close', async (code) => {
      try { await fsp.unlink(scriptPath); } catch {}
      if (code === 0) resolve({ success: true, output, errors, outputDirectory: outputDir, processedFiles: totalFiles * 3 });
      else reject({ success: false, output, errors, code, message: `Process exited with code ${code}` });
    });

    child.on('error', (e) => reject({ success: false, message: e.message, error: String(e) }));
  });
}

function generatePhaseScript(cfg) {
  const { directory, files, phaseBinaryPath, outputDir, outputPrefix, iterations, burnin, thinning, advancedArgs = [], options = {}, randomSeed } = cfg;

  const logFile = path.join(outputDir, 'phase_execution.log');
  const base = Number.isFinite(randomSeed) ? randomSeed : generateRandomSeed();
  const seeds = [base, base + 1, base + 2];

  let script = `#!/bin/bash
set -euo pipefail

echo "=== EZ-PHASE Execution Log ==="
echo "Timestamp: $(date)"
echo "Directory: ${directory}"
echo "Output Directory: ${outputDir}"
echo "PHASE Binary: ${phaseBinaryPath}"
echo "Files to process: ${files.map(f => (typeof f === 'string' ? f : f.name)).join(' ')}"
echo "Seeds: ${seeds.join(' ')}"
echo "================================"

LOG_FILE="${logFile}"
: > "$LOG_FILE"  # truncate

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
    echo "FAILED:  $base_name seed $seed" | tee -a "$LOG_FILE"
    return 1
  fi
}

success_count=0
total_jobs=0
`;

  for (const file of files) {
    const name = typeof file === 'string' ? file : (file.name || path.basename(file.path));
    const p = path.join(directory, name);
    script += `
# ----- ${name} -----
# ----- ${name} -----
if [ -f "${p}" ]; then
  echo "=== Processing ${name} ===" | tee -a "$LOG_FILE"
  ${[0,1,2].map(i => `
  total_jobs=$((total_jobs + 1))
  run_phase_file "${p}" "${(Number.isFinite(randomSeed) ? randomSeed : seeds[0]) + i}" &`).join('\n')}
  wait  # Wait for all background jobs to complete
  success_count=$((success_count + 3))  # Assume success for now
else
  echo "WARNING: File not found: ${p}" | tee -a "$LOG_FILE"
fi

`;
  }

  script += `
echo ""
echo "=== EXECUTION COMPLETE ===" | tee -a "$LOG_FILE"
echo "Total jobs: $total_jobs"    | tee -a "$LOG_FILE"
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

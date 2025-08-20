const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises; // Use promises version
const fsSync = require('fs'); // Keep sync version for certain operations
const { spawn } = require('child_process');
const os = require('os');

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
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false // Don't show until ready
  });

  mainWindow.loadFile('index.html');
  
  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  
  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();
  
  // macOS specific behavior
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Utility functions
function isExecutable(filePath) {
  try {
    fsSync.accessSync(filePath, fsSync.constants.F_OK | fsSync.constants.X_OK);
    return true;
  } catch (error) {
    return false;
  }
}

function generateRandomSeed() {
  return Math.floor(Math.random() * 999999) + 1;
}

// IPC Handlers
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select directory containing .inp files'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const dirPath = result.filePaths[0];
    try {
      const files = await fs.readdir(dirPath); // Fixed: using fs.promises
      const inpFiles = files.filter(file => file.toLowerCase().endsWith('.inp'));
      
      console.log('Found .inp files:', inpFiles);
      
      // Get file sizes for display
      const filesWithStats = await Promise.all(
        inpFiles.map(async (file) => {
          const filePath = path.join(dirPath, file);
          try {
            const stats = await fs.stat(filePath); // Fixed: using fs.promises
            return {
              name: file,
              path: filePath,
              size: stats.size
            };
          } catch (error) {
            console.error(`Error getting stats for ${file}:`, error);
            return {
              name: file,
              path: filePath,
              size: 0
            };
          }
        })
      );
      
      return {
        directory: dirPath,
        files: filesWithStats
      };
    } catch (error) {
      console.error('Error reading directory:', error);
      return null;
    }
  }
  
  return null;
});

ipcMain.handle('select-phase-binary', async () => {
  const filters = [];
  
  // Platform-specific filters
  if (process.platform === 'win32') {
    filters.push({ name: 'Executable', extensions: ['exe'] });
  } else {
    filters.push({ name: 'Executable', extensions: ['*'] });
  }
  filters.push({ name: 'All Files', extensions: ['*'] });
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Select PHASE binary executable',
    filters: filters
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    
    // Check if file is executable
    if (!isExecutable(selectedPath)) {
      // Try to make it executable on Unix systems
      if (process.platform !== 'win32') {
        try {
          await fs.chmod(selectedPath, '755'); // Fixed: using fs.promises
          console.log('Made PHASE binary executable');
        } catch (error) {
          console.warn('Could not make file executable:', error.message);
        }
      }
    }
    
    return selectedPath;
  }
  
  return null;
});

ipcMain.handle('run-phase', async (event, config) => {
  console.log('Starting PHASE with config:', config);
  
  return new Promise(async (resolve, reject) => {
    try {
      await validateConfig(config);
      
      const results = await executePhase(config);
      resolve(results);
      
    } catch (error) {
      console.error('PHASE execution error:', error);
      reject(error);
    }
  });
});

async function validateConfig(config) {
  const { directory, files, phaseBinaryPath } = config;
  
  if (!phaseBinaryPath) {
    throw new Error('PHASE binary path not specified');
  }
  
  try {
    await fs.access(phaseBinaryPath); // Fixed: using fs.promises
  } catch (error) {
    throw new Error(`PHASE binary not found at: ${phaseBinaryPath}`);
  }
  
  if (!isExecutable(phaseBinaryPath)) {
    throw new Error(`PHASE binary is not executable: ${phaseBinaryPath}`);
  }
  
  if (!directory) {
    throw new Error('Directory not specified');
  }
  
  try {
    await fs.access(directory); // Fixed: using fs.promises
  } catch (error) {
    throw new Error(`Directory not found: ${directory}`);
  }
  
  if (!files || files.length === 0) {
    throw new Error('No input files specified');
  }
  
  // Validate input files exist
  for (const file of files) {
    const filePath = typeof file === 'string' ? path.join(directory, file) : file.path;
    try {
      await fs.access(filePath); // Fixed: using fs.promises
    } catch (error) {
      throw new Error(`Input file not found: ${filePath}`);
    }
  }
}

async function executePhase(config) {
  const {
    directory,
    files,
    phaseBinaryPath,
    parallel,
    randomSeed,
    iterations,
    burnin,
    thinning,
    outputPrefix,
    advancedArgs,
    options
  } = config;

  // Create output directory
  const outputDir = path.join(directory, 'ez_phase_output');
  try {
    await fs.mkdir(outputDir, { recursive: true }); // Fixed: using fs.promises
  } catch (error) {
    console.warn('Could not create output directory:', error.message);
  }
  
  // Generate execution script
  const scriptContent = generatePhaseScript(config, outputDir);
  const scriptPath = path.join(outputDir, 'run_phase.sh');
  
  console.log('Writing execution script to:', scriptPath);
  await fs.writeFile(scriptPath, scriptContent, { mode: '755' }); // Fixed: using fs.promises
  
  return new Promise((resolve, reject) => {
    console.log('Executing PHASE script...');
    
    const process = spawn('bash', [scriptPath], {
      cwd: directory,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errors = '';
    let processedFiles = 0;
    const totalFiles = files.length;

    process.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      console.log('STDOUT:', chunk);
      
      // Parse progress from output
      if (chunk.includes('Processing:')) {
        processedFiles++;
        const progress = Math.round((processedFiles / totalFiles) * 100);
        mainWindow.webContents.send('phase-progress', { progress, processedFiles, totalFiles });
      }
      
      mainWindow.webContents.send('phase-output', chunk);
    });

    process.stderr.on('data', (data) => {
      const chunk = data.toString();
      errors += chunk;
      console.log('STDERR:', chunk);
      mainWindow.webContents.send('phase-error', chunk);
    });

    process.on('close', async (code) => {
      console.log('Process finished with code:', code);
      
      // Cleanup temp script
      try {
        await fs.unlink(scriptPath); // Fixed: using fs.promises
      } catch (err) {
        console.log('Cleanup error:', err);
      }
      
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

    process.on('error', (error) => {
      console.error('Process error:', error);
      reject({
        success: false,
        message: error.message,
        error: error.toString()
      });
    });
  });
}

function generatePhaseScript(config, outputDir) {
  const {
    directory,
    files,
    phaseBinaryPath,
    parallel,
    randomSeed,
    iterations,
    burnin,
    thinning,
    outputPrefix,
    advancedArgs,
    options
  } = config;

  const logFile = path.join(outputDir, 'phase_execution.log');
  const seeds = [
    randomSeed || generateRandomSeed(),
    (randomSeed || generateRandomSeed()) + 1,
    (randomSeed || generateRandomSeed()) + 2
  ];

  let script = `#!/bin/bash
set -e

echo "=== EZ-PHASE Execution Log ==="
echo "Timestamp: $(date)"
echo "Directory: ${directory}"
echo "Output Directory: ${outputDir}"
echo "PHASE Binary: ${phaseBinaryPath}"
echo "Files to process: ${files.map(f => typeof f === 'string' ? f : f.name).join(' ')}"
echo "Seeds: ${seeds.join(' ')}"
echo "================================"

# Create detailed log
LOG_FILE="${logFile}"
echo "=== EZ-PHASE Run $(date) ===" > "$LOG_FILE"

# Verify PHASE binary
if [ ! -f "${phaseBinaryPath}" ]; then
    echo "ERROR: PHASE binary not found at: ${phaseBinaryPath}"
    exit 1
fi

if [ ! -x "${phaseBinaryPath}" ]; then
    echo "Making PHASE binary executable..."
    chmod +x "${phaseBinaryPath}"
fi

echo "PHASE binary verified: OK"

# Function to run PHASE on a single file
run_phase_file() {
    local inp_file="$1"
    local seed="$2"
    local base_name=$(basename "$inp_file" .inp)
    local out_file="${outputDir}/${outputPrefix}_\${base_name}_seed\${seed}.out"
    
    echo "Processing: $inp_file with seed $seed"
    echo "Output: $out_file"
    
    # Build PHASE command
    local cmd="${phaseBinaryPath}"
`;

  // Add basic parameters
  script += `
    # Add basic parameters
    cmd="$cmd -S$seed"
    cmd="$cmd -X${iterations || 100}"
    cmd="$cmd -B${burnin || 100}"
    cmd="$cmd -T${thinning || 1}"
`;

  // Add advanced parameters
  if (advancedArgs && advancedArgs.length > 0) {
    script += `
    # Add advanced parameters
    cmd="$cmd ${advancedArgs.join(' ')}"
`;
  }

  // Add output options
  if (options.verbose) script += `    cmd="$cmd -v"\n`;
  if (options.saveAll) script += `    cmd="$cmd -F"\n`;

  script += `
    # Add input and output files
    cmd="$cmd $inp_file $out_file"
    
    echo "Command: $cmd" | tee -a "$LOG_FILE"
    
    # Execute PHASE
    if eval "$cmd" >> "$LOG_FILE" 2>&1; then
        echo "SUCCESS: $base_name with seed $seed" | tee -a "$LOG_FILE"
        return 0
    else
        echo "FAILED: $base_name with seed $seed" | tee -a "$LOG_FILE"
        return 1
    fi
}

# Process files
success_count=0
total_jobs=0

`;

  // Add file processing loop
  files.forEach((file, fileIndex) => {
    const fileName = typeof file === 'string' ? file : file.name;
    const filePath = path.join(directory, fileName);
    
    script += `
# Process ${fileName}
if [ -f "${filePath}" ]; then
    echo "=== Processing ${fileName} ==="`;
    
    seeds.forEach(seed => {
      script += `
    total_jobs=$((total_jobs + 1))
    if run_phase_file "${filePath}" "${seed}"; then
        success_count=$((success_count + 1))
    fi`;
    });
    
    script += `
else
    echo "WARNING: File not found: ${filePath}"
fi
`;
  });

  script += `
echo ""
echo "=== EXECUTION COMPLETE ==="
echo "Total jobs: $total_jobs"
echo "Successful: $success_count"
echo "Failed: $((total_jobs - success_count))"
echo "Output directory: ${outputDir}"
echo "Log file: $LOG_FILE"

if [ $success_count -eq $total_jobs ]; then
    echo "All jobs completed successfully!"
    exit 0
else
    echo "Some jobs failed. Check the log file for details."
    exit 1
fi
`;

  return script;
}

// App version handler
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});
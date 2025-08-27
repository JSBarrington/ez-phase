// renderer.js — EZ-PHASE Enhanced version
document.addEventListener('DOMContentLoaded', () => {
  // -------------------------------
  // State
  // -------------------------------
  let phaseBinaryPath = '';
  let selectedInpFiles = []; // Array of file objects with status
  let isRunning = false;
  let currentProcess = null; // Store current PHASE process for stopping

  // -------------------------------
  // Elements
  // -------------------------------
  const btnChooseBin = document.getElementById('choosePhaseBin');
  const btnChooseInp = document.getElementById('filePickerDiv');
  const runBtn = document.getElementById('runBtn');
  const stopBtn = document.getElementById('stopBtn');

  const binPathInput = document.getElementById('phaseBinPath');
  const fileInput = document.getElementById('fileInput');
  const fileListEl = document.getElementById('fileList');
  const filesWrap = document.getElementById('selectedFiles');
  const previewEl = document.getElementById('commandPreview');

  // Progress elements
  const progressSection = document.getElementById('progressSection');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const outputSection = document.getElementById('outputSection');
  const outputContent = document.getElementById('outputContent');

  // File status enum
  const FileStatus = {
    PENDING: 'pending',
    PROCESSING: 'processing', 
    COMPLETED: 'completed',
    ERROR: 'error'
  };

  // Bridge sanity check
  console.log('electronAPI available:', !!window.electronAPI);
  if (!window.electronAPI) {
    console.warn('Electron bridge is not available. Some features may not work in browser mode.');
  }

  // -------------------------------
  // Advanced UI Management
  // -------------------------------
  function initAdvancedUI() {
    const model = document.getElementById('recombModel');
    const mr1 = document.getElementById('mr1Wrap');
    const mr2 = document.getElementById('mr2Wrap');
    const mr4 = document.getElementById('mr4Wrap');
    const mr2Count = document.getElementById('mr2Count');
    const a2 = document.getElementById('mr2_a2');
    const b2 = document.getElementById('mr2_b2');
    const dmodel = document.getElementById('dmodel');
    const deltaWrap = document.getElementById('deltaFileWrap');

    function refreshAdvancedUI() {
      const val = model?.value || 'MR0';
      
      if (mr1) mr1.style.display = (val === 'MR1') ? 'block' : 'none';
      if (mr2) mr2.style.display = (val === 'MR2') ? 'block' : 'none';
      if (mr4) mr4.style.display = (val === 'MR4') ? 'block' : 'none';
      
      if (mr2Count && a2 && b2) {
        const isTwo = mr2Count.value === '2';
        a2.style.display = isTwo ? 'inline-block' : 'none';
        b2.style.display = isTwo ? 'inline-block' : 'none';
      }
      
      if (deltaWrap && dmodel) {
        deltaWrap.style.display = (dmodel.value === 'file') ? 'block' : 'none';
      }
    }

    model?.addEventListener('change', refreshAdvancedUI);
    mr2Count?.addEventListener('change', refreshAdvancedUI);
    dmodel?.addEventListener('change', refreshAdvancedUI);
    refreshAdvancedUI();
  }

  // Build advanced PHASE arguments
  function buildAdvancedPhaseArgs() {
    const args = [];
    
    // Recombination model
    const model = document.getElementById('recombModel')?.value || 'MR0';
    if (model === 'MR0' || model === 'MR3') {
      args.push(`-${model}`);
    } else if (model === 'MR1') {
      args.push('-MR1', '1');
    } else if (model === 'MR2') {
      const n = document.getElementById('mr2Count')?.value || '1';
      const a1 = +document.getElementById('mr2_a1').value;
      const b1 = +document.getElementById('mr2_b1').value;
      if (!a1 || !b1) throw new Error('Please provide a1 and b1 for -MR2.');
      
      const intervals = [Math.min(a1, b1), Math.max(a1, b1)];
      if (n === '2') {
        const a2 = +document.getElementById('mr2_a2').value;
        const b2 = +document.getElementById('mr2_b2').value;
        if (!a2 || !b2) throw new Error('Please provide a2 and b2 for -MR2 with 2 hotspots.');
        intervals.push(Math.min(a2, b2), Math.max(a2, b2));
      }
      args.push('-MR2', n, ...intervals.map(String));
    } else if (model === 'MR4') {
      const R = document.getElementById('Rvalue')?.value?.trim();
      if (!R) throw new Error('Please provide a -R value for -MR4.');
      args.push('-MR4', '-R', R);
    }

    // Individuals cap
    const N = document.getElementById('Ncap')?.value?.trim();
    if (N) args.push('-N', N);

    // Mutation model
    const dmodel = document.getElementById('dmodel')?.value || '';
    if (dmodel === '1') {
      args.push('-d1');
    } else if (dmodel === 'file') {
      const dfile = document.getElementById('deltaFile')?.value?.trim();
      if (!dfile) throw new Error('Please choose a δ-file for -d<file>.');
      args.push(`-d${dfile}`);
    }

    // Call thresholds
    const p = document.getElementById('pthresh')?.value?.trim() || '0.9';
    const q = document.getElementById('qthresh')?.value?.trim() || '0.9';
    if (p && p !== '0.9') args.push(`-p${p}`);
    if (q && q !== '0.9') args.push(`-q${q}`);

    return args;
  }

  // -------------------------------
  // File Management
  // -------------------------------
  function createFileObject(file) {
    return {
      file: file,
      name: file.name || file.path || 'unknown.inp',
      size: file.size || 0,
      status: FileStatus.PENDING,
      path: file.path || file.name
    };
  }

  function removeFile(index) {
    const fileObj = selectedInpFiles[index];
    
    // Don't allow removal if file is being processed
    if (fileObj.status === FileStatus.PROCESSING) {
      return;
    }

    selectedInpFiles.splice(index, 1);
    updateFileDisplay();
    updateCommandPreview();
    updateRunButton();
  }

  function updateFileDisplay() {
    if (!fileListEl) return;
    
    if (filesWrap) {
      filesWrap.style.display = selectedInpFiles.length > 0 ? 'block' : 'none';
    }
    
    if (selectedInpFiles.length === 0) {
      fileListEl.innerHTML = '<div style="opacity:0.8;text-align:center;">No .inp files selected</div>';
      return;
    }
    
    const rows = selectedInpFiles.map((fileObj, index) => {
      const size = fileObj.size > 0 
        ? ` <span style="opacity:0.7">${(fileObj.size / 1024).toFixed(1)} KB</span>` 
        : '';
      
      const statusIcon = {
        [FileStatus.PENDING]: '📄',
        [FileStatus.PROCESSING]: '⚙️',
        [FileStatus.COMPLETED]: '✅',
        [FileStatus.ERROR]: '❌'
      }[fileObj.status];

      const canRemove = fileObj.status !== FileStatus.PROCESSING;
      const removeButton = canRemove 
        ? `<div class="file-remove" onclick="removeFile(${index})">×</div>`
        : `<div class="file-remove disabled">×</div>`;

      return `
        <div class="file-item">
          <span>${statusIcon} ${fileObj.name}</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${size}
            ${removeButton}
          </div>
        </div>`;
    });
    
    fileListEl.innerHTML = rows.join('');
  }

  // Make removeFile available globally for onclick handlers
  window.removeFile = removeFile;

  function updateCommandPreview() {
    if (!previewEl) return;
    
    if (!phaseBinaryPath) {
      previewEl.textContent = 'Select PHASE binary to see command preview...';
      return;
    }
    
    if (selectedInpFiles.length === 0) {
      previewEl.textContent = 'Select input files to see command preview...';
      return;
    }

    try {
      const iterations = document.getElementById('iterations')?.value || '100';
      const burnin = document.getElementById('burnin')?.value || '100';
      const thinning = document.getElementById('thinning')?.value || '1';
      const randomSeed = document.getElementById('randomSeed')?.value;
      const outputPrefix = document.getElementById('outputPrefix')?.value || 'phase_output';
      const parallel = document.getElementById('parallel')?.value || '4';
      
      const advancedArgs = buildAdvancedPhaseArgs();
      
      let command = `"${phaseBinaryPath}"`;
      
      // Add advanced arguments
      if (advancedArgs.length > 0) {
        command += ' ' + advancedArgs.join(' ');
      }
      
      // Add basic parameters
      if (randomSeed) command += ` -S${randomSeed}`;
      if (document.getElementById('verbose')?.checked) command += ' -v';
      if (document.getElementById('saveAll')?.checked) command += ' -F';
      
      // Sample command with first file
      const sampleFile = selectedInpFiles[0];
      command += ` "${sampleFile.name}" "${outputPrefix}.out" ${iterations} ${thinning} ${burnin}`;
      
      const parallelText = parallel === '0' ? 'Auto-detect' : parallel;
      if (selectedInpFiles.length > 1 && parallel !== '1') {
        previewEl.innerHTML = `<strong>Will execute ${selectedInpFiles.length} files with ${parallelText} parallel processes</strong>\n\nSample command:\n${command}`;
      } else {
        previewEl.innerHTML = `<strong>Will execute ${selectedInpFiles.length} file(s) sequentially</strong>\n\nSample command:\n${command}`;
      }
    } catch (error) {
      previewEl.innerHTML = `<strong style="color: #e74c3c;">Parameter Error:</strong>\n${error.message}`;
    }
  }

  function updateRunButton() {
    if (!runBtn) return;
    
    const hasFiles = selectedInpFiles.length > 0;
    const hasBinary = phaseBinaryPath !== '';
    const canRun = hasFiles && hasBinary && !isRunning;
    
    runBtn.disabled = !canRun;
    
    const buttonText = document.getElementById('runButtonText');
    if (buttonText) {
      if (isRunning) {
        buttonText.textContent = 'Running...';
      } else if (!hasBinary) {
        buttonText.textContent = 'Select PHASE Binary';
      } else if (!hasFiles) {
        buttonText.textContent = 'Select Files';
      } else {
        buttonText.textContent = 'Run PHASE';
      }
    }

    // Show/hide stop button
    if (stopBtn) {
      stopBtn.style.display = isRunning ? 'inline-block' : 'none';
    }
  }

  // -------------------------------
  // Progress Management
  // -------------------------------
  function showProgress() {
    if (progressSection) progressSection.style.display = 'block';
  }

  function hideProgress() {
    if (progressSection) progressSection.style.display = 'none';
    if (progressFill) progressFill.style.width = '0%';
  }

  function updateProgress(percent, text) {
    if (progressFill) progressFill.style.width = percent + '%';
    if (progressText) progressText.textContent = text;
  }

  function showOutput() {
    if (outputSection) outputSection.style.display = 'block';
  }

  function hideOutput() {
    if (outputSection) outputSection.style.display = 'none';
    if (outputContent) outputContent.innerHTML = '';
  }

  function appendOutput(text, isError = false) {
    if (!outputContent) return;
    const div = document.createElement('div');
    div.style.color = isError ? '#e74c3c' : '#ecf0f1';
    div.textContent = text;
    outputContent.appendChild(div);
    outputContent.scrollTop = outputContent.scrollHeight;
  }

  // -------------------------------
  // Event Handlers
  // -------------------------------
  
  // PHASE Binary Selection
  btnChooseBin?.addEventListener('click', async () => {
    try {
      if (!window.electronAPI?.selectPhaseBinary) {
        alert('Binary selection only works in the Electron app.');
        return;
      }
      
      const result = await window.electronAPI.selectPhaseBinary();
      if (result) {
        phaseBinaryPath = result;
        if (binPathInput) binPathInput.value = result;
        updateCommandPreview();
        updateRunButton();
      }
    } catch (error) {
      console.error('Error selecting PHASE binary:', error);
      alert('Failed to select PHASE binary.');
    }
  });

  // File Selection
  btnChooseInp?.addEventListener('click', async () => {
    try {
      if (window.electronAPI?.selectInpFiles) {
        // Use Electron file dialog
        const result = await window.electronAPI.selectInpFiles();
        if (result && result.length > 0) {
          // Convert to file objects and add to existing files
          const newFileObjects = result.map(fileInfo => ({
            file: { name: fileInfo.name, path: fileInfo.path },
            name: fileInfo.name,
            size: fileInfo.size,
            status: FileStatus.PENDING,
            path: fileInfo.path
          }));
          selectedInpFiles = [...selectedInpFiles, ...newFileObjects];
          
          updateFileDisplay();
          updateCommandPreview();
          updateRunButton();
        }
      } else {
        // Fall back to HTML file input for browser
        if (fileInput) {
          fileInput.click();
        } else {
          alert('File selection not available.');
        }
      }
    } catch (error) {
      console.error('Error selecting files:', error);
      alert('Failed to select files.');
    }
  });

  // Handle file input change (browser fallback)
  fileInput?.addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    const inpFiles = files.filter(file => file.name.toLowerCase().endsWith('.inp'));
    
    if (inpFiles.length === 0) {
      alert('Please select .inp files only.');
      return;
    }
    
    // Convert to file objects and add to existing files
    const newFileObjects = inpFiles.map(createFileObject);
    selectedInpFiles = [...selectedInpFiles, ...newFileObjects];
    
    updateFileDisplay();
    updateCommandPreview();
    updateRunButton();
    
    // Clear the input so the same files can be selected again if needed
    e.target.value = '';
  });

  // Stop PHASE execution
  window.stopPhase = async function() {
    if (currentProcess && window.electronAPI?.stopPhase) {
      try {
        appendOutput('🛑 Stopping PHASE execution...', true);
        
        const result = await window.electronAPI.stopPhase();
        
        if (result.success) {
          appendOutput('✅ PHASE execution stopped successfully', true);
        } else {
          appendOutput(`❌ Stop failed: ${result.message}`, true);
        }
        
        // Reset file statuses
        selectedInpFiles.forEach(fileObj => {
          if (fileObj.status === FileStatus.PROCESSING) {
            fileObj.status = FileStatus.PENDING;
          }
        });
        
        isRunning = false;
        currentProcess = null;
        updateRunButton();
        updateFileDisplay();
        hideProgress();
        
      } catch (error) {
        console.error('Error stopping PHASE:', error);
        appendOutput(`❌ Error stopping: ${error.message}`, true);
      }
    }
  };

  // Run PHASE
  runBtn?.addEventListener('click', async () => {
    if (isRunning) return;
    
    if (!phaseBinaryPath) {
      alert('Please select the PHASE binary executable first.');
      return;
    }
    
    if (selectedInpFiles.length === 0) {
      alert('Please select .inp files first.');
      return;
    }

    isRunning = true;
    updateRunButton();
    showProgress();
    showOutput();
    
    // Clear previous output
    if (outputContent) outputContent.innerHTML = '';

    try {
      const parallelValue = document.getElementById('parallel')?.value || '4';
      const actualParallelForConfig = parallelValue === '0' ? 'auto' : parseInt(parallelValue);

      const config = {
        files: selectedInpFiles.map(obj => obj.file),
        phaseBinaryPath: phaseBinaryPath,
        parallel: actualParallelForConfig,
        randomSeed: document.getElementById('randomSeed')?.value ? parseInt(document.getElementById('randomSeed').value) : undefined,
        iterations: document.getElementById('iterations')?.value || '100',
        burnin: document.getElementById('burnin')?.value || '100',
        thinning: document.getElementById('thinning')?.value || '1',
        outputPrefix: document.getElementById('outputPrefix')?.value || 'phase_output',
        advancedArgs: buildAdvancedPhaseArgs(),
        options: {
          verbose: document.getElementById('verbose')?.checked || false,
          saveAll: document.getElementById('saveAll')?.checked || false
        }
      };

      console.log('Running PHASE with config:', config);

      if (window.electronAPI?.runPhase) {
        // Set initial file statuses
        selectedInpFiles.forEach(fileObj => {
          fileObj.status = FileStatus.PROCESSING;
        });
        updateFileDisplay();

        // Set up real-time listeners
        const cleanupOutput = window.electronAPI.onPhaseOutput?.((data) => {
          appendOutput(data.trim());
        });

        const cleanupError = window.electronAPI.onPhaseError?.((data) => {
          appendOutput(data.trim(), true);
        });

        const cleanupProgress = window.electronAPI.onPhaseProgress?.((data) => {
          const { progress, processedFiles, totalFiles } = data;
          updateProgress(progress, `Processing file ${processedFiles} of ${totalFiles}...`);
        });

        updateProgress(10, 'Starting PHASE execution...');
        
        currentProcess = await window.electronAPI.runPhase(config);
        
        // Cleanup listeners
        if (cleanupOutput) cleanupOutput();
        if (cleanupError) cleanupError();
        if (cleanupProgress) cleanupProgress();
        
        // Mark all files as completed
        selectedInpFiles.forEach(fileObj => {
          fileObj.status = FileStatus.COMPLETED;
        });
        updateFileDisplay();
        
        updateProgress(100, 'Completed successfully!');
        
        setTimeout(() => {
          alert(`✅ EZ-PHASE analysis completed successfully!\n\n📊 Processed ${currentProcess.processedFiles} files\n📂 Output directory: ${currentProcess.outputDirectory}\n\nCheck the output directory for results and log files.`);
          hideProgress();
          isRunning = false;
          currentProcess = null;
          updateRunButton();
        }, 1000);
        
      } else {
        // Browser fallback - simulate progress
        appendOutput('Demo mode: Simulating PHASE execution...');
        
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.random() * 15;
          if (progress > 100) progress = 100;
          
          updateProgress(progress, `Demo: Processing files... ${Math.round(progress)}%`);
          appendOutput(`Demo progress: ${Math.round(progress)}%`);
          
          if (progress >= 100) {
            clearInterval(progressInterval);
            setTimeout(() => {
              alert(`🎯 Demo completed!\n\nIn the full Electron app, this would execute:\n\n${selectedInpFiles.length} files with the configured parameters.\n\nGenerated commands are shown in the preview section.`);
              hideProgress();
              isRunning = false;
              currentProcess = null;
              updateRunButton();
            }, 500);
          }
        }, 300);
      }
    } catch (error) {
      console.error('PHASE execution error:', error);
      appendOutput(`❌ Error: ${error.message}`, true);
      alert(`❌ Error:\n\n${error.message}\n\nPlease check your parameter settings.`);
      
      // Reset file statuses on error
      selectedInpFiles.forEach(fileObj => {
        if (fileObj.status === FileStatus.PROCESSING) {
          fileObj.status = FileStatus.ERROR;
        }
      });
      updateFileDisplay();
      
      hideProgress();
      isRunning = false;
      currentProcess = null;
      updateRunButton();
    }
  });

  // Reset Form
  window.resetForm = function() {
    document.getElementById('phaseForm')?.reset();
    selectedInpFiles = [];
    phaseBinaryPath = '';
    
    if (binPathInput) binPathInput.value = '';
    
    // Reset default values
    const iterations = document.getElementById('iterations');
    const burnin = document.getElementById('burnin');
    const thinning = document.getElementById('thinning');
    const outputPrefix = document.getElementById('outputPrefix');
    const verbose = document.getElementById('verbose');
    const parallel = document.getElementById('parallel');
    
    if (iterations) iterations.value = '100';
    if (burnin) burnin.value = '100';
    if (thinning) thinning.value = '1';
    if (outputPrefix) outputPrefix.value = 'phase_output';
    if (verbose) verbose.checked = true;
    if (parallel) parallel.value = '4';
    
    updateFileDisplay();
    updateCommandPreview();
    updateRunButton();
    hideProgress();
    hideOutput();
    
    // Stop any running process
    if (isRunning) {
      window.stopPhase();
    }
  };

  // Real-time command preview updates
  const formInputs = document.querySelectorAll('#phaseForm input, #phaseForm select');
  formInputs.forEach(input => {
    input.addEventListener('input', updateCommandPreview);
    input.addEventListener('change', updateCommandPreview);
  });

  // -------------------------------
  // Initialize
  // -------------------------------
  initAdvancedUI();
  updateFileDisplay();
  updateCommandPreview();
  updateRunButton();
  
  console.log('EZ-PHASE renderer initialized successfully');
});
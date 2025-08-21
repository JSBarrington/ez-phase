// renderer.js – EZ-PHASE (Clean version)
// Handles file selection, parameter collection, and PHASE execution

document.addEventListener('DOMContentLoaded', () => {
  // -------------------------------
  // State
  // -------------------------------
  let phaseBinaryPath = '';
  let selectedDirectory = '';
  let selectedInpFiles = [];
  let isRunning = false;

  // -------------------------------
  // Elements
  // -------------------------------
  const btnChooseBin = document.getElementById('choosePhaseBin');
  const btnChooseInp = document.getElementById('filePickerDiv');
  const runBtn = document.getElementById('runBtn');

  const binPathInput = document.getElementById('phaseBinPath');
  const inpDirInput = document.getElementById('inputDirPath');
  const fileListEl = document.getElementById('fileList');
  const filesWrap = document.getElementById('selectedFiles');
  const previewEl = document.getElementById('commandPreview');

  const binaryStatus = document.getElementById('binaryStatus');
  const binaryStatusText = document.getElementById('binaryStatusText');

  // Progress elements
  const progressSection = document.getElementById('progressSection');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const outputSection = document.getElementById('outputSection');
  const outputContent = document.getElementById('outputContent');

  // Bridge sanity check
  console.log('electronAPI available:', !!window.electronAPI);
  if (!window.electronAPI) {
    alert('Electron bridge is not available. Some features may not work in browser mode.');
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
  // UI Helper Functions
  // -------------------------------
  function updateFileDisplay() {
    if (!fileListEl) return;
    
    if (filesWrap) {
      filesWrap.style.display = selectedInpFiles.length > 0 ? 'block' : 'none';
    }
    
    if (selectedInpFiles.length === 0) {
      fileListEl.innerHTML = '<div style="opacity:0.8;text-align:center;">No .inp files found in selected directory</div>';
      return;
    }
    
    const rows = selectedInpFiles.map(file => {
      const name = typeof file === 'string' ? file.split(/[\\/]/).pop() : (file.name || file.path || 'input.inp');
      const size = (typeof file === 'object' && typeof file.size === 'number') 
        ? ` <span style="opacity:0.7">${(file.size / 1024).toFixed(1)} KB</span>` 
        : '';
      return `<div class="file-item"><span>📄 ${name}</span>${size}</div>`;
    });
    
    fileListEl.innerHTML = rows.join('');
  }

  function updateBinaryStatus(isValid = false) {
    if (!binaryStatus || !binaryStatusText) return;
    
    if (isValid) {
      binaryStatus.className = 'status-indicator status-success';
      binaryStatusText.textContent = 'Valid';
      binaryStatusText.className = 'binary-status valid';
    } else {
      binaryStatus.className = 'status-indicator status-ready';
      binaryStatusText.textContent = 'Not selected';
      binaryStatusText.className = 'binary-status';
    }
  }

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
      const sampleName = typeof sampleFile === 'string' 
        ? sampleFile.split(/[\\/]/).pop() 
        : (sampleFile.name || sampleFile.path || 'input.inp');
      
      command += ` "${sampleName}" "${outputPrefix}.out" ${iterations} ${thinning} ${burnin}`;
      
      if (selectedInpFiles.length > 1 && parallel !== '1') {
        previewEl.innerHTML = `<strong>Will execute ${selectedInpFiles.length} files with ${parallel} parallel processes</strong>\n\nSample command:\n${command}`;
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
        updateBinaryStatus(true);
        updateCommandPreview();
        updateRunButton();
      }
    } catch (error) {
      console.error('Error selecting PHASE binary:', error);
      alert('Failed to select PHASE binary.');
    }
  });

  // Directory Selection
  btnChooseInp?.addEventListener('click', async () => {
    try {
      if (!window.electronAPI?.selectDirectory) {
        alert('Directory selection only works in the Electron app.');
        return;
      }
      
      const result = await window.electronAPI.selectDirectory();
      if (!result) return;

      selectedDirectory = result.directory || '';
      selectedInpFiles = result.files || [];

      if (inpDirInput) inpDirInput.value = selectedDirectory;

      updateFileDisplay();
      updateCommandPreview();
      updateRunButton();
    } catch (error) {
      console.error('Error selecting directory:', error);
      alert('Failed to select input directory.');
    }
  });

  // Run PHASE
  runBtn?.addEventListener('click', async () => {
    if (isRunning) return;
    
    if (!phaseBinaryPath) {
      alert('Please select the PHASE binary executable first.');
      return;
    }
    
    if (selectedInpFiles.length === 0) {
      alert('Please select a directory containing .inp files first.');
      return;
    }

    isRunning = true;
    updateRunButton();
    showProgress();
    showOutput();
    
    // Clear previous output
    if (outputContent) outputContent.innerHTML = '';

    try {
      const config = {
        directory: selectedDirectory,
        files: selectedInpFiles,
        phaseBinaryPath: phaseBinaryPath,
        parallel: document.getElementById('parallel')?.value || '4',
        randomSeed: document.getElementById('randomSeed')?.value || undefined,
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
        
        const result = await window.electronAPI.runPhase(config);
        
        // Cleanup listeners
        if (cleanupOutput) cleanupOutput();
        if (cleanupError) cleanupError();
        if (cleanupProgress) cleanupProgress();
        
        updateProgress(100, 'Completed successfully!');
        
        setTimeout(() => {
          alert(`✅ EZ-PHASE analysis completed successfully!\n\n📊 Processed ${result.processedFiles} files\n📂 Output directory: ${result.outputDirectory}\n\nCheck the output directory for results and log files.`);
          hideProgress();
          isRunning = false;
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
              updateRunButton();
            }, 500);
          }
        }, 300);
      }
    } catch (error) {
      console.error('PHASE execution error:', error);
      appendOutput(`❌ Error: ${error.message}`, true);
      alert(`❌ Error:\n\n${error.message}\n\nPlease check your parameter settings.`);
      hideProgress();
      isRunning = false;
      updateRunButton();
    }
  });

  // Reset Form
  window.resetForm = function() {
    document.getElementById('phaseForm')?.reset();
    selectedInpFiles = [];
    selectedDirectory = '';
    phaseBinaryPath = '';
    
    if (binPathInput) binPathInput.value = '';
    if (inpDirInput) inpDirInput.value = '';
    
    // Reset default values
    const iterations = document.getElementById('iterations');
    const burnin = document.getElementById('burnin');
    const thinning = document.getElementById('thinning');
    const outputPrefix = document.getElementById('outputPrefix');
    const verbose = document.getElementById('verbose');
    
    if (iterations) iterations.value = '100';
    if (burnin) burnin.value = '100';
    if (thinning) thinning.value = '1';
    if (outputPrefix) outputPrefix.value = 'phase_output';
    if (verbose) verbose.checked = true;
    
    updateBinaryStatus(false);
    updateFileDisplay();
    updateCommandPreview();
    updateRunButton();
    hideProgress();
    hideOutput();
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
  updateBinaryStatus(false);
  updateFileDisplay();
  updateCommandPreview();
  updateRunButton();
  
  console.log('EZ-PHASE renderer initialized successfully');
});
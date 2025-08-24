import { showError, showSuccess } from './ui/toast.js';
import { checkPreconditionsForGeneration } from './utils/stateChecker.js';

// Helper function to update stage indicators
function updateStageIndicator(stageId, status) {
  const stageElement = document.getElementById(stageId);
  if (stageElement) {
    const statusElement = stageElement.querySelector('.generate-stage-status');
    const iconElement = stageElement.querySelector('.generate-stage-icon');
    
    if (statusElement) {
      statusElement.textContent = status;
      statusElement.className = 'generate-stage-status pending';
      
      if (status === 'In Progress') {
        statusElement.classList.add('in-progress');
        if (iconElement) iconElement.textContent = '⚡';
      } else if (status === 'Completed') {
        statusElement.classList.add('completed');
        if (iconElement) iconElement.textContent = '✅';
      } else if (status === 'Failed') {
        statusElement.classList.add('failed');
        if (iconElement) iconElement.textContent = '❌';
      } else if (status === 'Pending') {
        if (iconElement) iconElement.textContent = '📋'; // Planning icon
        // For building stage
        if (stageId === 'building-stage' && iconElement) {
          iconElement.textContent = '🛠️';
        }
      }
    }
    
    // Update active state
    if (status === 'In Progress') {
      stageElement.classList.add('active');
    } else {
      stageElement.classList.remove('active');
    }
  }
}

// Helper function to add output line with proper styling
function addOutputLine(container, data) {
  if (!container) return;
  
  const outputLine = document.createElement('div');
  outputLine.className = 'generate-output-line';
  
  // Determine line type based on content
  if (typeof data === 'string') {
    if (data.includes('Error:') || data.includes('ERROR') || data.includes('Failed')) {
      outputLine.classList.add('error');
    } else if (data.includes('Success') || data.includes('Completed') || data.includes('SUCCESS')) {
      outputLine.classList.add('success');
    } else if (data.includes('Warning') || data.includes('WARNING')) {
      outputLine.classList.add('warning');
    } else if (data.includes('[') && data.includes(']')) {
      // Stage messages like [Planning] or [Building]
      outputLine.classList.add('stage');
    } else {
      outputLine.classList.add('info');
    }
    
    outputLine.textContent = data;
  } else {
    outputLine.textContent = String(data);
    outputLine.classList.add('info');
  }
  
  container.appendChild(outputLine);
  container.scrollTop = container.scrollHeight;
}

export function initializeGenerateMonitor() {
  const planBtn = document.getElementById('plan-btn');
  const buildBtn = document.getElementById('build-btn');
  const planBuildBtn = document.getElementById('plan-build-btn');
  const generationOutput = document.getElementById('generation-output');
  const toggleSidePreviewBtn = document.getElementById('toggle-side-preview-btn');
  const stopBtn = document.getElementById('stop-generate-btn');
  const sidePreviewContainer = document.getElementById('side-preview');
  const sidePreviewFrame = document.getElementById('side-preview-frame');
  const clearOutputBtn = document.getElementById('clear-output-btn');

  // Clear output button
  if (clearOutputBtn && generationOutput) {
    clearOutputBtn.addEventListener('click', () => {
      generationOutput.innerHTML = '<div class="generate-output-placeholder"><p>Generation output will appear here...</p></div>';
    });
  }

  // Toggle side preview
  if (toggleSidePreviewBtn && sidePreviewContainer && sidePreviewFrame) {
    toggleSidePreviewBtn.addEventListener('click', async () => {
      const isHidden = sidePreviewContainer.classList.contains('hidden');
      if (isHidden) {
        sidePreviewContainer.classList.remove('hidden');
        toggleSidePreviewBtn.innerHTML = '👁️ Hide Preview';
        const { loadPreview } = await import('./live-preview.js');
        await loadPreview(sidePreviewFrame);
      } else {
        sidePreviewContainer.classList.add('hidden');
        toggleSidePreviewBtn.innerHTML = '👁️ Show Preview';
      }
    });

    window.api.onPreviewReload(async () => {
      if (!sidePreviewContainer.classList.contains('hidden')) {
        const { refreshPreview } = await import('./live-preview.js');
        refreshPreview(sidePreviewFrame);
      }
    });
  }

  async function listenStreams() {
    // Listen once per click; listeners add up otherwise
    window.api.onGenerationOutput((data) => {
      // Remove placeholder if it exists
      const placeholder = generationOutput.querySelector('.generate-output-placeholder');
      if (placeholder) {
        placeholder.remove();
      }
      
      addOutputLine(generationOutput, data);
      
      if (typeof data === 'string') {
        if (data.includes('[Planning] Completed')) {
          updateStageIndicator('planning-stage', 'Completed');
          updateStageIndicator('building-stage', 'In Progress');
        } else if (data.includes('[Building] Completed')) {
          updateStageIndicator('building-stage', 'Completed');
          showSuccess('Build completed');
          disableStop();
        }
      }
    });
    
    window.api.onGenerationError((error) => {
      // Remove placeholder if it exists
      const placeholder = generationOutput.querySelector('.generate-output-placeholder');
      if (placeholder) {
        placeholder.remove();
      }
      
      addOutputLine(generationOutput, `Error: ${error}`);
    });
    
    window.api.onGenerationOutput(async (data) => {
      if (typeof data === 'string' && data.includes('[Building] Completed')) {
        const { loadPreview, refreshPreview } = await import('./live-preview.js');
        // Reload center preview to update placeholder visibility
        await loadPreview();
        // Refresh center preview content
        refreshPreview();
        // Refresh side preview if visible
        if (sidePreviewFrame && !sidePreviewContainer.classList.contains('hidden')) {
          refreshPreview(sidePreviewFrame);
        }
      }
    });
  }

  function enableStop() { 
    if (stopBtn) {
      stopBtn.disabled = false;
      stopBtn.innerHTML = '🛑 Stop';
    }
  }
  
  function disableStop() { 
    if (stopBtn) {
      stopBtn.disabled = true;
      stopBtn.innerHTML = '🛑 Stop';
    }
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', async () => {
      try {
        const res = await window.api.stopGeneration();
        if (!res.success) showError(res.error || 'Unable to stop');
        disableStop();
      } catch (e) { 
        showError(e.message); 
      }
    });
  }

  async function checkPreconditionsAndProceed(generationFunction) {
    const preconditionsCheck = await checkPreconditionsForGeneration();
    if (!preconditionsCheck.valid) {
      showError(preconditionsCheck.message);
      return;
    }

    if (generationOutput) {
      generationOutput.innerHTML = '';
    }
    
    updateStageIndicator('planning-stage', 'In Progress');
    updateStageIndicator('building-stage', 'Pending');
    
    try {
      await listenStreams();
      const result = await generationFunction();
      if (!result.success) {
        showError(`Generation failed: ${result.error}`);
        updateStageIndicator('planning-stage', 'Failed');
        updateStageIndicator('building-stage', 'Failed');
      }
      enableStop();
    } catch (error) {
      console.error('Error during generation:', error);
      
      // Remove placeholder if it exists
      const placeholder = generationOutput.querySelector('.generate-output-placeholder');
      if (placeholder) {
        placeholder.remove();
      }
      
      addOutputLine(generationOutput, `Error: ${error.message}`);
      showError(`Error during generation: ${error.message}`);
      
      updateStageIndicator('planning-stage', 'Failed');
      updateStageIndicator('building-stage', 'Failed');
      disableStop();
    }
  }

  if (planBuildBtn) {
    planBuildBtn.addEventListener('click', async () => {
      await checkPreconditionsAndProceed(() => window.api.startGeneration());
    });
  }

  if (planBtn) {
    planBtn.addEventListener('click', async () => {
      // For plan, we still need basic structure but not necessarily rules
      const workspacePath = await window.api.getWorkspacePath();
      if (!workspacePath) {
        showError('Please select a workspace first.');
        return;
      }
      
      const pagesResult = await window.api.listPages();
      if (!pagesResult.success || pagesResult.pages.length === 0) {
        showError('Please create at least one page first.');
        return;
      }
      
      // We'll rely on the backend to check for the development plan file existence
      // and report an error if it's missing.

      if (generationOutput) {
        generationOutput.innerHTML = '';
      }
      
      updateStageIndicator('planning-stage', 'In Progress');
      updateStageIndicator('building-stage', 'Pending');
      
      try {
        await listenStreams();
        const res = await window.api.planGeneration();
        if (!res.success) {
          showError(`Planning failed: ${res.error}`);
          updateStageIndicator('planning-stage', 'Failed');
        } else {
          enableStop();
        }
      } catch (e) {
        showError(`Planning error: ${e.message}`);
        updateStageIndicator('planning-stage', 'Failed');
      }
    });
  }

  if (buildBtn) {
    buildBtn.addEventListener('click', async () => {
      // Check for development plan file
      const workspacePath = await window.api.getWorkspacePath();
      if (!workspacePath) {
        showError('Please select a workspace first.');
        return;
      }
      
      // We'll rely on the backend to check for the development plan file existence
      // and report an error if it's missing.

      if (generationOutput) {
        generationOutput.innerHTML = '';
      }
      
      updateStageIndicator('planning-stage', 'Completed'); // Assume planning was done
      updateStageIndicator('building-stage', 'In Progress');
      
      try {
        await listenStreams();
        const res = await window.api.buildGeneration();
        if (!res.success) {
          showError(`Build failed: ${res.error}`);
          updateStageIndicator('building-stage', 'Failed');
        } else {
          enableStop();
        }
      } catch (e) {
        showError(`Build error: ${e.message}`);
        updateStageIndicator('building-stage', 'Failed');
      }
    });
  }
}

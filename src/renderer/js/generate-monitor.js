/*
 * Generate Monitor Module
 * Handles the generation process and progress monitoring
 */

// Helper function to update stage indicators
function updateStageIndicator(stageId, status) {
  const stageElement = document.getElementById(stageId);
  if (stageElement) {
    const statusElement = stageElement.querySelector('.stage-status');
    if (statusElement) {
      statusElement.textContent = status;
      
      // Update status class for styling
      statusElement.className = 'stage-status';
      if (status === 'In Progress') statusElement.classList.add('in-progress');
      if (status === 'Completed') statusElement.classList.add('completed');
      if (status === 'Failed') statusElement.classList.add('failed');
    }
  }
}

export function initializeGenerateMonitor() {
  // Generate & Monitor Page Elements
  const startGenerateBtn = document.getElementById('start-generate-btn');
  const generationOutput = document.getElementById('generation-output');
  const continueToPreviewBtn = document.getElementById('continue-to-preview-btn');
  
  // Set up navigation for "Continue" button
  if (continueToPreviewBtn) {
    continueToPreviewBtn.addEventListener('click', () => {
      // Import the navigation function dynamically to avoid circular dependencies
      import('./main.js').then(module => {
        module.navigateToPage('live-preview-page');
      });
    });
  }
  
  if (startGenerateBtn) {
    startGenerateBtn.addEventListener('click', async () => {
      if (generationOutput) generationOutput.innerHTML = ''; // Clear previous output
      
      // Update stage indicators
      updateStageIndicator('planning-stage', 'In Progress');
      updateStageIndicator('building-stage', 'Pending');
      
      try {
        // Listen for generation output
        window.api.onGenerationOutput((data) => {
          if (generationOutput) {
            const outputLine = document.createElement('div');
            outputLine.textContent = data;
            generationOutput.appendChild(outputLine);
            generationOutput.scrollTop = generationOutput.scrollHeight; // Auto-scroll
          }
          
          // Simple parsing to update stage indicators
          // In a full implementation, this would be more robust
          if (data.includes('[Planning] Completed')) {
            updateStageIndicator('planning-stage', 'Completed');
            updateStageIndicator('building-stage', 'In Progress');
          } else if (data.includes('[Building] Completed')) {
            updateStageIndicator('building-stage', 'Completed');
            if (continueToPreviewBtn) {
              continueToPreviewBtn.disabled = false;
            }
          }
        });
        
        // Listen for generation errors
        window.api.onGenerationError((error) => {
          if (generationOutput) {
            const errorLine = document.createElement('div');
            errorLine.textContent = `Error: ${error}`;
            errorLine.style.color = 'red';
            generationOutput.appendChild(errorLine);
            generationOutput.scrollTop = generationOutput.scrollHeight; // Auto-scroll
          }
        });
        
        // Start the generation process
        const result = await window.api.startGeneration();
        if (!result.success) {
          alert(`Generation failed: ${result.error}`);
        }
      } catch (error) {
        console.error('Error during generation:', error);
        if (generationOutput) {
          const errorLine = document.createElement('div');
          errorLine.textContent = `Error: ${error.message}`;
          errorLine.style.color = 'red';
          generationOutput.appendChild(errorLine);
        }
      }
    });
  }
}
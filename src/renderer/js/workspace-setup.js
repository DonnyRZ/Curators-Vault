/*
 * Workspace Setup Module
 * Handles workspace selection, creation, and precondition checks
 */

let selectWorkspaceBtn, createWorkspaceBtn, workspaceInfo, workspacePath, continueToPagesBtn;

// Helper function to handle workspace selection
async function handleWorkspaceSelected(path) {
  if (workspacePath) workspacePath.textContent = path;
  if (workspaceInfo) workspaceInfo.classList.remove('hidden');
  
  // Perform precondition checks
  try {
    const checks = await window.api.checkPreconditions(path);
    
    // Update UI with check results
    const geminiCheck = document.getElementById('gemini-check')?.querySelector('.status');
    const yoloCheck = document.getElementById('yolo-check')?.querySelector('.status');
    const permissionsCheck = document.getElementById('permissions-check')?.querySelector('.status');
    
    if (geminiCheck) {
      geminiCheck.textContent = checks.geminiInstalled ? 'Installed' : 'Missing';
      geminiCheck.className = checks.geminiInstalled ? 'status success' : 'status error';
    }
    
    if (yoloCheck) {
      yoloCheck.textContent = checks.yoloSupported ? 'Supported' : 'Not Supported';
      yoloCheck.className = checks.yoloSupported ? 'status success' : 'status error';
    }
    
    if (permissionsCheck) {
      permissionsCheck.textContent = checks.writePermissions ? 'Granted' : 'Denied';
      permissionsCheck.className = checks.writePermissions ? 'status success' : 'status error';
    }
    
    // Enable continue button only if all checks pass
    const allChecksPassed = checks.geminiInstalled && checks.yoloSupported && checks.writePermissions;
    if (continueToPagesBtn) continueToPagesBtn.disabled = !allChecksPassed;
    
    // If all checks pass, initialize the workspace on the server
    if (allChecksPassed) {
      try {
        const initResult = await window.api.createWorkspace(path);
        if (!initResult.success) {
          console.error('Error initializing workspace:', initResult.error);
          alert(`Error initializing workspace: ${initResult.error}`);
          if (continueToPagesBtn) continueToPagesBtn.disabled = true;
        }
      } catch (initError) {
        console.error('Error initializing workspace:', initError);
        alert(`Error initializing workspace: ${initError.message}`);
        if (continueToPagesBtn) continueToPagesBtn.disabled = true;
      }
    }
    
  } catch (error) {
    console.error('Error checking preconditions:', error);
    alert(`Error checking preconditions: ${error.message}`);
  }
}

export function initializeWorkspaceSetup() {
  // Workspace Setup Page Elements
  selectWorkspaceBtn = document.getElementById('select-workspace-btn');
  createWorkspaceBtn = document.getElementById('create-workspace-btn');
  workspaceInfo = document.getElementById('workspace-info');
  workspacePath = document.getElementById('workspace-path');
  continueToPagesBtn = document.getElementById('continue-to-pages-btn');
  
  // Set up window controls
  const minimizeBtn = document.getElementById('minimize-btn');
  const maximizeBtn = document.getElementById('maximize-btn');
  const closeBtn = document.getElementById('close-btn');
  
  if (minimizeBtn) minimizeBtn.addEventListener('click', () => window.api.minimizeWindow());
  if (maximizeBtn) maximizeBtn.addEventListener('click', () => window.api.maximizeWindow());
  if (closeBtn) closeBtn.addEventListener('click', () => window.api.closeWindow());
  
  // Set up navigation for "Continue" button
  if (continueToPagesBtn) {
    continueToPagesBtn.addEventListener('click', () => {
      // Import the navigation function dynamically to avoid circular dependencies
      import('./main.js').then(module => {
        module.navigateToPage('pages-manager-page');
      });
    });
  }
  
  // Workspace Setup Page Logic
  if (selectWorkspaceBtn) {
    selectWorkspaceBtn.addEventListener('click', async () => {
      try {
        const path = await window.api.selectWorkspace();
        if (path) {
          await handleWorkspaceSelected(path);
        }
      } catch (error) {
        console.error('Error selecting workspace:', error);
        alert(`Error selecting workspace: ${error.message}`);
      }
    });
  }
  
  if (createWorkspaceBtn) {
    createWorkspaceBtn.addEventListener('click', async () => {
      // In a full implementation, this would open a dialog to choose a path
      // For now, we'll just simulate with a placeholder
      const path = '/path/to/new/workspace'; // This should be dynamically chosen
      try {
        const result = await window.api.createWorkspace(path);
        if (result.success) {
          await handleWorkspaceSelected(path);
        } else {
          alert(`Error creating workspace: ${result.error}`);
        }
      } catch (error) {
        console.error('Error creating workspace:', error);
        alert(`Error creating workspace: ${error.message}`);
      }
    });
  }
}
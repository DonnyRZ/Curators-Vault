/*
 * Workspace Setup Module
 * Handles workspace selection, creation, and precondition checks
 */

import { showError, showSuccess } from './ui/toast.js';
import { navigateToRoute } from './router.js'; // Navigate to workspace route

let selectWorkspaceBtn, workspaceInfo, workspacePath;

// Helper function to update precondition status
function updatePreconditionStatus(elementId, status, message) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const statusIcon = element.querySelector('.precondition-status-icon');
  const statusText = element.querySelector('span:last-child');
  
  if (statusIcon && statusText) {
    if (status === 'checking') {
      statusIcon.textContent = '⏳';
      statusIcon.className = 'precondition-status-icon precondition-status-checking';
      statusText.textContent = message || 'Checking...';
    } else if (status === 'success') {
      statusIcon.textContent = '✓';
      statusIcon.className = 'precondition-status-icon precondition-status-success';
      statusText.textContent = message || 'Success';
    } else if (status === 'error') {
      statusIcon.textContent = '✗';
      statusIcon.className = 'precondition-status-icon precondition-status-error';
      statusText.textContent = message || 'Failed';
    }
  }
}

// Helper function to handle workspace selection
async function handleWorkspaceSelected(path) {
  if (workspacePath) workspacePath.textContent = path;
  if (workspaceInfo) workspaceInfo.classList.remove('hidden');
  
  // Reset precondition statuses to checking
  updatePreconditionStatus('qwen-check', 'checking'); // Keeping the ID for backward compatibility
  updatePreconditionStatus('yolo-check', 'checking'); // Keeping the ID for backward compatibility
  updatePreconditionStatus('permissions-check', 'checking');
  
  // Perform precondition checks
  try {
    const checks = await window.api.checkPreconditions(path);
    
    // Update UI with check results
    updatePreconditionStatus('qwen-check', 
      checks.qwenInstalled ? 'success' : 'error',
      checks.qwenInstalled ? 'Installed' : 'Missing'
    );
    
    updatePreconditionStatus('yolo-check',
      checks.yoloMode ? 'success' : 'error',
      checks.yoloMode ? 'Supported' : 'Not Supported'
    );
    
    updatePreconditionStatus('permissions-check',
      checks.writePermissions ? 'success' : 'error',
      checks.writePermissions ? 'Granted' : 'Denied'
    );
    
    // If checks pass, initialize the workspace on the server
    const allChecksPassed = checks.qwenInstalled && checks.yoloMode && checks.writePermissions;
    if (allChecksPassed) {
      try {
        const initResult = await window.api.createWorkspace(path);
        if (!initResult.success) {
          console.error('Error initializing workspace:', initResult.error);
          showError(`Error initializing workspace: ${initResult.error}`);
        } else {
          showSuccess('Workspace initialized successfully!');
          // Enter workspace
          setTimeout(() => { navigateToRoute('workspace'); }, 800);
        }
      } catch (initError) {
        console.error('Error initializing workspace:', initError);
        showError(`Error initializing workspace: ${initError.message}`);
      }
    } else {
      // If checks fail, show an error but don't navigate
      showError('Workspace selected, but some preconditions are not met. Please check the status above.');
    }
    
  } catch (error) {
    console.error('Error checking preconditions:', error);
    showError(`Error checking preconditions: ${error.message}`);
    
    // Update statuses to error if the check failed
    updatePreconditionStatus('qwen-check', 'error', 'Check failed');
    updatePreconditionStatus('yolo-check', 'error', 'Check failed');
    updatePreconditionStatus('permissions-check', 'error', 'Check failed');
  }
}

export function initializeWorkspaceSetup() {
  // Workspace Setup Page Elements
  selectWorkspaceBtn = document.getElementById('select-workspace-btn');
  workspaceInfo = document.getElementById('workspace-info');
  workspacePath = document.getElementById('workspace-path');
  
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
        showError(`Error selecting workspace: ${error.message}`);
      }
    });
  }
  
  // Note: The workspace-action-card is the same element as selectWorkspaceBtn (they share the same ID),
  // so we don't need to attach another event listener to avoid duplicate dialogs
}

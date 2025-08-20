// Simple stepper component reflecting current route and completion status

import { checkProjectStructure, checkProjectRules } from '../utils/stateChecker.js';

const steps = [
  { key: 'workspace', label: 'Workspace' },
  { key: 'pages', label: 'Pages' },
  { key: 'features', label: 'Features' },
  { key: 'rules', label: 'Rules' },
  { key: 'generate', label: 'Generate' },
  { key: 'preview', label: 'Preview' },
];

let navigateToPageFn; // Store the navigateToPage function

async function updateStepCompletionStatus() {
  const container = document.getElementById('stepper');
  if (!container) return;

  const workspacePath = await window.api.getWorkspacePath();
  const items = container.querySelectorAll('.stepper-item');
  
  // Reset completion status
  items.forEach(btn => btn.classList.remove('completed'));

  if (!workspacePath) return; // No workspace, nothing to complete

  // Mark Workspace as completed
  const workspaceStepIndex = steps.findIndex(s => s.key === 'workspace');
  if (workspaceStepIndex !== -1) {
    items[workspaceStepIndex].classList.add('completed');
  }

  // Check Pages
  try {
    const pagesResult = await window.api.listPages();
    if (pagesResult.success && pagesResult.pages.length > 0) {
      const pagesStepIndex = steps.findIndex(s => s.key === 'pages');
      if (pagesStepIndex !== -1) {
        items[pagesStepIndex].classList.add('completed');
      }
    }
  } catch (e) {
    // Ignore errors for stepper update
  }

  // Check Features
  try {
    const structureCheck = await checkProjectStructure();
    if (structureCheck.valid) {
      const featuresStepIndex = steps.findIndex(s => s.key === 'features');
      if (featuresStepIndex !== -1) {
        items[featuresStepIndex].classList.add('completed');
      }
    }
  } catch (e) {
    // Ignore errors for stepper update
  }

  // Check Rules
  try {
    const rulesCheck = await checkProjectRules();
    if (rulesCheck.valid) {
      const rulesStepIndex = steps.findIndex(s => s.key === 'rules');
      if (rulesStepIndex !== -1) {
        items[rulesStepIndex].classList.add('completed');
      }
    }
  } catch (e) {
    // Ignore errors for stepper update
  }

  // For Generate and Preview, we'll mark them as completed if the previous steps are done
  // This is a simplification. A more robust check would involve verifying the output files.
  const rulesStepIndex = steps.findIndex(s => s.key === 'rules');
  if (rulesStepIndex !== -1 && items[rulesStepIndex].classList.contains('completed')) {
    const generateStepIndex = steps.findIndex(s => s.key === 'generate');
    const previewStepIndex = steps.findIndex(s => s.key === 'preview');
    if (generateStepIndex !== -1) items[generateStepIndex].classList.add('completed');
    if (previewStepIndex !== -1) items[previewStepIndex].classList.add('completed');
  }
}

export function initStepper(navigateToPage) {
  const container = document.getElementById('stepper');
  if (!container) return;
  
  navigateToPageFn = navigateToPage; // Store the function
  
  container.innerHTML = '';
  steps.forEach((s, idx) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'stepper-item';
    el.dataset.route = s.key;
    el.textContent = `${idx + 1}. ${s.label}`;
    el.addEventListener('click', async () => {
      // Use the stored navigateToPage function which includes guards
      if (navigateToPageFn) {
        const pageId = `${s.key}-page`; // Derive page ID from route key
        // Special case for dashboard
        if (s.key === 'dashboard') {
            await navigateToPageFn('dashboard-page');
        } else {
            await navigateToPageFn(pageId);
        }
      }
    });
    container.appendChild(el);
  });

  const apply = async () => {
    const route = (window.location.hash || '#/dashboard').replace(/^#\//, '');
    const currentIndex = steps.findIndex(s => s.key === route);
    const items = container.querySelectorAll('.stepper-item');
    items.forEach((btn, i) => {
      btn.classList.toggle('active', i === currentIndex);
      // Completion status is handled by updateStepCompletionStatus
    });
    
    // Update completion status whenever the route changes
    await updateStepCompletionStatus();
  };
  
  window.addEventListener('hashchange', apply);
  // Initial application and status update
  apply();
}


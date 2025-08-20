/*
 * Project Rules Module
 * Handles project rules definition and management
 */

import { showError, showSuccess } from './ui/toast.js';
import { navigateToPage } from './router.js'; // Import navigateToPage for automatic navigation

// Helper function to update the rules preview
function updateRulesPreview() {
  const appType = document.getElementById('app-type')?.value || 'SPA';
  const language = document.getElementById('language')?.value || 'javascript-vanilla';
  const html = document.getElementById('html-support')?.checked || false;
  const css = document.getElementById('css-support')?.checked || false;
  const constraints = document.getElementById('constraints')?.value || '';
  
  const rulesData = {
    appType,
    language,
    typescript: language === 'typescript',
    html,
    css,
    constraints: constraints.split('\n').filter(c => c.trim() !== '')
  };
  
  const previewContent = document.querySelector('.rules-preview-content');
  if (previewContent) {
    previewContent.textContent = JSON.stringify(rulesData, null, 2);
  }
}

// Helper function to load existing rules
async function loadExistingRules() {
  try {
    const result = await window.api.loadRules();
    if (result.success && result.rules) {
      const rules = result.rules;
      
      if (document.getElementById('app-type')) {
        document.getElementById('app-type').value = rules.appType || 'SPA';
      }
      if (document.getElementById('language')) {
        document.getElementById('language').value = rules.language || 'javascript-vanilla';
      }
      if (document.getElementById('html-support')) {
        document.getElementById('html-support').checked = rules.html !== false; // default to true
      }
      if (document.getElementById('css-support')) {
        document.getElementById('css-support').checked = rules.css !== false; // default to true
      }
      if (document.getElementById('constraints') && rules.constraints) {
        document.getElementById('constraints').value = Array.isArray(rules.constraints) 
          ? rules.constraints.join('\n') 
          : rules.constraints;
      }
      
      // Update preview
      updateRulesPreview();
    }
  } catch (error) {
    console.error('Error loading existing rules:', error);
  }
}

export function initializeProjectRules() {
  // Project Rules Page Elements
  const saveRulesBtn = document.getElementById('save-rules-btn');
  const useDefaultRulesBtn = document.getElementById('use-default-rules-btn');
  
  // Load existing rules when the page initializes
  loadExistingRules();
  
  // Add event listeners to form elements to update preview
  const formElements = [
    'app-type',
    'language',
    'html-support',
    'css-support',
    'constraints'
  ];
  
  formElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', updateRulesPreview);
      element.addEventListener('change', updateRulesPreview);
    }
  });
  
  // Project Rules Page Logic
  if (saveRulesBtn) {
    saveRulesBtn.addEventListener('click', async () => {
      // Gather form data
      const rulesData = {
        appType: document.getElementById('app-type')?.value || 'SPA',
        language: document.getElementById('language')?.value || 'javascript-vanilla',
        typescript: document.getElementById('language')?.value === 'typescript',
        html: document.getElementById('html-support')?.checked || false,
        css: document.getElementById('css-support')?.checked || false,
        constraints: document.getElementById('constraints')?.value.split('\n').filter(c => c.trim() !== '') || []
      };
      
      try {
        const result = await window.api.saveRules(rulesData);
        if (result.success) {
          showSuccess('Rules saved successfully');
          // Automatically navigate to the next step (Generate) after a short delay
          setTimeout(() => {
            navigateToPage('generate-monitor-page');
          }, 1500);
        } else {
          showError(`Error saving rules: ${result.error}`);
        }
      } catch (error) {
        console.error('Error saving rules:', error);
        showError(`Error saving rules: ${error.message}`);
      }
    });
  }
  
  if (useDefaultRulesBtn) {
    useDefaultRulesBtn.addEventListener('click', () => {
      // Reset form to default values
      if (document.getElementById('app-type')) {
        document.getElementById('app-type').value = 'SPA';
      }
      if (document.getElementById('language')) {
        document.getElementById('language').value = 'javascript-vanilla';
      }
      if (document.getElementById('html-support')) {
        document.getElementById('html-support').checked = true;
      }
      if (document.getElementById('css-support')) {
        document.getElementById('css-support').checked = true;
      }
      if (document.getElementById('constraints')) {
        document.getElementById('constraints').value = 
          'single index.html at root\nmultiple JS/CSS files allowed\nno frameworks by default';
      }
      
      // Update preview
      updateRulesPreview();
      
      showSuccess('Reset to default rules');
    });
  }
}
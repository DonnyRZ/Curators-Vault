/*
 * Project Rules Module
 * Handles project rules definition and management
 */

export function initializeProjectRules() {
  // Project Rules Page Elements
  const saveRulesBtn = document.getElementById('save-rules-btn');
  const useDefaultRulesBtn = document.getElementById('use-default-rules-btn');
  const continueToGenerateBtn = document.getElementById('continue-to-generate-btn');
  
  // Set up navigation for "Continue" button
  if (continueToGenerateBtn) {
    continueToGenerateBtn.addEventListener('click', () => {
      // Import the navigation function dynamically to avoid circular dependencies
      import('./main.js').then(module => {
        module.navigateToPage('generate-monitor-page');
      });
    });
  }
  
  // Project Rules Page Logic
  if (saveRulesBtn) {
    saveRulesBtn.addEventListener('click', async () => {
      // Gather form data (in a full implementation, this would be more comprehensive)
      const rulesData = {
        appType: document.getElementById('app-type')?.value || 'SPA',
        language: document.getElementById('language')?.value || 'javascript-vanilla',
        typescript: document.getElementById('language')?.value === 'typescript',
        html: document.getElementById('html-support')?.checked || false,
        css: document.getElementById('css-support')?.checked || false,
        constraints: document.getElementById('constraints')?.value.split('\n') || []
      };
      
      try {
        const result = await window.api.saveRules(rulesData);
        if (result.success) {
          alert('Rules saved successfully!');
          if (continueToGenerateBtn) {
            continueToGenerateBtn.disabled = false;
          }
        } else {
          alert(`Error saving rules: ${result.error}`);
        }
      } catch (error) {
        console.error('Error saving rules:', error);
        alert(`Error saving rules: ${error.message}`);
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
    });
  }
}
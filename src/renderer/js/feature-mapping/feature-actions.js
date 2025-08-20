/*
 * Feature Actions Module
 * Handles feature saving, importing, and exporting
 */

import { collectFeaturesFromForm } from './feature-form.js';
import { showError, showSuccess } from '../ui/toast.js';
import { navigateToPage } from '../router.js'; // Import navigateToPage for automatic navigation

let saveFeaturesBtn, bulkImportBtn, bulkExportBtn;
let selectedPageId = null;

// Helper function to get the currently selected page ID
function getCurrentPageId() {
  const pageSelect = document.getElementById('page-select');
  return pageSelect ? pageSelect.value : null;
}

// Helper function to check if all pages have features and enable continue button
async function checkAndEnableContinueButton() {
  try {
    const result = await window.api.listPages();
    if (result.success && result.pages.length > 0) {
      // Check if all pages have features
      const allHaveFeatures = result.pages.every(page => page.hasFeatures);
      
      // If all pages have features, automatically navigate to the next step (Rules)
      if (allHaveFeatures) {
         // Use a small delay to allow any success messages to be seen
        setTimeout(() => {
          navigateToPage('project-rules-page');
        }, 1500);
      }
    }
  } catch (error) {
    console.error('Error checking page features:', error);
  }
}

// Helper function to handle file selection for bulk import
function handleBulkImportFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      // Show loading message
      const originalBtnText = bulkImportBtn.innerHTML;
      bulkImportBtn.innerHTML = '📥 Importing...';
      bulkImportBtn.disabled = true;
      
      const result = await window.api.bulkImportFeatures(data);
      
      // Restore button
      bulkImportBtn.innerHTML = originalBtnText;
      bulkImportBtn.disabled = false;
      
        if (result.success) {
          showSuccess('Features imported successfully!');
        // Refresh the page selector and feature form
        const { populatePageSelector } = await import('./page-selector.js');
        await populatePageSelector();
        
        // If a page is currently selected, reload its features
        const pageId = getCurrentPageId();
        if (pageId) {
          const { loadFeatureFormForPage } = await import('./feature-form.js');
          await loadFeatureFormForPage(pageId);
        }
        
        // Refresh pages list in the pages manager
        import('../pages-manager.js').then(module => {
          module.refreshPagesList();
        });
        
        // Check if we should enable the continue button or navigate
        await checkAndEnableContinueButton();
        } else {
          showError(`Error importing features: ${result.error}`);
        }
      } catch (error) {
        console.error('Error parsing or importing features:', error);
        showError(`Error importing features: ${error.message}`);
      
      // Restore button
      if (bulkImportBtn) {
        const originalBtnText = bulkImportBtn.innerHTML.replace('📥 Importing...', '📥 Import');
        bulkImportBtn.innerHTML = originalBtnText;
        bulkImportBtn.disabled = false;
      }
    } finally {
      // Remove the file input element
      if (event.target && event.target.parentNode) {
        event.target.parentNode.removeChild(event.target);
      }
    }
  };
  
  reader.onerror = () => {
    showError('Error reading file');
    
    // Restore button
    if (bulkImportBtn) {
      const originalBtnText = bulkImportBtn.innerHTML.replace('📥 Importing...', '📥 Import');
      bulkImportBtn.innerHTML = originalBtnText;
      bulkImportBtn.disabled = false;
    }
    
    // Remove the file input element
    if (event.target && event.target.parentNode) {
      event.target.parentNode.removeChild(event.target);
    }
  };
  
  reader.readAsText(file);
}

// Function to show bulk import modal
function showBulkImportModal() {
  // Create modal HTML
  const modalHTML = `
    <div class="modal-overlay" id="bulk-import-modal">
      <div class="modal bulk-modal">
        <div class="modal-header">
          <h3 class="modal-title">Bulk Import Features</h3>
          <button class="modal-close" id="bulk-import-close">&times;</button>
        </div>
        <div class="modal-body">
          <p>Upload a JSON file with your features data:</p>
          <input type="file" id="bulk-import-file" accept=".json" class="form-control">
        </div>
      </div>
    </div>
  `;
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Add event listeners
  const modal = document.getElementById('bulk-import-modal');
  const closeBtn = document.getElementById('bulk-import-close');
  const fileInput = document.getElementById('bulk-import-file');
  
  const closeModal = () => {
    if (modal) {
      modal.remove();
    }
  };
  
  closeBtn.addEventListener('click', closeModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  fileInput.addEventListener('change', (e) => {
    handleBulkImportFileSelect(e);
    closeModal();
  });
}

// Function to show bulk export modal
function showBulkExportModal(data) {
  // Create modal HTML
  const modalHTML = `
    <div class="modal-overlay" id="bulk-export-modal">
      <div class="modal bulk-modal">
        <div class="modal-header">
          <h3 class="modal-title">Bulk Export Features</h3>
          <button class="modal-close" id="bulk-export-close">&times;</button>
        </div>
        <div class="modal-body">
          <p>Copy the JSON data below or download as a file:</p>
          <textarea class="form-control bulk-textarea" readonly>${JSON.stringify(data, null, 2)}</textarea>
          <div class="bulk-actions">
            <button class="btn btn-secondary" id="bulk-export-copy">📋 Copy to Clipboard</button>
            <button class="btn btn-primary" id="bulk-export-download">📥 Download JSON</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Add event listeners
  const modal = document.getElementById('bulk-export-modal');
  const closeBtn = document.getElementById('bulk-export-close');
  const copyBtn = document.getElementById('bulk-export-copy');
  const downloadBtn = document.getElementById('bulk-export-download');
  const textarea = modal.querySelector('.bulk-textarea');
  
  const closeModal = () => {
    if (modal) {
      modal.remove();
    }
  };
  
  closeBtn.addEventListener('click', closeModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  copyBtn.addEventListener('click', () => {
    textarea.select();
    document.execCommand('copy');
    showSuccess('Copied to clipboard!');
  });
  
  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'features-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess('Features exported successfully!');
  });
}

export function initializeFeatureActions() {
  // Get button elements
  saveFeaturesBtn = document.getElementById('save-features-btn');
  bulkImportBtn = document.getElementById('bulk-import-btn');
  bulkExportBtn = document.getElementById('bulk-export-btn');
  
  // Set up event listeners
  if (saveFeaturesBtn) {
    // Remove existing event listener if any
    if (saveFeaturesBtn.eventListener) {
      saveFeaturesBtn.removeEventListener('click', saveFeaturesBtn.eventListener);
    }
    
    // Create new event listener
    const listener = async () => {
      const pageId = getCurrentPageId();
      if (!pageId) {
        showError('Please select a page first.');
        return;
      }
      
      // Show loading message
      const originalBtnText = saveFeaturesBtn.innerHTML;
      saveFeaturesBtn.innerHTML = '💾 Saving...';
      saveFeaturesBtn.disabled = true;
      
      try {
        const features = collectFeaturesFromForm();
        const result = await window.api.saveFeatures(pageId, features);
        
        // Restore button
        saveFeaturesBtn.innerHTML = originalBtnText;
        saveFeaturesBtn.disabled = false;
        
        if (result.success) {
          showSuccess('Features saved successfully!');
          // Refresh the pages list to update the status
          import('../pages-manager.js').then(module => {
            module.refreshPagesList();
          });
          
          // Check if we should enable the continue button or navigate
          await checkAndEnableContinueButton();
        } else {
          showError(`Error saving features: ${result.error}`);
        }
      } catch (error) {
        console.error('Error saving features:', error);
        showError(`Error saving features: ${error.message}`);
        
        // Restore button
        saveFeaturesBtn.innerHTML = originalBtnText;
        saveFeaturesBtn.disabled = false;
      }
    };
    
    // Store reference to listener for cleanup
    saveFeaturesBtn.eventListener = listener;
    
    // Add event listener
    saveFeaturesBtn.addEventListener('click', listener);
  }
  
  if (bulkImportBtn) {
    // Remove existing event listener if any
    if (bulkImportBtn.eventListener) {
      bulkImportBtn.removeEventListener('click', bulkImportBtn.eventListener);
    }
    
    // Create new event listener
    const listener = async () => {
      try {
        showBulkImportModal();
      } catch (error) {
        console.error('Error setting up bulk import:', error);
        showError(`Error setting up bulk import: ${error.message}`);
      }
    };
    
    // Store reference to listener for cleanup
    bulkImportBtn.eventListener = listener;
    
    // Add event listener
    bulkImportBtn.addEventListener('click', listener);
  }
  
  if (bulkExportBtn) {
    // Remove existing event listener if any
    if (bulkExportBtn.eventListener) {
      bulkExportBtn.removeEventListener('click', bulkExportBtn.eventListener);
    }
    
    // Create new event listener
    const listener = async () => {
      try {
        // Show loading message
        const originalBtnText = bulkExportBtn.innerHTML;
        bulkExportBtn.innerHTML = '📤 Exporting...';
        bulkExportBtn.disabled = true;
        
        const result = await window.api.bulkExportFeatures();
        
        // Restore button
        bulkExportBtn.innerHTML = originalBtnText;
        bulkExportBtn.disabled = false;
        
        if (result.success) {
          showBulkExportModal(result.data);
        } else {
          showError(`Error exporting features: ${result.error}`);
        }
      } catch (error) {
        console.error('Error exporting features:', error);
        showError(`Error exporting features: ${error.message}`);
        
        // Restore button
        if (bulkExportBtn) {
          const originalBtnText = bulkExportBtn.innerHTML.replace('📤 Exporting...', '📤 Export');
          bulkExportBtn.innerHTML = originalBtnText;
          bulkExportBtn.disabled = false;
        }
      }
    };
    
    // Store reference to listener for cleanup
    bulkExportBtn.eventListener = listener;
    
    // Add event listener
    bulkExportBtn.addEventListener('click', listener);
  }
}

// Export the check function so it can be called from other modules
export { checkAndEnableContinueButton };
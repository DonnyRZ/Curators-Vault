/*
 * Feature Actions Module
 * Handles feature saving, importing, and exporting
 */

import { collectFeaturesFromForm } from './feature-form.js';

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
      
      // Enable/disable continue button based on this
      const continueBtn = document.getElementById('continue-to-rules-btn');
      if (continueBtn) {
        continueBtn.disabled = !allHaveFeatures;
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
      const originalBtnText = bulkImportBtn.textContent;
      bulkImportBtn.textContent = 'Importing...';
      bulkImportBtn.disabled = true;
      
      const result = await window.api.bulkImportFeatures(data);
      
      // Restore button
      bulkImportBtn.textContent = originalBtnText;
      bulkImportBtn.disabled = false;
      
      if (result.success) {
        alert('Features imported successfully!');
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
        
        // Check if we should enable the continue button
        await checkAndEnableContinueButton();
      } else {
        alert(`Error importing features: ${result.error}`);
      }
    } catch (error) {
      console.error('Error parsing or importing features:', error);
      alert(`Error importing features: ${error.message}`);
      
      // Restore button
      if (bulkImportBtn) {
        const originalBtnText = bulkImportBtn.textContent.replace('Importing...', 'Bulk Import');
        bulkImportBtn.textContent = originalBtnText;
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
    alert('Error reading file');
    
    // Restore button
    if (bulkImportBtn) {
      const originalBtnText = bulkImportBtn.textContent.replace('Importing...', 'Bulk Import');
      bulkImportBtn.textContent = originalBtnText;
      bulkImportBtn.disabled = false;
    }
    
    // Remove the file input element
    if (event.target && event.target.parentNode) {
      event.target.parentNode.removeChild(event.target);
    }
  };
  
  reader.readAsText(file);
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
        alert('Please select a page first.');
        return;
      }
      
      // Show loading message
      const originalBtnText = saveFeaturesBtn.textContent;
      saveFeaturesBtn.textContent = 'Saving...';
      saveFeaturesBtn.disabled = true;
      
      try {
        const features = collectFeaturesFromForm();
        const result = await window.api.saveFeatures(pageId, features);
        
        // Restore button
        saveFeaturesBtn.textContent = originalBtnText;
        saveFeaturesBtn.disabled = false;
        
        if (result.success) {
          alert('Features saved successfully!');
          // Refresh the pages list to update the status
          import('../pages-manager.js').then(module => {
            module.refreshPagesList();
          });
          
          // Check if we should enable the continue button
          await checkAndEnableContinueButton();
        } else {
          alert(`Error saving features: ${result.error}`);
        }
      } catch (error) {
        console.error('Error saving features:', error);
        alert(`Error saving features: ${error.message}`);
        
        // Restore button
        saveFeaturesBtn.textContent = originalBtnText;
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
        // Create a hidden file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        
        // Add event listener for file selection
        fileInput.addEventListener('change', handleBulkImportFileSelect);
        
        // Add to DOM, trigger click, then remove
        document.body.appendChild(fileInput);
        fileInput.click();
      } catch (error) {
        console.error('Error setting up bulk import:', error);
        alert(`Error setting up bulk import: ${error.message}`);
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
        const originalBtnText = bulkExportBtn.textContent;
        bulkExportBtn.textContent = 'Exporting...';
        bulkExportBtn.disabled = true;
        
        const result = await window.api.bulkExportFeatures();
        
        // Restore button
        bulkExportBtn.textContent = originalBtnText;
        bulkExportBtn.disabled = false;
        
        if (result.success) {
          // Create a blob and download link
          const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'features-export.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          alert('Features exported successfully!');
        } else {
          alert(`Error exporting features: ${result.error}`);
        }
      } catch (error) {
        console.error('Error exporting features:', error);
        alert(`Error exporting features: ${error.message}`);
        
        // Restore button
        if (bulkExportBtn) {
          const originalBtnText = bulkExportBtn.textContent.replace('Exporting...', 'Bulk Export');
          bulkExportBtn.textContent = originalBtnText;
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
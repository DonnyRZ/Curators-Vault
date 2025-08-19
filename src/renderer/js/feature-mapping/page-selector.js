/*
 * Page Selector Module
 * Handles the page selection dropdown
 */

let pageSelect = null;
let isPopulatingPageSelector = false;

// Helper function to populate the page selector dropdown
export async function populatePageSelector() {
  pageSelect = document.getElementById('page-select');
  if (!pageSelect) return;
  
  // Prevent concurrent calls
  if (isPopulatingPageSelector) return;
  isPopulatingPageSelector = true;
  
  try {
    // Clear existing options
    pageSelect.innerHTML = '<option value="">-- Select a Page --</option>';
    
    // Fetch pages from the server
    const result = await window.api.listPages();
    
    if (result.success && result.pages.length > 0) {
      // Populate the dropdown with pages
      result.pages.forEach(page => {
        const option = document.createElement('option');
        option.value = page.id;
        option.textContent = `${page.name} (${page.id})`;
        pageSelect.appendChild(option);
      });
      
      // If there's a selected page ID from the pages manager, select it
      if (window.selectedPageId) {
        pageSelect.value = window.selectedPageId;
        // Trigger the change event to load the feature form
        pageSelect.dispatchEvent(new Event('change'));
        // Clear the selected page ID
        window.selectedPageId = null;
      }
    }
  } catch (error) {
    console.error('Error populating page selector:', error);
    pageSelect.innerHTML = '<option value="">Error loading pages</option>';
  } finally {
    // Always reset the guard variable
    isPopulatingPageSelector = false;
  }
}

// Handle page selection change
async function handlePageSelectionChange(event) {
  const pageId = event.target.value;
  if (pageId) {
    // Import the feature form module dynamically
    const { loadFeatureFormForPage } = await import('./feature-form.js');
    await loadFeatureFormForPage(pageId);
  } else {
    const featureFormContainer = document.getElementById('feature-form-container');
    if (featureFormContainer) featureFormContainer.innerHTML = '';
  }
}

export async function initializePageSelector() {
  // Get the page selector element
  pageSelect = document.getElementById('page-select');
  
  if (pageSelect) {
    // Populate the selector
    await populatePageSelector();
    
    // Remove existing event listener if any
    if (pageSelect.eventListener) {
      pageSelect.removeEventListener('change', pageSelect.eventListener);
    }
    
    // Create new event listener
    const listener = handlePageSelectionChange;
    
    // Store reference to listener for cleanup
    pageSelect.eventListener = listener;
    
    // Add event listener for selection changes
    pageSelect.addEventListener('change', listener);
  }
}
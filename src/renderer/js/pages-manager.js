/*
 * Pages Manager Module
 * Handles page creation, management, and navigation
 */

let addPageBtn, pagesList, continueToFeaturesBtn;

// Helper function to create a page card element
function createPageCard(page) {
  const pageCard = document.createElement('div');
  pageCard.className = 'page-card';
  pageCard.dataset.id = page.id;
  
  pageCard.innerHTML = `
    <div class="page-header">
      <input type="text" class="page-name" value="${page.name}" placeholder="Page Name">
      <button type="button" class="remove-page-btn" title="Remove Page">✕</button>
    </div>
    <div class="page-info">
      <p>ID: ${page.id}</p>
      <p>Status: <span class="status ${page.hasFeatures ? 'success' : 'pending'}">${page.hasFeatures ? 'Features Defined' : 'Missing Features'}</span></p>
    </div>
    <div class="page-actions">
      <button type="button" class="edit-features-btn secondary-btn">Edit Features</button>
    </div>
  `;
  
  // Add event listeners
  const removeBtn = pageCard.querySelector('.remove-page-btn');
  // Remove existing event listener if any
  if (removeBtn.eventListener) {
    removeBtn.removeEventListener('click', removeBtn.eventListener);
  }
  
  // Create new event listener
  const removeListener = () => {
    pageCard.remove();
    checkAndEnableContinueButton();
  };
  
  // Store reference to listener for cleanup
  removeBtn.eventListener = removeListener;
  
  // Add event listener
  removeBtn.addEventListener('click', removeListener);
  
  const editFeaturesBtn = pageCard.querySelector('.edit-features-btn');
  // Remove existing event listener if any
  if (editFeaturesBtn.eventListener) {
    editFeaturesBtn.removeEventListener('click', editFeaturesBtn.eventListener);
  }
  
  // Create new event listener
  const editListener = () => {
    // Navigate to feature mapping page with this page selected
    import('./main.js').then(module => {
      // Store the selected page ID in a global variable or state
      window.selectedPageId = page.id;
      module.navigateToPage('feature-mapping-page');
    });
  };
  
  // Store reference to listener for cleanup
  editFeaturesBtn.eventListener = editListener;
  
  // Add event listener
  editFeaturesBtn.addEventListener('click', editListener);
  
  // Update page name when input changes
  const nameInput = pageCard.querySelector('.page-name');
  nameInput.addEventListener('input', () => {
    page.name = nameInput.value;
  });
  
  return pageCard;
}

// Helper function to get the next page ID
function getNextPageId() {
  const pageCards = document.querySelectorAll('.page-card');
  if (pageCards.length === 0) return 'page-1';
  
  const ids = Array.from(pageCards).map(card => card.dataset.id);
  const numbers = ids.map(id => parseInt(id.replace('page-', '')));
  const maxNumber = Math.max(...numbers);
  return `page-${maxNumber + 1}`;
}

// Helper function to refresh the pages list
export async function refreshPagesList() {
  if (!pagesList) return;
  
  try {
    // Clear the list
    pagesList.innerHTML = '';
    
    // Fetch pages from the server (if any exist)
    const result = await window.api.listPages();
    
    if (result.success && result.pages.length > 0) {
      // Populate the list with pages
      result.pages.forEach(page => {
        const pageCard = createPageCard(page);
        pagesList.appendChild(pageCard);
      });
      
      // Enable continue button if we have pages
      if (continueToFeaturesBtn) {
        continueToFeaturesBtn.disabled = false;
      }
    } else {
      // Show a message if no pages
      pagesList.innerHTML = '<p class="empty-message">No pages created yet. Add your first page!</p>';
    }
  } catch (error) {
    console.error('Error refreshing pages list:', error);
    pagesList.innerHTML = '<p class="error-message">Error loading pages.</p>';
  }
}

// Helper function to check if all pages have features and enable continue button
async function checkAndEnableContinueButton() {
  try {
    const result = await window.api.listPages();
    if (result.success && result.pages.length > 0) {
      // Check if all pages have features
      const allHaveFeatures = result.pages.every(page => page.hasFeatures);
      
      // Enable/disable continue button based on this
      if (continueToFeaturesBtn) {
        continueToFeaturesBtn.disabled = !allHaveFeatures;
      }
    } else {
      // Disable continue button if no pages
      if (continueToFeaturesBtn) {
        continueToFeaturesBtn.disabled = true;
      }
    }
  } catch (error) {
    console.error('Error checking page features:', error);
  }
}

export function initializePagesManager() {
  // Pages Manager Page Elements
  addPageBtn = document.getElementById('add-page-btn');
  pagesList = document.getElementById('pages-list');
  continueToFeaturesBtn = document.getElementById('continue-to-features-btn');
  
  // Set up navigation for "Continue" button
  if (continueToFeaturesBtn) {
    // Remove existing event listener if any
    if (continueToFeaturesBtn.eventListener) {
      continueToFeaturesBtn.removeEventListener('click', continueToFeaturesBtn.eventListener);
    }
    
    // Create new event listener
    const continueListener = () => {
      // Import the navigation function dynamically to avoid circular dependencies
      import('./main.js').then(module => {
        module.navigateToPage('feature-mapping-page');
      });
    };
    
    // Store reference to listener for cleanup
    continueToFeaturesBtn.eventListener = continueListener;
    
    // Add event listener
    continueToFeaturesBtn.addEventListener('click', continueListener);
  }
  
  // Pages Manager Page Logic
  if (addPageBtn) {
    // Remove existing event listener if any
    if (addPageBtn.eventListener) {
      addPageBtn.removeEventListener('click', addPageBtn.eventListener);
    }
    
    // Create new event listener
    const addPageListener = async () => {
      try {
        const pageId = getNextPageId();
        const pageName = `Page ${pageId.split('-')[1]}`;
        
        // Create page on the server
        const result = await window.api.createPage(pageId, pageName);
        
        if (result.success) {
          // Create page card in UI
          const pageCard = createPageCard({
            id: pageId,
            name: pageName,
            hasFeatures: false
          });
          pagesList.appendChild(pageCard);
          
          // Enable continue button
          if (continueToFeaturesBtn) {
            continueToFeaturesBtn.disabled = false;
          }
        } else {
          alert(`Error creating page: ${result.error}`);
        }
      } catch (error) {
        console.error('Error creating page:', error);
        alert(`Error creating page: ${error.message}`);
      }
    };
    
    // Store reference to listener for cleanup
    addPageBtn.eventListener = addPageListener;
    
    // Add event listener
    addPageBtn.addEventListener('click', addPageListener);
  }
  
  // Initialize the pages list
  refreshPagesList();
}
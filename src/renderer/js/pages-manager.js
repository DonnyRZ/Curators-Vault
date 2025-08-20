/*
 * Pages Manager Module
 * Handles page creation, management, and navigation
 */

import { showError, showSuccess } from './ui/toast.js';
import { navigateToPage } from './router.js'; // Import navigateToPage for automatic navigation

let addPageBtn, addFirstPageBtn, pagesList, emptyPagesPlaceholder;
let lastCreatedPageId = null; // To track the last created page

// Helper function to create a page card element
function createPageCard(page) {
  const pageCard = document.createElement('div');
  pageCard.className = 'page-card';
  pageCard.dataset.id = page.id;
  
  pageCard.innerHTML = `
    <div class="page-card-header">
      <input type="text" class="page-card-title-input" value="${page.name}" placeholder="Page Name">
      <div class="page-card-actions">
        <button type="button" class="btn btn-icon remove-page-btn" title="Remove Page">
          ✕
        </button>
      </div>
    </div>
    <div class="page-card-content">
      <div class="page-card-info">
        <div class="page-info-item">
          <span class="page-info-icon">🆔</span>
          <span>ID: ${page.id}</span>
        </div>
        <div class="page-info-item">
          <span class="page-info-icon">⚙️</span>
          <span>Features: <span class="page-features-count">${page.featuresCount || 0}</span></span>
        </div>
      </div>
    </div>
    <div class="page-card-footer">
      <button type="button" class="btn btn-secondary edit-features-btn">
        Edit Features
      </button>
    </div>
  `;
  
  // Add event listeners
  const removeBtn = pageCard.querySelector('.remove-page-btn');
  // Remove existing event listener if any
  if (removeBtn.eventListener) {
    removeBtn.removeEventListener('click', removeBtn.eventListener);
  }
  
  // Create new event listener
  const removeListener = async () => {
    try {
      const res = await window.api.deletePage(page.id);
      if (!res.success) throw new Error(res.error || 'Failed to delete');
      showSuccess(`Deleted ${page.name}`);
      // Refresh list from source of truth
      await refreshPagesList();
    } catch (e) {
      console.error('Delete page error:', e);
      showError(`Error deleting page: ${e.message}`);
    }
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
    window.selectedPageId = page.id;
    navigateToPage('feature-mapping-page');
  };
  
  // Store reference to listener for cleanup
  editFeaturesBtn.eventListener = editListener;
  
  // Add event listener
  editFeaturesBtn.addEventListener('click', editListener);
  
  // Update page name when input changes
  const nameInput = pageCard.querySelector('.page-card-title-input');
  nameInput.addEventListener('blur', async () => {
    const newName = nameInput.value.trim() || page.name;
    if (newName !== page.name) {
      try {
        const res = await window.api.updatePageName(page.id, newName);
        if (!res.success) throw new Error(res.error || 'Failed to save name');
        page.name = newName;
        showSuccess('Page name saved');
      } catch (e) {
        console.error('Update page name error:', e);
        showError(`Error saving name: ${e.message}`);
      }
    }
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
      // Hide empty pages placeholder
      if (emptyPagesPlaceholder) {
        emptyPagesPlaceholder.classList.add('hidden');
      }
      
      // Populate the list with pages
      result.pages.forEach(page => {
        const pageCard = createPageCard(page);
        pagesList.appendChild(pageCard);
      });
      
      // Check if we should automatically navigate to features after creating a page
      if (lastCreatedPageId) {
        const createdPage = result.pages.find(p => p.id === lastCreatedPageId);
        if (createdPage && !createdPage.hasFeatures) {
          // Automatically open features for the newly created page
          window.selectedPageId = lastCreatedPageId;
          setTimeout(() => {
            navigateToPage('feature-mapping-page');
          }, 500); // Small delay to let the UI update
        }
        lastCreatedPageId = null; // Reset
      }
    } else {
      // Show empty pages placeholder
      if (emptyPagesPlaceholder) {
        emptyPagesPlaceholder.classList.remove('hidden');
      }
    }
  } catch (error) {
    console.error('Error refreshing pages list:', error);
    pagesList.innerHTML = '<p class="error-message">Error loading pages.</p>';
  }
}

export function initializePagesManager() {
  // Pages Manager Page Elements
  addPageBtn = document.getElementById('add-page-btn');
  addFirstPageBtn = document.getElementById('add-first-page-btn');
  pagesList = document.getElementById('pages-list');
  emptyPagesPlaceholder = document.getElementById('empty-pages-placeholder');
  
  // Pages Manager Page Logic
  const addPageHandler = async () => {
    try {
      const pageId = getNextPageId();
      const pageName = `Page ${pageId.split('-')[1]}`;
      
      // Create page on the server
      const result = await window.api.createPage(pageId, pageName);
      
      if (result.success) {
        // Track the last created page ID
        lastCreatedPageId = pageId;
        
        // Create page card in UI
        const pageCard = createPageCard({
          id: pageId,
          name: pageName,
          featuresCount: 0
        });
        pagesList.appendChild(pageCard);
        
        // Hide empty pages placeholder
        if (emptyPagesPlaceholder) {
          emptyPagesPlaceholder.classList.add('hidden');
        }
        
        // The refreshPagesList function will handle automatic navigation
        
      } else {
        showError(`Error creating page: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating page:', error);
      showError(`Error creating page: ${error.message}`);
    }
  };
  
  if (addPageBtn) {
    addPageBtn.addEventListener('click', addPageHandler);
  }
  
  if (addFirstPageBtn) {
    addFirstPageBtn.addEventListener('click', addPageHandler);
  }
  
  // Initialize the pages list
  refreshPagesList();
}
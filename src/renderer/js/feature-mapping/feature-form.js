/*
 * Feature Form Module
 * Handles the feature form creation and management
 */

import { checkAndEnableContinueButton } from './feature-actions.js';

let featureFormContainer = null;
let currentAddFeatureBtn = null;
let currentFeatureList = null;

// Helper function to create a feature item element
function createFeatureItem(feature = {}) {
  const featureId = feature.id || 'new-' + Date.now();
  const featureElement = document.createElement('div');
  featureElement.className = 'feature-item';
  featureElement.dataset.id = featureId;
  
  featureElement.innerHTML = `
    <div class="feature-item-header">
      <input type="text" class="feature-item-title-input" placeholder="Feature Name" value="${feature.name || ''}">
      <div class="feature-item-actions">
        <button type="button" class="btn btn-icon remove-feature-btn" title="Remove Feature">
          ✕
        </button>
      </div>
    </div>
    <div class="feature-item-content">
      <div class="form-group">
        <label class="form-label">Description:</label>
        <textarea class="form-control feature-description-textarea" placeholder="Describe what this feature does...">${feature.description || ''}</textarea>
      </div>
      <div class="form-group">
        <div class="feature-required-checkbox">
          <input type="checkbox" class="form-checkbox feature-required-checkbox-input" ${feature.required ? 'checked' : ''}>
          <label class="form-label">Required Feature</label>
        </div>
      </div>
    </div>
  `;
  
  // Add event listener to remove button
  const removeBtn = featureElement.querySelector('.remove-feature-btn');
  removeBtn.addEventListener('click', () => {
    featureElement.remove();
    // Check if we should enable the continue button
    checkAndEnableContinueButton();
  });
  
  // Add event listeners for input fields to enable real-time validation
  const nameInput = featureElement.querySelector('.feature-item-title-input');
  nameInput.addEventListener('input', () => {
    // Could add validation here if needed
  });
  
  return featureElement;
}

// Helper function to attach event listener to add feature button
function attachAddFeatureButtonListener() {
  if (currentAddFeatureBtn && currentFeatureList) {
    // Remove existing event listener if any
    if (currentAddFeatureBtn.eventListener) {
      currentAddFeatureBtn.removeEventListener('click', currentAddFeatureBtn.eventListener);
    }
    
    // Create new event listener
    const listener = () => {
      const newFeature = createFeatureItem();
      currentFeatureList.appendChild(newFeature);
      // Check if we should enable the continue button
      checkAndEnableContinueButton();
    };
    
    // Store reference to listener for cleanup
    currentAddFeatureBtn.eventListener = listener;
    
    // Add event listener
    currentAddFeatureBtn.addEventListener('click', listener);
  }
}

// Helper function to load the feature form for a selected page
export async function loadFeatureFormForPage(pageId) {
  featureFormContainer = document.getElementById('feature-form-container');
  if (!featureFormContainer) return;
  
  try {
    // Try to load existing features for this page
    const result = await window.api.loadFeatures(pageId);
    
    // Create feature form with add button
    featureFormContainer.innerHTML = `
      <div class="feature-form">
        <div class="feature-form-header">
          <h3 class="feature-form-title">Features for Page ${pageId}</h3>
          <button type="button" id="add-feature-btn" class="btn btn-secondary">
            + Add Feature
          </button>
        </div>
        <div class="feature-list"></div>
      </div>
    `;
    
    currentFeatureList = featureFormContainer.querySelector('.feature-list');
    currentAddFeatureBtn = featureFormContainer.querySelector('#add-feature-btn');
    
    // Attach event listener to add button
    attachAddFeatureButtonListener();
    
    // If we have existing features, populate the form
    if (result.success && result.features && result.features.length > 0) {
      result.features.forEach(feature => {
        const featureElement = createFeatureItem(feature);
        currentFeatureList.appendChild(featureElement);
      });
    } else {
      // Add one empty feature by default
      const newFeature = createFeatureItem();
      currentFeatureList.appendChild(newFeature);
    }
    
    // Check if we should enable the continue button
    await checkAndEnableContinueButton();
  } catch (error) {
    console.error(`Error loading feature form for page ${pageId}:`, error);
    featureFormContainer.innerHTML = `<div class="empty-features">
      <div class="empty-features-icon">⚙️</div>
      <h3 class="empty-features-title">Error Loading Features</h3>
      <p class="empty-features-desc">Could not load features for page ${pageId}</p>
    </div>`;
  }
}

// Helper function to collect features from the form
export function collectFeaturesFromForm() {
  featureFormContainer = document.getElementById('feature-form-container');
  if (!featureFormContainer) return [];
  
  const featureItems = featureFormContainer.querySelectorAll('.feature-item');
  const features = [];
  
  featureItems.forEach((item, index) => {
    const id = item.dataset.id || `feature-${index + 1}`;
    const nameInput = item.querySelector('.feature-item-title-input');
    const descInput = item.querySelector('.feature-description-textarea');
    const requiredInput = item.querySelector('.feature-required-checkbox-input');
    
    const name = nameInput ? nameInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';
    const required = requiredInput ? requiredInput.checked : false;
    
    // Only add features with a name
    if (name) {
      features.push({
        id,
        name,
        description,
        required
      });
    }
  });
  
  return features;
}

export async function initializeFeatureForm() {
  // Get the feature form container
  featureFormContainer = document.getElementById('feature-form-container');
  
  // We don't need to do anything here as the form is loaded when a page is selected
  // This function is here for consistency with the module structure
}
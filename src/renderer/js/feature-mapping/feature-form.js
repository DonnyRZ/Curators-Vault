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
    <div class="feature-header">
      <input type="text" class="feature-name" placeholder="Feature Name" value="${feature.name || ''}">
      <button type="button" class="remove-feature-btn" title="Remove Feature">✕</button>
    </div>
    <div class="feature-details">
      <div class="form-group">
        <label>Description:</label>
        <textarea class="feature-description" placeholder="Describe what this feature does...">${feature.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" class="feature-required" ${feature.required ? 'checked' : ''}>
          Required Feature
        </label>
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
  const nameInput = featureElement.querySelector('.feature-name');
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
        <div class="form-header">
          <h3>Features for Page ${pageId}</h3>
          <button type="button" id="add-feature-btn" class="secondary-btn">+ Add Feature</button>
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
    featureFormContainer.innerHTML = `<p>Error loading features for page ${pageId}</p>`;
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
    const nameInput = item.querySelector('.feature-name');
    const descInput = item.querySelector('.feature-description');
    const requiredInput = item.querySelector('.feature-required');
    
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
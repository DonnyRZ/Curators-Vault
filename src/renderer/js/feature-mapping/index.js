/*
 * Main Feature Mapping Module
 * Coordinates all feature mapping functionality
 */

import { initializePageSelector } from './page-selector.js';
import { initializeFeatureForm } from './feature-form.js';
import { initializeFeatureActions } from './feature-actions.js';

let featureMappingPage = null;
let featureMappingObserver = null;

// Function to initialize the observer for the Feature Mapping page
function initFeatureMappingObserver() {
  if (featureMappingPage && !featureMappingObserver) {
    featureMappingObserver = new MutationObserver(async (mutations) => {
      mutations.forEach(async (mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (featureMappingPage.classList.contains('active')) {
            // Page became active, initialize components
            await initializePageSelector();
            await initializeFeatureForm();
            await initializeFeatureActions();
          }
        }
      });
    });
    
    featureMappingObserver.observe(featureMappingPage, { attributes: true });
  }
}

export function initializeFeatureMapping() {
  // Get the feature mapping page element
  featureMappingPage = document.getElementById('feature-mapping-page');
  
  // Initialize the observer when the page loads
  if (featureMappingPage) {
    initFeatureMappingObserver();
  }
  
  // No more Continue button; navigate via sidebar
}

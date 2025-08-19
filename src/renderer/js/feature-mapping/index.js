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
  
  // Set up navigation for "Continue" button
  const continueToRulesBtn = document.getElementById('continue-to-rules-btn');
  if (continueToRulesBtn) {
    // Remove existing event listener if any
    if (continueToRulesBtn.eventListener) {
      continueToRulesBtn.removeEventListener('click', continueToRulesBtn.eventListener);
    }
    
    // Create new event listener
    const continueListener = () => {
      // Import the navigation function dynamically to avoid circular dependencies
      import('../main.js').then(module => {
        module.navigateToPage('project-rules-page');
      });
    };
    
    // Store reference to listener for cleanup
    continueToRulesBtn.eventListener = continueListener;
    
    // Add event listener
    continueToRulesBtn.addEventListener('click', continueListener);
  }
}
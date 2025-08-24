/*
 * Main Feature Mapping Module
 * Coordinates all feature mapping functionality
 */

import { initializePageSelector } from './page-selector.js';
import { initializeFeatureForm } from './feature-form.js';
import { initializeFeatureActions } from './feature-actions.js';

export function initializeFeatureMapping() {
  // Initialize immediately if containers are present (workspace layout)
  const hasFeatureMappingUi = document.getElementById('feature-mapping-page') ||
    (document.getElementById('feature-form-container') && document.getElementById('page-select'));
  if (hasFeatureMappingUi) {
    // Fire-and-forget; modules handle idempotency
    initializePageSelector();
    initializeFeatureForm();
    initializeFeatureActions();
  }
}

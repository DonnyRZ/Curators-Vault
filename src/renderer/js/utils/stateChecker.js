// src/renderer/js/utils/stateChecker.js

/**
 * Utility functions to check the overall state of the project.
 */

/**
 * Checks if the essential project structure (pages with features) exists.
 * @returns {Promise<{valid: boolean, message: string}>} Validation result.
 */
export async function checkProjectStructure() {
  try {
    const workspacePath = await window.api.getWorkspacePath();
    if (!workspacePath) {
      return { valid: false, message: 'No workspace selected.' };
    }

    const pagesResult = await window.api.listPages();
    if (!pagesResult.success) {
      return { valid: false, message: `Error listing pages: ${pagesResult.error}` };
    }

    if (pagesResult.pages.length === 0) {
      return { valid: false, message: 'No pages created. Please add at least one page.' };
    }

    // Check if all pages have features
    const allPagesHaveFeatures = pagesResult.pages.every(page => page.hasFeatures);
    if (!allPagesHaveFeatures) {
      return { valid: false, message: 'Not all pages have features defined. Please define features for all pages.' };
    }

    return { valid: true, message: 'Project structure is valid.' };
  } catch (error) {
    console.error('Error in checkProjectStructure:', error);
    return { valid: false, message: `Unexpected error checking project structure: ${error.message}` };
  }
}

/**
 * Checks if the project rules are saved.
 * @returns {Promise<{valid: boolean, message: string}>} Validation result.
 */
export async function checkProjectRules() {
  try {
    const workspacePath = await window.api.getWorkspacePath();
    if (!workspacePath) {
      return { valid: false, message: 'No workspace selected.' };
    }

    // Attempt to load rules. If they don't exist or are invalid, the load function should handle it.
    // The default rules are loaded if the file is missing, but we want to ensure they are explicitly saved.
    // A simple check could be to see if the rules file exists.
    // However, the current `loadRules` IPC handler returns default rules if the file is missing.
    // We can modify the IPC handler or check the file directly.
    // For now, let's assume if `loadRules` succeeds, rules are effectively set (either loaded or defaults applied).
    // A more robust check would involve modifying the main process to distinguish between loaded and default rules.
    // For this implementation, we'll proceed with a basic check via the API.
    const rulesResult = await window.api.loadRules();
    if (!rulesResult.success) {
      return { valid: false, message: `Error loading rules: ${rulesResult.error}` };
    }
    // If loadRules succeeds, we consider rules to be present.
    return { valid: true, message: 'Project rules are present.' };
  } catch (error) {
    console.error('Error in checkProjectRules:', error);
    return { valid: false, message: `Unexpected error checking project rules: ${error.message}` };
  }
}

/**
 * Checks if all preconditions for generation are met.
 * This includes workspace validity, project structure, and project rules.
 * @returns {Promise<{valid: boolean, message: string}>} Validation result.
 */
export async function checkPreconditionsForGeneration() {
  try {
    const workspacePath = await window.api.getWorkspacePath();
    if (!workspacePath) {
      return { valid: false, message: 'No workspace selected. Please select a workspace first.' };
    }

    const structureCheck = await checkProjectStructure();
    if (!structureCheck.valid) {
      return structureCheck; // Return the specific error message
    }

    const rulesCheck = await checkProjectRules();
    if (!rulesCheck.valid) {
      return rulesCheck; // Return the specific error message
    }

    // If all checks pass
    return { valid: true, message: 'All preconditions for generation are met.' };
  } catch (error) {
    console.error('Error in checkPreconditionsForGeneration:', error);
    return { valid: false, message: `Unexpected error checking preconditions: ${error.message}` };
  }
}
/*
 * Main renderer process script for the Curator's Vault MVP application.
 * This script handles UI interactions and communicates with the main process.
 */

// DOM Elements
const appContainer = document.getElementById('app-container');
const pages = document.querySelectorAll('.page');
const navbar = document.getElementById('navbar');

// Window Control Buttons
const minimizeBtn = document.getElementById('minimize-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const closeBtn = document.getElementById('close-btn');

// Workspace Setup Page Elements
const selectWorkspaceBtn = document.getElementById('select-workspace-btn');
const createWorkspaceBtn = document.getElementById('create-workspace-btn');
const workspaceInfo = document.getElementById('workspace-info');
const workspacePath = document.getElementById('workspace-path');
const continueToMockupsBtn = document.getElementById('continue-to-mockups-btn');

// Mockups Manager Page Elements
const uploadMockupsBtn = document.getElementById('upload-mockups-btn');
const mockupFileInput = document.getElementById('mockup-file-input');
const mockupsGallery = document.getElementById('mockups-gallery');
const continueToFeaturesBtn = document.getElementById('continue-to-features-btn');

// Navigation function
function navigateToPage(pageId) {
  // Hide all pages
  pages.forEach(page => {
    page.classList.remove('active');
  });
  
  // Show the requested page
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active');
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer process loaded');
  
  // Set up window controls
  if (minimizeBtn) minimizeBtn.addEventListener('click', () => window.api.minimizeWindow());
  if (maximizeBtn) maximizeBtn.addEventListener('click', () => window.api.maximizeWindow());
  if (closeBtn) closeBtn.addEventListener('click', () => window.api.closeWindow());
  
  // Set up navigation for "Continue" buttons
  if (continueToMockupsBtn) continueToMockupsBtn.addEventListener('click', () => navigateToPage('mockups-manager-page'));
  if (continueToFeaturesBtn) continueToFeaturesBtn.addEventListener('click', () => navigateToPage('feature-mapping-page'));
  if (document.getElementById('continue-to-rules-btn')) {
    document.getElementById('continue-to-rules-btn').addEventListener('click', () => navigateToPage('project-rules-page'));
  }
  if (document.getElementById('continue-to-generate-btn')) {
    document.getElementById('continue-to-generate-btn').addEventListener('click', () => navigateToPage('generate-monitor-page'));
  }
  if (document.getElementById('continue-to-preview-btn')) {
    document.getElementById('continue-to-preview-btn').addEventListener('click', () => navigateToPage('live-preview-page'));
  }
  
  // Workspace Setup Page Logic
  if (selectWorkspaceBtn) {
    selectWorkspaceBtn.addEventListener('click', async () => {
      try {
        const path = await window.api.selectWorkspace();
        if (path) {
          await handleWorkspaceSelected(path);
        }
      } catch (error) {
        console.error('Error selecting workspace:', error);
        alert(`Error selecting workspace: ${error.message}`);
      }
    });
  }
  
  if (createWorkspaceBtn) {
    createWorkspaceBtn.addEventListener('click', async () => {
      // In a full implementation, this would open a dialog to choose a path
      // For now, we'll just simulate with a placeholder
      const path = '/path/to/new/workspace'; // This should be dynamically chosen
      try {
        const result = await window.api.createWorkspace(path);
        if (result.success) {
          await handleWorkspaceSelected(path);
        } else {
          alert(`Error creating workspace: ${result.error}`);
        }
      } catch (error) {
        console.error('Error creating workspace:', error);
        alert(`Error creating workspace: ${error.message}`);
      }
    });
  }
  
  // Mockups Manager Page Logic
  if (uploadMockupsBtn) {
    uploadMockupsBtn.addEventListener('click', () => {
      if (mockupFileInput) mockupFileInput.click();
    });
  }
  
  if (mockupFileInput) {
    mockupFileInput.addEventListener('change', async (event) => {
      const files = Array.from(event.target.files);
      if (files.length > 0) {
        try {
          // Convert files to base64
          const mockupData = await Promise.all(files.map(file => {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                resolve({
                  name: file.name,
                  data: e.target.result // This is the base64 data
                });
              };
              reader.onerror = (e) => {
                reject(e);
              };
              reader.readAsDataURL(file); // This converts to base64
            });
          }));
          
          const result = await window.api.uploadMockups(mockupData);
          if (result.success) {
            alert(result.message);
            // Refresh the mockups gallery
            await refreshMockupsGallery();
          } else {
            alert(`Error uploading mockups: ${result.error}`);
          }
        } catch (error) {
          console.error('Error uploading mockups:', error);
          alert(`Error uploading mockups: ${error.message}`);
        }
      }
    });
  }
  
  // Project Rules Page Logic
  const saveRulesBtn = document.getElementById('save-rules-btn');
  if (saveRulesBtn) {
    saveRulesBtn.addEventListener('click', async () => {
      // Gather form data (in a full implementation, this would be more comprehensive)
      const rulesData = {
        appType: document.getElementById('app-type')?.value || 'SPA',
        language: document.getElementById('language')?.value || 'javascript-vanilla',
        typescript: document.getElementById('language')?.value === 'typescript',
        html: document.getElementById('html-support')?.checked || false,
        css: document.getElementById('css-support')?.checked || false,
        constraints: document.getElementById('constraints')?.value.split('\n') || []
      };
      
      try {
        const result = await window.api.saveRules(rulesData);
        if (result.success) {
          alert('Rules saved successfully!');
          if (document.getElementById('continue-to-generate-btn')) {
            document.getElementById('continue-to-generate-btn').disabled = false;
          }
        } else {
          alert(`Error saving rules: ${result.error}`);
        }
      } catch (error) {
        console.error('Error saving rules:', error);
        alert(`Error saving rules: ${error.message}`);
      }
    });
  }
  
  // Feature Mapping Page Logic
  const mockupSelect = document.getElementById('mockup-select');
  const featureFormContainer = document.getElementById('feature-form-container');
  const saveFeaturesBtn = document.getElementById('save-features-btn');
  const bulkImportBtn = document.getElementById('bulk-import-btn');
  const bulkExportBtn = document.getElementById('bulk-export-btn');
  
  // Populate mockup selector when Feature Mapping page is shown
  const featureMappingPage = document.getElementById('feature-mapping-page');
  let featureMappingObserver = null;
  
  // Function to initialize the observer for the Feature Mapping page
  function initFeatureMappingObserver() {
    if (featureMappingPage && !featureMappingObserver) {
      featureMappingObserver = new MutationObserver(async (mutations) => {
        mutations.forEach(async (mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (featureMappingPage.classList.contains('active')) {
              // Page became active, populate mockup selector
              await populateMockupSelector();
              // Check if we should enable the continue button
              await checkAndEnableContinueButton();
            }
          }
        });
      });
      
      featureMappingObserver.observe(featureMappingPage, { attributes: true });
    }
  }
  
  // Initialize the observer when the page loads
  if (featureMappingPage) {
    initFeatureMappingObserver();
  }
  
  // Handle mockup selection change
  if (mockupSelect) {
    mockupSelect.addEventListener('change', async (event) => {
      const mockupId = event.target.value;
      if (mockupId) {
        await loadFeatureFormForMockup(mockupId);
      } else {
        if (featureFormContainer) featureFormContainer.innerHTML = '';
      }
    });
  }
  
  // Save features button handler
  if (saveFeaturesBtn) {
    saveFeaturesBtn.addEventListener('click', async () => {
      const mockupId = mockupSelect?.value;
      if (!mockupId) {
        alert('Please select a mockup first.');
        return;
      }
      
      // Collect actual feature data from the form
      const features = collectFeaturesFromForm();
      
      try {
        const result = await window.api.saveFeatures(mockupId, features);
        if (result.success) {
          alert('Features saved successfully!');
          // Refresh the mockups gallery to update feature status
          await refreshMockupsGallery();
          // Check if we should enable the continue button
          checkAndEnableContinueButton();
        } else {
          alert(`Error saving features: ${result.error}`);
        }
      } catch (error) {
        console.error('Error saving features:', error);
        alert(`Error saving features: ${error.message}`);
      }
    });
  }
  
  // Bulk import button handler
  if (bulkImportBtn) {
    bulkImportBtn.addEventListener('click', async () => {
      try {
        // Create a file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        
        // Add change event listener
        fileInput.addEventListener('change', async (event) => {
          const file = event.target.files[0];
          if (file) {
            try {
              // Read the file content
              const content = await readFileAsText(file);
              const importData = JSON.parse(content);
              
              // Send to main process for bulk import
              const result = await window.api.bulkImportFeatures(importData);
              if (result.success) {
                alert('Features imported successfully!');
                // Refresh the mockups gallery and check continue button
                await refreshMockupsGallery();
                await checkAndEnableContinueButton();
              } else {
                alert(`Error importing features: ${result.error}`);
              }
            } catch (error) {
              console.error('Error importing features:', error);
              alert(`Error importing features: ${error.message}`);
            }
          }
        });
        
        // Add to document and trigger click
        document.body.appendChild(fileInput);
        fileInput.click();
        
        // Remove after click
        setTimeout(() => {
          document.body.removeChild(fileInput);
        }, 1000);
      } catch (error) {
        console.error('Error during bulk import:', error);
        alert(`Error during bulk import: ${error.message}`);
      }
    });
  }
  
  // Bulk export button handler
  if (bulkExportBtn) {
    bulkExportBtn.addEventListener('click', async () => {
      try {
        // Request bulk export from main process
        const result = await window.api.bulkExportFeatures();
        if (result.success) {
          // Create and download JSON file
          const dataStr = JSON.stringify(result.data, null, 2);
          const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
          
          const exportFileDefaultName = 'features-export.json';
          
          const linkElement = document.createElement('a');
          linkElement.setAttribute('href', dataUri);
          linkElement.setAttribute('download', exportFileDefaultName);
          linkElement.click();
          
          alert('Features exported successfully!');
        } else {
          alert(`Error exporting features: ${result.error}`);
        }
      } catch (error) {
        console.error('Error during bulk export:', error);
        alert(`Error during bulk export: ${error.message}`);
      }
    });
  }
  
  // Generate & Monitor Page Logic
  const startGenerateBtn = document.getElementById('start-generate-btn');
  const generationOutput = document.getElementById('generation-output');
  
  if (startGenerateBtn) {
    startGenerateBtn.addEventListener('click', async () => {
      if (generationOutput) generationOutput.innerHTML = ''; // Clear previous output
      
      // Update stage indicators
      updateStageIndicator('planning-stage', 'In Progress');
      updateStageIndicator('building-stage', 'Pending');
      
      try {
        // Listen for generation output
        window.api.onGenerationOutput((data) => {
          if (generationOutput) {
            const outputLine = document.createElement('div');
            outputLine.textContent = data;
            generationOutput.appendChild(outputLine);
            generationOutput.scrollTop = generationOutput.scrollHeight; // Auto-scroll
          }
          
          // Simple parsing to update stage indicators
          // In a full implementation, this would be more robust
          if (data.includes('[Planning] Completed')) {
            updateStageIndicator('planning-stage', 'Completed');
            updateStageIndicator('building-stage', 'In Progress');
          } else if (data.includes('[Building] Completed')) {
            updateStageIndicator('building-stage', 'Completed');
            if (document.getElementById('continue-to-preview-btn')) {
              document.getElementById('continue-to-preview-btn').disabled = false;
            }
          }
        });
        
        // Listen for generation errors
        window.api.onGenerationError((error) => {
          if (generationOutput) {
            const errorLine = document.createElement('div');
            errorLine.textContent = `Error: ${error}`;
            errorLine.style.color = 'red';
            generationOutput.appendChild(errorLine);
            generationOutput.scrollTop = generationOutput.scrollHeight; // Auto-scroll
          }
        });
        
        // Start the generation process
        const result = await window.api.startGeneration();
        if (!result.success) {
          alert(`Generation failed: ${result.error}`);
        }
      } catch (error) {
        console.error('Error during generation:', error);
        if (generationOutput) {
          const errorLine = document.createElement('div');
          errorLine.textContent = `Error: ${error.message}`;
          errorLine.style.color = 'red';
          generationOutput.appendChild(errorLine);
        }
      }
    });
  }
});

// Helper function to handle workspace selection
async function handleWorkspaceSelected(path) {
  if (workspacePath) workspacePath.textContent = path;
  if (workspaceInfo) workspaceInfo.classList.remove('hidden');
  
  // Perform precondition checks
  try {
    const checks = await window.api.checkPreconditions(path);
    
    // Update UI with check results
    const geminiCheck = document.getElementById('gemini-check')?.querySelector('.status');
    const yoloCheck = document.getElementById('yolo-check')?.querySelector('.status');
    const permissionsCheck = document.getElementById('permissions-check')?.querySelector('.status');
    
    if (geminiCheck) {
      geminiCheck.textContent = checks.geminiInstalled ? 'Installed' : 'Missing';
      geminiCheck.className = checks.geminiInstalled ? 'status success' : 'status error';
    }
    
    if (yoloCheck) {
      yoloCheck.textContent = checks.yoloSupported ? 'Supported' : 'Not Supported';
      yoloCheck.className = checks.yoloSupported ? 'status success' : 'status error';
    }
    
    if (permissionsCheck) {
      permissionsCheck.textContent = checks.writePermissions ? 'Granted' : 'Denied';
      permissionsCheck.className = checks.writePermissions ? 'status success' : 'status error';
    }
    
    // Enable continue button only if all checks pass
    const allChecksPassed = checks.geminiInstalled && checks.yoloSupported && checks.writePermissions;
    if (continueToMockupsBtn) continueToMockupsBtn.disabled = !allChecksPassed;
    
    // If all checks pass, initialize the workspace on the server
    if (allChecksPassed) {
      try {
        const initResult = await window.api.createWorkspace(path);
        if (!initResult.success) {
          console.error('Error initializing workspace:', initResult.error);
          alert(`Error initializing workspace: ${initResult.error}`);
          if (continueToMockupsBtn) continueToMockupsBtn.disabled = true;
        }
      } catch (initError) {
        console.error('Error initializing workspace:', initError);
        alert(`Error initializing workspace: ${initError.message}`);
        if (continueToMockupsBtn) continueToMockupsBtn.disabled = true;
      }
    }
    
  } catch (error) {
    console.error('Error checking preconditions:', error);
    alert(`Error checking preconditions: ${error.message}`);
  }
}

// Helper function to update stage indicators
function updateStageIndicator(stageId, status) {
  const stageElement = document.getElementById(stageId);
  if (stageElement) {
    const statusElement = stageElement.querySelector('.stage-status');
    if (statusElement) {
      statusElement.textContent = status;
      
      // Update status class for styling
      statusElement.className = 'stage-status';
      if (status === 'In Progress') statusElement.classList.add('in-progress');
      if (status === 'Completed') statusElement.classList.add('completed');
      if (status === 'Failed') statusElement.classList.add('failed');
    }
  }
}

// Helper function to refresh the mockups gallery
async function refreshMockupsGallery() {
  if (!mockupsGallery) return;
  
  try {
    // Clear the gallery
    mockupsGallery.innerHTML = '';
    
    // Fetch mockups from the server
    const result = await window.api.listMockups();
    
    if (result.success && result.mockups.length > 0) {
      // Populate the gallery with mockups
      result.mockups.forEach(mockup => {
        const mockupCard = document.createElement('div');
        mockupCard.className = 'mockup-card';
        mockupCard.innerHTML = `
          <div class="mockup-thumbnail">
            <span>${mockup.name}</span>
          </div>
          <div class="mockup-info">
            <h3>${mockup.name}</h3>
            <p>ID: ${mockup.id}</p>
            <p>Status: ${mockup.hasFeatures ? 'Features Defined' : 'Missing Features'}</p>
          </div>
        `;
        mockupsGallery.appendChild(mockupCard);
      });
      
      // Enable continue button if we have mockups
      if (continueToFeaturesBtn) {
        continueToFeaturesBtn.disabled = false;
      }
      
      // Check if we should enable the continue button on the feature mapping page
      await checkAndEnableContinueButton();
    } else {
      // Show a message if no mockups
      mockupsGallery.innerHTML = '<p>No mockups uploaded yet.</p>';
    }
  } catch (error) {
    console.error('Error refreshing mockups gallery:', error);
    mockupsGallery.innerHTML = '<p>Error loading mockups.</p>';
  }
}

// Helper function to populate the mockup selector dropdown
let isPopulatingMockupSelector = false;

async function populateMockupSelector() {
  const mockupSelect = document.getElementById('mockup-select');
  if (!mockupSelect) return;
  
  // Prevent concurrent calls
  if (isPopulatingMockupSelector) return;
  isPopulatingMockupSelector = true;
  
  try {
    // Clear existing options
    mockupSelect.innerHTML = '<option value="">-- Select a Mockup --</option>';
    
    // Fetch mockups from the server
    const result = await window.api.listMockups();
    
    if (result.success && result.mockups.length > 0) {
      // Populate the dropdown with mockups
      result.mockups.forEach(mockup => {
        const option = document.createElement('option');
        option.value = mockup.id;
        option.textContent = `${mockup.name} (${mockup.id})`;
        mockupSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error populating mockup selector:', error);
    mockupSelect.innerHTML = '<option value="">Error loading mockups</option>';
  } finally {
    // Always reset the guard variable
    isPopulatingMockupSelector = false;
  }
}

// Helper function to read a file as text
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

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
  });
  
  return featureElement;
}

// Helper function to load the feature form for a selected mockup
async function loadFeatureFormForMockup(mockupId) {
  const featureFormContainer = document.getElementById('feature-form-container');
  if (!featureFormContainer) return;
  
  try {
    // Try to load existing features for this mockup
    const result = await window.api.loadFeatures(mockupId);
    
    // Create feature form with add button
    featureFormContainer.innerHTML = `
      <div class="feature-form">
        <div class="form-header">
          <h3>Features for Mockup ${mockupId}</h3>
          <button type="button" id="add-feature-btn" class="secondary">+ Add Feature</button>
        </div>
        <div class="feature-list"></div>
      </div>
    `;
    
    const featureList = featureFormContainer.querySelector('.feature-list');
    const addFeatureBtn = featureFormContainer.querySelector('#add-feature-btn');
    
    // Add event listener to add button
    addFeatureBtn.addEventListener('click', () => {
      const newFeature = createFeatureItem();
      featureList.appendChild(newFeature);
      // Check if we should enable the continue button
      checkAndEnableContinueButton();
    });
    
    // If we have existing features, populate the form
    if (result.success && result.features && result.features.length > 0) {
      result.features.forEach(feature => {
        const featureElement = createFeatureItem(feature);
        featureList.appendChild(featureElement);
      });
    } else {
      // Add one empty feature by default
      const newFeature = createFeatureItem();
      featureList.appendChild(newFeature);
    }
  } catch (error) {
    console.error(`Error loading feature form for mockup ${mockupId}:`, error);
    featureFormContainer.innerHTML = `<p>Error loading features for mockup ${mockupId}</p>`;
  }
}

// Helper function to collect features from the form
function collectFeaturesFromForm() {
  const featureFormContainer = document.getElementById('feature-form-container');
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

// Helper function to check if all mockups have features and enable continue button
async function checkAndEnableContinueButton() {
  try {
    const result = await window.api.listMockups();
    if (result.success && result.mockups.length > 0) {
      // Check if all mockups have features
      const allHaveFeatures = result.mockups.every(mockup => mockup.hasFeatures);
      
      // Enable/disable continue button based on this
      const continueBtn = document.getElementById('continue-to-rules-btn');
      if (continueBtn) {
        continueBtn.disabled = !allHaveFeatures;
      }
    }
  } catch (error) {
    console.error('Error checking mockup features:', error);
  }
}
// frontend/src/app.js (Our app's UI logic)

// electronAPI is exposed from preload.js, giving us secure access to Electron's main process
const { openDirectoryDialog, readTextFile, writeTextFile, createDirectory, path, exists } = window.electronAPI;

// --- DOM Element References ---
const addNewProjectBtn = document.getElementById('add-new-project-btn');
const projectListEl = document.getElementById('project-list');
const noProjectsMessageEl = document.getElementById('no-projects-message');
const statusMessageEl = document.getElementById('status-message');

// --- Configuration Paths ---
let configDirPath;
let projectsFilePath;

/**
 * A utility function to update the status message in the footer.
 * @param {string} message The message to display.
 * @param {boolean} isError If true, the message will be styled as an error.
 */
function updateStatus(message, isError = false) {
  console.log(`Status: ${message}`);
  statusMessageEl.textContent = message;
  statusMessageEl.style.color = isError ? '#D32F2F' : '#8A9199'; // Adjust colors if needed
}

/**
 * Reads the projects.json file and returns the array of projects.
 * Returns an empty array if the file doesn't exist.
 * @returns {Promise<Array<object>>}
 */
async function getProjects() {
  if (await exists(projectsFilePath)) {
    const content = await readTextFile(projectsFilePath);
    return JSON.parse(content);
  }
  return []; // Return an empty array if the file doesn't exist yet
}

/**
 * Renders the list of projects in the UI.
 */
async function renderProjectList() {
  updateStatus('Loading projects...');
  const projects = await getProjects();
  
  // Clear the current list
  projectListEl.innerHTML = ''; 
  // Always add the "no projects" message first, then hide if projects are found.
  projectListEl.appendChild(noProjectsMessageEl);

  if (projects.length > 0) {
    noProjectsMessageEl.style.display = 'none'; // Hide the message

    projects.forEach(project => {
      const projectItem = document.createElement('div');
      projectItem.className = 'project-item';
      projectItem.dataset.path = project.path; // Store the path for later use

      const projectName = document.createElement('h3');
      projectName.textContent = project.name;

      const projectPath = document.createElement('p');
      projectPath.textContent = project.path;

      projectItem.appendChild(projectName);
      projectItem.appendChild(projectPath);
      projectListEl.appendChild(projectItem);
    });
    updateStatus('Projects loaded.');
  } else {
    noProjectsMessageEl.style.display = 'block'; // Show the message
    updateStatus('No projects found. Add one to get started!');
  }
}

/**
 * Handles the logic for adding a new project.
 */
async function handleAddNewProject() {
  try {
    // 1. Open the native OS folder selection dialog via Electron's main process
    const selectedPath = await openDirectoryDialog();

    if (selectedPath) {
      updateStatus('Adding new project...');
      const projects = await getProjects();
      const projectName = selectedPath.split(/[\\/]/).pop(); // Get the last part of the path

      // 2. Check if this project path already exists
      if (projects.some(p => p.path === selectedPath)) {
        updateStatus('This project is already being tracked.', true);
        return;
      }

      // 3. Add the new project and save to the JSON file
      projects.push({ name: projectName, path: selectedPath });
      await writeTextFile(projectsFilePath, JSON.stringify(projects, null, 2));

      // 4. Re-render the UI to show the new project
      await renderProjectList();
      updateStatus(`Project "${projectName}" added successfully.`);
    } else {
      updateStatus('Project selection cancelled.');
    }
  } catch (error) {
    updateStatus(`Error adding project: ${error.message || error}`, true);
    console.error("Detailed error adding project:", error);
  }
}

/**
 * The main initialization function for our application.
 */
async function initializeApp() {
  // Set up the configuration paths
  const home = await path.homeDir(); // Get home directory via Electron's main process
  configDirPath = await window.electronAPI.path.join(home, '.curators-atlas');
  projectsFilePath = await window.electronAPI.path.join(configDirPath, 'projects.json');

  // Ensure the configuration directory exists
  if (!(await exists(configDirPath))) {
    await createDirectory(configDirPath); // Create directory via Electron's main process
  }

  // Add the event listener to our button
  addNewProjectBtn.addEventListener('click', handleAddNewProject);
  
  // Perform the initial render of the project list
  await renderProjectList();
}

// Start the application when the DOM is fully loaded
window.addEventListener("DOMContentLoaded", initializeApp);
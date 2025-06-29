document.addEventListener('DOMContentLoaded', async () => {
    // Main UI Elements
    const welcomeScreen = document.getElementById('welcome-screen');
    const projectMapContainer = document.getElementById('project-map-container');
    const mainContent = document.querySelector('.main-content'); // Parent for switching views

    // Sidebar Elements
    const projectList = document.getElementById('project-list');
    const addProjectBtn = document.getElementById('add-project-btn');
    const githubUrlInput = document.getElementById('github-url-input');
    const saveRepoBtn = document.getElementById('save-repo-btn');
    const armoryList = document.getElementById('armory-list');

    // Project Map Elements
    const fileTreeContainer = document.getElementById('file-tree');
    const collapseAllBtn = document.getElementById('collapse-all-btn');
    const expandAllBtn = document.getElementById('expand-all-btn');
    
    // Goal Definition Elements
    const goalDefinitionContainer = document.getElementById('goal-definition-container');
    const goalInput = document.getElementById('goal-input');
    const clearGoalBtn = document.getElementById('clear-goal-btn');

    // Footer & Status Elements
    const statusIndicator = document.getElementById('status-indicator');
    const statusMessage = document.getElementById('status-message');
    
    // App State
    let projects = [];
    let enrichedRepos = [];

    // --- Utility Functions ---

    // Update status message
    const updateStatus = (message, isError = false) => {
        statusMessage.textContent = message;
        statusMessage.style.color = isError ? 'var(--error)' : 'var(--text-secondary)';
    };

    // --- Rendering Functions ---

    // Function to render enriched repos in the Armory
    const renderEnrichedRepos = () => {
        armoryList.innerHTML = '';
        if (enrichedRepos.length === 0) {
            armoryList.innerHTML = '<div class="empty-state">No repositories enriched yet</div>';
            return;
        }
        
        enrichedRepos.forEach(repo => {
            const repoItem = document.createElement('div');
            repoItem.className = 'armory-item';
            repoItem.innerHTML = `
                <h4>${repo.url.split('/').pop()}</h4>
                <p><strong>Summary:</strong> ${repo.one_liner}</p>
                <p><strong>Tags:</strong> ${repo.capability_tags.join(', ')}</p>
            `;
            armoryList.appendChild(repoItem);
        });
    };

    // Function to render the interactive file tree
    const renderFileTree = (node, parentElement) => {
        if (!node) return;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'file-tree-item';
        itemDiv.dataset.type = node.type;

        const nameSpan = document.createElement('span');
        nameSpan.textContent = node.name;
        itemDiv.appendChild(nameSpan);

        if (node.type === 'directory') {
            itemDiv.classList.add('directory');
            // Add click listener to the name to toggle collapse/expand
            nameSpan.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent other clicks
                itemDiv.classList.toggle('collapsed');
            });

            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children';
            // Start with directories collapsed by default for a cleaner view
            itemDiv.classList.add('collapsed');
            
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => renderFileTree(child, childrenContainer));
                itemDiv.appendChild(childrenContainer);
            }
        } else {
            itemDiv.classList.add('file');
        }

        parentElement.appendChild(itemDiv);
    };

    // Function to render projects in the Project Hub
    const renderProjects = () => {
        projectList.innerHTML = '';
        if (projects.length === 0) {
            projectList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📁</div>
                    <p>No projects added yet</p>
                    <button id="add-first-project" class="action-btn">Add Your First Project</button>
                </div>
            `;
            
            document.getElementById('add-first-project').addEventListener('click', handleAddProject);
            return;
        }
        
        projects.forEach(project => {
            const projectDiv = document.createElement('div');
            projectDiv.className = 'project-item';
            projectDiv.innerHTML = `
                <h3>${project.name}</h3>
                <p>${project.path}</p>
                <button class="remove-project-btn" data-path="${project.path}">✕</button>
            `;
            projectList.appendChild(projectDiv);

            // Event listener for removing a project
            projectDiv.querySelector('.remove-project-btn').addEventListener('click', async (event) => {
                event.stopPropagation();
                const projectPathToRemove = event.target.dataset.path;
                if (confirm(`Remove project: ${project.name}?`)) {
                    projects = projects.filter(p => p.path !== projectPathToRemove);
                    await window.electronAPI.writeProjectsFile(projects);
                    renderProjects();
                    updateStatus(`Project "${project.name}" removed`);
                }
            });

            // Event listener for selecting a project
            projectDiv.addEventListener('click', async () => {
                updateStatus(`Scanning project: ${project.name}...`);
                try {
                    const response = await fetch('http://127.0.0.1:5001/api/scan_project', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ path: project.path }),
                    });

                    const data = await response.json();
                    if (response.ok) {
                        updateStatus(`Project "${project.name}" loaded successfully`);
                        // Switch the main view from welcome screen to the project map
                        welcomeScreen.style.display = 'none';
                        projectMapContainer.style.display = 'flex';
                        
                        fileTreeContainer.innerHTML = ''; // Clear previous tree
                        data.children.forEach(child => renderFileTree(child, fileTreeContainer));
                    } else {
                        updateStatus(`Scan failed: ${data.error}`, true);
                    }
                } catch (error) {
                    updateStatus(`Error connecting to backend: ${error.message}`, true);
                }
            });
        });
    };

    // --- Event Handlers & Initializers ---

    // Add project helper function
    const addProject = async (selectedPath) => {
        const projectName = selectedPath.split(/[\\/]/).pop();
        const newProject = { name: projectName, path: selectedPath };

        if (!projects.some(p => p.path === newProject.path)) {
            projects.push(newProject);
            await window.electronAPI.writeProjectsFile(projects);
            renderProjects();
            updateStatus(`Project "${projectName}" added`);
        } else {
            updateStatus('Project already exists', true);
        }
    };
    
    // Handler for clicking the 'Add Project' or 'Add First Project' button
    const handleAddProject = async () => {
        const selectedPath = await window.electronAPI.openDirectoryDialog();
        if (selectedPath) {
            addProject(selectedPath);
        }
    };

    // Load projects from file on startup
    const loadProjects = async () => {
        try {
            updateStatus('Loading projects...');
            const loadedProjects = await window.electronAPI.readProjectsFile();
            projects = loadedProjects || [];
            renderProjects();
        } catch (error) {
            console.error('Failed to load projects:', error);
            updateStatus('Failed to load projects.', true);
            projects = [];
            renderProjects();
        }
    };
    
    // Handle adding a new project
    addProjectBtn.addEventListener('click', handleAddProject);
    
    // Handle saving and enriching a GitHub repo
    saveRepoBtn.addEventListener('click', async () => {
        const githubUrl = githubUrlInput.value.trim();
        if (!githubUrl) {
            updateStatus('Please enter a GitHub URL', true);
            githubUrlInput.focus();
            return;
        }

        updateStatus(`Enriching repository: ${githubUrl}...`);
        try {
            const response = await fetch('http://127.0.0.1:5001/api/enrich_repo', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ url: githubUrl }),
            });

            const data = await response.json();
            if (response.ok) {
                enrichedRepos.push(data);
                renderEnrichedRepos();
                githubUrlInput.value = '';
                updateStatus(`Repository enriched successfully`);
            } else {
                updateStatus(`Enrichment failed: ${data.error}`, true);
            }
        } catch (error) {
            updateStatus(`Error connecting to backend: ${error.message}`, true);
        }
    });

    // Handle map controls
    collapseAllBtn.addEventListener('click', () => {
        fileTreeContainer.querySelectorAll('.file-tree-item.directory').forEach(dir => {
            dir.classList.add('collapsed');
        });
    });

    expandAllBtn.addEventListener('click', () => {
        fileTreeContainer.querySelectorAll('.file-tree-item.directory').forEach(dir => {
            dir.classList.remove('collapsed');
        });
    });

    // Handle goal input changes
    goalInput.addEventListener('input', (event) => {
        if (event.target.value) {
            goalInput.style.background = 'rgba(187, 134, 252, 0.05)';
        } else {
            goalInput.style.background = 'transparent';
        }
    });

    clearGoalBtn.addEventListener('click', () => {
        goalInput.value = '';
        goalInput.dispatchEvent(new Event('input')); // Trigger style change
    });
    
    // Simulate backend status heartbeat
    setInterval(() => {
        // This is a visual effect and does not check actual connectivity
        statusIndicator.style.background = `rgba(76, 175, 80, ${0.1 + 0.05 * Math.random()})`;
        statusIndicator.querySelector('.status-dot').style.boxShadow = 
            `0 0 8px rgba(76, 175, 80, ${0.5 + 0.3 * Math.random()})`;
    }, 2000);

    // Initial application load sequence
    const initialLoad = async () => {
        await loadProjects();
        
        updateStatus('Loading repositories...');
        enrichedRepos = await window.electronAPI.readAllEnrichedRepos();
        renderEnrichedRepos();
        
        updateStatus('Ready');
    };
    
    initialLoad();
});
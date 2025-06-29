document.addEventListener('DOMContentLoaded', async () => {
    // --- Navigation Elements ---
    const backBtn = document.getElementById('back-btn');
    const forwardBtn = document.getElementById('forward-btn');

    // --- App Views ---
    const projectHubView = document.getElementById('project-hub-view');
    const projectAnvilView = document.getElementById('project-anvil-view');
    const comparisonView = document.getElementById('comparison-view');

    // --- Project Hub Elements ---
    const projectCardList = document.getElementById('project-card-list');
    const addProjectBtn = document.getElementById('add-project-btn');
    const githubUrlInput = document.getElementById('github-url-input');
    const saveRepoBtn = document.getElementById('save-repo-btn');

    // --- Project Anvil Elements ---
    const projectTitle = document.getElementById('project-title');
    const fileTreeContainer = document.getElementById('file-tree');
    const collapseAllBtn = document.getElementById('collapse-all-btn');
    const expandAllBtn = document.getElementById('expand-all-btn');
    const goalInput = document.getElementById('goal-input');
    const clearGoalBtn = document.getElementById('clear-goal-btn');
    const findSolutionsBtn = document.getElementById('find-solutions-btn');
    const armoryList = document.getElementById('armory-list');

    // --- Footer & Status Elements ---
    const statusIndicator = document.getElementById('status-indicator');
    const statusMessage = document.getElementById('status-message');
    
    // --- App State ---
    let projects = [];
    let enrichedRepos = [];
    let activeProject = null;
    let history = [];
    let historyIndex = -1;

    const updateStatus = (message, isError = false) => {
        statusMessage.textContent = message;
        statusMessage.style.color = isError ? 'var(--error)' : 'var(--text-secondary)';
    };

    // --- Navigation & View Management ---

    const updateNavButtons = () => {
        backBtn.disabled = historyIndex <= 0;
        forwardBtn.disabled = historyIndex >= history.length - 1;
    };

    const navigateTo = (state, fromHistory = false) => {
        if (!fromHistory) {
            // If not navigating from history, it's a new action.
            // Truncate future history if we are branching off.
            if (historyIndex < history.length - 1) {
                history = history.slice(0, historyIndex + 1);
            }
            history.push(state);
            historyIndex = history.length - 1;
        }

        activeProject = state.project;

        if (state.view === 'hub') {
            projectAnvilView.style.display = 'none';
            comparisonView.style.display = 'none';
            projectHubView.style.display = 'flex';
            renderProjects();
        } else if (state.view === 'anvil') {
            projectHubView.style.display = 'none';
            comparisonView.style.display = 'none';
            projectTitle.textContent = state.project.name;
            projectAnvilView.style.display = 'flex';
            scanProject(state.project);
        } else if (state.view === 'comparison') {
            projectHubView.style.display = 'none';
            projectAnvilView.style.display = 'none';
            comparisonView.style.display = 'flex';
            // We will call a new render function here later
        }

        updateNavButtons();
    };

    backBtn.addEventListener('click', () => {
        if (historyIndex > 0) {
            historyIndex--;
            navigateTo(history[historyIndex], true);
        }
    });

    forwardBtn.addEventListener('click', () => {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            navigateTo(history[historyIndex], true);
        }
    });

    const switchToAnvilView = (project) => {
        navigateTo({ view: 'anvil', project: project });
    };

    const switchToHubView = () => {
        navigateTo({ view: 'hub', project: null });
    };

    // --- Rendering Functions ---

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
            nameSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                itemDiv.classList.toggle('collapsed');
            });

            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children';
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

    const renderProjects = () => {
        projectCardList.innerHTML = '';
        if (projects.length === 0) {
            projectCardList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📁</div>
                    <p>No projects yet. Add one to begin.</p>
                </div>
            `;
            return;
        }
        
        projects.forEach(project => {
            const projectCard = document.createElement('div');
            projectCard.className = 'project-card';
            projectCard.innerHTML = `
                <h3>${project.name}</h3>
                <p>${project.path}</p>
                <button class="remove-project-btn" data-path="${project.path}">✕</button>
            `;
            projectCardList.appendChild(projectCard);

            projectCard.querySelector('.remove-project-btn').addEventListener('click', async (event) => {
                event.stopPropagation();
                const projectPathToRemove = event.target.dataset.path;
                if (confirm(`Remove project: ${project.name}?`)) {
                    projects = projects.filter(p => p.path !== projectPathToRemove);
                    await window.electronAPI.writeProjectsFile(projects);
                    renderProjects();
                    updateStatus(`Project "${project.name}" removed`);
                }
            });

            projectCard.addEventListener('click', () => {
                switchToAnvilView(project);
            });
        });
    };

    // --- API & Backend Functions ---

    const scanProject = async (project) => {
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
                fileTreeContainer.innerHTML = '';
                data.children.forEach(child => renderFileTree(child, fileTreeContainer));
            } else {
                updateStatus(`Scan failed: ${data.error}`, true);
                switchToHubView(); // Go back if scan fails
            }
        } catch (error) {
            updateStatus(`Error connecting to backend: ${error.message}`, true);
            switchToHubView(); // Go back if scan fails
        }
    };

    // --- Event Handlers & Initializers ---

    const handleAddProject = async () => {
        const selectedPath = await window.electronAPI.openDirectoryDialog();
        if (selectedPath) {
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
        }
    };

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
    
    addProjectBtn.addEventListener('click', handleAddProject);
    
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

    goalInput.addEventListener('input', () => {
        findSolutionsBtn.disabled = goalInput.value.trim() === '';
    });

    clearGoalBtn.addEventListener('click', () => {
        goalInput.value = '';
        findSolutionsBtn.disabled = true;
    });

    findSolutionsBtn.addEventListener('click', () => {
        const goalText = goalInput.value.trim();
        if (!goalText || !activeProject) {
            updateStatus('Please define a goal and select a project first.', true);
            return;
        }
        updateStatus(`Finding solutions for goal: "${goalText}"...`);
        // Placeholder for future API call
        console.log('Finding solutions for:', {
            goal: goalText,
            project: activeProject
        });
    });
    
    // --- Initial Load ---
    const initialLoad = async () => {
        await loadProjects();
        
        updateStatus('Loading repositories...');
        enrichedRepos = await window.electronAPI.readAllEnrichedRepos();
        renderEnrichedRepos();
        
        updateStatus('Ready');
        switchToHubView(); // Ensure we start at the hub
    };
    
    initialLoad();
});
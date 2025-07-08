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
    const deleteRepoBtn = document.getElementById('delete-repo-btn');

    // --- Footer & Status Elements ---
    const statusIndicator = document.getElementById('status-indicator');
    const statusMessage = document.getElementById('status-message');
    const llmModelSelect = document.getElementById('llm-model-select');
    
    // --- App State ---
    let projects = [];
    let enrichedRepos = [];
    let activeProject = null;
    let history = [];
    let historyIndex = -1;

    // Utility to generate a simple UUID
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

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
            renderComparisonCards(state.analysis);
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
        console.log('Project object passed to switchToAnvilView:', project);
        navigateTo({ view: 'anvil', project: project });
    };

    const switchToHubView = () => {
        navigateTo({ view: 'hub', project: null });
    };

    // --- Rendering Functions ---

    const renderEnrichedRepos = () => {
        armoryList.innerHTML = '';
        deleteRepoBtn.disabled = true; // Disable button initially
        if (enrichedRepos.length === 0) {
            armoryList.innerHTML = '<div class="empty-state">No repositories enriched yet</div>';
            return;
        }
        
        enrichedRepos.forEach(repo => {
            const repoItem = document.createElement('div');
            repoItem.className = 'armory-item';
            repoItem.dataset.repoUrl = repo.url; // Use dataset for the URL

            // Safely access properties with default values
            const repoName = repo.repo_name || 'Unnamed Repo';
            const repoUrl = repo.url || '#';
            const oneLiner = repo.one_liner || 'No summary available.';
            const language = repo.primary_language || 'N/A';
            const dependencies = repo.key_dependencies || [];
            const installMethod = repo.installation_method || 'N/A';
            const useCase = repo.primary_use_case || 'N/A';
            const integration = repo.integration_points || 'N/A';
            const tags = repo.capability_tags || [];

            repoItem.innerHTML = `
                <div class="armory-item-header">
                    <h4>${repoName}</h4>
                    <a href="${repoUrl}" target="_blank" class="repo-link">${repoUrl}</a>
                </div>
                <p class="repo-summary">${oneLiner}</p>
                <div class="repo-details">
                    <div class="detail-item">
                        <strong>Language:</strong>
                        <span class="language-tag">${language}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Primary Use Case:</strong>
                        <span>${useCase}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Installation:</strong>
                        <code class="install-command">${installMethod}</code>
                    </div>
                    <div class="detail-item">
                        <strong>Key Dependencies:</strong>
                        <div class="dependency-tags">
                            ${dependencies.map(dep => `<span class="dep-tag">${dep}</span>`).join('')}
                        </div>
                    </div>
                    <div class="detail-item">
                        <strong>Integration Points:</strong>
                        <span>${integration}</span>
                    </div>
                </div>
                <div class="capability-tags">
                    ${tags.map(tag => `<span class="cap-tag">${tag}</span>`).join('')}
                </div>
            `;
            armoryList.appendChild(repoItem);

            // Event listener for selection
            repoItem.addEventListener('click', () => {
                // Clear previous selection
                const currentSelected = document.querySelector('.armory-item.selected');
                if (currentSelected) {
                    currentSelected.classList.remove('selected');
                }
                // Add selection to the clicked item
                repoItem.classList.add('selected');
                deleteRepoBtn.disabled = false; // Enable the delete button
            });
        });
    };

    deleteRepoBtn.addEventListener('click', async () => {
        const selectedRepo = document.querySelector('.armory-item.selected');
        if (selectedRepo) {
            const repoUrlToDelete = selectedRepo.dataset.repoUrl;
            if (confirm(`Are you sure you want to delete ${repoUrlToDelete}?`)) {
                await deleteRepository(repoUrlToDelete);
            }
        }
    });

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
                const clickedProjectPath = project.path;
                const updatedProject = projects.find(p => p.path === clickedProjectPath);
                if (updatedProject) {
                    switchToAnvilView(updatedProject);
                } else {
                    console.error('Clicked project not found in updated projects array.', clickedProjectPath);
                }
            });
        });
    };

    const renderComparisonCards = (candidates) => {
        const comparisonCardList = document.getElementById('comparison-card-list');
        comparisonCardList.innerHTML = '';

        if (!candidates || candidates.length === 0) {
            comparisonCardList.innerHTML = '<div class="empty-state">No candidates to display.</div>';
            return;
        }

        candidates.forEach(candidate => {
            const card = document.createElement('div');
            card.className = 'comparison-card';
            card.dataset.url = candidate.url; // Store URL for dynamic updates
            card.innerHTML = `
                <h3>${candidate.repo_name}</h3>
                <div class="info-item cost">
                    <strong>Integration Cost (Ease)</strong>
                    <span>Analyzing...</span>
                </div>
                <div class="info-item boost">
                    <strong>Capability Boost (Power)</strong>
                    <span>Analyzing...</span>
                </div>
                <button class="action-btn choose-btn" data-url="${candidate.url}" disabled>Choose ${candidate.repo_name}</button>
            `;
            comparisonCardList.appendChild(card);

            card.querySelector('.choose-btn').addEventListener('click', (e) => {
                const chosenUrl = e.target.dataset.url;
                console.log(`Chosen solution: ${chosenUrl}`);
                // Placeholder for Phase 3 logic
                updateStatus(`You have chosen ${candidate.repo_name}. Next, we will generate the playbook.`);
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
                activeProject.structure = data; // Store the project structure
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
            const projectName = selectedPath.split(/[\\/]/).pop();            const newProject = { id: generateUUID(), name: projectName, path: selectedPath };

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
            let loadedProjects = await window.electronAPI.readProjectsFile();
            
            // Assign IDs to projects if they don't have one (for backward compatibility)
            let projectsUpdated = false;
            if (loadedProjects) {
                loadedProjects = loadedProjects.map(p => {
                    if (!p.id) {
                        projectsUpdated = true;
                        return { ...p, id: generateUUID() };
                    }
                    return p;
                });
            }

            projects = loadedProjects || [];
            if (projectsUpdated) {
                await window.electronAPI.writeProjectsFile(projects);
            }
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
                // No longer pushing to enrichedRepos directly, as it will be reloaded
                // from the armory directory, which now contains the full BriefingCard.
                // This also ensures the armory index is rebuilt.
                await loadEnrichedRepos(); 
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

    findSolutionsBtn.addEventListener('click', async () => {
        const goalText = goalInput.value.trim();
        if (!goalText || !activeProject || !activeProject.structure) {
            updateStatus('Please define a goal and ensure the project is fully scanned.', true);
            return;
        }

        updateStatus(`Finding solution candidates for: "${goalText}"...`);
        try {
            // Step 1: Find potential solution candidates (fast)
            const candidatesResponse = await fetch('http://127.0.0.1:5001/api/find_solution_candidates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal: goalText }),
            });

            const candidates = await candidatesResponse.json();
            if (!candidatesResponse.ok || candidates.length === 0) {
                updateStatus('No potential solutions found in your Armory for that goal.', true);
                return;
            }

            // Step 2: Switch to comparison view and render initial cards
            navigateTo({ view: 'comparison', project: activeProject, analysis: candidates });
            updateStatus('Found candidates! Running deep analysis in the background...');

            // Step 3: Run impact analysis for each candidate in the background
            const analysisPromises = candidates.map(candidate => 
                fetch('http://127.0.0.1:5001/api/run_impact_analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        project_structure: activeProject.structure,
                        goal: goalText, // Corrected key from goal_text to goal
                        repo_url: candidate.url,
                    }),
                }).then(res => res.json())
            );

            // Step 4: Update cards as analysis completes
            analysisPromises.forEach(promise => {
                promise.then(analysisData => {
                    if (analysisData && !analysisData.error) {
                        const card = document.querySelector(`.comparison-card[data-url="${analysisData.url}"]`);
                        if (card) {
                            card.querySelector('.info-item.cost').innerHTML = `<strong>Integration Cost (Ease)</strong><span>${analysisData.integration_cost} - ${analysisData.integration_justification}</span>`;
                            card.querySelector('.info-item.boost').innerHTML = `<strong>Capability Boost (Power)</strong><span>${analysisData.capability_boost} - ${analysisData.capability_justification}</span>`;
                            card.querySelector('.choose-btn').disabled = false;
                        }
                    }
                });
            });

        } catch (error) {
            updateStatus(`Error: ${error.message}`, true);
        }
    });
    
    // --- Initial Load ---
    const initialLoad = async () => {
        await loadProjects();
        await loadOllamaModels();
        
        updateStatus('Connecting to backend...');
        
        // Retry mechanism to wait for the backend to be ready
        let backendReady = false;
        for (let i = 0; i < 10; i++) { // Try up to 10 times
            try {
                await fetch('http://127.0.0.1:5001/api/build_armory_index', { method: 'POST' });
                console.log('Backend connection successful. Armory index built.');
                backendReady = true;
                break; // Exit loop on success
            } catch (error) {
                console.log('Backend not ready, retrying in 2 seconds...');
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
            }
        }

        if (!backendReady) {
            updateStatus('Failed to connect to backend after multiple retries.', true);
            console.error('Failed to build armory index on startup.');
            // Still try to load repos, maybe the index exists from a previous run
        }

        await loadEnrichedRepos();
        
        updateStatus('Ready');
        switchToHubView(); // Ensure we start at the hub
    };
    
    initialLoad();

    async function loadEnrichedRepos() {
        enrichedRepos = await window.electronAPI.readAllEnrichedRepos();
        renderEnrichedRepos();
    }

    async function deleteRepository(repoUrl) {
        updateStatus(`Deleting repository: ${repoUrl}...`);
        try {
            const response = await fetch('http://127.0.0.1:5001/api/delete_repo', {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ repo_url: repoUrl }),
            });

            const data = await response.json();
            if (response.ok) {
                updateStatus(`Repository ${repoUrl} deleted successfully.`);
                deleteRepoBtn.disabled = true; // Disable button after deletion
                await loadEnrichedRepos(); // Reload repos after deletion
            } else {
                updateStatus(`Deletion failed: ${data.error}`, true);
            }
        } catch (error) {
            updateStatus(`Error connecting to backend: ${error.message}`, true);
        }
    }

    llmModelSelect.addEventListener('change', async () => {
        const selectedModel = llmModelSelect.value;
        if (selectedModel) {
            updateStatus(`Setting LLM model to: ${selectedModel}...`);
            try {
                await window.electronAPI.setLLMModel(selectedModel);
                updateStatus(`LLM model set to: ${selectedModel}`);
            } catch (error) {
                updateStatus(`Error setting LLM model: ${error.message}`, true);
            }
        }
    });

    async function loadOllamaModels() {
        try {
            const models = await window.electronAPI.getOllamaModels();
            llmModelSelect.innerHTML = '';
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                llmModelSelect.appendChild(option);
            });
        } catch (error) {
            updateStatus(`Error loading Ollama models: ${error.message}`, true);
        }
    }});
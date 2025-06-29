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

    const renderComparisonCards = (analysisData) => {
        const comparisonCardList = document.getElementById('comparison-card-list');
        comparisonCardList.innerHTML = '';

        if (!analysisData || analysisData.length === 0) {
            comparisonCardList.innerHTML = '<div class="empty-state">No analysis data to display.</div>';
            return;
        }

        analysisData.forEach(cardData => {
            const card = document.createElement('div');
            card.className = 'comparison-card';
            card.innerHTML = `
                <h3>${cardData.repo_name}</h3>
                <div class="info-item">
                    <strong>Integration Cost (Ease)</strong>
                    <span>${cardData.integration_cost} - ${cardData.integration_justification}</span>
                </div>
                <div class="info-item">
                    <strong>Capability Boost (Power)</strong>
                    <span>${cardData.capability_boost} - ${cardData.capability_justification}</span>
                </div>
                <button class="action-btn choose-btn" data-url="${cardData.url}">Choose ${cardData.repo_name}</button>
            `;
            comparisonCardList.appendChild(card);

            card.querySelector('.choose-btn').addEventListener('click', (e) => {
                const chosenUrl = e.target.dataset.url;
                console.log(`Chosen solution: ${chosenUrl}`);
                // Placeholder for Phase 3 logic
                updateStatus(`You have chosen ${cardData.repo_name}. Next, we will generate the playbook.`);
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

    findSolutionsBtn.addEventListener('click', async () => {
        const goalText = goalInput.value.trim();
        if (!goalText || !activeProject || !activeProject.structure) {
            updateStatus('Please define a goal and ensure the project is fully scanned.', true);
            return;
        }

        updateStatus(`Finding solutions for: "${goalText}"...`);
        try {
            console.log('Sending project_id:', activeProject.id);
            console.log('Sending goal:', goalText);
            // Step 1: Find potential solutions
            const solutionsResponse = await fetch('http://127.0.0.1:5001/api/find_solutions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: activeProject.id,
                    goal: goalText
                }),
            });

            const solutionsData = await solutionsResponse.json();
            if (!solutionsResponse.ok || !solutionsData.recommendation) {
                updateStatus('No potential solutions found in your Armory for that goal.', true);
                return;
            }

            const solutionUrls = solutionsData.relevant_armory_repos.map(repo => repo.url);

            updateStatus('Found potential solutions! Running impact analysis...');

            // Step 2: Run impact analysis
            const analysisResponse = await fetch('http://127.0.0.1:5001/api/run_impact_analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_structure: activeProject.structure,
                    goal_text: goalText,
                    solution_urls: solutionUrls,
                }),
            });

            const analysisData = await analysisResponse.json();
            if (!analysisResponse.ok) {
                throw new Error(analysisData.error || 'Analysis failed');
            }

            // Step 3: Switch to comparison view and render results
            navigateTo({ view: 'comparison', project: activeProject, analysis: analysisData });

        } catch (error) {
            updateStatus(`Error: ${error.message}`, true);
        }
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
// static/js/anvil.js

document.addEventListener('DOMContentLoaded', () => {

    // --- Cache DOM element references ---
    const projectListEl = document.getElementById('project-list');
    const assetListEl = document.getElementById('asset-list');
    const blueprintTitleEl = document.getElementById('blueprint-title');
    const blueprintDescriptionEl = document.getElementById('blueprint-description');
    const blueprintComponentsEl = document.getElementById('blueprint-components'); // New reference
    const armorySearchEl = document.getElementById('armory-search');

    // --- State Management ---
    const state = {
        projects: [],
        assets: [],
        selectedProjectId: null,
        blueprintComponents: [], // New state for components
        filteredAssets: []
    };

    // --- API Functions ---
    const api = {
        fetchProjects: async () => {
            try {
                const response = await fetch('/api/projects');
                if (!response.ok) throw new Error('Network response was not ok');
                return await response.json();
            } catch (error) {
                console.error('Failed to fetch projects:', error);
                projectListEl.innerHTML = '<div class="loader">Failed to load projects.</div>';
                return [];
            }
        },
        fetchAssets: async () => {
            try {
                const response = await fetch('/api/assets');
                if (!response.ok) throw new Error('Network response was not ok');
                return await response.json();
            } catch (error) {
                console.error('Failed to fetch assets:', error);
                assetListEl.innerHTML = '<div class="loader">Failed to load assets.</div>';
                return [];
            }
        },
        // --- NEW API FUNCTION ---
        fetchBlueprint: async (projectId) => {
            if (!projectId) return [];
            try {
                const response = await fetch(`/api/project/${projectId}/blueprint`);
                if (!response.ok) throw new Error('Network response was not ok');
                return await response.json();
            } catch (error) {
                console.error(`Failed to fetch blueprint for project ${projectId}:`, error);
                blueprintComponentsEl.innerHTML = '<div class="loader">Failed to load blueprint.</div>';
                return [];
            }
        }
    };

    // --- Render Functions ---
    const render = {
        projects: () => {
            projectListEl.innerHTML = '';
            if (state.projects.length === 0) {
                projectListEl.innerHTML = '<div class="loader">No projects found.</div>';
                return;
            }
            state.projects.forEach(project => {
                const projectEl = document.createElement('div');
                projectEl.className = 'project-item';
                projectEl.dataset.projectId = project.id;
                
                projectEl.innerHTML = `
                    <h3>${project.name}</h3>
                    <p>${project.description || 'No description.'}</p>
                `;

                if (project.id === state.selectedProjectId) {
                    projectEl.classList.add('selected');
                }
                projectListEl.appendChild(projectEl);
            });
        },
        assets: () => {
            assetListEl.innerHTML = '';
            const assetsToRender = state.filteredAssets.length > 0 || armorySearchEl.value ? state.filteredAssets : state.assets;

            if (assetsToRender.length === 0) {
                assetListEl.innerHTML = '<div class="loader">No assets found.</div>';
                return;
            }

            assetsToRender.forEach(asset => {
                const cardEl = document.createElement('div');
                cardEl.className = 'asset-card';
                const tags = asset.tags ? asset.tags.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('') : '';
                cardEl.innerHTML = `
                    <h3>${asset.author}</h3>
                    <p class="summary">${asset.one_liner_summary}</p>
                    <div class="tags">${tags}</div>
                `;
                assetListEl.appendChild(cardEl);
            });
        },
        blueprint: () => {
            blueprintComponentsEl.innerHTML = ''; // Clear previous components
            if (state.selectedProjectId) {
                const project = state.projects.find(p => p.id === state.selectedProjectId);
                if (project) {
                    blueprintTitleEl.textContent = project.name;
                    blueprintDescriptionEl.textContent = project.description || 'No description provided.';
                }
                
                if (state.blueprintComponents.length > 0) {
                    state.blueprintComponents.forEach(component => {
                        const componentEl = document.createElement('div');
                        componentEl.className = 'component-card';
                        componentEl.innerHTML = `
                            <h4>${component.name}</h4>
                            <p>${component.description || 'Drag an asset here to assign it.'}</p>
                        `;
                        blueprintComponentsEl.appendChild(componentEl);
                    });
                } else if (project.id !== 1) { // Don't show for "Uncategorized"
                     blueprintComponentsEl.innerHTML = '<div class="loader">No components defined for this project.</div>';
                }

            } else {
                blueprintTitleEl.textContent = 'Select a Project';
                blueprintDescriptionEl.textContent = 'Your strategic workspace will appear here.';
            }
        }
    };

    // --- Event Handlers ---
    // --- MODIFIED: This handler is now more powerful ---
    const handleProjectClick = async (event) => {
        const projectItem = event.target.closest('.project-item');
        if (projectItem) {
            const projectId = parseInt(projectItem.dataset.projectId, 10);
            
            // If the same project is clicked, do nothing.
            if (projectId === state.selectedProjectId) return;

            state.selectedProjectId = projectId;
            
            // Show loading state immediately for better UX
            blueprintComponentsEl.innerHTML = '<div class="loader">Loading Blueprint...</div>';
            
            // Fetch the blueprint for the newly selected project
            const components = await api.fetchBlueprint(projectId);
            state.blueprintComponents = components;
            
            // Re-render everything to update the UI
            render.projects(); // To update the 'selected' highlight
            render.blueprint(); // To show the new header and components
        }
    };

    const handleArmorySearch = (event) => {
        const searchTerm = event.target.value.toLowerCase();
        if (!searchTerm) {
            state.filteredAssets = state.assets;
        } else {
            state.filteredAssets = state.assets.filter(asset => {
                const summary = asset.one_liner_summary?.toLowerCase() || '';
                const tags = asset.tags?.toLowerCase() || '';
                const author = asset.author?.toLowerCase() || '';
                return summary.includes(searchTerm) || tags.includes(searchTerm) || author.includes(searchTerm);
            });
        }
        render.assets();
    };

    // --- Initialization Function ---
    const init = async () => {
        const [projects, assets] = await Promise.all([
            api.fetchProjects(),
            api.fetchAssets()
        ]);

        state.projects = projects;
        state.assets = assets;
        state.filteredAssets = assets;

        render.projects();
        render.assets();
        render.blueprint(); // Initial render for the blueprint header

        projectListEl.addEventListener('click', handleProjectClick);
        armorySearchEl.addEventListener('input', handleArmorySearch);
    };

    // --- Run the app! ---
    init();

});
document.addEventListener('DOMContentLoaded', async () => {
    const projectList = document.getElementById('project-list');
    const addProjectBtn = document.getElementById('add-project-btn');
    const projectHub = document.getElementById('project-hub');
    const projectMapContainer = document.getElementById('project-map-container');
    const fileTreeContainer = document.getElementById('file-tree');
    const goalDefinitionContainer = document.getElementById('goal-definition-container');
    const goalInput = document.getElementById('goal-input');
    const armoryContainer = document.getElementById('armory-container');
    const githubUrlInput = document.getElementById('github-url-input');
    const saveRepoBtn = document.getElementById('save-repo-btn');
    const armoryList = document.getElementById('armory-list');

    let projects = [];
    let enrichedRepos = [];

    // Function to render enriched repos in the UI
    const renderEnrichedRepos = () => {
        armoryList.innerHTML = ''; // Clear existing list
        if (enrichedRepos.length === 0) {
            armoryList.innerHTML = '<p>No repositories enriched yet.</p>';
            return;
        }
        enrichedRepos.forEach(repo => {
            const repoItem = document.createElement('div');
            repoItem.className = 'armory-item';
            repoItem.innerHTML = `
                <h4>${repo.url}</h4>
                <p>One-Liner: ${repo.one_liner}</p>
                <p>Tags: ${repo.capability_tags.join(', ')}</p>
            `;
            armoryList.appendChild(repoItem);
        });
    };

    // Function to render the file tree
    const renderFileTree = (node, parentElement) => {
        if (!node) return;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'file-tree-item';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = node.name;
        itemDiv.appendChild(nameSpan);

        if (node.type === 'directory') {
            itemDiv.classList.add('directory');
            nameSpan.classList.add('collapsible');
            nameSpan.addEventListener('click', () => {
                itemDiv.classList.toggle('collapsed');
            });

            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children';
            node.children.forEach(child => renderFileTree(child, childrenContainer));
            itemDiv.appendChild(childrenContainer);
        } else {
            itemDiv.classList.add('file');
        }

        parentElement.appendChild(itemDiv);
    };

    // Function to render projects in the UI
    const renderProjects = () => {
        projectList.innerHTML = ''; // Clear existing list
        if (projects.length === 0) {
            projectList.innerHTML = '<p>No projects added yet. Click "+ Add New Project" to get started!</p>';
            return;
        }
        projects.forEach(project => {
            const projectDiv = document.createElement('div');
            projectDiv.className = 'project-item';
            projectDiv.innerHTML = `
                <h3>${project.name}</h3>
                <p>${project.path}</p>
                <button class="remove-project-btn" data-path="${project.path}">Remove</button>
            `;
            projectList.appendChild(projectDiv);

            // Add event listener for remove button
            projectDiv.querySelector('.remove-project-btn').addEventListener('click', async (event) => {
                event.stopPropagation(); // Prevent projectDiv click if we add one later
                const projectPathToRemove = event.target.dataset.path;
                if (confirm(`Are you sure you want to remove project: ${project.name}?`)) {
                    projects = projects.filter(p => p.path !== projectPathToRemove);
                    await window.electronAPI.writeProjectsFile(projects);
                    renderProjects();
                }
            });

            // Add click handler to open project
            projectDiv.addEventListener('click', async () => {
                console.log(`Opening project: ${project.name} at ${project.path}`);
                try {
                    const response = await fetch('http://127.0.0.1:5001/api/scan_project', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ path: project.path }),
                    });

                    const data = await response.json();
                    if (response.ok) {
                        console.log('Project scan successful:', data);
                        projectHub.style.display = 'none';
                        projectMapContainer.style.display = 'block';
                        goalDefinitionContainer.style.display = 'block'; // Show goal input
                        fileTreeContainer.innerHTML = ''; // Clear previous tree
                        data.children.forEach(child => renderFileTree(child, fileTreeContainer));
                    } else {
                        console.error('Project scan failed:', data.error);
                        alert(`Failed to scan project: ${data.error}`);
                    }
                } catch (error) {
                    console.error('Error during project scan fetch:', error);
                    alert(`An error occurred while scanning the project: ${error.message}`);
                }
            });
        });
    };

    // Load projects from file
    const loadProjects = async () => {
        try {
            const loadedProjects = await window.electronAPI.readProjectsFile();
            projects = loadedProjects || [];
            renderProjects();
        } catch (error) {
            console.error('Failed to load projects:', error);
            projects = [];
            renderProjects();
        }
    };

    // Handle adding a new project
    addProjectBtn.addEventListener('click', async () => {
        const selectedPath = await window.electronAPI.openDirectoryDialog();
        if (selectedPath) {
            const projectName = selectedPath.split(window.electronAPI.path.join('/')).pop(); // Get folder name
            const newProject = { name: projectName, path: selectedPath };

            // Check if project already exists
            if (!projects.some(p => p.path === newProject.path)) {
                projects.push(newProject);
                await window.electronAPI.writeProjectsFile(projects);
                renderProjects();
            } else {
                alert('This project is already added!');
            }
        }
    });

    // Initial load
    const initialLoad = async () => {
        await loadProjects();
        enrichedRepos = await window.electronAPI.readAllEnrichedRepos();
        renderEnrichedRepos();
    };
    initialLoad();

    // Handle goal input
    goalInput.addEventListener('input', (event) => {
        console.log('Current Goal:', event.target.value);
        // In a real app, you'd store this in a state variable
    });

    // Handle saving and enriching a GitHub repo
    saveRepoBtn.addEventListener('click', async () => {
        const githubUrl = githubUrlInput.value.trim();
        if (!githubUrl) {
            alert('Please enter a GitHub repository URL.');
            return;
        }

        console.log(`Attempting to enrich repo: ${githubUrl}`);
        try {
            const response = await fetch('http://127.0.0.1:5001/api/enrich_repo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: githubUrl }),
            });

            const data = await response.json();
            if (response.ok) {
                console.log('Repo enrichment successful:', data);
                enrichedRepos.push(data); // Add new repo to the list
                renderEnrichedRepos(); // Re-render the list
                githubUrlInput.value = ''; // Clear input
            } else {
                console.error('Repo enrichment failed:', data.error);
                alert(`Failed to enrich repo: ${data.error}`);
            }
        } catch (error) {
            console.error('Error during repo enrichment fetch:', error);
            alert(`An error occurred during repo enrichment: ${error.message}`);
        }
    });
});
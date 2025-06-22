// static/js/atlas.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State & Elements ---
    const appContainer = document.getElementById('app-container');
    const header = document.querySelector('header');
    let currentConnections = []; // Holds all Leader-Line instances

    // --- Router ---
    function navigate() {
        const hash = window.location.hash;
        currentConnections.forEach(line => line.remove());
        currentConnections = [];

        if (hash.startsWith('#project-')) {
            const projectId = hash.substring('#project-'.length);
            loadWorkshopView(projectId);
        } else {
            loadProjectHub();
        }
    }

    // --- View: Project Hub ---
    async function loadProjectHub() {
        header.innerHTML = `<h1>The Project Ignition Deck</h1><p>Your command center for turning ideas into products.</p>`;
        appContainer.className = 'projects-grid-container';
        appContainer.innerHTML = '<p class="loading-message">Loading your projects...</p>';
        try {
            const response = await fetch('/api/projects');
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            const projects = await response.json();
            
            appContainer.innerHTML = '';
            
            projects.forEach(project => appContainer.appendChild(createProjectCard(project)));
            
            appContainer.appendChild(createNewProjectCard());

        } catch (error) {
            console.error("Failed to load projects:", error);
            appContainer.innerHTML = '<p class="loading-message">Error: Could not load project data.</p>';
        }
    }

    function createProjectCard(project) {
        const cardLink = document.createElement('a');
        cardLink.className = 'project-card';
        cardLink.href = `#project-${project.id}`;
        
        const ideaCount = project.idea_count || 0;
        const lastSpark = project.last_spark_timestamp ? 
            `Last spark: ${new Date(project.last_spark_timestamp).toLocaleDateString()}` : 'No activity yet';

        cardLink.innerHTML = `
            <div>
                <h2>${project.name}</h2>
                <p>${project.description || 'No description.'}</p>
            </div>
            <div class="project-card-footer">
                <span>${lastSpark}</span>
                <span class="stats">${ideaCount} Ideas →</span>
            </div>`;
        return cardLink;
    }

    function createNewProjectCard() {
        const card = document.createElement('div');
        card.className = 'project-card new-project-card';
        card.innerHTML = `+ New Project`;
        card.addEventListener('click', showNewProjectModal);
        return card;
    }

    // --- View: Workshop ---
    async function loadWorkshopView(projectId) {
        appContainer.innerHTML = '<p class="loading-message">Loading workshop...</p>';
        appContainer.className = 'workshop-container';
        try {
            const [postsResponse, projectsResponse, layoutResponse] = await Promise.all([
                fetch(`/api/project/${projectId}`),
                fetch('/api/projects'),
                fetch(`/api/project/${projectId}/layout`)
            ]);

            if (!postsResponse.ok || !projectsResponse.ok || !layoutResponse.ok) throw new Error('Failed to fetch workshop data');
            
            const posts = await postsResponse.json();
            const projects = await projectsResponse.json();
            const layout = await layoutResponse.json();
            const currentProject = projects.find(p => p.id == projectId);
            
            header.innerHTML = `<h1>${currentProject ? currentProject.name : 'Project'}</h1><p><a href="#" id="back-to-hub">← Back to All Projects</a></p>`;
            document.getElementById('back-to-hub').addEventListener('click', (e) => {
                e.preventDefault();
                window.location.hash = '';
            });

            appContainer.innerHTML = `
                <div id="idea-stream" class="idea-stream-panel"></div>
                <div id="spark-board" class="spark-board-panel">
                    <div class="spark-board-canvas"></div>
                    <button class="save-layout-button">Save Layout</button>
                </div>
                <div id="resource-rack" class="resource-rack-panel">
                    <h3>Resources</h3>
                    <div id="resource-list-container">
                        <p class="placeholder-text">Select an idea to see its resources.</p>
                    </div>
                </div>
            `;

            const ideaStreamContainer = document.getElementById('idea-stream');
            const sparkBoardCanvas = document.querySelector('.spark-board-canvas');
            const resourceListContainer = document.getElementById('resource-list-container');

            if (posts.length === 0) {
                ideaStreamContainer.innerHTML = '<p class="placeholder-text">No ideas saved for this project yet.</p>';
            } else {
                posts.forEach(post => {
                    const ideaCard = createIdeaCard(post, resourceListContainer);
                    ideaStreamContainer.appendChild(ideaCard);
                });
            }

            const sparkNotes = new Map();
            if (layout.sparks.length > 0) {
                layout.sparks.forEach(spark => {
                    const postData = posts.find(p => p.id === spark.post_id);
                    if (postData) {
                        const stickyNote = createStickyNote(spark.id, postData, resourceListContainer);
                        stickyNote.style.left = `${spark.x_pos}px`;
                        stickyNote.style.top = `${spark.y_pos}px`;
                        sparkBoardCanvas.appendChild(stickyNote);
                        sparkNotes.set(spark.id, stickyNote);
                    }
                });
            } else {
                 sparkBoardCanvas.innerHTML += '<p class="spark-board-placeholder">Drag ideas here to build your project.</p>';
            }

            if (layout.connections.length > 0) {
                layout.connections.forEach(conn => {
                    const startEl = sparkNotes.get(conn.start_spark_id);
                    const endEl = sparkNotes.get(conn.end_spark_id);
                    if (startEl && endEl) {
                        const line = new LeaderLine(startEl, endEl, { 
                            color: 'rgba(122, 134, 245, 0.6)', 
                            size: 3, 
                            path: 'fluid' 
                        });
                        currentConnections.push(line);
                    }
                });
            }

            setupSparkBoard(sparkBoardCanvas, posts, resourceListContainer);
            
        } catch (error) {
            console.error(`Failed to load workshop for project ${projectId}:`, error);
            appContainer.innerHTML = '<p class="loading-message">Error: Could not load workshop.</p>';
        }
    }
    
    // --- Component Creation & Update Functions ---
    function createIdeaCard(post, resourceContainer) {
        const card = document.createElement('div');
        card.className = 'idea-card';
        card.dataset.postId = post.id;
        card.setAttribute('draggable', true);

        const notesHTML = post.notes ? `<div class="idea-card-notes">${post.notes}</div>` : '<p class="no-notes">No notes added.</p>';
        const authorHTML = `<p class="idea-card-author">${post.author || 'Unknown Author'}</p>`;
        const postTextHTML = `<div class="idea-card-post-text">${(post.post_text || 'No content.').substring(0, 150)}...</div>`;
        card.innerHTML = `${notesHTML}<div class="idea-card-source">${authorHTML}${postTextHTML}</div>`;

        card.addEventListener('dragstart', (event) => {
            event.target.classList.add('dragging');
            event.dataTransfer.setData('text/plain', JSON.stringify(post));
        });
        card.addEventListener('dragend', (event) => {
            event.target.classList.remove('dragging');
        });
        card.addEventListener('click', () => {
            updateResourceRack(post, resourceContainer);
            document.querySelectorAll('.idea-card.selected, .sticky-note.selected').forEach(el => el.classList.remove('selected'));
            card.classList.add('selected');
        });
        return card;
    }

    function createStickyNote(sparkId, post, resourceContainer) {
        const note = document.createElement('div');
        note.className = 'sticky-note';
        note.dataset.sparkId = sparkId;
        note.dataset.postId = post.id;

        const notesHTML = post.notes ? `<h3>${post.notes}</h3>` : '<h3>No notes.</h3>';
        note.innerHTML = `${notesHTML}<p>${post.author}</p><div class="connector-handle"></div>`;
        
        note.addEventListener('click', () => {
            updateResourceRack(post, resourceContainer);
            document.querySelectorAll('.idea-card.selected, .sticky-note.selected').forEach(el => el.classList.remove('selected'));
            note.classList.add('selected');
        });
        return note;
    }

    function updateResourceRack(post, container) {
        container.innerHTML = '';
        if (post.resources) {
            try {
                const resources = JSON.parse(post.resources);
                if (resources.length > 0) {
                    const resourceList = document.createElement('ul');
                    resourceList.className = 'resource-list';
                    resources.forEach(url => {
                        const listItem = document.createElement('li');
                        listItem.className = 'resource-item';
                        let domain = new URL(url).hostname.replace('www.', '');
                        listItem.innerHTML = `<a href="${url}" target="_blank">${domain}</a>`;
                        resourceList.appendChild(listItem);
                    });
                    container.appendChild(resourceList);
                } else {
                    container.innerHTML = '<p class="placeholder-text">No resource links found in this post.</p>';
                }
            } catch (e) {
                container.innerHTML = '<p class="placeholder-text">Error loading resources.</p>';
            }
        } else {
            container.innerHTML = '<p class="placeholder-text">No resource links found in this post.</p>';
        }
    }

    function showNewProjectModal() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal-content">
                <h2>Create a New Project</h2>
                <form id="new-project-form">
                    <div class="modal-form-group">
                        <label for="project-name">Project Name</label>
                        <input type="text" id="project-name" name="name" required>
                    </div>
                    <div class="modal-form-group">
                        <label for="project-description">Description (Optional)</label>
                        <textarea id="project-description" name="description"></textarea>
                    </div>
                    <p class="modal-error-message" id="modal-error"></p>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Project</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        const form = document.getElementById('new-project-form');
        const errorEl = document.getElementById('modal-error');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const name = formData.get('name');
            const description = formData.get('description');

            try {
                const response = await fetch('/api/projects/new', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, description })
                });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.message || 'Failed to create project.');
                }
                modalOverlay.remove();
                window.location.hash = `#project-${result.id}`;
            } catch (err) {
                errorEl.textContent = err.message;
                errorEl.style.display = 'block';
            }
        });

        modalOverlay.querySelector('#cancel-btn').addEventListener('click', () => modalOverlay.remove());
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        });
    }

    // --- Interactivity Setup ---
    function setupSparkBoard(canvas, posts, resourceContainer) {
        let line_in_progress = null;

        // --- THE FIX: Define the options for the line being dragged ---
        const lineInProgressOptions = {
            color: 'rgba(255, 255, 255, 0.5)',
            size: 4,
            dash: { animation: true },
            dropShadow: true
        };

        // Make existing notes draggable and reposition lines
        canvas.querySelectorAll('.sticky-note').forEach(note => {
            new PlainDraggable(note, { 
                containment: canvas,
                onMove: () => currentConnections.forEach(line => line.position())
            });
        });

        canvas.addEventListener('dragover', (event) => event.preventDefault());
        canvas.addEventListener('drop', (event) => {
            event.preventDefault();
            const postData = JSON.parse(event.dataTransfer.getData('text/plain'));
            const tempSparkId = `new_${Date.now()}`;
            const stickyNote = createStickyNote(tempSparkId, postData, resourceContainer);
            
            const boardRect = canvas.getBoundingClientRect();
            stickyNote.style.left = `${event.clientX - boardRect.left - 140}px`;
            stickyNote.style.top = `${event.clientY - boardRect.top - 50}px`;

            canvas.appendChild(stickyNote);
            new PlainDraggable(stickyNote, { 
                containment: canvas,
                onMove: () => currentConnections.forEach(line => line.position())
            });

            const placeholder = canvas.querySelector('.spark-board-placeholder');
            if (placeholder) placeholder.remove();
        });

        // --- THE FIX: Use event delegation on the canvas for mousedown ---
        canvas.addEventListener('mousedown', (event) => {
            if (event.target.classList.contains('connector-handle')) {
                const startNote = event.target.closest('.sticky-note');
                // Use document.body as the parent to ensure the line is drawn on top
                line_in_progress = new LeaderLine(
                    startNote, 
                    LeaderLine.pointAnchor(document.body, {x: event.clientX, y: event.clientY}), 
                    lineInProgressOptions
                );
            }
        });

        // --- THE FIX: Listen on the entire document for mousemove and mouseup ---
        document.addEventListener('mousemove', (event) => {
            if (line_in_progress) {
                line_in_progress.position();
                line_in_progress.end = LeaderLine.pointAnchor(document.body, {x: event.clientX, y: event.clientY});
            }
        });

        document.addEventListener('mouseup', (event) => {
            if (line_in_progress) {
                // Hide the temporary line before checking for a target
                line_in_progress.hide(); 
                const endTarget = document.elementFromPoint(event.clientX, event.clientY)?.closest('.sticky-note');
                
                if (endTarget && endTarget !== line_in_progress.start) {
                    // We have a valid connection, create the permanent line
                    const permanentLine = new LeaderLine(line_in_progress.start, endTarget, { 
                        color: 'rgba(122, 134, 245, 0.6)', 
                        size: 3, 
                        path: 'fluid' 
                    });
                    currentConnections.push(permanentLine);
                }
                // Remove the temporary line
                line_in_progress.remove();
                line_in_progress = null;
            }
        });

        const saveButton = document.querySelector('.save-layout-button');
        saveButton.addEventListener('click', async () => {
            saveButton.textContent = 'Saving...';
            saveButton.classList.add('saving');

            const sparksToSave = [];
            canvas.querySelectorAll('.sticky-note').forEach(note => {
                sparksToSave.push({
                    id: note.dataset.sparkId,
                    post_id: note.dataset.postId,
                    x_pos: parseFloat(note.style.left),
                    y_pos: parseFloat(note.style.top)
                });
            });

            const connectionsToSave = [];
            currentConnections.forEach(line => {
                if (line.start && line.end) { // Ensure the line is valid
                    connectionsToSave.push({
                        start_spark_id: line.start.dataset.sparkId,
                        end_spark_id: line.end.dataset.sparkId,
                        label: null
                    });
                }
            });

            const layoutPayload = {
                sparks: sparksToSave,
                connections: connectionsToSave
            };

            const projectId = window.location.hash.substring('#project-'.length);
            try {
                const response = await fetch(`/api/project/${projectId}/layout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(layoutPayload)
                });
                if (!response.ok) throw new Error('Save failed');
                navigate(); 
            } catch (error) {
                saveButton.textContent = 'Save Failed!';
                setTimeout(() => {
                    saveButton.textContent = 'Save Layout';
                    saveButton.classList.remove('saving');
                }, 2000);
            }
        });
    }

    // --- Initial Load ---
    window.addEventListener('hashchange', navigate);
    navigate();
});
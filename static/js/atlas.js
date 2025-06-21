document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app-container');
    const header = document.querySelector('header');

    function navigate() {
        const hash = window.location.hash;
        if (hash.startsWith('#project-')) {
            const projectId = hash.substring('#project-'.length);
            loadWorkshopView(projectId);
        } else {
            loadProjectHub();
        }
    }

    async function loadProjectHub() {
        header.innerHTML = `<h1>The Project Ignition Deck</h1><p>Your command center for turning ideas into products.</p>`;
        appContainer.className = 'projects-grid-container';
        appContainer.innerHTML = '<p class="loading-message">Loading your projects...</p>';
        try {
            const response = await fetch('/api/projects');
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            const projects = await response.json();
            appContainer.innerHTML = '';
            if (projects.length === 0) {
                appContainer.innerHTML = '<p class="loading-message">No projects found.</p>';
                return;
            }
            projects.forEach(project => appContainer.appendChild(createProjectCard(project)));
        } catch (error) {
            console.error("Failed to load projects:", error);
            appContainer.innerHTML = '<p class="loading-message">Error: Could not load project data.</p>';
        }
    }

    function createProjectCard(project) {
        const cardLink = document.createElement('a');
        cardLink.className = 'project-card';
        cardLink.href = `#project-${project.id}`;
        cardLink.innerHTML = `<h2>${project.name}</h2><p>${project.description || 'No description.'}</p><div class="project-card-footer">View Ideas →</div>`;
        return cardLink;
    }

    async function loadWorkshopView(projectId) {
        appContainer.innerHTML = '<p class="loading-message">Loading ideas...</p>';
        appContainer.className = 'workshop-container';
        try {
            const [postsResponse, projectsResponse] = await Promise.all([
                fetch(`/api/project/${projectId}`),
                fetch('/api/projects')
            ]);
            if (!postsResponse.ok || !projectsResponse.ok) throw new Error('Failed to fetch data');
            const posts = await postsResponse.json();
            const projects = await projectsResponse.json();
            const currentProject = projects.find(p => p.id == projectId);
            
            header.innerHTML = `<h1>${currentProject ? currentProject.name : 'Project'}</h1><p><a href="#" id="back-to-hub">← Back to All Projects</a></p>`;
            document.getElementById('back-to-hub').addEventListener('click', (e) => {
                e.preventDefault();
                window.location.hash = '';
                navigate();
            });

            appContainer.innerHTML = `
                <div id="idea-stream" class="idea-stream-panel"></div>
                <div id="spark-board" class="spark-board-panel">
                    <div class="spark-board-canvas"></div>
                    <p class="spark-board-placeholder">Drag ideas from the left stream and drop them here to build your project.</p>
                </div>
            `;

            const ideaStreamContainer = document.getElementById('idea-stream');
            const sparkBoardCanvas = document.querySelector('.spark-board-canvas');

            if (posts.length === 0) {
                ideaStreamContainer.innerHTML = '<p class="placeholder-text">No ideas saved for this project yet.</p>';
                return;
            }

            posts.forEach(post => {
                const ideaCard = createIdeaCard(post);
                ideaStreamContainer.appendChild(ideaCard);
            });
            
            // --- THIS IS THE FIX ---
            // The drop listener is now on the canvas itself.
            sparkBoardCanvas.addEventListener('dragover', (event) => {
                event.preventDefault(); 
            });

            sparkBoardCanvas.addEventListener('drop', (event) => {
                event.preventDefault();
                const postData = JSON.parse(event.dataTransfer.getData('text/plain'));
                
                // 1. Create the sticky note element
                const stickyNote = createStickyNote(postData);
                
                // 2. Position it correctly
                const boardRect = sparkBoardCanvas.getBoundingClientRect();
                stickyNote.style.left = `${event.clientX - boardRect.left - 150}px`;
                stickyNote.style.top = `${event.clientY - boardRect.top - 50}px`;

                // 3. ADD IT TO THE PAGE FIRST
                sparkBoardCanvas.appendChild(stickyNote);
                
                // 4. NOW that it exists, make it draggable
                new PlainDraggable(stickyNote, {
                    containment: sparkBoardCanvas
                });
            });

        } catch (error) {
            console.error(`Failed to load posts for project ${projectId}:`, error);
            appContainer.innerHTML = '<p class="loading-message">Error: Could not load ideas for this project.</p>';
        }
    }
    
    function createIdeaCard(post) {
        const card = document.createElement('div');
        card.className = 'idea-card';
        card.setAttribute('draggable', true);

        const notesHTML = post.notes ? `<div class="idea-card-notes">${post.notes}</div>` : '<p class="no-notes">No notes added for this idea.</p>';
        const authorHTML = `<p class="idea-card-author">${post.author || 'Unknown Author'}</p>`;
        const postTextHTML = `<div class="idea-card-post-text">${post.post_text || 'No content.'}</div>`;
        card.innerHTML = `${notesHTML}<div class="idea-card-source">${authorHTML}${postTextHTML}</div>`;

        card.addEventListener('dragstart', (event) => {
            event.target.classList.add('dragging');
            event.dataTransfer.setData('text/plain', JSON.stringify(post));
        });
        card.addEventListener('dragend', (event) => {
            event.target.classList.remove('dragging');
        });
        return card;
    }

    // This function is now simpler. It just creates the element.
    function createStickyNote(post) {
        const note = document.createElement('div');
        note.className = 'sticky-note';
        const notesHTML = post.notes ? `<h3>${post.notes}</h3>` : '<h3>No notes.</h3>';
        note.innerHTML = `${notesHTML}<p>${post.author}</p>`;
        return note;
    }

    window.addEventListener('hashchange', navigate);
    navigate();
});
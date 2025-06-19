// This function runs as soon as the script is loaded, thanks to the 'defer' attribute.
document.addEventListener('DOMContentLoaded', () => {
    // Find the main container where we will build our grid
    const gridContainer = document.getElementById('posts-grid');
    if (!gridContainer) {
        console.error("Error: Could not find the 'posts-grid' container.");
        return;
    }

    // --- The Core Function: Fetch data and build the UI ---
    async function loadPosts() {
        try {
            // 1. Fetch the data from our Flask API
            const response = await fetch('/api/posts');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const posts = await response.json();

            // 2. Clear the "Loading..." message
            gridContainer.innerHTML = '';

            // 3. Check if there are any posts
            if (posts.length === 0) {
                gridContainer.innerHTML = '<p class="loading-message">No posts found in your vault yet. Go save some using the desktop app!</p>';
                return;
            }

            // 4. Loop through the data and create a card for each post
            posts.forEach(post => {
                const card = createPostCard(post);
                gridContainer.appendChild(card);
            });

        } catch (error) {
            console.error("Failed to load posts:", error);
            gridContainer.innerHTML = '<p class="loading-message">Error: Could not load data from the server. Is the dashboard.py server running?</p>';
        }
    }

    // --- Helper Function: Create a single post card element ---
    function createPostCard(post) {
        // Create the main card element
        const card = document.createElement('div');
        card.className = 'post-card';

        // --- A more robust way to parse the author name and handle ---
        let authorName = "Unknown Author";
        let authorHandle = "@unknown";
        if (post.author) {
            const match = post.author.match(/^(.*?)\s\((@.*?)\)$/);
            if (match) {
                authorName = match[1];
                authorHandle = match[2];
            } else {
                authorName = post.author;
            }
        }
        
        // Use innerHTML to easily construct the card's content
        card.innerHTML = `
            <div class="post-card-header">
                <div class="author-info">
                    <h3>${authorName}</h3>
                    <p>${authorHandle}</p>
                </div>
            </div>
            <div class="post-card-content">
                ${post.post_text || 'No content available.'}
            </div>
            <div class="post-card-footer">
                Category: ${post.category_name || 'None'}
            </div>
        `;

        // We can add click listeners here later for the "Focus Mode"
        card.addEventListener('click', () => {
            console.log(`Clicked on post ID: ${post.id}`);
            // Future: Open focus mode modal here
        });

        return card;
    }

    // --- Run the main function ---
    loadPosts();
});
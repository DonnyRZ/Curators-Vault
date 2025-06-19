from flask import Flask, render_template, jsonify # NEW: Import jsonify
from app.database import get_all_posts

# --- Flask App Initialization ---
app = Flask(__name__)


# --- Route Definitions ---

# This route serves the main HTML file, which is the shell of our application.
@app.route('/')
def home():
    """Serves the main dashboard page."""
    # We no longer pass data here. The page itself will fetch it.
    return render_template('index.html')

# --- NEW: This is our data API endpoint ---
@app.route('/api/posts')
def get_posts_api():
    """Fetches all posts and returns them as JSON."""
    # Fetch all posts from the database using our existing function
    posts_from_db = get_all_posts()
    
    # We need to convert the database row objects into a standard list of dictionaries
    # so Flask can convert it to JSON properly.
    posts_list = [dict(row) for row in posts_from_db]
    
    # The jsonify function correctly formats our list into the JSON format
    # that JavaScript can easily understand.
    return jsonify(posts_list)


# --- Main Execution Block ---
if __name__ == '__main__':
    app.run(debug=True)
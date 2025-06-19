import sqlite3
import os

# --- Database Configuration ---
DATABASE_FILE = "curators_vault.db"
DB_PATH = os.path.join(os.path.dirname(__file__), '..', DATABASE_FILE)

# --- Database Connection Helper ---
def get_db_connection():
    """Establishes a connection to the database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row 
    return conn

# --- Database Initialization ---
def init_db():
    """
    Initializes the database and creates the necessary tables if they don't exist.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create the 'categories' table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
    ''')

    # Create the 'posts' table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author TEXT,
            post_text TEXT NOT NULL,
            notes TEXT,
            url TEXT,
            category_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories (id)
        )
    ''')

    # Add default categories if they don't exist
    default_categories = ["AI", "ML", "General", "Project Ideas"]
    for category in default_categories:
        cursor.execute("INSERT OR IGNORE INTO categories (name) VALUES (?)", (category,))

    conn.commit()
    conn.close()
    print("Database initialized successfully.")

# --- Data Access Functions ---

def get_all_categories():
    """Fetches all categories from the database."""
    conn = get_db_connection()
    categories = conn.execute("SELECT * FROM categories ORDER BY name").fetchall()
    conn.close()
    return categories

def add_post(author, post_text, notes, url, category_name):
    """Adds a new post to the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    category = cursor.execute("SELECT id FROM categories WHERE name = ?", (category_name,)).fetchone()
    if category:
        category_id = category['id']
        cursor.execute(
            "INSERT INTO posts (author, post_text, notes, url, category_id) VALUES (?, ?, ?, ?, ?)",
            (author, post_text, notes, url, category_id)
        )
        conn.commit()
    
    conn.close()

def update_post(post_id, author, post_text, notes, url, category_name):
    """Updates an existing post in the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    category = cursor.execute("SELECT id FROM categories WHERE name = ?", (category_name,)).fetchone()
    if category:
        category_id = category['id']
        cursor.execute('''
            UPDATE posts
            SET author = ?, post_text = ?, notes = ?, url = ?, category_id = ?
            WHERE id = ?
        ''', (author, post_text, notes, url, category_id, post_id))
        conn.commit()
    
    conn.close()

def delete_post(post_id):
    """Deletes a post from the database by its ID."""
    conn = get_db_connection()
    conn.execute("DELETE FROM posts WHERE id = ?", (post_id,))
    conn.commit()
    conn.close()

def get_all_posts(search_term=None):
    """
    Fetches all posts from the database, optionally filtering by a search term.
    The search term will check author, post_text, and notes.
    """
    conn = get_db_connection()
    
    query = '''
        SELECT p.id, p.author, p.post_text, p.notes, p.url, c.name as category_name, p.created_at
        FROM posts p
        LEFT JOIN categories c ON p.category_id = c.id
    '''
    
    params = []
    
    if search_term and search_term.strip() != "":
        # The '%' are wildcards, so it finds the term anywhere in the text
        query += " WHERE p.author LIKE ? OR p.post_text LIKE ? OR p.notes LIKE ?"
        like_term = f"%{search_term}%"
        params.extend([like_term, like_term, like_term])

    query += " ORDER BY p.created_at DESC"
    
    posts = conn.execute(query, params).fetchall()
    
    conn.close()
    return posts
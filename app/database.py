# app/database.py

import sqlite3
import os

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row 
    return conn

DATABASE_FILE = "curators_vault.db"
# This pathing is correct based on your structure.
DB_PATH = os.path.join(os.path.dirname(__file__), '..', DATABASE_FILE)

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # --- Existing Tables (No changes here) ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author TEXT,
            post_text TEXT,
            notes TEXT,
            url TEXT,
            category_id INTEGER,
            project_id INTEGER,
            avatar_url TEXT,
            resources TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories (id),
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
    ''')

    # --- Database Migrations ---
    # This section safely adds columns if they don't exist, preventing errors on restart.
    cursor.execute("PRAGMA table_info(posts)")
    columns = [row['name'] for row in cursor.fetchall()]
    
    # Check and add columns from your previous structure if they are missing
    if 'project_id' not in columns:
        cursor.execute("ALTER TABLE posts ADD COLUMN project_id INTEGER REFERENCES projects(id)")
    if 'avatar_url' not in columns:
        cursor.execute("ALTER TABLE posts ADD COLUMN avatar_url TEXT")
    if 'resources' not in columns:
        cursor.execute("ALTER TABLE posts ADD COLUMN resources TEXT")

    # --- NEW MIGRATIONS FOR THE CURATOR'S ATLAS ---
    if 'content' not in columns:
        print("Migrating database: Adding 'content' to posts table...")
        cursor.execute("ALTER TABLE posts ADD COLUMN content TEXT")
    if 'one_liner_summary' not in columns:
        print("Migrating database: Adding 'one_liner_summary' to posts table...")
        cursor.execute("ALTER TABLE posts ADD COLUMN one_liner_summary TEXT")
    if 'tags' not in columns:
        print("Migrating database: Adding 'tags' to posts table...")
        cursor.execute("ALTER TABLE posts ADD COLUMN tags TEXT")

    # --- Spark Board tables (from your original file) ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sparks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            post_id INTEGER NOT NULL,
            x_pos REAL NOT NULL,
            y_pos REAL NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects (id),
            FOREIGN KEY (post_id) REFERENCES posts (id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS connections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            start_spark_id INTEGER NOT NULL,
            end_spark_id INTEGER NOT NULL,
            label TEXT,
            FOREIGN KEY (project_id) REFERENCES projects (id),
            FOREIGN KEY (start_spark_id) REFERENCES sparks (id),
            FOREIGN KEY (end_spark_id) REFERENCES sparks (id)
        )
    ''')

    cursor.execute("INSERT OR IGNORE INTO projects (id, name, description) VALUES (?, ?, ?)", 
                   (1, "Uncategorized Ideas", "A place for posts that haven't been assigned to a specific project yet."))
                   
    conn.commit()
    conn.close()
    print("Database initialized and migrated successfully.")


def get_or_create_project_id(conn, name):
    if not name or not name.strip():
        return 1
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM projects WHERE name = ?", (name,))
    project = cursor.fetchone()
    if project:
        return project['id']
    else:
        cursor.execute("INSERT INTO projects (name) VALUES (?)", (name,))
        conn.commit()
        return cursor.lastrowid

def get_or_create_category_id(conn, name):
    if not name or not name.strip():
        return None
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM categories WHERE name = ?", (name,))
    category = cursor.fetchone()
    if category:
        return category['id']
    else:
        cursor.execute("INSERT INTO categories (name) VALUES (?)", (name,))
        conn.commit()
        return cursor.lastrowid

def get_all_projects():
    conn = get_db_connection()
    projects_rows = conn.execute("SELECT * FROM projects ORDER BY name").fetchall()
    conn.close()
    return [dict(row) for row in projects_rows]

# --- MODIFIED: Added 'content' to the function signature and INSERT statement ---
def add_post(author, post_text, notes, url, category_name, project_name, avatar_url, resources=None, content=None):
    conn = get_db_connection()
    project_id = get_or_create_project_id(conn, project_name)
    category_id = get_or_create_category_id(conn, category_name)
    
    conn.execute(
        "INSERT INTO posts (author, post_text, notes, url, category_id, project_id, avatar_url, resources, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (author, post_text, notes, url, category_id, project_id, avatar_url, resources, content)
    )
    conn.commit()
    conn.close()

# --- MODIFIED: Added 'content' to the function signature and UPDATE statement ---
def update_post(post_id, author, post_text, notes, url, category_name, project_name, avatar_url, resources=None, content=None):
    conn = get_db_connection()
    project_id = get_or_create_project_id(conn, project_name)
    category_id = get_or_create_category_id(conn, category_name)

    conn.execute('''
        UPDATE posts
        SET author = ?, post_text = ?, notes = ?, url = ?, category_id = ?, project_id = ?, avatar_url = ?, resources = ?, content = ?
        WHERE id = ?
    ''', (author, post_text, notes, url, category_id, project_id, avatar_url, resources, content, post_id))
    conn.commit()
    conn.close()

def get_all_posts(search_term=None, project_id=None):
    conn = get_db_connection()
    # --- MODIFIED: Added our new columns to the SELECT statement ---
    query = '''
        SELECT p.id, p.author, p.post_text, p.notes, p.url, p.avatar_url, 
               p.resources, p.content, p.one_liner_summary, p.tags,
               c.name as category_name, proj.name as project_name
        FROM posts p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN projects proj ON p.project_id = proj.id
    '''
    conditions = []
    params = []
    if project_id:
        if project_id == 1:
            conditions.append("(p.project_id = ? OR p.project_id IS NULL)")
            params.append(project_id)
        else:
            conditions.append("p.project_id = ?")
            params.append(project_id)
    if search_term and search_term.strip() != "":
        search_condition = "(p.author LIKE ? OR p.post_text LIKE ? OR p.notes LIKE ?)"
        conditions.append(search_condition)
        like_term = f"%{search_term}%"
        params.extend([like_term, like_term, like_term])
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY p.created_at DESC"
    posts_rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(row) for row in posts_rows]

def get_all_categories():
    conn = get_db_connection()
    categories_rows = conn.execute("SELECT * FROM categories ORDER BY name").fetchall()
    conn.close()
    return [dict(row) for row in categories_rows]

def delete_post(post_id):
    conn = get_db_connection()
    # --- MODIFIED: Also delete any associated sparks when a post is deleted ---
    conn.execute("DELETE FROM sparks WHERE post_id = ?", (post_id,))
    conn.execute("DELETE FROM posts WHERE id = ?", (post_id,))
    conn.commit()
    conn.close()

def delete_project(project_id):
    if project_id == 1:
        print("Cannot delete the default 'Uncategorized Ideas' project.")
        return
    conn = get_db_connection()
    conn.execute("UPDATE posts SET project_id = 1 WHERE project_id = ?", (project_id,))
    # --- MODIFIED: Also delete sparks and connections for the deleted project ---
    conn.execute("DELETE FROM connections WHERE project_id = ?", (project_id,))
    conn.execute("DELETE FROM sparks WHERE project_id = ?", (project_id,))
    conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    conn.commit()
    conn.close()

def delete_category(category_id):
    conn = get_db_connection()
    conn.execute("UPDATE posts SET category_id = NULL WHERE category_id = ?", (category_id,))
    conn.execute("DELETE FROM categories WHERE id = ?", (category_id,))
    conn.commit()
    conn.close()

# --- NEW FUNCTIONS TO UPDATE OUR AI-GENERATED DATA ---

def update_post_summary(post_id: int, summary: str):
    """Updates only the one_liner_summary for a specific post."""
    conn = get_db_connection()
    conn.execute("UPDATE posts SET one_liner_summary = ? WHERE id = ?", (summary, post_id))
    conn.commit()
    conn.close()

def update_post_tags(post_id: int, tags: str):
    """Updates only the tags for a specific post."""
    conn = get_db_connection()
    conn.execute("UPDATE posts SET tags = ? WHERE id = ?", (tags, post_id))
    conn.commit()
    conn.close()
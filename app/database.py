# app/database.py

import sqlite3
import os

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row 
    return conn

DATABASE_FILE = "curators_vault.db"
DB_PATH = os.path.join(os.path.dirname(__file__), '..', DATABASE_FILE)

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
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
            avatar_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories (id)
        )
    ''')

    cursor.execute("PRAGMA table_info(posts)")
    columns = [row['name'] for row in cursor.fetchall()]
    if 'project_id' not in columns:
        cursor.execute("ALTER TABLE posts ADD COLUMN project_id INTEGER REFERENCES projects(id)")
    if 'avatar_url' not in columns:
        cursor.execute("ALTER TABLE posts ADD COLUMN avatar_url TEXT")

    cursor.execute("INSERT OR IGNORE INTO projects (id, name, description) VALUES (?, ?, ?)", 
                   (1, "Uncategorized Ideas", "A place for posts that haven't been assigned to a specific project yet."))
                   
    conn.commit()
    conn.close()
    print("Database initialized and migrated successfully.")

# --- NEW HELPER: Get a project's ID, creating the project if it doesn't exist ---
def get_or_create_project_id(conn, name):
    if not name or not name.strip():
        return 1 # Default to "Uncategorized Ideas"
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM projects WHERE name = ?", (name,))
    project = cursor.fetchone()
    if project:
        return project['id']
    else:
        cursor.execute("INSERT INTO projects (name) VALUES (?)", (name,))
        conn.commit()
        return cursor.lastrowid

# --- NEW HELPER: Get a category's ID, creating the category if it doesn't exist ---
def get_or_create_category_id(conn, name):
    if not name or not name.strip():
        return None # No category
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

# --- MODIFIED: Now uses the get_or_create helpers ---
def add_post(author, post_text, notes, url, category_name, project_name, avatar_url):
    conn = get_db_connection()
    project_id = get_or_create_project_id(conn, project_name)
    category_id = get_or_create_category_id(conn, category_name)
    
    conn.execute(
        "INSERT INTO posts (author, post_text, notes, url, category_id, project_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (author, post_text, notes, url, category_id, project_id, avatar_url)
    )
    conn.commit()
    conn.close()

# --- MODIFIED: Now uses the get_or_create helpers ---
def update_post(post_id, author, post_text, notes, url, category_name, project_name, avatar_url):
    conn = get_db_connection()
    project_id = get_or_create_project_id(conn, project_name)
    category_id = get_or_create_category_id(conn, category_name)

    conn.execute('''
        UPDATE posts
        SET author = ?, post_text = ?, notes = ?, url = ?, category_id = ?, project_id = ?, avatar_url = ?
        WHERE id = ?
    ''', (author, post_text, notes, url, category_id, project_id, avatar_url, post_id))
    conn.commit()
    conn.close()

def get_all_posts(search_term=None, project_id=None):
    conn = get_db_connection()
    query = '''
        SELECT p.id, p.author, p.post_text, p.notes, p.url, p.avatar_url, c.name as category_name, proj.name as project_name
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
    conn.execute("DELETE FROM posts WHERE id = ?", (post_id,))
    conn.commit()
    conn.close()
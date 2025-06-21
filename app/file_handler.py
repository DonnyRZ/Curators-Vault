# app/file_handler.py

import os
import shutil
from tkinter import filedialog

# This is the relative path from `main.py` to the database
DATABASE_PATH = 'curators_vault.db'

def backup_database() -> tuple[bool, str]:
    """Opens a 'save as' dialog and copies the current database to the selected path."""
    backup_path = filedialog.asksaveasfilename(
        defaultextension=".db",
        filetypes=[("Database files", "*.db")],
        title="Save Backup As",
        initialfile="curators_vault_backup.db"
    )
    if not backup_path:
        return False, "Backup cancelled."
    
    try:
        shutil.copyfile(DATABASE_PATH, backup_path)
        return True, f"Backup successful: {os.path.basename(backup_path)}"
    except Exception as e:
        return False, f"Backup failed: {e}"

def restore_database() -> tuple[bool, str]:
    """Opens a file dialog to select a backup and replaces the current database with it."""
    backup_path = filedialog.askopenfilename(
        filetypes=[("Database files", "*.db")],
        title="Select Backup to Restore"
    )
    if not backup_path:
        return False, "Restore cancelled."
        
    try:
        shutil.copyfile(backup_path, DATABASE_PATH)
        return True, f"Restore successful from {os.path.basename(backup_path)}"
    except Exception as e:
        return False, f"Restore failed: {e}"

def create_briefing(posts: list, search_term: str) -> tuple[bool, str]:
    """Generates a markdown briefing from a list of posts and saves it to a file."""
    if not posts:
        return False, "No posts to create a briefing from."

    file_path = filedialog.asksaveasfilename(
        defaultextension=".md",
        filetypes=[("Markdown", "*.md")],
        title="Save Briefing As"
    )
    if not file_path:
        return False, "Briefing save cancelled."

    title = f"# X Briefing: {search_term}" if search_term else "# X Briefing: All Posts"
    content = f"{title}\n\n"
    
    for post in posts:
        content += f"## Post by: {post.get('author', 'N/A')}\n"
        content += f"**URL:** {post.get('url', 'N/A')}\n\n"
        content += f"### Text\n```\n{post.get('post_text', '')}\n```\n\n"
        content += f"### Notes\n```\n{post.get('notes', '')}\n```\n\n"
        content += "---\n\n"
        
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return True, f"Briefing saved: {os.path.basename(file_path)}"
    except Exception as e:
        return False, f"Failed to save briefing: {e}"
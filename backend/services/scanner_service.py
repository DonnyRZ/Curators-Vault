# backend/services/scanner_service.py

import os

def scan_directory(root_path: str) -> dict:
    """
    Recursively scans a directory and builds a JSON-like dictionary representing
    its file tree structure.
    """
    # First, check if the provided path is a valid directory
    if not os.path.isdir(root_path):
        return {"error": "Invalid path provided. Not a directory.", "path": root_path}

    # The root of our tree structure, starting with the folder's name
    tree = {
        "name": os.path.basename(root_path),
        "type": "directory",
        "path": root_path,
        "children": []
    }

    try:
        # os.walk is the magic here. It goes through every folder and file.
        for root, dirs, files in os.walk(root_path):
            # We want to find the current directory's dictionary in our 'tree'
            # so we can add its children (subfolders and files).
            current_level = tree
            
            # This logic navigates down the tree to the correct spot
            parts = root.replace(root_path, '').strip(os.path.sep).split(os.path.sep)
            if parts != ['']:
                for part in parts:
                    # Find the child dict that matches the current folder part
                    for child in current_level["children"]:
                        if child["name"] == part and child["type"] == "directory":
                            current_level = child
                            break
            
            # Add all subdirectories to the current level's children
            for d in sorted(dirs):
                current_level["children"].append({
                    "name": d,
                    "type": "directory",
                    "path": os.path.join(root, d),
                    "children": []
                })

            # Add all files to the current level's children
            for f in sorted(files):
                current_level["children"].append({
                    "name": f,
                    "type": "file",
                    "path": os.path.join(root, f)
                })
            
            # We only process the top-level of os.walk each time
            # by modifying dirs in-place to stop it from going deeper on its own.
            # Our own loop logic handles the depth.
            dirs[:] = [] 

    except OSError as e:
        return {"error": f"Error reading directory: {e}"}

    return tree
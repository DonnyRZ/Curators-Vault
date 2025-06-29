import os

def scan_directory(path: str):
    """
    Scans a directory and returns its file and folder structure as a dictionary.
    """
    if not os.path.isdir(path):
        return {"error": f"Directory not found: {path}"}

    tree = {
        "name": os.path.basename(path),
        "path": path,
        "type": "directory",
        "children": []
    }

    try:
        for entry_name in os.listdir(path):
            entry_path = os.path.join(path, entry_name)
            if os.path.isdir(entry_path):
                # Recursively scan subdirectories
                tree["children"].append(scan_directory(entry_path))
            else:
                # Add files
                tree["children"].append({
                    "name": entry_name,
                    "path": entry_path,
                    "type": "file"
                })
    except Exception as e:
        return {"error": f"Error scanning directory {path}: {e}"}

    return tree
import os

def scan_directory(path: str, max_depth: int = 3):
    """
    Scans a directory and returns its file and folder structure as a dictionary.
    max_depth: The maximum depth to scan. -1 for unlimited.
    """
    if not os.path.isdir(path):
        return {"error": f"Directory not found: {path}"}

    if max_depth == 0:
        return {
            "name": os.path.basename(path),
            "path": path,
            "type": "directory",
            "children": [],
            "truncated": True # Indicate that children exist but are not shown
        }

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
                # Recursively scan subdirectories with reduced depth
                tree["children"].append(scan_directory(entry_path, max_depth - 1))
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
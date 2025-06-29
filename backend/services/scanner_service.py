
import os

def scan_directory(path):
    """
    Scans a directory and returns a dictionary representing its structure.
    Each key is a file or directory name, and values are either None (for files)
    or another dictionary (for subdirectories).
    """
    structure = {}
    if not os.path.exists(path):
        return {"error": "Path does not exist"}
    if not os.path.isdir(path):
        return {"error": "Path is not a directory"}

    for item in os.listdir(path):
        item_path = os.path.join(path, item)
        if os.path.isdir(item_path):
            structure[item] = scan_directory(item_path)  # Recursively scan subdirectories
        else:
            structure[item] = None  # Mark as a file
    return structure

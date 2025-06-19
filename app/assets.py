import customtkinter
from PIL import Image
import os

class AppAssets:
    def __init__(self):
        # --- FONT DEFINITIONS ---
        self.font_heading = customtkinter.CTkFont(family="Inter", size=20, weight="bold")
        self.font_body = customtkinter.CTkFont(family="Inter", size=13, weight="normal")
        self.font_small = customtkinter.CTkFont(family="Inter", size=12, weight="normal")
        self.font_content = customtkinter.CTkFont(family="Lora", size=15, weight="normal")
        # --- NEW: A dedicated, bolder font for our primary buttons ---
        self.font_button = customtkinter.CTkFont(family="Inter", size=14, weight="bold")

        # --- ICON DEFINITIONS ---
        app_path = os.path.dirname(os.path.abspath(__file__))
        icons_path = os.path.join(app_path, '..', 'icons')

        self.backup_icon = self.load_icon(os.path.join(icons_path, 'backup.png'))
        self.briefing_icon = self.load_icon(os.path.join(icons_path, 'briefing.png'))
        self.delete_icon = self.load_icon(os.path.join(icons_path, 'delete.png'))
        self.new_icon = self.load_icon(os.path.join(icons_path, 'new.png'))
        self.restore_icon = self.load_icon(os.path.join(icons_path, 'restore.png'))
        self.search_icon = self.load_icon(os.path.join(icons_path, 'search.png'))
        self.update_icon = self.load_icon(os.path.join(icons_path, 'update.png'))

    def load_icon(self, path, size=(20, 20)):
        try:
            return customtkinter.CTkImage(Image.open(path), size=size)
        except FileNotFoundError:
            print(f"Error: Icon not found at {path}")
            return None

def load_assets():
    print("Loading application assets...")
    return AppAssets()
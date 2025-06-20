import customtkinter
from PIL import Image, ImageDraw
import os
import requests
from io import BytesIO

class AppAssets:
    def __init__(self):
        # --- FONT DEFINITIONS ---
        self.font_heading = customtkinter.CTkFont(family="Inter", size=20, weight="bold")
        self.font_body = customtkinter.CTkFont(family="Inter", size=13, weight="normal")
        self.font_small = customtkinter.CTkFont(family="Inter", size=12, weight="normal")
        self.font_content = customtkinter.CTkFont(family="Lora", size=15, weight="normal")
        self.font_button = customtkinter.CTkFont(family="Inter", size=14, weight="bold")

        # --- ICON DEFINITIONS ---
        app_path = os.path.dirname(os.path.abspath(__file__))
        icons_path = os.path.join(app_path, '..', 'icons')

        self.backup_icon = self._load_icon(os.path.join(icons_path, 'backup.png'))
        self.briefing_icon = self._load_icon(os.path.join(icons_path, 'briefing.png'))
        self.delete_icon = self._load_icon(os.path.join(icons_path, 'delete.png'))
        self.new_icon = self._load_icon(os.path.join(icons_path, 'new.png'))
        # We will ignore the missing restore icon for now
        self.restore_icon = self._load_icon(os.path.join(icons_path, 'restore.png')) 
        self.search_icon = self._load_icon(os.path.join(icons_path, 'search.png'))
        self.update_icon = self._load_icon(os.path.join(icons_path, 'update.png'))
        
        # --- NEW: Default placeholder for the profile picture ---
        self.default_avatar = self._create_placeholder_avatar()

    def _load_icon(self, path, size=(20, 20)):
        """Helper function to load and resize an icon."""
        try:
            return customtkinter.CTkImage(Image.open(path), size=size)
        except FileNotFoundError:
            # If an icon is missing, we don't crash, we just return None.
            return None

    def _create_placeholder_avatar(self, size=(48, 48)):
        """Creates a simple gray circle as a default avatar."""
        img = Image.new('RGBA', size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.ellipse((0, 0, size[0], size[1]), fill='#4B4B4B')
        return customtkinter.CTkImage(img, size=size)

    # --- NEW: Function to load an avatar from a URL ---
    def load_avatar_from_url(self, url, size=(48, 48)):
        """Downloads an image from a URL and returns it as a CTkImage."""
        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            # Open the image from the downloaded bytes
            img_data = BytesIO(response.content)
            img = Image.open(img_data)
            
            # Create a circular mask
            mask = Image.new('L', size, 0)
            draw = ImageDraw.Draw(mask)
            draw.ellipse((0, 0, size[0], size[1]), fill=255)
            
            # Apply the mask to the image
            img = img.resize(size)
            img.putalpha(mask)
            
            return customtkinter.CTkImage(img, size=size)
        except Exception as e:
            print(f"Failed to load avatar from URL: {e}")
            return self.default_avatar

def load_assets():
    print("Loading application assets...")
    return AppAssets()
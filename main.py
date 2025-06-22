print("Start Curators Atlas")

import customtkinter
from app.database import init_db
from app.main_window import MainWindow
from app.assets import load_assets

# UI Configuration
customtkinter.set_appearance_mode("dark")
customtkinter.set_default_color_theme("theme.json")


class App(customtkinter.CTk):
    def __init__(self):
        super().__init__()

        self.assets = load_assets()

        # Configure the main window
        self.title("The Curator's Vault - v1.0") # Final Version!
        self.geometry("1200x720") # A slightly larger default size
        
        # --- NEW: Set a minimum size for the window ---
        self.minsize(900, 600)

        # Configure grid layout
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # Create and place the main UI frame
        self.main_frame = MainWindow(master=self, assets=self.assets)
        self.main_frame.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")


if __name__ == "__main__":
    init_db()
    
    app = App()
    app.mainloop()
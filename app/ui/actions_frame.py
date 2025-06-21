# app/ui/actions_frame.py

import customtkinter

class ActionsFrame(customtkinter.CTkFrame):
    """
    A dedicated frame for the main action buttons (Save, Update, Delete, New).
    This component is responsible for its own layout and button states.
    It uses callbacks to communicate with its parent controller.
    """
    def __init__(self, master, assets):
        super().__init__(master, fg_color="transparent")
        self.assets = assets

        # Callbacks to be set by the parent
        self.save_callback = None
        self.update_callback = None
        self.delete_callback = None
        self.new_callback = None

        self._create_widgets()
        self.show_save_mode() # Default state

    def _create_widgets(self):
        """Creates all the button widgets."""
        self.grid_columnconfigure((0, 1, 2), weight=1)

        # --- Create Buttons ---
        self.save_button = customtkinter.CTkButton(
            self,
            text="Save New Post",
            font=self.assets.font_button,
            command=lambda: self.save_callback() if self.save_callback else None,
            height=40
        )

        self.update_button = customtkinter.CTkButton(
            self,
            text="Update",
            image=self.assets.update_icon,
            font=self.assets.font_button,
            command=lambda: self.update_callback() if self.update_callback else None,
            height=40,
            compound="left",
            anchor="center"
        )

        self.delete_button = customtkinter.CTkButton(
            self,
            text="Delete",
            image=self.assets.delete_icon,
            font=self.assets.font_button,
            fg_color="#D32F2F",
            hover_color="#B71C1C",
            command=lambda: self.delete_callback() if self.delete_callback else None,
            height=40,
            compound="left",
            anchor="center"
        )

        self.new_post_button = customtkinter.CTkButton(
            self,
            text="New",
            image=self.assets.new_icon,
            font=self.assets.font_button,
            command=lambda: self.new_callback() if self.new_callback else None,
            height=40,
            compound="left",
            anchor="center"
        )

    def show_save_mode(self):
        """Configures the frame to show only the 'Save' button for a new post."""
        self.update_button.grid_remove()
        self.delete_button.grid_remove()
        self.new_post_button.grid_remove()
        self.save_button.grid(row=0, column=0, columnspan=3, padx=5, sticky="ew")

    def show_edit_mode(self):
        """Configures the frame to show 'Update', 'Delete', and 'New' buttons for an existing post."""
        self.save_button.grid_remove()
        self.update_button.grid(row=0, column=0, padx=5, sticky="ew")
        self.delete_button.grid(row=0, column=1, padx=5, sticky="ew")
        self.new_post_button.grid(row=0, column=2, padx=5, sticky="ew")
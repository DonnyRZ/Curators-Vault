# app/ui/management_dialog.py

import customtkinter

class ManagementDialog(customtkinter.CTkToplevel):
    """
    A generic dialog window for managing (deleting) a list of items.
    It takes a list of items and a callback function for deletion.
    """
    def __init__(self, master, title: str, items: list, delete_callback):
        super().__init__(master)
        
        self.delete_callback = delete_callback
        
        # --- Window Configuration ---
        self.title(title)
        self.geometry("400x500")
        self.transient(master)
        self.resizable(False, False)

        # --- Main Frame ---
        self.main_frame = customtkinter.CTkFrame(self)
        self.main_frame.pack(fill="both", expand=True, padx=10, pady=10)
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(1, weight=1)

        # --- Widgets ---
        title_label = customtkinter.CTkLabel(self.main_frame, text=title, font=master.assets.font_heading)
        title_label.grid(row=0, column=0, columnspan=2, pady=(10, 20))

        scrollable_frame = customtkinter.CTkScrollableFrame(self.main_frame, label_text="Click to delete an item")
        scrollable_frame.grid(row=1, column=0, columnspan=2, sticky="nsew", pady=(0, 10))
        scrollable_frame.grid_columnconfigure(0, weight=1)

        if not items:
            no_items_label = customtkinter.CTkLabel(scrollable_frame, text="Nothing to manage.")
            no_items_label.pack(pady=20)
        else:
            for i, item in enumerate(items):
                if item.get('id') == 1 and "Project" in title:
                    continue

                item_label = customtkinter.CTkLabel(scrollable_frame, text=item['name'], anchor="w")
                item_label.grid(row=i, column=0, sticky="ew", padx=10, pady=5)

                delete_button = customtkinter.CTkButton(
                    scrollable_frame,
                    text="Delete",
                    fg_color="#D32F2F",
                    hover_color="#B71C1C",
                    width=80,
                    command=lambda item_id=item['id']: self.on_delete(item_id)
                )
                delete_button.grid(row=i, column=1, padx=10, pady=5)

        close_button = customtkinter.CTkButton(self.main_frame, text="Close", command=self.destroy)
        close_button.grid(row=2, column=0, columnspan=2, pady=(10, 0), sticky="ew")

        # --- MODIFIED: The Fix ---
        # We schedule grab_set() to be called after the window is viewable.
        # 10ms is a safe, tiny delay.
        self.after(10, self.grab_set)

    def on_delete(self, item_id: int):
        if self.delete_callback:
            self.delete_callback(item_id)
        self.destroy()
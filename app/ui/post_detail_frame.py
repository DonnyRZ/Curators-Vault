# app/ui/post_detail_frame.py

import customtkinter
import threading
from .actions_frame import ActionsFrame

class PostDetailFrame(customtkinter.CTkFrame):
    def __init__(self, master, assets):
        super().__init__(master)
        self.assets = assets

        self.url_fetch_callback = None
        self.save_callback = None
        self.update_callback = None
        self.delete_callback = None
        self.new_callback = None
        self.manage_projects_callback = None
        self.manage_categories_callback = None

        self._setup_layout()
        self._create_widgets()

    def _setup_layout(self):
        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(7, weight=1)

    def _create_widgets(self):
        self.form_label = customtkinter.CTkLabel(self, text="Post Details", font=self.assets.font_heading)
        self.form_label.grid(row=0, column=0, columnspan=2, padx=20, pady=(20, 10), sticky="w")

        url_label = customtkinter.CTkLabel(self, text="Post URL", font=self.assets.font_small)
        url_label.grid(row=1, column=0, columnspan=2, padx=20, pady=(10, 0), sticky="w")
        self.url_entry = customtkinter.CTkEntry(self, font=self.assets.font_body, placeholder_text="Paste a valid X.com URL to automatically fetch data...")
        self.url_entry.grid(row=2, column=0, columnspan=2, padx=20, pady=(0, 10), sticky="ew")
        self.url_entry.bind("<KeyRelease>", self._on_url_change)

        profile_frame = customtkinter.CTkFrame(self, fg_color="transparent")
        profile_frame.grid(row=3, column=0, columnspan=2, padx=20, pady=10, sticky="ew")
        profile_frame.grid_columnconfigure(1, weight=1)
        self.avatar_label = customtkinter.CTkLabel(profile_frame, text="", image=self.assets.default_avatar)
        self.avatar_label.grid(row=0, column=0, rowspan=2, padx=(0, 10))
        self.author_name_label = customtkinter.CTkLabel(profile_frame, text="Author Name", font=self.assets.font_button, anchor="w")
        self.author_name_label.grid(row=0, column=1, sticky="w")
        self.author_handle_label = customtkinter.CTkLabel(profile_frame, text="@author_handle", font=self.assets.font_small, text_color="gray", anchor="w")
        self.author_handle_label.grid(row=1, column=1, sticky="w")

        post_text_label = customtkinter.CTkLabel(self, text="Post Text", font=self.assets.font_small)
        post_text_label.grid(row=4, column=0, columnspan=2, padx=20, pady=(10, 0), sticky="w")
        self.post_text_box = customtkinter.CTkTextbox(self, height=100, font=self.assets.font_content)
        self.post_text_box.grid(row=5, column=0, columnspan=2, padx=20, pady=(0, 10), sticky="nsew")
        
        notes_label = customtkinter.CTkLabel(self, text="Your Notes / Ideas", font=self.assets.font_small)
        notes_label.grid(row=6, column=0, columnspan=2, padx=20, pady=(10, 0), sticky="w")
        self.notes_text_box = customtkinter.CTkTextbox(self, height=60, font=self.assets.font_content)
        self.notes_text_box.grid(row=7, column=0, columnspan=2, padx=20, pady=(0, 10), sticky="nsew")

        project_label_frame = customtkinter.CTkFrame(self, fg_color="transparent")
        project_label_frame.grid(row=8, column=0, padx=20, pady=(10, 0), sticky="ew")
        project_label = customtkinter.CTkLabel(project_label_frame, text="Project", font=self.assets.font_small)
        project_label.pack(side="left")
        manage_projects_button = customtkinter.CTkButton(
            project_label_frame, text="Manage...", font=self.assets.font_small,
            fg_color="transparent", width=60,
            command=lambda: self.manage_projects_callback() if self.manage_projects_callback else None
        )
        manage_projects_button.pack(side="right")

        self.project_combobox = customtkinter.CTkComboBox(self, font=self.assets.font_body, height=40, values=[])
        self.project_combobox.grid(row=9, column=0, padx=20, pady=(0, 10), sticky="ew")
        
        category_label_frame = customtkinter.CTkFrame(self, fg_color="transparent")
        category_label_frame.grid(row=8, column=1, padx=20, pady=(10, 0), sticky="ew")
        category_label = customtkinter.CTkLabel(category_label_frame, text="Category", font=self.assets.font_small)
        category_label.pack(side="left")
        manage_categories_button = customtkinter.CTkButton(
            category_label_frame, text="Manage...", font=self.assets.font_small,
            fg_color="transparent", width=60,
            command=lambda: self.manage_categories_callback() if self.manage_categories_callback else None
        )
        manage_categories_button.pack(side="right")

        self.category_combobox = customtkinter.CTkComboBox(self, font=self.assets.font_body, height=40, values=[])
        self.category_combobox.grid(row=9, column=1, padx=20, pady=(0, 10), sticky="ew")

        self.actions_frame = ActionsFrame(self, self.assets)
        self.actions_frame.grid(row=10, column=0, columnspan=2, padx=20, pady=10, sticky="ew")

        settings_frame = customtkinter.CTkFrame(self)
        settings_frame.grid(row=11, column=0, columnspan=2, padx=10, pady=10, sticky="sew")
        settings_frame.grid_columnconfigure((0, 1), weight=1)
        settings_label = customtkinter.CTkLabel(settings_frame, text="Database Management", font=self.assets.font_small)
        settings_label.grid(row=0, column=0, columnspan=2, padx=10, pady=(5,0))
        self.backup_button = customtkinter.CTkButton(settings_frame, text="Backup", image=self.assets.backup_icon, font=self.assets.font_button, height=40, compound="left", anchor="center")
        self.backup_button.grid(row=1, column=0, padx=10, pady=10, sticky="ew")
        self.restore_button = customtkinter.CTkButton(settings_frame, text="Restore", image=self.assets.restore_icon, font=self.assets.font_button, height=40, compound="left", anchor="center")
        self.restore_button.grid(row=1, column=1, padx=10, pady=10, sticky="ew")

    def populate_form(self, post_data: dict):
        self.clear_form(clear_url=False)
        self.url_entry.insert(0, post_data.get('url', ""))
        self.post_text_box.insert("1.0", post_data.get('post_text', ""))
        self.notes_text_box.insert("1.0", post_data.get('notes', ""))

        author_full = post_data.get('author', "Author Name (@author_handle)")
        try:
            name, handle = author_full.rsplit('(', 1)
            author_name = name.strip()
            author_handle = f"@{handle.replace(')', '').strip()}"
        except (ValueError, IndexError):
            author_name, author_handle = author_full, ""
            
        self.author_name_label.configure(text=author_name)
        self.author_handle_label.configure(text=author_handle)
        
        self.project_combobox.set(post_data.get('project_name', "Uncategorized Ideas"))
        self.category_combobox.set(post_data.get('category_name', ""))

        avatar_url = post_data.get('avatar_url')
        if avatar_url:
            thread = threading.Thread(target=self._load_and_set_avatar, args=(avatar_url,))
            thread.daemon = True
            thread.start()
        else:
            self.avatar_label.configure(image=self.assets.default_avatar)

        self.set_edit_mode()

    def populate_scraped_data(self, scraped_data: dict):
        self.clear_form(clear_url=False)
        self.author_name_label.configure(text=scraped_data["author_name"])
        self.author_handle_label.configure(text=scraped_data["author_handle"])
        self.post_text_box.insert("1.0", scraped_data["post_text"])
        
        if scraped_data["avatar_url"]:
            thread = threading.Thread(target=self._load_and_set_avatar, args=(scraped_data["avatar_url"],))
            thread.daemon = True
            thread.start()
            
        self.notes_text_box.focus()

    def get_form_data(self) -> dict:
        author = f"{self.author_name_label.cget('text')} ({self.author_handle_label.cget('text')})"
        return {
            "author": author,
            # --- THE FIX: Changed "1.o" to "1.0" ---
            "post_text": self.post_text_box.get("1.0", "end-1c"),
            "notes": self.notes_text_box.get("1.0", "end-1c"),
            "url": self.url_entry.get(),
            "category_name": self.category_combobox.get(),
            "project_name": self.project_combobox.get()
        }

    def clear_form(self, clear_url=True):
        if clear_url:
            self.url_entry.delete(0, "end")
        self.post_text_box.delete("1.0", "end")
        self.notes_text_box.delete("1.0", "end")
        self.author_name_label.configure(text="Author Name")
        self.author_handle_label.configure(text="@author_handle")
        self.avatar_label.configure(image=self.assets.default_avatar)
        self.project_combobox.set("")
        self.category_combobox.set("")
        self.set_save_mode()

    def set_save_mode(self):
        self.form_label.configure(text="Add New Post")
        self.actions_frame.show_save_mode()

    def set_edit_mode(self):
        self.form_label.configure(text="Edit Post Details")
        self.actions_frame.show_edit_mode()

    def set_url_entry_state(self, state: str):
        self.url_entry.configure(state=state)

    def update_project_menu(self, project_names: list):
        self.project_combobox.configure(values=project_names)

    def update_category_menu(self, category_names: list):
        self.category_combobox.configure(values=category_names)

    def connect_callbacks(self, save, update, delete, new, fetch, backup, restore, manage_projects, manage_categories):
        self.actions_frame.save_callback = save
        self.actions_frame.update_callback = update
        self.actions_frame.delete_callback = delete
        self.actions_frame.new_callback = new
        self.url_fetch_callback = fetch
        self.backup_button.configure(command=backup)
        self.restore_button.configure(command=restore)
        self.manage_projects_callback = manage_projects
        self.manage_categories_callback = manage_categories

    def _on_url_change(self, event=None):
        url = self.url_entry.get()
        if self.url_fetch_callback and ("x.com" in url or "twitter.com" in url) and "/status/" in url:
            self.url_fetch_callback(url)

    def _load_and_set_avatar(self, url):
        avatar_image = self.assets.load_avatar_from_url(url)
        if avatar_image:
            self.after(0, lambda: self.avatar_label.configure(image=avatar_image))
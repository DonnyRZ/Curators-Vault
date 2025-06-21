# app/main_window.py

import customtkinter
import threading
from . import database
from . import file_handler
from .scraper import PostScraper
from .ui.post_list_frame import PostListFrame
from .ui.post_detail_frame import PostDetailFrame

class MainWindow(customtkinter.CTkFrame):
    def __init__(self, master, assets):
        super().__init__(master)
        self.assets = assets
        self.scraper = PostScraper()

        # --- Application State ---
        self.selected_post_id = None
        self.current_avatar_url = None
        self.is_fetching = False

        # --- Main Layout ---
        self.grid_columnconfigure(0, weight=1, minsize=300)
        self.grid_columnconfigure(1, weight=3)
        self.grid_rowconfigure(0, weight=1)

        # --- Create and Place UI Components ---
        self.post_list_frame = PostListFrame(self, self.assets)
        self.post_list_frame.grid(row=0, column=0, padx=(10, 5), pady=10, sticky="nsew")

        self.post_detail_frame = PostDetailFrame(self, self.assets)
        self.post_detail_frame.grid(row=0, column=1, padx=(5, 10), pady=10, sticky="nsew")

        # --- Status Bar ---
        self.status_bar = customtkinter.CTkLabel(self, text="Ready", anchor="w", font=self.assets.font_small)
        self.status_bar.grid(row=1, column=0, columnspan=2, padx=10, pady=(0, 10), sticky="ew")

        self._connect_callbacks()
        self._load_initial_data()

    def _connect_callbacks(self):
        self.post_list_frame.connect_callbacks(
            post_selected=self.on_post_selected,
            create_briefing=self.on_create_briefing
        )
        self.post_detail_frame.connect_callbacks(
            save=self.on_save_post,
            update=self.on_update_post,
            delete=self.on_delete_post,
            new=self.on_new_post,
            fetch=self.on_fetch_url,
            backup=self.on_backup_database,
            restore=self.on_restore_database
        )

    def _load_initial_data(self):
        """Loads all necessary data from the database on startup."""
        # --- RESTORED: Load projects and categories for the comboboxes ---
        self.refresh_projects()
        self.refresh_categories()
        self.refresh_post_list()
        self.on_new_post()

    # --- CONTROLLER LOGIC (HANDLERS FOR UI EVENTS) ---

    def on_post_selected(self, post_data, search_term):
        if post_data:
            self.selected_post_id = post_data['id']
            self.current_avatar_url = post_data.get('avatar_url')
            self.post_detail_frame.populate_form(post_data)
            self.update_status(f"Viewing Post ID: {self.selected_post_id}")
        else:
            self.refresh_post_list(search_term)

    def on_new_post(self):
        self.selected_post_id = None
        self.current_avatar_url = None
        self.post_list_frame.clear_selection()
        self.post_detail_frame.clear_form()
        self.update_status("Ready to create a new post.")

    def on_save_post(self):
        data = self.post_detail_frame.get_form_data()
        if not data["post_text"] or data["post_text"] == "Post content not found.":
            self.update_status("Cannot save post with no content.", is_error=True)
            return
        
        database.add_post(
            data["author"], data["post_text"], data["notes"], data["url"], 
            data["category_name"], data["project_name"], self.current_avatar_url
        )
        
        self.update_status("Post saved successfully.")
        # --- ADDED: Refresh projects/categories in case a new one was added ---
        self.refresh_projects()
        self.refresh_categories()
        self.refresh_post_list()
        self.on_new_post()

    def on_update_post(self):
        if self.selected_post_id is None:
            self.update_status("Error: No post selected to update.", is_error=True)
            return
            
        data = self.post_detail_frame.get_form_data()
        database.update_post(
            self.selected_post_id, data["author"], data["post_text"], data["notes"], 
            data["url"], data["category_name"], data["project_name"], self.current_avatar_url
        )
        
        self.update_status(f"Post ID {self.selected_post_id} updated.")
        # --- ADDED: Refresh projects/categories in case a new one was added ---
        self.refresh_projects()
        self.refresh_categories()
        self.refresh_post_list()

    def on_delete_post(self):
        if self.selected_post_id is None:
            self.update_status("Error: No post selected to delete.", is_error=True)
            return
            
        database.delete_post(self.selected_post_id)
        self.update_status(f"Post ID {self.selected_post_id} deleted.")
        self.refresh_post_list()
        self.on_new_post()

    def on_fetch_url(self, url):
        if self.is_fetching:
            return
        self.is_fetching = True
        self.update_status("Fetching post details...")
        self.post_detail_frame.set_url_entry_state("disabled")
        
        thread = threading.Thread(target=self._scrape_post_thread, args=(url,))
        thread.daemon = True
        thread.start()

    def on_backup_database(self):
        success, message = file_handler.backup_database()
        self.update_status(message, is_error=not success)

    def on_restore_database(self):
        success, message = file_handler.restore_database()
        self.update_status(message, is_error=not success)
        if success:
            self._load_initial_data()

    def on_create_briefing(self, search_term):
        posts = database.get_all_posts(search_term)
        success, message = file_handler.create_briefing(posts, search_term)
        self.update_status(message, is_error=not success)

    # --- DATA REFRESHERS ---

    def refresh_post_list(self, search_term=None):
        posts = database.get_all_posts(search_term)
        self.post_list_frame.refresh_post_list(posts)

    # --- RESTORED: Methods to fetch data and update the comboboxes ---
    def refresh_projects(self):
        """Fetches projects and tells the detail frame to update its menu."""
        projects = database.get_all_projects()
        project_names = [p['name'] for p in projects]
        self.post_detail_frame.update_project_menu(project_names)

    def refresh_categories(self):
        """Fetches categories and tells the detail frame to update its menu."""
        categories = database.get_all_categories()
        category_names = [cat['name'] for cat in categories]
        self.post_detail_frame.update_category_menu(category_names)

    # --- HELPER & THREADING METHODS ---

    def update_status(self, message, is_error=False):
        color = "#D32F2F" if is_error else "#DCE4EE"
        self.status_bar.configure(text=message, text_color=color)
        self.status_bar.after(4000, lambda: self.status_bar.configure(text=""))

    def _scrape_post_thread(self, url):
        scraped_data = self.scraper.fetch_post_data(url)
        self.after(0, self._populate_scraped_data, scraped_data)

    def _populate_scraped_data(self, data):
        self.is_fetching = False
        self.post_detail_frame.set_url_entry_state("normal")

        if data:
            self.current_avatar_url = data.get("avatar_url")
            self.post_detail_frame.populate_scraped_data(data)
            self.update_status("Post data fetched successfully!")
        else:
            self.current_avatar_url = None
            self.update_status("Fetch failed. Post may be private or deleted.", is_error=True)
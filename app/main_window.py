# app/main_window.py

import customtkinter
import threading
from . import database
from . import file_handler
from .scraper import PostScraper
from .ui.post_list_frame import PostListFrame
from .ui.post_detail_frame import PostDetailFrame
from .ui.management_dialog import ManagementDialog
# --- NEW: Import our RAG Engine ---
from .rag.core import RagEngine

class MainWindow(customtkinter.CTkFrame):
    def __init__(self, master, assets):
        super().__init__(master)
        self.assets = assets
        self.scraper = PostScraper()
        # --- NEW: Instantiate the RAG Engine on app startup ---
        # This will cause a short, one-time delay as models are loaded.
        self.rag_engine = RagEngine()

        # --- Application State ---
        self.selected_post_id = None
        self.current_avatar_url = None
        self.current_resources = None
        # --- NEW: State to hold the full content for RAG analysis ---
        self.current_content = None
        self.is_fetching = False
        self.dialog = None

        # --- Main Layout ---
        self.grid_columnconfigure(0, weight=1, minsize=300)
        self.grid_columnconfigure(1, weight=3)
        self.grid_rowconfigure(0, weight=1)

        # --- UI Components ---
        self.post_list_frame = PostListFrame(self, self.assets)
        self.post_list_frame.grid(row=0, column=0, padx=(10, 5), pady=10, sticky="nsew")

        self.post_detail_frame = PostDetailFrame(self, self.assets)
        self.post_detail_frame.grid(row=0, column=1, padx=(5, 10), pady=10, sticky="nsew")

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
            restore=self.on_restore_database,
            manage_projects=self.on_manage_projects,
            manage_categories=self.on_manage_categories,
            # --- NEW: Connect the analyze callback for the button we will add ---
            analyze=self.on_analyze_post
        )

    def _load_initial_data(self):
        self.refresh_projects()
        self.refresh_categories()
        self.refresh_post_list()
        self.on_new_post()

    # --- CONTROLLER LOGIC (HANDLERS FOR UI EVENTS) ---

    def on_post_selected(self, post_data, search_term):
        if post_data:
            self.selected_post_id = post_data['id']
            self.current_avatar_url = post_data.get('avatar_url')
            self.current_resources = post_data.get('resources')
            # --- MODIFIED: Store the content from the selected post ---
            self.current_content = post_data.get('content')
            self.post_detail_frame.populate_form(post_data)
            self.update_status(f"Viewing Post ID: {self.selected_post_id}")
        else:
            # This handles the case where the search term changes, triggering a refresh
            self.refresh_post_list(search_term)

    def on_new_post(self):
        self.selected_post_id = None
        self.current_avatar_url = None
        self.current_resources = None
        # --- MODIFIED: Clear the content when starting a new post ---
        self.current_content = None
        self.post_list_frame.clear_selection()
        self.post_detail_frame.clear_form()
        self.update_status("Ready to create a new post.")

    def on_save_post(self):
        data = self.post_detail_frame.get_form_data()
        if not data["post_text"] or data["post_text"] == "Post content not found.":
            self.update_status("Cannot save post with no content.", is_error=True)
            return
        
        # --- MODIFIED: Pass the stored content to the database function ---
        database.add_post(
            data["author"], data["post_text"], data["notes"], data["url"], 
            data["category_name"], data["project_name"], self.current_avatar_url,
            self.current_resources, self.current_content
        )
        
        self.update_status("Post saved successfully.")
        self.refresh_projects()
        self.refresh_categories()
        self.refresh_post_list()
        self.on_new_post()

    def on_update_post(self):
        if self.selected_post_id is None:
            self.update_status("Error: No post selected to update.", is_error=True)
            return
            
        data = self.post_detail_frame.get_form_data()
        # --- MODIFIED: Pass the stored content to the database function ---
        database.update_post(
            self.selected_post_id, data["author"], data["post_text"], data["notes"], 
            data["url"], data["category_name"], data["project_name"], self.current_avatar_url,
            self.current_resources, self.current_content
        )
        
        self.update_status(f"Post ID {self.selected_post_id} updated.")
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

    # --- NEW: Handler for the "Analyze" button click ---
    def on_analyze_post(self):
        if self.selected_post_id is None:
            self.update_status("Please select a post to analyze.", is_error=True)
            return
        
        if not self.current_content or not self.current_content.strip():
            self.update_status("This post has no content to analyze.", is_error=True)
            return

        # Disable the button in the UI to prevent multiple clicks
        self.post_detail_frame.set_analyze_button_state("disabled")
        self.update_status(f"Analyzing Post ID: {self.selected_post_id}...")

        # Run the analysis in a background thread to keep the UI responsive
        thread = threading.Thread(target=self._analyze_post_thread)
        thread.daemon = True
        thread.start()

    # --- NEW: Worker thread for RAG analysis ---
    def _analyze_post_thread(self):
        post_id = self.selected_post_id
        content = self.current_content

        # Step 1: Get the one-liner summary
        self.rag_engine.build_index_from_text(content, str(post_id))
        summary = self.rag_engine.get_one_liner_summary()

        if summary:
            # Step 2: Save summary to the database
            database.update_post_summary(post_id, summary)
            # We'll add tagging logic here in a future step
            
            # Step 3: Schedule UI update on the main thread
            self.after(0, self._on_analysis_complete, post_id)
        else:
            # Handle failure
            self.after(0, self._on_analysis_failed)
            
    # --- NEW: UI update function for successful analysis ---
    def _on_analysis_complete(self, post_id):
        self.update_status(f"Analysis complete for Post ID: {post_id}.")
        self.post_detail_frame.set_analyze_button_state("normal")
        
        # Refresh the entire post list to get the new data from the DB
        self.refresh_post_list()
        
        # Find the newly updated post data in the refreshed list
        all_posts = self.post_list_frame.posts_data
        updated_post_data = next((p for p in all_posts if p['id'] == post_id), None)
        
        # Re-select the post to update the detail view with the new summary
        if updated_post_data:
            self.on_post_selected(updated_post_data, self.post_list_frame.search_entry.get())

    # --- NEW: UI update function for failed analysis ---
    def _on_analysis_failed(self):
        self.update_status("Analysis failed. Check terminal logs for details.", is_error=True)
        self.post_detail_frame.set_analyze_button_state("normal")

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

    def on_manage_projects(self):
        if self.dialog is not None and self.dialog.winfo_exists():
            self.dialog.focus()
            return
        
        projects = database.get_all_projects()
        self.dialog = ManagementDialog(self, "Manage Projects", projects, self.delete_project)

    def on_manage_categories(self):
        if self.dialog is not None and self.dialog.winfo_exists():
            self.dialog.focus()
            return
            
        categories = database.get_all_categories()
        self.dialog = ManagementDialog(self, "Manage Categories", categories, self.delete_category)

    def delete_project(self, project_id):
        database.delete_project(project_id)
        self.update_status("Project deleted successfully.")
        self.refresh_projects()
        self.refresh_post_list()

    def delete_category(self, category_id):
        database.delete_category(category_id)
        self.update_status("Category deleted successfully.")
        self.refresh_categories()
        self.refresh_post_list()

    def refresh_post_list(self, search_term=None):
        posts = database.get_all_posts(search_term)
        self.post_list_frame.refresh_post_list(posts)

    def refresh_projects(self):
        projects = database.get_all_projects()
        project_names = [p['name'] for p in projects]
        self.post_detail_frame.update_project_menu(project_names)

    def refresh_categories(self):
        categories = database.get_all_categories()
        category_names = [cat['name'] for cat in categories]
        self.post_detail_frame.update_category_menu(category_names)

    def update_status(self, message, is_error=False):
        color = "#D32F2F" if is_error else "#DCE4EE"
        self.status_bar.configure(text=message, text_color=color)
        self.status_bar.after(5000, lambda: self.status_bar.configure(text=""))

    def _scrape_post_thread(self, url):
        scraped_data = self.scraper.fetch_post_data(url)
        self.after(0, self._populate_scraped_data, scraped_data)

    def _populate_scraped_data(self, data):
        self.is_fetching = False
        self.post_detail_frame.set_url_entry_state("normal")

        if data:
            self.current_avatar_url = data.get("avatar_url")
            self.current_resources = data.get("resources")
            # --- MODIFIED: Store the scraped content in our state variable ---
            self.current_content = data.get("content")
            self.post_detail_frame.populate_scraped_data(data)
            self.update_status("Post data fetched successfully!")
        else:
            self.current_avatar_url = None
            self.current_resources = None
            # --- MODIFIED: Clear content on a failed fetch ---
            self.current_content = None
            self.update_status("Fetch failed. Post may be private or deleted.", is_error=True)
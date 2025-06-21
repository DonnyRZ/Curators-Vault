import customtkinter
import pyperclip
import webbrowser
from .database import get_all_categories, add_post, update_post, delete_post, get_all_posts, get_all_projects
from tkinter import filedialog
import shutil
import os
from playwright.sync_api import sync_playwright
import threading
import re

class MainWindow(customtkinter.CTkFrame):
    def __init__(self, master, assets):
        super().__init__(master)
        self.assets = assets

        self.selected_post_id = None
        self.selected_post_frame = None

        self.grid_columnconfigure(0, weight=1, minsize=300); self.grid_columnconfigure(1, weight=3)
        self.grid_rowconfigure(0, weight=1); self.grid_rowconfigure(1, weight=0)

        # Left Frame
        self.left_frame = customtkinter.CTkFrame(self); self.left_frame.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")
        self.left_frame.grid_columnconfigure(0, weight=1); self.left_frame.grid_rowconfigure(2, weight=1) 
        list_label = customtkinter.CTkLabel(self.left_frame, text="Saved Posts", font=self.assets.font_heading); list_label.grid(row=0, column=0, padx=20, pady=(20, 10), sticky="w")
        self.search_entry = customtkinter.CTkEntry(self.left_frame, placeholder_text="Search...", font=self.assets.font_body); self.search_entry.grid(row=1, column=0, padx=20, pady=(0, 10), sticky="ew")
        self.search_entry.bind("<KeyRelease>", self.on_search_change)
        self.search_icon_label = customtkinter.CTkLabel(self.search_entry, text="", image=self.assets.search_icon); self.search_icon_label.place(relx=1.0, rely=0.5, x=-10, anchor="e")
        self.scrollable_post_list = customtkinter.CTkScrollableFrame(self.left_frame); self.scrollable_post_list.grid(row=2, column=0, padx=20, pady=(0, 10), sticky="nsew")
        self.scrollable_post_list.grid_columnconfigure(0, weight=1)
        self.briefing_button = customtkinter.CTkButton(self.left_frame, text="Create Briefing", image=self.assets.briefing_icon, font=self.assets.font_button, command=self.create_briefing_action, height=40, compound="left", anchor="center"); self.briefing_button.grid(row=3, column=0, padx=20, pady=10, sticky="ew")

        # Right Frame
        self.right_frame = customtkinter.CTkFrame(self); self.right_frame.grid(row=0, column=1, padx=(0, 10), pady=10, sticky="nsew")
        self.right_frame.grid_columnconfigure(0, weight=1); self.right_frame.grid_rowconfigure(4, weight=1); self.right_frame.grid_rowconfigure(6, weight=1); self.right_frame.grid_rowconfigure(10, weight=10)
        self.form_label = customtkinter.CTkLabel(self.right_frame, text="Post Details", font=self.assets.font_heading); self.form_label.grid(row=0, column=0, columnspan=2, padx=20, pady=(20, 10), sticky="w")
        url_label = customtkinter.CTkLabel(self.right_frame, text="Post URL", font=self.assets.font_small); url_label.grid(row=1, column=0, columnspan=2, padx=20, pady=(20, 0), sticky="w")
        self.url_entry = customtkinter.CTkEntry(self.right_frame, font=self.assets.font_body, placeholder_text="Paste a valid X.com URL to automatically fetch data...")
        self.url_entry.grid(row=2, column=0, columnspan=2, padx=20, pady=(0, 10), sticky="ew")
        self.url_entry.bind("<KeyRelease>", self.on_url_change)
        self.profile_frame = customtkinter.CTkFrame(self.right_frame, fg_color="transparent"); self.profile_frame.grid(row=3, column=0, columnspan=2, padx=20, pady=10, sticky="ew")
        self.profile_frame.grid_columnconfigure(1, weight=1)
        self.avatar_label = customtkinter.CTkLabel(self.profile_frame, text="", image=self.assets.default_avatar); self.avatar_label.grid(row=0, column=0, rowspan=2, padx=(0,10))
        self.author_name_label = customtkinter.CTkLabel(self.profile_frame, text="Author Name", font=self.assets.font_button, anchor="w"); self.author_name_label.grid(row=0, column=1, sticky="w")
        self.author_handle_label = customtkinter.CTkLabel(self.profile_frame, text="@author_handle", font=self.assets.font_small, text_color="gray", anchor="w"); self.author_handle_label.grid(row=1, column=1, sticky="w")
        post_text_label = customtkinter.CTkLabel(self.right_frame, text="Post Text", font=self.assets.font_small); post_text_label.grid(row=4, column=0, columnspan=2, padx=20, pady=(10, 0), sticky="w")
        self.post_text_box = customtkinter.CTkTextbox(self.right_frame, height=100, font=self.assets.font_content); self.post_text_box.grid(row=5, column=0, columnspan=2, padx=20, pady=(0, 10), sticky="nsew")
        notes_label = customtkinter.CTkLabel(self.right_frame, text="Your Notes / Ideas", font=self.assets.font_small); notes_label.grid(row=6, column=0, columnspan=2, padx=20, pady=(10, 0), sticky="w")
        self.notes_text_box = customtkinter.CTkTextbox(self.right_frame, height=60, font=self.assets.font_content); self.notes_text_box.grid(row=7, column=0, columnspan=2, padx=20, pady=(0, 10), sticky="nsew")
        
        project_label = customtkinter.CTkLabel(self.right_frame, text="Project", font=self.assets.font_small); project_label.grid(row=8, column=0, padx=20, pady=(10, 0), sticky="w")
        self.project_menu = customtkinter.CTkOptionMenu(self.right_frame, font=self.assets.font_button, height=40); self.project_menu.grid(row=9, column=0, padx=20, pady=(0, 10), sticky="w")
        
        category_label = customtkinter.CTkLabel(self.right_frame, text="Category", font=self.assets.font_small); category_label.grid(row=8, column=1, padx=20, pady=(10, 0), sticky="w")
        categories = get_all_categories(); category_names = [cat['name'] for cat in categories]
        self.category_menu = customtkinter.CTkOptionMenu(self.right_frame, values=category_names, font=self.assets.font_button, height=40); self.category_menu.grid(row=9, column=1, padx=20, pady=(0, 10), sticky="w")
        
        self.button_frame = customtkinter.CTkFrame(self.right_frame, fg_color="transparent"); self.button_frame.grid(row=10, column=0, columnspan=2, padx=20, pady=10, sticky="ew")
        self.button_frame.grid_columnconfigure((0, 1, 2), weight=1)
        self.save_button = customtkinter.CTkButton(self.button_frame, text="Save New Post", font=self.assets.font_button, command=self.save_post_action, height=40)
        self.update_button = customtkinter.CTkButton(self.button_frame, text="Update", image=self.assets.update_icon, font=self.assets.font_button, command=self.update_post_action, height=40, compound="left", anchor="center")
        self.delete_button = customtkinter.CTkButton(self.button_frame, text="Delete", image=self.assets.delete_icon, font=self.assets.font_button, fg_color="#D32F2F", hover_color="#B71C1C", command=self.delete_post_action, height=40, compound="left", anchor="center")
        self.new_post_button = customtkinter.CTkButton(self.button_frame, text="New", image=self.assets.new_icon, font=self.assets.font_button, command=self.clear_form_action, height=40, compound="left", anchor="center")
        
        self.settings_frame = customtkinter.CTkFrame(self.right_frame); self.settings_frame.grid(row=11, column=0, columnspan=2, padx=10, pady=10, sticky="sew")
        self.settings_frame.grid_columnconfigure((0, 1), weight=1)
        settings_label = customtkinter.CTkLabel(self.settings_frame, text="Database Management", font=self.assets.font_small); settings_label.grid(row=0, column=0, columnspan=2, padx=10, pady=(5,0))
        self.backup_button = customtkinter.CTkButton(self.settings_frame, text="Backup", image=self.assets.backup_icon, font=self.assets.font_button, command=self.backup_database_action, height=40, compound="left", anchor="center"); self.backup_button.grid(row=1, column=0, padx=10, pady=10, sticky="ew")
        self.restore_button = customtkinter.CTkButton(self.settings_frame, text="Restore", image=self.assets.restore_icon, font=self.assets.font_button, command=self.restore_database_action, height=40, compound="left", anchor="center"); self.restore_button.grid(row=1, column=1, padx=10, pady=10, sticky="ew")
        
        self.status_bar = customtkinter.CTkLabel(self, text="", anchor="w", font=self.assets.font_small); self.status_bar.grid(row=1, column=0, columnspan=2, padx=10, pady=(5, 10), sticky="ew")
        
        self.load_projects_into_menu()
        self.clear_form_action()
        self.refresh_post_list()

    # --- THIS IS THE FIX: The missing update_status method is restored ---
    def update_status(self, message, is_error=False):
        self.status_bar.configure(text=message, text_color=("#C70039" if is_error else "#DCE4EE"))
        self.status_bar.after(4000, lambda: self.status_bar.configure(text=""))

    def on_url_change(self, event=None):
        url = self.url_entry.get()
        if url and ("x.com" in url or "twitter.com" in url) and "/status/" in url and self.url_entry.cget("state") == "normal":
            self.after(500, self.start_fetch_thread)

    def start_fetch_thread(self):
        if self.url_entry.cget("state") == "disabled": return
        self.url_entry.configure(state="disabled"); self.update_status("Fetching post details...")
        thread = threading.Thread(target=self._scrape_post_thread, args=(self.url_entry.get(),)); thread.daemon = True; thread.start()

    def _scrape_post_thread(self, url):
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(); page = browser.new_page()
                page.goto(url, wait_until='domcontentloaded', timeout=20000)
                article_selector = 'article[data-testid="tweet"]'; page.wait_for_selector(article_selector, timeout=15000)
                post_article = page.query_selector(article_selector)
                
                author_name = "Author Not Found"; author_handle = "@handle_not_found"
                user_container = post_article.query_selector('div[data-testid="User-Name"]')
                if user_container:
                    spans = user_container.query_selector_all('span')
                    if len(spans) >= 1: author_name = spans[0].inner_text().strip()
                    for span in spans:
                        if span.inner_text().strip().startswith('@'): author_handle = span.inner_text().strip(); break
                
                post_text_element = post_article.query_selector('div[data-testid="tweetText"]'); post_text = post_text_element.inner_text() if post_text_element else "Post content not found."
                avatar_element = post_article.query_selector('div[data-testid="Tweet-User-Avatar"] img'); avatar_url = avatar_element.get_attribute('src') if avatar_element else None
                
                browser.close()
                self.after(0, self.populate_fetched_data, author_name, author_handle, post_text, avatar_url)
        except Exception as e:
            self.after(0, self.update_status, f"Fetch failed. Post may be private or deleted.", True)
            print(f"Playwright Error: {e}") 
        finally:
            self.after(0, lambda: self.url_entry.configure(state="normal"))

    def populate_fetched_data(self, author_name, author_handle, content, avatar_url):
        self.clear_form_action(clear_url=False)
        self.author_name_label.configure(text=author_name); self.author_handle_label.configure(text=author_handle)
        self.post_text_box.insert("1.0", content)
        if avatar_url: threading.Thread(target=self._load_and_set_avatar, args=(avatar_url,), daemon=True).start()
        self.update_status("Post data fetched successfully!"); self.notes_text_box.focus()

    def _load_and_set_avatar(self, url):
        avatar_image = self.assets.load_avatar_from_url(url)
        self.after(0, lambda: self.avatar_label.configure(image=avatar_image))

    def _update_ui_state(self):
        if self.selected_post_id is not None:
            self.form_label.configure(text="Edit Post Details")
            self.save_button.grid_remove()
            self.update_button.grid(row=0, column=0, padx=5, sticky="ew"); self.delete_button.grid(row=0, column=1, padx=5, sticky="ew"); self.new_post_button.grid(row=0, column=2, padx=5, sticky="ew")
        else:
            self.form_label.configure(text="Add New Post")
            self.save_button.grid(row=0, column=0, columnspan=3, padx=5, sticky="ew")
            self.update_button.grid_remove(); self.delete_button.grid_remove(); self.new_post_button.grid_remove()
            
    def clear_form_action(self, clear_url=True):
        self.selected_post_id = None
        if self.selected_post_frame: self.selected_post_frame.configure(fg_color="transparent"); self.selected_post_frame = None
        if clear_url: self.url_entry.delete(0, "end")
        self.post_text_box.delete("1.0", "end"); self.notes_text_box.delete("1.0", "end")
        self.author_name_label.configure(text="Author Name"); self.author_handle_label.configure(text="@author_handle")
        self.avatar_label.configure(image=self.assets.default_avatar)
        self._update_ui_state()
        
    def show_post_details(self, post, post_frame):
        if self.selected_post_frame: self.selected_post_frame.configure(fg_color="transparent")
        post_frame.configure(fg_color=("#E5E5E5", "#2A2D2E")); self.selected_post_frame = post_frame
        self.selected_post_id = post['id']
        
        self.url_entry.delete(0, "end"); self.url_entry.insert(0, post['url'] or "")
        self.post_text_box.delete("1.0", "end"); self.post_text_box.insert("1.0", post['post_text'] or "")
        self.notes_text_box.delete("1.0", "end"); self.notes_text_box.insert("1.0", post['notes'] or "")
        
        author_full = post['author'] or "Author Name (@author_handle)"
        try:
            author_parts = author_full.rsplit('(', 1)
            author_name = author_parts[0].strip()
            author_handle = f"@{author_parts[1]}" if len(author_parts) > 1 else ""
            author_handle = author_handle.replace(')','').strip()
        except (ValueError, IndexError): author_name, author_handle = author_full, ""
        self.author_name_label.configure(text=author_name); self.author_handle_label.configure(text=author_handle)
        
        self.avatar_label.configure(image=self.assets.default_avatar)
        if post['category_name']: self.category_menu.set(post['category_name'])
        if post['project_name']: self.project_menu.set(post['project_name'])
        else: self.project_menu.set("Uncategorized Ideas")
        
        self._update_ui_state()
        self.update_status(f"Viewing Post ID: {post['id']}")

    def load_projects_into_menu(self):
        self.projects = get_all_projects()
        self.project_map = {p['name']: p['id'] for p in self.projects}
        project_names = list(self.project_map.keys())
        self.project_menu.configure(values=project_names)
        if project_names: self.project_menu.set(project_names[0])

    def save_post_action(self):
        author = f"{self.author_name_label.cget('text')} ({self.author_handle_label.cget('text')})"
        post_text=self.post_text_box.get("1.0","end-1c"); notes=self.notes_text_box.get("1.0","end-1c"); url=self.url_entry.get(); category=self.category_menu.get()
        project_name = self.project_menu.get(); project_id = self.project_map.get(project_name)
        if not post_text or post_text == "Post content not found.":
            self.update_status("Cannot save post with no content.", is_error=True); return
        add_post(author,post_text,notes,url,category, project_id); self.update_status("Post saved successfully."); self.clear_form_action(); self.refresh_post_list()

    def update_post_action(self):
        if self.selected_post_id is not None:
            author = f"{self.author_name_label.cget('text')} ({self.author_handle_label.cget('text')})"
            post_text=self.post_text_box.get("1.0","end-1c"); notes=self.notes_text_box.get("1.0","end-1c"); url=self.url_entry.get(); category=self.category_menu.get()
            project_name = self.project_menu.get(); project_id = self.project_map.get(project_name)
            update_post(self.selected_post_id,author,post_text,notes,url,category, project_id); self.update_status(f"Post ID {self.selected_post_id} updated."); self.refresh_post_list()
        else: self.update_status("Error: No post selected to update.", is_error=True)

    def delete_post_action(self):
        if self.selected_post_id is not None:
            post_id_to_delete = self.selected_post_id; delete_post(post_id_to_delete); self.update_status(f"Post ID {post_id_to_delete} deleted."); self.clear_form_action(); self.refresh_post_list()
        else: self.update_status("Error: No post selected to delete.", is_error=True)

    def refresh_post_list(self, search_term=None):
        for widget in self.scrollable_post_list.winfo_children(): widget.destroy()
        posts = get_all_posts(search_term)
        for i, post in enumerate(posts):
            post_frame = customtkinter.CTkFrame(self.scrollable_post_list, fg_color="transparent", corner_radius=5); post_frame.grid(row=i, column=0, padx=5, pady=5, sticky="ew")
            post_frame.grid_columnconfigure(0, weight=1)
            author = post['author'] or "Unknown author"; post_text = post['post_text'] or "No content"
            author_label = customtkinter.CTkLabel(post_frame, text=author, font=customtkinter.CTkFont(family="Inter", weight="bold"), justify="left", anchor="w"); author_label.grid(row=0, column=0, padx=10, pady=(10, 0), sticky="w")
            display_text = f"{post_text[:80]}..." if len(post_text)>80 else post_text
            post_content_label=customtkinter.CTkLabel(post_frame, text=display_text, font=self.assets.font_body, justify="left", anchor="w"); post_content_label.grid(row=1, column=0, padx=10, pady=(0, 10), sticky="w")
            post_frame.bind("<Button-1>", command=lambda e, p=post, f=post_frame: self.show_post_details(p, f)); author_label.bind("<Button-1>", command=lambda e, p=post, f=post_frame: self.show_post_details(p, f)); post_content_label.bind("<Button-1>", command=lambda e, p=post, f=post_frame: self.show_post_details(p, f))
    
    def on_search_change(self, event=None): self.refresh_post_list(self.search_entry.get())
    def backup_database_action(self):
        backup_path = filedialog.asksaveasfilename(defaultextension=".db", filetypes=[("Database files", "*.db")], title="Save Backup", initialfile="curators_vault_backup.db")
        if backup_path:
            try: shutil.copyfile(os.path.join(os.path.dirname(__file__), '..', 'curators_vault.db'), backup_path); self.update_status(f"Backup successful: {os.path.basename(backup_path)}")
            except Exception as e: self.update_status(f"Backup failed: {e}", is_error=True)
    def restore_database_action(self):
        backup_path = filedialog.askopenfilename(filetypes=[("Database files", "*.db")], title="Select Backup to Restore")
        if backup_path:
            try:
                shutil.copyfile(backup_path, os.path.join(os.path.dirname(__file__), '..', 'curators_vault.db')); self.update_status(f"Restore successful from {os.path.basename(backup_path)}")
                self.refresh_post_list(); self.clear_form_action()
            except Exception as e: self.update_status(f"Restore failed: {e}", is_error=True)
    def create_briefing_action(self):
        search_term = self.search_entry.get(); posts = get_all_posts(search_term)
        if not posts: self.update_status("No posts in list to create a briefing from.", is_error=True); return
        file_path = filedialog.asksaveasfilename(defaultextension=".md", filetypes=[("Markdown", "*.md")], title="Save Briefing")
        if not file_path: return
        content = f"# X Briefing: {search_term or 'All Posts'}\n\n";
        for post in posts: content += f"## Post by: {post['author'] or 'N/A'}\n**URL:** {post['url'] or 'N/A'}\n\n### Text\n```\n{post['post_text'] or ''}\n```\n\n### Notes\n```\n{post['notes'] or ''}\n```\n\n---\n\n"
        try:
            with open(file_path, "w", encoding="utf-8") as f: f.write(content)
            self.update_status(f"Briefing saved: {os.path.basename(file_path)}")
        except Exception as e: self.update_status(f"Failed to save briefing: {e}", is_error=True)
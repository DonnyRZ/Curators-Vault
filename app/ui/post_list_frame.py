# app/ui/post_list_frame.py

import customtkinter

class PostListFrame(customtkinter.CTkFrame):
    """
    A frame that displays a searchable list of posts.
    It is responsible for its own layout and widgets. When a post is selected,
    it notifies the parent controller via a callback.
    """
    def __init__(self, master, assets):
        super().__init__(master)
        self.assets = assets
        self.posts_data = []
        self.selected_post_frame = None

        # Callbacks to be set by the controller
        self.post_selected_callback = None
        self.create_briefing_callback = None

        self._setup_layout()
        self._create_widgets()

    def _setup_layout(self):
        """Configure the grid layout for this frame."""
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

    def _create_widgets(self):
        """Create and place all the UI widgets for the post list view."""
        list_label = customtkinter.CTkLabel(self, text="Saved Posts", font=self.assets.font_heading)
        list_label.grid(row=0, column=0, padx=20, pady=(20, 10), sticky="w")
        
        self.search_entry = customtkinter.CTkEntry(self, placeholder_text="Search...", font=self.assets.font_body)
        self.search_entry.grid(row=1, column=0, padx=20, pady=(0, 10), sticky="ew")
        self.search_entry.bind("<KeyRelease>", self._on_search_change)
        
        search_icon_label = customtkinter.CTkLabel(self.search_entry, text="", image=self.assets.search_icon)
        search_icon_label.place(relx=1.0, rely=0.5, x=-10, anchor="e")

        self.scrollable_post_list = customtkinter.CTkScrollableFrame(self)
        self.scrollable_post_list.grid(row=2, column=0, padx=20, pady=(0, 10), sticky="nsew")
        self.scrollable_post_list.grid_columnconfigure(0, weight=1)

        briefing_button = customtkinter.CTkButton(
            self,
            text="Create Briefing",
            image=self.assets.briefing_icon,
            font=self.assets.font_button,
            command=lambda: self.create_briefing_callback(self.search_entry.get()) if self.create_briefing_callback else None,
            height=40,
            compound="left",
            anchor="center"
        )
        briefing_button.grid(row=3, column=0, padx=20, pady=10, sticky="ew")

    # --- PUBLIC METHODS (API for the controller) ---

    def connect_callbacks(self, post_selected, create_briefing):
        """Connects callbacks to methods in the controller."""
        self.post_selected_callback = post_selected
        self.create_briefing_callback = create_briefing

    def refresh_post_list(self, posts: list):
        """
        Clears and re-populates the list of posts from a new list of data.
        This method should be called by the main controller.
        """
        self.posts_data = posts
        self.selected_post_frame = None

        # Clear existing widgets
        for widget in self.scrollable_post_list.winfo_children():
            widget.destroy()
            
        # Create new widgets from the data
        for i, post in enumerate(self.posts_data):
            post_frame = customtkinter.CTkFrame(self.scrollable_post_list, fg_color="transparent", corner_radius=5)
            post_frame.grid(row=i, column=0, padx=5, pady=5, sticky="ew")
            post_frame.grid_columnconfigure(0, weight=1)
            
            author = post.get('author', "Unknown author")
            post_text = post.get('post_text', "No content")
            display_text = f"{post_text[:80]}..." if len(post_text) > 80 else post_text
            
            author_label = customtkinter.CTkLabel(post_frame, text=author, font=self.assets.font_button, justify="left", anchor="w")
            author_label.grid(row=0, column=0, padx=10, pady=(10, 0), sticky="w")
            
            post_content_label = customtkinter.CTkLabel(post_frame, text=display_text, font=self.assets.font_body, justify="left", anchor="w")
            post_content_label.grid(row=1, column=0, padx=10, pady=(0, 10), sticky="w")
            
            # Bind clicks to the internal handler
            command = lambda e, p=post, f=post_frame: self._on_post_selected(p, f)
            post_frame.bind("<Button-1>", command)
            author_label.bind("<Button-1>", command)
            post_content_label.bind("<Button-1>", command)

    def clear_selection(self):
        """Visually deselects the currently selected post frame."""
        if self.selected_post_frame:
            self.selected_post_frame.configure(fg_color="transparent")
            self.selected_post_frame = None

    # --- PRIVATE METHODS ---

    def _on_search_change(self, event=None):
        """
        Internal handler for search entry changes.
        It calls the post_selected_callback with the search term.
        The controller is responsible for fetching the filtered data.
        """
        if self.post_selected_callback:
            # We reuse the post_selected_callback to trigger a refresh.
            # The controller will see the post_data is None and just refresh the list.
            self.post_selected_callback(None, self.search_entry.get())

    def _on_post_selected(self, post_data: dict, post_frame: customtkinter.CTkFrame):
        """
        Internal handler for when a post is clicked.
        It updates the visual selection and calls the main controller's callback.
        """
        self.clear_selection()
        
        post_frame.configure(fg_color=("#E5E5E5", "#2A2D2E"))
        self.selected_post_frame = post_frame
        
        if self.post_selected_callback:
            self.post_selected_callback(post_data, self.search_entry.get())
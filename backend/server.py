# backend/server.py

from flask import Flask, jsonify
from flask_cors import CORS

# Import our blueprint from the api folder
from api.project_routes import project_bp

# --- Application Factory ---
def create_app():
    """Creates and configures the Flask application."""
    
    # Create the Flask app instance
    app = Flask(__name__)
    
    # --- CORS Configuration ---
    # This is crucial. It allows our Tauri frontend (running on a different
    # 'origin') to make requests to this backend.
    CORS(app, resources={r"/api/*": {"origins": "*"}}) # A bit lenient for dev, can be tightened later

    # --- Register Blueprints ---
    # This tells the app about all the routes we defined in project_routes.py,
    # and it prefixes them with '/api'.
    # So, '/scan_project' becomes '/api/scan_project'.
    app.register_blueprint(project_bp, url_prefix='/api')

    # --- A simple health-check route ---
    # This is useful for testing if the server is up and running.
    @app.route('/')
    def index():
        return jsonify({"status": "ok", "message": "Curator's Atlas Backend is running."})

    return app


# --- Main Entry Point ---
if __name__ == '__main__':
    # This block runs only when you execute 'python server.py' directly.
    # It's used for development and testing.
    app = create_app()
    
    # Running in debug mode gives us helpful error messages and auto-reloads
    # when we save a file. Port 5001 is what we planned in the blueprint.
    app.run(debug=True, port=5001)
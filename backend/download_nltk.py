import os
import urllib.request
import zipfile
import shutil
import sys
import site

def download_punkt_with_progress():
    """
    Downloads and extracts the NLTK 'punkt' tokenizer, showing progress,
    and performing cleanup before and after.
    """
    # --- Setup Paths ---
    try:
        # A more reliable way to find the site-packages directory
        site_packages_path = next(p for p in site.getsitepackages() if 'site-packages' in p)
        nltk_data_path = os.path.join(site_packages_path, "llama_index/core/_static/nltk_cache")
    except (StopIteration, IndexError):
        print("Error: Could not automatically find the site-packages directory.")
        # Fallback to the previously used path if auto-detection fails
        venv_path = os.path.join(os.path.dirname(__file__), "..", ".venv")
        nltk_data_path = os.path.join(venv_path, "lib/python3.12/site-packages/llama_index/core/_static/nltk_cache")
        print(f"Falling back to a hardcoded path: {nltk_data_path}")

    tokenizers_path = os.path.join(nltk_data_path, "tokenizers")
    punkt_path = os.path.join(tokenizers_path, "punkt")
    punkt_zip_path = os.path.join(tokenizers_path, "punkt.zip")
    url = "https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/tokenizers/punkt.zip"

    # --- 1. Cleanup ---
    print("--- Step 1: Cleaning up previous downloads ---")
    if os.path.exists(punkt_path):
        try:
            shutil.rmtree(punkt_path)
            print(f"Removed existing directory: {punkt_path}")
        except OSError as e:
            print(f"Error removing directory {punkt_path}: {e}")
            return
    if os.path.exists(punkt_zip_path):
        try:
            os.remove(punkt_zip_path)
            print(f"Removed existing zip file: {punkt_zip_path}")
        except OSError as e:
            print(f"Error removing zip file {punkt_zip_path}: {e}")
            return
    print("Cleanup complete.")

    # --- 2. Download with Manual Progress ---
    try:
        os.makedirs(tokenizers_path, exist_ok=True)
        print(f"--- Step 2: Downloading {url.split('/')[-1]} ---")

        with urllib.request.urlopen(url) as response:
            # Get total file size from headers
            total_size_str = response.info().get('Content-Length')
            if not total_size_str:
                print("Could not determine file size. Progress will not be shown.")
                total_size = 0
            else:
                total_size = int(total_size_str.strip())

            chunk_size = 1024 * 4  # 4 KB chunks
            bytes_so_far = 0

            with open(punkt_zip_path, 'wb') as f:
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break # Download finished
                    
                    f.write(chunk)
                    bytes_so_far += len(chunk)

                    # --- Progress Calculation and Display ---
                    if total_size > 0:
                        percent = float(bytes_so_far) / total_size
                        percent = round(percent * 100, 2)
                        # Use carriage return '\r' to stay on the same line
                        sys.stdout.write(f"\rDownloaded {bytes_so_far} of {total_size} bytes ({percent}%)")
                        sys.stdout.flush()

        sys.stdout.write('\n') # Move to the next line
        print("Download complete.")

    except Exception as e:
        print(f"\nAn error occurred during download: {e}")
        return

    # --- 3. Unzip ---
    try:
        print(f"--- Step 3: Extracting {punkt_zip_path} ---")
        with zipfile.ZipFile(punkt_zip_path, 'r') as zip_ref:
            zip_ref.extractall(tokenizers_path)
        print("Extraction complete.")
    except Exception as e:
        print(f"An error occurred during extraction: {e}")
        return
    finally:
        # --- 4. Final Cleanup ---
        if os.path.exists(punkt_zip_path):
            os.remove(punkt_zip_path)
            print(f"Removed temporary zip file: {punkt_zip_path}")

    print("\nNLTK 'punkt' tokenizer has been successfully installed.")

if __name__ == "__main__":
    download_punkt_with_progress()

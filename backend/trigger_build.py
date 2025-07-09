import requests
import sys

# Define the endpoint URL
BUILD_ENDPOINT = "http://127.0.0.1:5001/api/build_armory_index"

def trigger_build():
    print(f"Attempting to trigger Armory index build at {BUILD_ENDPOINT}...")
    try:
        response = requests.post(BUILD_ENDPOINT)
        response.raise_for_status()  # Raise an exception for HTTP errors (4xx or 5xx)
        print("Successfully triggered build!")
        print("Response:", response.json())
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the backend server.")
        print("Please ensure the backend server is running at http://127.0.0.1:5001")
        sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"An error occurred during the request: {e}")
        if response is not None:
            print("Response status code:", response.status_code)
            print("Response body:", response.text)
        sys.exit(1)

if __name__ == "__main__":
    trigger_build()

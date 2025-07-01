
import requests
import json

url = "http://127.0.0.1:5001/api/enrich_repo"
headers = {"Content-Type": "application/json"}
# Corrected: Send 'url' directly as the JSON payload
data = {"url": "https://github.com/Canner/WrenAI"}

try:
    response = requests.post(url, headers=headers, data=json.dumps(data))
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
    response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
except requests.exceptions.RequestException as e:
    print(f"Request failed: {e}")
    if hasattr(e, 'response') and e.response is not None:
        print(f"Error Response Body: {e.response.text}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")

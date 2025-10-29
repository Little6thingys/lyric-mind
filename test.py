import requests

resp = requests.post(
    "http://127.0.0.1:5000/api/llama3",
    json={
        "prompt": "test",
        "xml": "<score-partwise><work><work-title>Untitled</work-title></work></score-partwise>"
    }
)
print(resp.json())

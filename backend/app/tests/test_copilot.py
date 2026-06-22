import pytest
from backend.app.models import ChatHistory

def test_get_chat_history(client, db):
    # 1. Sign up and login a test user to get authorized
    client.post(
        "/api/v1/auth/signup",
        json={
            "email": "copilotuser@example.com",
            "password": "copilotpassword",
            "full_name": "Copilot Tester",
            "role": "recruiter"
        }
    )
    
    login_resp = client.post(
        "/api/v1/auth/login",
        data={
            "username": "copilotuser@example.com",
            "password": "copilotpassword"
        }
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Insert mock chat history logs directly to the test db
    session_id = "test-session-123"
    msg1 = ChatHistory(session_id=session_id, role="user", message_text="Hello, who are you?")
    msg2 = ChatHistory(session_id=session_id, role="assistant", message_text="I am ARS recruiter copilot.")
    db.add(msg1)
    db.add(msg2)
    db.commit()

    # 3. Call GET /history/{session_id} and verify success and correct keys mapping
    response = client.get(f"/api/v1/copilot/history/{session_id}", headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 2
    
    # Check that message_text correctly maps to content in ChatMessage
    assert data[0]["role"] == "user"
    assert data[0]["content"] == "Hello, who are you?"
    assert "created_at" in data[0]

    assert data[1]["role"] == "assistant"
    assert data[1]["content"] == "I am ARS recruiter copilot."
    assert "created_at" in data[1]

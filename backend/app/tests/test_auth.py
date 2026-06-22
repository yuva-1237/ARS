import pytest

def test_signup(client):
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "testuser@example.com",
            "password": "testpassword",
            "full_name": "Test User",
            "role": "recruiter"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "testuser@example.com"
    assert "id" in data
    assert data["role"] == "recruiter"

def test_login(client):
    # First sign up
    client.post(
        "/api/v1/auth/signup",
        json={
            "email": "loginuser@example.com",
            "password": "loginpassword",
            "full_name": "Login User",
            "role": "hr_manager"
        }
    )
    
    # Try logging in (using form data)
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "loginuser@example.com",
            "password": "loginpassword"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "loginuser@example.com"
    assert data["user"]["role"] == "hr_manager"

def test_me(client):
    # First sign up and login
    client.post(
        "/api/v1/auth/signup",
        json={
            "email": "meuser@example.com",
            "password": "mepassword",
            "full_name": "Me User",
            "role": "admin"
        }
    )
    
    login_resp = client.post(
        "/api/v1/auth/login",
        data={
            "username": "meuser@example.com",
            "password": "mepassword"
        }
    )
    token = login_resp.json()["access_token"]
    
    # Retrieve current user with JWT authorization header
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "meuser@example.com"
    assert data["role"] == "admin"

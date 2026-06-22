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

def test_update_me(client):
    # First sign up and login
    client.post(
        "/api/v1/auth/signup",
        json={
            "email": "updateuser@example.com",
            "password": "updatepassword",
            "full_name": "Before Update",
            "role": "recruiter"
        }
    )
    
    login_resp = client.post(
        "/api/v1/auth/login",
        data={
            "username": "updateuser@example.com",
            "password": "updatepassword"
        }
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Perform PUT profile update (only full_name first)
    response = client.put(
        "/api/v1/auth/me",
        headers=headers,
        json={
            "full_name": "After Update"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "After Update"
    assert data["email"] == "updateuser@example.com"
    
    # Retrieve to confirm persistence
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["full_name"] == "After Update"
    
    # Now update the email
    response_email = client.put(
        "/api/v1/auth/me",
        headers=headers,
        json={
            "email": "updateuser_new@example.com"
        }
    )
    assert response_email.status_code == 200
    
    # Login again with the new email
    login_resp_new = client.post(
        "/api/v1/auth/login",
        data={
            "username": "updateuser_new@example.com",
            "password": "updatepassword"
        }
    )
    assert login_resp_new.status_code == 200
    token_new = login_resp_new.json()["access_token"]
    headers_new = {"Authorization": f"Bearer {token_new}"}
    
    # Verify we can retrieve with new token
    me_resp_new = client.get("/api/v1/auth/me", headers=headers_new)
    assert me_resp_new.status_code == 200
    assert me_resp_new.json()["email"] == "updateuser_new@example.com"

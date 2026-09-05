import db


def test_register_sets_session_cookie(client, user_email):
    resp = client.post("/auth/register", json={"email": user_email, "password": "testpass123"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == user_email
    assert body["is_admin"] is False
    assert "sms_session" in resp.cookies
    with db.pool.connection() as conn:
        conn.execute("DELETE FROM users WHERE email = %s", (user_email,))


def test_register_duplicate_email_conflicts(auth_client, user_email):
    resp = auth_client.post("/auth/register", json={"email": user_email, "password": "anotherpass123"})
    assert resp.status_code == 409


def test_register_invalid_email_rejected(client):
    resp = client.post("/auth/register", json={"email": "not-an-email", "password": "testpass123"})
    assert resp.status_code == 400


def test_login_success(client, user_email):
    client.post("/auth/register", json={"email": user_email, "password": "testpass123"})
    client.cookies.clear()
    resp = client.post("/auth/login", json={"email": user_email, "password": "testpass123"})
    assert resp.status_code == 200
    assert resp.json()["email"] == user_email
    with db.pool.connection() as conn:
        conn.execute("DELETE FROM users WHERE email = %s", (user_email,))


def test_login_wrong_password_rejected(client, user_email):
    client.post("/auth/register", json={"email": user_email, "password": "testpass123"})
    client.cookies.clear()
    resp = client.post("/auth/login", json={"email": user_email, "password": "wrong-password"})
    assert resp.status_code == 401
    with db.pool.connection() as conn:
        conn.execute("DELETE FROM users WHERE email = %s", (user_email,))


def test_me_requires_auth(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_me_returns_current_user(auth_client, user_email):
    resp = auth_client.get("/auth/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == user_email


def test_logout_clears_session(auth_client):
    resp = auth_client.post("/auth/logout")
    assert resp.status_code == 200
    resp2 = auth_client.get("/auth/me")
    assert resp2.status_code == 401

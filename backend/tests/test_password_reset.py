"""forgot-password / reset-password / change-password / delete-account.

No email provider is configured in this project (see README), so
/auth/forgot-password returns the reset link directly in demo_reset_link
instead of emailing it -- these tests exercise that real token flow
end-to-end against Postgres, same as every other test in this suite."""

import db


def test_forgot_password_unknown_email_is_generic(client):
    resp = client.post("/auth/forgot-password", json={"email": "nobody-here@example.test"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["demo_reset_link"] is None


def test_forgot_password_known_email_returns_link(client, user_email):
    client.post("/auth/register", json={"email": user_email, "password": "testpass123"})
    resp = client.post("/auth/forgot-password", json={"email": user_email})
    assert resp.status_code == 200
    body = resp.json()
    assert body["demo_reset_link"] is not None
    assert "token=" in body["demo_reset_link"]
    assert body["expires_in_minutes"] == 30
    with db.pool.connection() as conn:
        conn.execute("DELETE FROM users WHERE email = %s", (user_email,))


def _extract_token(reset_link: str) -> str:
    return reset_link.split("token=", 1)[1]


def test_reset_password_with_valid_token_then_login(client, user_email):
    client.post("/auth/register", json={"email": user_email, "password": "oldpass123"})
    link = client.post("/auth/forgot-password", json={"email": user_email}).json()["demo_reset_link"]
    token = _extract_token(link)

    resp = client.post("/auth/reset-password", json={"token": token, "new_password": "newpass456"})
    assert resp.status_code == 200

    client.cookies.clear()
    login = client.post("/auth/login", json={"email": user_email, "password": "newpass456"})
    assert login.status_code == 200
    old_login = client.post("/auth/login", json={"email": user_email, "password": "oldpass123"})
    assert old_login.status_code == 401
    with db.pool.connection() as conn:
        conn.execute("DELETE FROM users WHERE email = %s", (user_email,))


def test_reset_password_token_is_single_use(client, user_email):
    client.post("/auth/register", json={"email": user_email, "password": "oldpass123"})
    link = client.post("/auth/forgot-password", json={"email": user_email}).json()["demo_reset_link"]
    token = _extract_token(link)

    first = client.post("/auth/reset-password", json={"token": token, "new_password": "newpass456"})
    assert first.status_code == 200
    second = client.post("/auth/reset-password", json={"token": token, "new_password": "anotherpass789"})
    assert second.status_code == 400
    with db.pool.connection() as conn:
        conn.execute("DELETE FROM users WHERE email = %s", (user_email,))


def test_reset_password_rejects_bogus_token(client):
    resp = client.post("/auth/reset-password", json={"token": "not-a-real-token", "new_password": "whatever123"})
    assert resp.status_code == 400


def test_change_password_requires_correct_current_password(auth_client, user_email):
    resp = auth_client.patch(
        "/auth/change-password", json={"current_password": "wrong-password", "new_password": "newpass456"}
    )
    assert resp.status_code == 401


def test_change_password_success_then_relogin(auth_client, user_email):
    resp = auth_client.patch(
        "/auth/change-password", json={"current_password": "testpass123", "new_password": "newpass456"}
    )
    assert resp.status_code == 200
    auth_client.cookies.clear()
    login = auth_client.post("/auth/login", json={"email": user_email, "password": "newpass456"})
    assert login.status_code == 200


def test_change_password_requires_auth(client):
    resp = client.patch("/auth/change-password", json={"current_password": "x", "new_password": "newpass456"})
    assert resp.status_code == 401


def test_delete_account_requires_auth(client):
    resp = client.delete("/auth/me")
    assert resp.status_code == 401


def test_delete_account_removes_user(client, user_email):
    client.post("/auth/register", json={"email": user_email, "password": "testpass123"})
    resp = client.delete("/auth/me")
    assert resp.status_code == 200
    me = client.get("/auth/me")
    assert me.status_code == 401


def test_forgot_password_rate_limited(client, user_email, monkeypatch):
    monkeypatch.delenv("RATE_LIMIT_DISABLED", raising=False)
    for _ in range(5):
        resp = client.post("/auth/forgot-password", json={"email": "nobody-here@example.test"})
        assert resp.status_code == 200
    limited = client.post("/auth/forgot-password", json={"email": "nobody-here@example.test"})
    assert limited.status_code == 429

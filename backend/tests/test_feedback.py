import uuid

from fastapi.testclient import TestClient

import db
import main

HAM_TEXT = "See you at the meeting tomorrow at 10am"


def _create_message(auth_client):
    return auth_client.post("/messages", json={"message": HAM_TEXT}).json()


def test_submit_correct_feedback(auth_client):
    msg = _create_message(auth_client)
    resp = auth_client.post(f"/messages/{msg['id']}/feedback", json={"is_correct": True})
    assert resp.status_code == 201
    body = resp.json()
    assert body["is_correct"] is True
    assert body["actual_classification"] is None


def test_incorrect_feedback_requires_actual_classification(auth_client):
    msg = _create_message(auth_client)
    resp = auth_client.post(f"/messages/{msg['id']}/feedback", json={"is_correct": False})
    assert resp.status_code == 400


def test_incorrect_feedback_with_actual_classification(auth_client):
    msg = _create_message(auth_client)
    resp = auth_client.post(
        f"/messages/{msg['id']}/feedback", json={"is_correct": False, "actual_classification": "spam"}
    )
    assert resp.status_code == 201
    assert resp.json()["actual_classification"] == "spam"


def test_duplicate_feedback_conflicts(auth_client):
    msg = _create_message(auth_client)
    auth_client.post(f"/messages/{msg['id']}/feedback", json={"is_correct": True})
    resp = auth_client.post(f"/messages/{msg['id']}/feedback", json={"is_correct": True})
    assert resp.status_code == 409


def test_get_feedback_for_message(auth_client):
    msg = _create_message(auth_client)
    assert auth_client.get(f"/messages/{msg['id']}/feedback").json() is None
    auth_client.post(f"/messages/{msg['id']}/feedback", json={"is_correct": True})
    fb = auth_client.get(f"/messages/{msg['id']}/feedback").json()
    assert fb["is_correct"] is True


def test_list_feedback_for_user(auth_client):
    msg = _create_message(auth_client)
    auth_client.post(f"/messages/{msg['id']}/feedback", json={"is_correct": True})
    resp = auth_client.get("/feedback")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_feedback_requires_auth(client):
    resp = client.post(f"/messages/{uuid.uuid4()}/feedback", json={"is_correct": True})
    assert resp.status_code == 401


def test_feedback_on_other_users_message_404s(auth_client):
    msg = _create_message(auth_client)

    other_email = f"pytest-{uuid.uuid4().hex[:12]}@example.test"
    other = TestClient(main.app)
    other.post("/auth/register", json={"email": other_email, "password": "testpass123"})
    resp = other.post(f"/messages/{msg['id']}/feedback", json={"is_correct": True})
    assert resp.status_code == 404
    with db.pool.connection() as conn:
        conn.execute("DELETE FROM users WHERE email = %s", (other_email,))

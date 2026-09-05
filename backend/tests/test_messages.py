import uuid

from fastapi.testclient import TestClient

import db
import main

SPAM_TEXT = "WINNER!! Free cash prize, claim now by calling this number!!!"
HAM_TEXT = "See you at the meeting tomorrow at 10am"


def test_create_message_requires_auth(client):
    resp = client.post("/messages", json={"message": SPAM_TEXT})
    assert resp.status_code == 401


def test_create_message_persists_and_classifies(auth_client):
    resp = auth_client.post("/messages", json={"message": SPAM_TEXT})
    assert resp.status_code == 201
    body = resp.json()
    assert body["message"] == SPAM_TEXT
    assert body["classification"] in ("spam", "ham")
    assert 0.0 <= body["spam_probability"] <= 1.0
    assert body["created_at"] == body["updated_at"]


def test_list_messages_scoped_to_owner(auth_client):
    auth_client.post("/messages", json={"message": SPAM_TEXT})
    auth_client.post("/messages", json={"message": HAM_TEXT})
    resp = auth_client.get("/messages")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_search_filters_by_content(auth_client):
    auth_client.post("/messages", json={"message": SPAM_TEXT})
    auth_client.post("/messages", json={"message": HAM_TEXT})
    resp = auth_client.get("/messages", params={"q": "meeting"})
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 1
    assert "meeting" in results[0]["message"]


def test_filter_by_classification(auth_client):
    auth_client.post("/messages", json={"message": SPAM_TEXT})
    auth_client.post("/messages", json={"message": HAM_TEXT})
    resp = auth_client.get("/messages", params={"classification": "ham"})
    assert resp.status_code == 200
    assert all(r["classification"] == "ham" for r in resp.json())


def test_get_message_detail_includes_prediction_history(auth_client):
    created = auth_client.post("/messages", json={"message": HAM_TEXT}).json()
    resp = auth_client.get(f"/messages/{created['id']}")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["predictions"]) == 1
    assert body["feedback"] is None


def test_update_message_reclassifies_and_keeps_history(auth_client):
    created = auth_client.post("/messages", json={"message": HAM_TEXT}).json()
    resp = auth_client.put(f"/messages/{created['id']}", json={"message": SPAM_TEXT})
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["message"] == SPAM_TEXT
    assert updated["created_at"] == created["created_at"]
    assert updated["updated_at"] != created["updated_at"]

    detail = auth_client.get(f"/messages/{created['id']}").json()
    assert len(detail["predictions"]) == 2


def test_delete_message(auth_client):
    created = auth_client.post("/messages", json={"message": HAM_TEXT}).json()
    resp = auth_client.delete(f"/messages/{created['id']}")
    assert resp.status_code == 200
    resp2 = auth_client.get(f"/messages/{created['id']}")
    assert resp2.status_code == 404


def test_delete_nonexistent_message_404s(auth_client):
    resp = auth_client.delete(f"/messages/{uuid.uuid4()}")
    assert resp.status_code == 404


def test_invalid_uuid_400s(auth_client):
    resp = auth_client.get("/messages/not-a-uuid")
    assert resp.status_code == 400


def test_cross_user_access_is_404_not_leaked(auth_client, user_email):
    created = auth_client.post("/messages", json={"message": HAM_TEXT}).json()

    other_email = f"pytest-{uuid.uuid4().hex[:12]}@example.test"
    other = TestClient(main.app)
    other.post("/auth/register", json={"email": other_email, "password": "testpass123"})
    resp = other.get(f"/messages/{created['id']}")
    assert resp.status_code == 404
    resp2 = other.delete(f"/messages/{created['id']}")
    assert resp2.status_code == 404
    with db.pool.connection() as conn:
        conn.execute("DELETE FROM users WHERE email = %s", (other_email,))


def test_blank_message_rejected(auth_client):
    resp = auth_client.post("/messages", json={"message": "   "})
    assert resp.status_code == 422

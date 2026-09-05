import io


def _csv_bytes(rows):
    body = "message\n" + "\n".join(f'"{r}"' for r in rows) + "\n"
    return body.encode("utf-8")


def test_batch_requires_auth(client):
    resp = client.post("/batch", files={"file": ("test.csv", _csv_bytes(["hello"]), "text/csv")})
    assert resp.status_code == 401


def test_batch_upload_counts_match_content(auth_client):
    rows = [
        "WINNER!! Free cash prize, claim now!!!",
        "See you at the meeting tomorrow",
        "",  # invalid: empty
    ]
    resp = auth_client.post("/batch", files={"file": ("test.csv", _csv_bytes(rows), "text/csv")})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert body["valid"] == 2
    assert body["invalid"] == 1
    assert body["spam_count"] + body["ham_count"] == 2
    assert body["spam_count"] == sum(1 for r in body["results"] if r.get("classification") == "spam")


def test_batch_upload_saves_messages(auth_client):
    resp = auth_client.post(
        "/batch", files={"file": ("test.csv", _csv_bytes(["a totally normal ham message here"]), "text/csv")}
    )
    batch_id = resp.json()["batch_id"]
    listed = auth_client.get("/messages").json()
    assert any(m["message"] == "a totally normal ham message here" for m in listed)
    assert batch_id


def test_batch_rejects_non_csv_extension(auth_client):
    resp = auth_client.post("/batch", files={"file": ("test.txt", b"hello", "text/plain")})
    assert resp.status_code == 400


def test_batch_rejects_empty_file(auth_client):
    resp = auth_client.post("/batch", files={"file": ("test.csv", b"", "text/csv")})
    assert resp.status_code == 400


def test_batch_rejects_too_many_rows(auth_client):
    rows = [f"message number {i}" for i in range(501)]
    resp = auth_client.post("/batch", files={"file": ("test.csv", _csv_bytes(rows), "text/csv")})
    assert resp.status_code == 400


def test_batch_export_returns_csv(auth_client):
    resp = auth_client.post(
        "/batch", files={"file": ("test.csv", _csv_bytes(["export me please, ham message"]), "text/csv")}
    )
    batch_id = resp.json()["batch_id"]
    export_resp = auth_client.get(f"/batch/{batch_id}/export")
    assert export_resp.status_code == 200
    assert export_resp.headers["content-type"].startswith("text/csv")
    text = export_resp.text
    assert "export me please, ham message" in text
    assert text.splitlines()[0] == "id,message,classification,spam_probability,created_at"


def test_batch_export_unknown_batch_404s(auth_client):
    resp = auth_client.get("/batch/00000000-0000-0000-0000-000000000000/export")
    assert resp.status_code == 404

import classify

SPAM_TEXT = "WINNER!! You have been selected to receive a £1000 cash prize. Call now to claim!!!"
HAM_TEXT = "Hey, are we still on for lunch tomorrow at noon?"


def test_predict_spam_message(client):
    resp = client.post("/predict", json={"message": SPAM_TEXT})
    assert resp.status_code == 200
    body = resp.json()
    assert body["label"] == "spam"
    assert 0.0 <= body["spam_probability"] <= 1.0


def test_predict_ham_message(client):
    resp = client.post("/predict", json={"message": HAM_TEXT})
    assert resp.status_code == 200
    body = resp.json()
    assert body["label"] == "ham"
    assert 0.0 <= body["spam_probability"] <= 1.0


def test_predict_probability_is_not_fabricated(client):
    """Cross-checks the API's returned probability against calling the
    loaded model directly — proves the number is the model's real output,
    not a hardcoded or heuristic-derived stand-in."""
    resp = client.post("/predict", json={"message": SPAM_TEXT})
    api_probability = resp.json()["spam_probability"]

    x = classify.vectorizer.transform([SPAM_TEXT])
    direct_probability = round(float(classify.model.predict_proba(x)[0][classify.SPAM_INDEX]), 4)

    assert api_probability == direct_probability


def test_predict_empty_message_rejected(client):
    resp = client.post("/predict", json={"message": ""})
    assert resp.status_code == 422

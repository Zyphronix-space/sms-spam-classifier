"""Load the saved model and classify a few example messages."""

import joblib

model = joblib.load("spam_model.joblib")
vectorizer = joblib.load("vectorizer.joblib")

examples = [
    "Hey, are we still on for lunch tomorrow?",
    "WINNER!! You have been selected to receive a £1000 cash prize. Call now!",
    "Can you pick up milk on your way home?",
    "URGENT: Your account has been suspended. Verify now at bit.ly/xyz to avoid closure.",
]

X = vectorizer.transform(examples)
predictions = model.predict(X)
probabilities = model.predict_proba(X)
spam_index = list(model.classes_).index("spam")

for message, predicted, proba in zip(examples, predictions, probabilities):
    print(f"[{predicted:5s} | spam probability={proba[spam_index]:.2f}] {message}")

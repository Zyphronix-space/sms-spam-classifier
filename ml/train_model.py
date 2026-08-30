"""
Beginner ML training program: classify SMS messages as spam or ham (not spam).

Steps:
1. Load the labeled dataset
2. Split it into training and test sets
3. Turn text into numbers with TF-IDF
4. Train a Naive Bayes classifier
5. Evaluate how good the model is
6. Save the trained model and vectorizer to disk
7. Save a machine-readable evaluation report (evaluation.json)
"""

import json
from datetime import datetime, timezone

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB

MODEL_NAME = "MultinomialNB"
MODEL_VERSION = "v1"
TEST_SIZE = 0.2

# 1. Load the data
# label = "spam" or "ham" (ham = a normal, legitimate message)
# message = the raw SMS text
data = pd.read_csv("data/sms.tsv", sep="\t", header=None, names=["label", "message"])

print(f"Dataset size: {len(data)} messages")
print(data["label"].value_counts(), "\n")

X, y = data["message"], data["label"]

# 2. Split into training data (used to learn) and test data (used to check)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=TEST_SIZE, random_state=42, stratify=y
)

# 3. Convert text into TF-IDF feature vectors.
# TF-IDF scores each word by how often it appears in a message, discounted by
# how common that word is across all messages — so words like "free" or "win"
# that show up a lot in spam (but rarely in ham) get a high weight.
vectorizer = TfidfVectorizer(stop_words="english")
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

# 4. Train the model
model = MultinomialNB()
model.fit(X_train_vec, y_train)

# 5. Evaluate on data the model has never seen
predictions = model.predict(X_test_vec)
accuracy = accuracy_score(y_test, predictions)
precision = precision_score(y_test, predictions, pos_label="spam")
recall = recall_score(y_test, predictions, pos_label="spam")
f1 = f1_score(y_test, predictions, pos_label="spam")
cm = confusion_matrix(y_test, predictions, labels=["ham", "spam"])

print("Evaluation on test data:")
print(f"  Accuracy: {accuracy:.3f}\n")
print("Classification report:")
print(classification_report(y_test, predictions))
print("Confusion matrix (rows=actual, cols=predicted, order=[ham, spam]):")
print(cm)

# Show a few example predictions
print("\nSample predictions:")
for message, predicted, actual in list(zip(X_test[:5], predictions[:5], y_test[:5])):
    print(f"  predicted={predicted:5s} actual={actual:5s}  \"{message[:60]}\"")

# 6. Save the trained model and vectorizer so they can be reused without retraining
joblib.dump(model, "spam_model.joblib")
joblib.dump(vectorizer, "vectorizer.joblib")
print("\nSaved model to spam_model.joblib")
print("Saved vectorizer to vectorizer.joblib")

# 7. Save a machine-readable evaluation report so the backend/frontend can
# display real metrics instead of hardcoded numbers.
label_counts = data["label"].value_counts()
evaluation = {
    "model_name": MODEL_NAME,
    "version": MODEL_VERSION,
    "trained_at": datetime.now(timezone.utc).isoformat(),
    "features": "TF-IDF",
    "test_size": TEST_SIZE,
    "dataset": {
        "total": int(len(data)),
        "ham": int(label_counts.get("ham", 0)),
        "spam": int(label_counts.get("spam", 0)),
    },
    "metrics": {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1": round(float(f1), 4),
    },
    "confusion_matrix": {
        "labels": ["ham", "spam"],
        "matrix": cm.tolist(),
    },
}
with open("evaluation.json", "w") as f:
    json.dump(evaluation, f, indent=2)
print("Saved evaluation report to evaluation.json")

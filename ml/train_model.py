"""
Beginner ML training program: classify SMS messages as spam or ham (not spam).

Steps:
1. Load the labeled dataset
2. Split it into training and test sets
3. Turn text into numbers with TF-IDF
4. Train a Naive Bayes classifier
5. Evaluate how good the model is
6. Save the trained model and vectorizer to disk
"""

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB

# 1. Load the data
# label = "spam" or "ham" (ham = a normal, legitimate message)
# message = the raw SMS text
data = pd.read_csv("data/sms.tsv", sep="\t", header=None, names=["label", "message"])

print(f"Dataset size: {len(data)} messages")
print(data["label"].value_counts(), "\n")

X, y = data["message"], data["label"]

# 2. Split into training data (used to learn) and test data (used to check)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
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

print("Evaluation on test data:")
print(f"  Accuracy: {accuracy:.3f}\n")
print("Classification report:")
print(classification_report(y_test, predictions))
print("Confusion matrix (rows=actual, cols=predicted, order=[ham, spam]):")
print(confusion_matrix(y_test, predictions, labels=["ham", "spam"]))

# Show a few example predictions
print("\nSample predictions:")
for message, predicted, actual in list(zip(X_test[:5], predictions[:5], y_test[:5])):
    print(f"  predicted={predicted:5s} actual={actual:5s}  \"{message[:60]}\"")

# 6. Save the trained model and vectorizer so they can be reused without retraining
joblib.dump(model, "spam_model.joblib")
joblib.dump(vectorizer, "vectorizer.joblib")
print("\nSaved model to spam_model.joblib")
print("Saved vectorizer to vectorizer.joblib")

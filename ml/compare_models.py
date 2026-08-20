"""
Benchmark: Naive Bayes vs Logistic Regression for SMS spam classification.

Both models use the same TF-IDF features. This is here to show *why*
Naive Bayes was picked, not just assert it — comparing options against
the same test set is standard practice before settling on a model.
"""

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB

data = pd.read_csv("data/sms.tsv", sep="\t", header=None, names=["label", "message"])
X, y = data["message"], data["label"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

vectorizer = TfidfVectorizer(stop_words="english")
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

models = {
    "Multinomial Naive Bayes": MultinomialNB(),
    "Logistic Regression": LogisticRegression(max_iter=1000),
}

print(f"{'Model':<26} {'Accuracy':>10} {'F1 (spam)':>10}")
for name, model in models.items():
    model.fit(X_train_vec, y_train)
    predictions = model.predict(X_test_vec)
    accuracy = accuracy_score(y_test, predictions)
    f1 = f1_score(y_test, predictions, pos_label="spam")
    print(f"{name:<26} {accuracy:>10.3f} {f1:>10.3f}")


import os

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")
os.makedirs(MODEL_DIR, exist_ok=True)

RANDOM_STATE = 42
N_SAMPLES = 5000
RNG = np.random.default_rng(RANDOM_STATE)


def assign_risk(score):
    """Convert a points score into one of three risk labels."""
    if score <= 3:
        return "Low"
    elif score <= 6:
        return "Moderate"
    return "High"


def generate_dataset(disease):
    # IMPORTANT: This is entirely synthetic training data.
    # It is for software demonstration only, not medical diagnosis.

    age = RNG.integers(18, 81, N_SAMPLES)
    bmi = np.round(RNG.uniform(17, 42, N_SAMPLES), 1)
    activity = RNG.integers(0, 4, N_SAMPLES)
    sleep_hours = np.round(RNG.uniform(3, 11, N_SAMPLES), 1)

    if disease == "diabetes":
        family_diabetes = RNG.integers(0, 2, N_SAMPLES)

        score = (
                (age >= 55) * 2
                + (bmi >= 30) * 2
                + ((bmi >= 25) & (bmi < 30)) * 1
                + (activity == 0) * 2
                + (activity == 1) * 1
                + (sleep_hours < 5) * 2
                + ((sleep_hours >= 5) & (sleep_hours < 6)) * 1
                + family_diabetes * 3
        )

        features = pd.DataFrame({
            "age": age,
            "bmi": bmi,
            "activity": activity,
            "sleep_hours": sleep_hours,
            "family_diabetes": family_diabetes,
        })

    elif disease == "heart":
        stress = RNG.integers(0, 3, N_SAMPLES)
        family_heart = RNG.integers(0, 2, N_SAMPLES)

        score = (
                (age >= 55) * 2
                + (bmi >= 30) * 2
                + ((bmi >= 25) & (bmi < 30)) * 1
                + (activity == 0) * 2
                + (activity == 1) * 1
                + (sleep_hours < 5) * 2
                + ((sleep_hours >= 5) & (sleep_hours < 6)) * 1
                + stress * 2
                + family_heart * 3
        )

        features = pd.DataFrame({
            "age": age,
            "bmi": bmi,
            "activity": activity,
            "sleep_hours": sleep_hours,
            "stress": stress,
            "family_heart": family_heart,
        })

    else:
        raise ValueError(f"Unknown disease: {disease}")

    # Add noise so the labels are not perfectly determined by the score.
    noisy_score = score + RNG.integers(-2, 3, N_SAMPLES)
    labels = np.array([assign_risk(int(s)) for s in noisy_score])

    return features, labels


def train_model(disease):
    X, y = generate_dataset(disease)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_leaf=3,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    probabilities = model.predict_proba(X_test)

    accuracy = accuracy_score(y_test, predictions)
    precision_weighted = precision_score(y_test, predictions, average="weighted", zero_division=0)
    precision_macro = precision_score(y_test, predictions, average="macro", zero_division=0)
    recall_weighted = recall_score(y_test, predictions, average="weighted", zero_division=0)
    recall_macro = recall_score(y_test, predictions, average="macro", zero_division=0)
    f1_weighted = f1_score(y_test, predictions, average="weighted", zero_division=0)
    f1_macro = f1_score(y_test, predictions, average="macro", zero_division=0)
    roc_auc_weighted = roc_auc_score(
        y_test,
        probabilities,
        multi_class="ovr",
        average="weighted",
        labels=model.classes_,
    )
    roc_auc_macro = roc_auc_score(
        y_test,
        probabilities,
        multi_class="ovr",
        average="macro",
        labels=model.classes_,
    )

    print(f"\n--- {disease.upper()} MODEL EVALUATION ---")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"Precision: {precision_weighted:.4f}")
    print(f"Recall: {recall_weighted:.4f}")
    print(f"F1: {f1_weighted:.4f}")
    print(f"ROC-AUC: {roc_auc_weighted:.4f}")
    print("\nMacro Averages:")
    print(f"Precision (Macro): {precision_macro:.4f}")
    print(f"Recall (Macro): {recall_macro:.4f}")
    print(f"F1 (Macro): {f1_macro:.4f}")
    print(f"ROC-AUC (Macro): {roc_auc_macro:.4f}")
    print("\nClassification Report:")
    print(classification_report(
        y_test,
        predictions,
        labels=["Low", "Moderate", "High"],
        zero_division=0,
    ))

    model_path = os.path.join(MODEL_DIR, f"{disease}_model.pkl")
    joblib.dump(model, model_path)

    print(f"Saved: {model_path}")


if __name__ == "__main__":
    train_model("diabetes")
    train_model("heart")
    print("\nBoth synthetic-data models trained successfully.")

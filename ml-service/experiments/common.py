"""
Shared helpers for the YourArogyum experiments.

generate_pair() mirrors ml-service/train_model.py exactly (same draw order and
formulas) but takes the seed as a parameter so independent datasets can be produced.
For seed 42 it reproduces the repository's datasets bit-for-bit (checked in exp1).
It also returns the noise-free points score, which the original script discards;
that score is what makes the 'oracle ceiling' analysis possible.
"""
import numpy as np, pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (accuracy_score, f1_score, roc_auc_score,
                             precision_recall_fscore_support, confusion_matrix)

CLASSES = ["Low", "Moderate", "High"]
FEATURES = {"diabetes": ["age", "bmi", "activity", "sleep_hours", "family_diabetes"],
            "heart": ["age", "bmi", "activity", "sleep_hours", "stress", "family_heart"]}
N = 5000


def assign_risk(score):
    return "Low" if score <= 3 else ("Moderate" if score <= 6 else "High")


def _points(df, disease):
    s = ((df.age >= 55) * 2 + (df.bmi >= 30) * 2 + ((df.bmi >= 25) & (df.bmi < 30)) * 1
         + (df.activity == 0) * 2 + (df.activity == 1) * 1
         + (df.sleep_hours < 5) * 2 + ((df.sleep_hours >= 5) & (df.sleep_hours < 6)) * 1)
    if disease == "diabetes":
        s = s + df.family_diabetes * 3
    else:
        s = s + df.stress * 2 + df.family_heart * 3
    return s.to_numpy()


def generate_pair(seed):
    """Return {disease: (X, y, clean_score)} using ONE shared RNG, diabetes first then heart."""
    rng = np.random.default_rng(seed)
    out = {}
    for disease in ("diabetes", "heart"):
        age = rng.integers(18, 81, N)
        bmi = np.round(rng.uniform(17, 42, N), 1)
        activity = rng.integers(0, 4, N)
        sleep = np.round(rng.uniform(3, 11, N), 1)
        d = {"age": age, "bmi": bmi, "activity": activity, "sleep_hours": sleep}
        if disease == "diabetes":
            d["family_diabetes"] = rng.integers(0, 2, N)
        else:
            d["stress"] = rng.integers(0, 3, N)
            d["family_heart"] = rng.integers(0, 2, N)
        X = pd.DataFrame(d)[FEATURES[disease]]
        score = _points(X, disease)                      # noise-free score
        noisy = score + rng.integers(-2, 3, N)           # same draw as train_model.py
        y = np.array([assign_risk(int(s)) for s in noisy])
        out[disease] = (X, y, score)
    return out


def make_rf(seed):
    return RandomForestClassifier(n_estimators=200, max_depth=10, min_samples_leaf=3,
                                  class_weight="balanced", random_state=seed, n_jobs=-1)


def make_lr(seed):  # baseline as described in the manuscript evidence pack
    return make_pipeline(StandardScaler(),
                         LogisticRegression(max_iter=2000, class_weight="balanced", random_state=seed))


def indicator_features(X, disease):
    """Threshold indicators that expose the labelling rule (diagnostic only; uses knowledge of the rule)."""
    f = pd.DataFrame({"age55": (X.age >= 55) * 1, "bmi30": (X.bmi >= 30) * 1,
                      "bmi25_30": ((X.bmi >= 25) & (X.bmi < 30)) * 1,
                      "act0": (X.activity == 0) * 1, "act1": (X.activity == 1) * 1,
                      "sleep_lt5": (X.sleep_hours < 5) * 1,
                      "sleep_5_6": ((X.sleep_hours >= 5) & (X.sleep_hours < 6)) * 1})
    if disease == "diabetes":
        f["fam"] = X.family_diabetes.values
    else:
        f["stress"] = X.stress.values; f["fam"] = X.family_heart.values
    return f


def oracle_proba(score):
    """Exact P(class | clean score) when noise is uniform on {-2..2}. Columns: Low, Moderate, High."""
    score = np.asarray(score); P = np.zeros((len(score), 3))
    for e in range(-2, 3):
        noisy = score + e
        P[:, 0] += noisy <= 3
        P[:, 1] += (noisy > 3) & (noisy <= 6)
        P[:, 2] += noisy > 6
    return P / 5.0


def reorder(proba, model_classes):
    return proba[:, [list(model_classes).index(c) for c in CLASSES]]


def onehot(y):
    return pd.get_dummies(pd.Categorical(y, categories=CLASSES)).values


def summarise(y, pred, proba):
    p, r, f, s = precision_recall_fscore_support(y, pred, labels=CLASSES, zero_division=0)
    return {"accuracy": accuracy_score(y, pred), "macro_precision": p.mean(), "macro_recall": r.mean(),
            "macro_f1": f.mean(),
            "weighted_f1": f1_score(y, pred, average="weighted"),
            "macro_roc_auc": roc_auc_score(onehot(y), proba, average="macro", multi_class="ovr"),
            "confusion_matrix": confusion_matrix(y, pred, labels=CLASSES).tolist(),
            "per_class": {c: dict(precision=float(p[i]), recall=float(r[i]), f1=float(f[i]), support=int(s[i]))
                          for i, c in enumerate(CLASSES)}}


def fit_eval(model, Xtr, ytr, Xte, yte):
    model.fit(Xtr, ytr)
    pred = model.predict(Xte)
    proba = reorder(model.predict_proba(Xte), model.classes_)
    return summarise(yte, pred, proba), pred, proba

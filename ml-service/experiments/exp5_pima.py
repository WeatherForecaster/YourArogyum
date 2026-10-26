"""Experiment 5 (SEPARATE from the synthetic experiments): real public diabetes data (Pima Indians Diabetes Database).
Original owner: National Institute of Diabetes and Digestive and Kidney Diseases; 768 women >= 21 years, Pima heritage,
Phoenix, Arizona; Outcome = diabetes by WHO criteria (Smith et al., 1988). This script downloads a public GitHub mirror
(plotly/datasets) and checks row/class counts. The app's synthetic models are NOT evaluated here; their 3-level
labels and 5 features do not exist in this dataset. Only Age and BMI overlap with the app's features.
Writes results/exp5_pima.json/.md. Data file is not redistributed here."""
import hashlib, io, json, os, sys, urllib.request
import numpy as np, pandas as pd
from scipy import stats
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, accuracy_score, f1_score, balanced_accuracy_score
from sklearn.model_selection import RepeatedStratifiedKFold, train_test_split, cross_validate
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.dummy import DummyClassifier
from sklearn.inspection import permutation_importance
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "results")
URL = "https://raw.githubusercontent.com/plotly/datasets/master/diabetes.csv"
raw = urllib.request.urlopen(URL, timeout=60).read()
df = pd.read_csv(io.BytesIO(raw)); SHA = hashlib.sha256(raw).hexdigest()
assert df.shape == (768, 9) and df.Outcome.sum() == 268, "unexpected dataset"
zero_missing = ["Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI"]
zeros = {c: int((df[c] == 0).sum()) for c in zero_missing}
for c in zero_missing: df.loc[df[c] == 0, c] = np.nan
y = df.Outcome.values
SETS = {"A_overlap_age_bmi": ["Age", "BMI"], "B_age_bmi_pedigree": ["Age", "BMI", "DiabetesPedigreeFunction"],
        "C_all_clinical_reference": ["Pregnancies", "Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI", "DiabetesPedigreeFunction", "Age"]}
def lr(): return make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42))
def rf(): return make_pipeline(SimpleImputer(strategy="median"), RandomForestClassifier(n_estimators=200, max_depth=10, min_samples_leaf=3, class_weight="balanced", random_state=42, n_jobs=-1))
def maj(): return DummyClassifier(strategy="most_frequent")
R = {"source": URL, "sha256": SHA, "n": int(len(df)), "positives": int(y.sum()), "prevalence": float(y.mean()),
     "zero_values_treated_as_missing": zeros, "imputation": "median, fitted inside each training fold (no leakage)", "cv": {}, "heldout": {}}
cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=20, random_state=42)       # 100 folds, fixed in advance
scoring = {"auc": "roc_auc", "accuracy": "accuracy", "f1_pos": "f1", "bal_acc": "balanced_accuracy"}
folds = {}
for sname, cols in SETS.items():
    X = df[cols]; R["cv"][sname] = {}; folds[sname] = {}
    for mname, mk in [("logistic_regression", lr), ("random_forest", rf), ("majority_class", maj)]:
        sc = cross_validate(mk(), X, y, cv=cv, scoring=scoring, n_jobs=1)
        folds[sname][mname] = sc["test_auc"] if mname != "majority_class" else sc["test_auc"]
        R["cv"][sname][mname] = {k[5:]: {"mean": float(v.mean()), "sd": float(v.std(ddof=1))} for k, v in sc.items() if k.startswith("test_")}
    # Nadeau-Bengio corrected resampled t-test, RF vs LR AUC (test/train ratio = 1/4)
    d = folds[sname]["random_forest"] - folds[sname]["logistic_regression"]; k = len(d)
    t = d.mean() / np.sqrt((1 / k + 0.25) * d.var(ddof=1)); p = 2 * stats.t.sf(abs(t), k - 1)
    R["cv"][sname]["rf_minus_lr_auc"] = {"mean_diff": float(d.mean()), "nadeau_bengio_t": float(t), "p": float(p), "folds": int(k)}
# one fixed held-out split (seed 42) with bootstrap CI for AUC
idx = np.arange(len(df)); tr, te = train_test_split(idx, test_size=0.2, stratify=y, random_state=42)
rng = np.random.default_rng(42)
for sname, cols in SETS.items():
    X = df[cols]; R["heldout"][sname] = {}
    for mname, mk in [("logistic_regression", lr), ("random_forest", rf)]:
        m = mk().fit(X.iloc[tr], y[tr]); p = m.predict_proba(X.iloc[te])[:, 1]; yt = y[te]; boots = []
        for _ in range(2000):
            i = rng.choice(len(yt), len(yt));
            if len(set(yt[i])) == 2: boots.append(roc_auc_score(yt[i], p[i]))
        R["heldout"][sname][mname] = {"auc": float(roc_auc_score(yt, p)), "auc_ci95_bootstrap": [float(np.percentile(boots, 2.5)), float(np.percentile(boots, 97.5))],
                                      "accuracy": float(accuracy_score(yt, m.predict(X.iloc[te]))), "n_test": int(len(te))}
# descriptive check of the app's PARTIAL rule (age and BMI points only) on real data - not validation of the app
pts = (df.Age >= 55) * 2 + (df.BMI >= 30) * 2 + ((df.BMI >= 25) & (df.BMI < 30)) * 1
bm = df.BMI.isna(); auc_rule = roc_auc_score(y[~bm], pts[~bm])
R["partial_rule_check"] = {"auc_age_bmi_points_only": float(auc_rule), "rows_used": int((~bm).sum()),
    "note": "Only 2 of the 5 points components exist in this dataset (age>=55: 2, BMI>=30: 2, BMI 25-30: 1). Descriptive only."}
json.dump(R, open(os.path.join(OUT, "exp5_pima.json"), "w"), indent=2)
L = [f"# Experiment 5: Pima Indians Diabetes (n={R['n']}, prevalence {R['prevalence']:.3f}); sha256 {SHA[:12]}…", f"zeros treated as missing: {zeros}", ""]
for s in SETS:
    L.append(f"## {s} - repeated 5-fold CV x20 (100 folds), mean±SD")
    for m in ("logistic_regression", "random_forest", "majority_class"):
        v = R["cv"][s][m]; L.append(f"- {m}: AUC {v['auc']['mean']:.3f}±{v['auc']['sd']:.3f} | acc {v['accuracy']['mean']:.3f} | F1(pos) {v['f1_pos']['mean']:.3f} | bal.acc {v['bal_acc']['mean']:.3f}")
    d = R["cv"][s]["rf_minus_lr_auc"]; L.append(f"- RF-LR AUC diff {d['mean_diff']:+.4f}, corrected t={d['nadeau_bengio_t']:.2f}, p={d['p']:.3f}")
    for m in ("logistic_regression", "random_forest"):
        v = R["heldout"][s][m]; L.append(f"- held-out {m}: AUC {v['auc']:.3f} [{v['auc_ci95_bootstrap'][0]:.3f},{v['auc_ci95_bootstrap'][1]:.3f}] acc {v['accuracy']:.3f} (n={v['n_test']})")
    L.append("")
L.append(f"Partial app rule (age/BMI points) AUC: {auc_rule:.3f} on {int((~bm).sum())} rows")
open(os.path.join(OUT, "exp5_pima.md"), "w").write("\n".join(L)); print("\n".join(L))

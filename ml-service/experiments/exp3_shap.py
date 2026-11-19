"""Experiment 3: (a) do the repository's saved models reproduce the sample /predict output? (b) are they identical to a
retrain of train_model.py logic? (c) SHAP additivity; (d) do SHAP importances track the known labelling rule?
Run with the pinned environment (scikit-learn 1.5.2, shap 0.46.0) so the saved pickles load."""
import json, os, sys, warnings
import numpy as np, pandas as pd, joblib, shap
from scipy.stats import spearmanr
from sklearn.model_selection import train_test_split
HERE = os.path.dirname(os.path.abspath(__file__)); ML = os.path.dirname(HERE); sys.path.insert(0, HERE); sys.path.insert(0, ML)
from common import *
from common import _points
import app as A      # the FastAPI module (importing does not start the server)
warnings.filterwarnings("ignore")
R = {"sample_profile": {}, "saved_vs_retrained": {}, "additivity": {}, "rule_alignment": {}}
sample = json.load(open(os.path.join(HERE, "data", "shap_sample_output.json")))
models = {d: joblib.load(os.path.join(ML, "model", f"{d}_model.pkl")) for d in ("diabetes", "heart")}
expl = {d: shap.TreeExplainer(models[d]) for d in models}

# (a) the sample profile exactly as the API would map it
fv = {"age": 42.0, "bmi": A.calculate_bmi(170, 75), "activity": A.map_activity("Moderately active"),
      "sleep_hours": A.map_sleep("Less than 5 hours"), "stress": A.map_stress("Moderate"),
      "family_diabetes": 1, "family_heart": 1}
for d in models:
    got = A.predict_disease(models[d], expl[d], d, fv); ref = sample[d]
    pdiff = max(abs(got["probabilities"][k] - ref["probabilities"][k]) for k in ref["probabilities"])
    gi = {f["feature"]: f["impact"] for f in got["top_factors"]}; ri = {f["feature"]: f["impact"] for f in ref["top_factors"]}
    idiff = max(abs(gi[k] - ri[k]) for k in ri)
    R["sample_profile"][d] = {"bmi": fv["bmi"], "predicted_class_match": got["risk_level"] == ref["risk_level"],
        "max_abs_probability_diff_pct_points": pdiff, "max_abs_impact_diff": idiff,
        "same_top5_order": [f["feature"] for f in got["top_factors"]] == [f["feature"] for f in ref["top_factors"]]}

pair = generate_pair(42)
for d, (X, y, score) in pair.items():
    Xtr, Xte, ytr, yte, _, ste = train_test_split(X, y, score, test_size=0.2, random_state=42, stratify=y)
    # (b) saved model vs a fresh fit with the same settings and data
    fresh = make_rf(42).fit(Xtr, ytr); saved = models[d]
    same_pred = float((fresh.predict(Xte) == saved.predict(Xte)).mean())
    maxdiff = float(np.abs(fresh.predict_proba(Xte) - saved.predict_proba(Xte)).max())
    R["saved_vs_retrained"][d] = {"prediction_agreement": same_pred, "max_abs_proba_diff": maxdiff,
        "saved_model_test_accuracy": float((saved.predict(Xte) == yte).mean())}
    # (c) additivity: base + sum(shap) = predicted-class probability
    idx = np.random.default_rng(0).choice(len(Xte), 300, replace=False); Xs = Xte.iloc[idx]
    sv = np.asarray(expl[d].shap_values(Xs))      # samples x features x classes
    base = np.asarray(expl[d].expected_value)
    pr = saved.predict_proba(Xs); err = []
    for i in range(len(Xs)):
        c = int(np.argmax(pr[i])); err.append(abs(base[c] + sv[i, :, c].sum() - pr[i, c]))
    R["additivity"][d] = {"rows": len(Xs), "max_abs_error": float(max(err)), "mean_abs_error": float(np.mean(err))}
    # (d) alignment with the rule: mean |SHAP| (predicted class) vs oracle permutation importance
    pc = np.array([int(np.argmax(p)) for p in pr]); shap_abs = np.array([np.abs(sv[i, :, pc[i]]) for i in range(len(Xs))]).mean(0)
    ste_s = ste[idx]; ys = np.asarray(yte)[idx]; rng = np.random.default_rng(1)
    def oracle_acc(Xm):
        op = oracle_proba(_points(Xm, d)); return float((np.array(CLASSES)[op.argmax(1)] == ys).mean())
    base_acc = oracle_acc(Xs); orc_imp = []
    for f in X.columns:
        drops = []
        for _ in range(20):
            Xp = Xs.copy(); Xp[f] = rng.permutation(Xp[f].values); drops.append(base_acc - oracle_acc(Xp))
        orc_imp.append(np.mean(drops))
    rho = spearmanr(shap_abs, orc_imp)
    R["rule_alignment"][d] = {"features": list(X.columns), "mean_abs_shap": shap_abs.tolist(),
        "oracle_permutation_importance": [float(v) for v in orc_imp],
        "spearman_rho": float(rho.correlation), "p": float(rho.pvalue), "n_features": len(X.columns)}
json.dump(R, open(os.path.join(HERE, "results", "exp3_shap.json"), "w"), indent=2)
print(json.dumps(R, indent=1))

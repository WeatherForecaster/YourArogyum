"""Experiment 1: reproduce the manuscript's single-split results from the repository code, and check
that the seed-parametrised generator is identical to train_model.py. Writes results/exp1_reproduction.json/.md"""
import json, os, sys
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.dummy import DummyClassifier
from sklearn.tree import DecisionTreeClassifier
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.dirname(HERE))
from common import *
import train_model as T     # the repository script (module-level RNG seeded with 42)

# manuscript values (Tables III-VI of the paper)
REPORTED = {"diabetes": {"acc": 0.6690, "macro_f1": 0.6765, "auc": 0.8556, "lr_acc": 0.6460, "lr_auc": 0.8358,
                         "cm": [[235, 87, 3], [79, 224, 94], [3, 65, 210]],
                         "lr_cm": [[246, 72, 7], [90, 188, 119], [1, 65, 212]],
                         "counts": {"Low": 1624, "Moderate": 1988, "High": 1388}},
            "heart": {"acc": 0.7250, "macro_f1": 0.6845, "auc": 0.8814, "lr_acc": 0.7110, "lr_auc": 0.8715,
                      "cm": [[97, 48, 0], [51, 171, 75], [1, 100, 457]],
                      "lr_cm": [[103, 42, 0], [67, 168, 62], [4, 114, 440]],
                      "counts": {"Low": 725, "Moderate": 1487, "High": 2788}}}
SEED = 42
pair = generate_pair(SEED)
res = {"seed": SEED, "checks": {}, "results": {}}
for d in ("diabetes", "heart"):
    Xo, yo = T.generate_dataset(d)                       # repository generator (shared module RNG, same order)
    X, y, score = pair[d]
    same = bool(np.array_equal(Xo.values, X.values) and np.array_equal(yo, y))
    res["checks"][d] = {"generator_identical_to_train_model_py": same,
                        "class_counts": {c: int((y == c).sum()) for c in CLASSES},
                        "class_counts_match_manuscript": {c: int((y == c).sum()) for c in CLASSES} == REPORTED[d]["counts"],
                        "missing_values": int(X.isna().sum().sum()),
                        "duplicate_feature_rows": int(X.duplicated().sum())}
    Xtr, Xte, ytr, yte, str_, ste = train_test_split(X, y, score, test_size=0.2, random_state=SEED, stratify=y)
    tr = set(map(tuple, Xtr.values.tolist()))
    res["checks"][d]["test_rows_with_feature_vector_in_train"] = int(sum(tuple(r) in tr for r in Xte.values.tolist()))
    rf_m, _, _ = fit_eval(make_rf(SEED), Xtr, ytr, Xte, yte)
    lr_m, _, _ = fit_eval(make_lr(SEED), Xtr, ytr, Xte, yte)
    maj_m, _, _ = fit_eval(DummyClassifier(strategy="most_frequent"), Xtr, ytr, Xte, yte)
    t3_m, _, _ = fit_eval(DecisionTreeClassifier(max_depth=3, random_state=SEED), Xtr, ytr, Xte, yte)
    ind_m, _, _ = fit_eval(make_lr(SEED), indicator_features(Xtr, d), ytr, indicator_features(Xte, d), yte)
    op = oracle_proba(ste); opred = np.array(CLASSES)[op.argmax(1)]
    orc = summarise(yte, opred, op); orc["expected_accuracy_from_posterior"] = float(op.max(1).mean())
    res["results"][d] = {"random_forest": rf_m, "logistic_regression": lr_m, "majority_class": maj_m,
                         "tree_depth3": t3_m, "lr_on_rule_indicators": ind_m, "oracle_ceiling": orc}
    rep = REPORTED[d]
    res["checks"][d]["manuscript_vs_reproduced"] = {
        "rf_accuracy": [rep["acc"], round(rf_m["accuracy"], 4)], "rf_macro_f1": [rep["macro_f1"], round(rf_m["macro_f1"], 4)],
        "rf_auc": [rep["auc"], round(rf_m["macro_roc_auc"], 4)], "lr_accuracy": [rep["lr_acc"], round(lr_m["accuracy"], 4)],
        "lr_auc": [rep["lr_auc"], round(lr_m["macro_roc_auc"], 4)],
        "rf_confusion_identical": rf_m["confusion_matrix"] == rep["cm"], "lr_confusion_identical": lr_m["confusion_matrix"] == rep["lr_cm"]}
os.makedirs(os.path.join(HERE, "results"), exist_ok=True)
json.dump(res, open(os.path.join(HERE, "results", "exp1_reproduction.json"), "w"), indent=2)
L = ["# Experiment 1: reproduction (seed 42)", ""]
for d in ("diabetes", "heart"):
    L.append(f"## {d}"); L.append(json.dumps(res["checks"][d], indent=1)); L.append("")
    for n, m in res["results"][d].items():
        L.append(f"- {n}: acc {m['accuracy']:.4f} | macro-F1 {m['macro_f1']:.4f} | macro-AUC {m['macro_roc_auc']:.4f}")
    L.append("")
open(os.path.join(HERE, "results", "exp1_reproduction.md"), "w").write("\n".join(L)); print("\n".join(L))

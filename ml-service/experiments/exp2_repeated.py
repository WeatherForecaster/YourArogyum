"""Experiment 2: variability. (A) 30 independent regenerations of the synthetic data (seeds 0-29, fixed in advance),
each with its own stratified 80/20 split; (B) repeated stratified 5-fold CV (3 repeats) on the seed-42 dataset.
No tuning is performed and the test split is never used for model choice. Writes results/exp2_*.csv/json/md"""
import json, os, sys, time
import numpy as np, pandas as pd
from scipy import stats
from sklearn.model_selection import train_test_split, RepeatedStratifiedKFold, cross_validate
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from common import *
OUT = os.path.join(HERE, "results"); os.makedirs(OUT, exist_ok=True)
SEEDS = list(range(30)); rows = []; t0 = time.time()
for seed in SEEDS:
    pair = generate_pair(seed)
    for d, (X, y, score) in pair.items():
        Xtr, Xte, ytr, yte, _, ste = train_test_split(X, y, score, test_size=0.2, random_state=seed, stratify=y)
        rf_m, _, _ = fit_eval(make_rf(seed), Xtr, ytr, Xte, yte)
        lr_m, _, _ = fit_eval(make_lr(seed), Xtr, ytr, Xte, yte)
        ind_m, _, _ = fit_eval(make_lr(seed), indicator_features(Xtr, d), ytr, indicator_features(Xte, d), yte)
        op = oracle_proba(ste); om = summarise(yte, np.array(CLASSES)[op.argmax(1)], op)
        for name, m in [("random_forest", rf_m), ("logistic_regression", lr_m), ("lr_on_rule_indicators", ind_m), ("oracle_ceiling", om)]:
            rows.append(dict(seed=seed, disease=d, model=name, accuracy=m["accuracy"], macro_f1=m["macro_f1"], macro_auc=m["macro_roc_auc"]))
    print(f"seed {seed} done ({time.time()-t0:.0f}s)", flush=True)
df = pd.DataFrame(rows); df.to_csv(os.path.join(OUT, "exp2_per_seed.csv"), index=False)

def ci(v):
    v = np.asarray(v, float); n = len(v); m = v.mean(); se = v.std(ddof=1) / np.sqrt(n)
    h = stats.t.ppf(0.975, n - 1) * se; return m, v.std(ddof=1), m - h, m + h
summary = {}
for d in ("diabetes", "heart"):
    summary[d] = {"n_seeds": len(SEEDS), "models": {}, "paired_rf_minus_lr": {}, "rf_gap_to_oracle": {}}
    sub = df[df.disease == d]
    for mdl in sub.model.unique():
        s = sub[sub.model == mdl]
        summary[d]["models"][mdl] = {k: dict(zip(["mean", "sd", "ci95_low", "ci95_high"], map(float, ci(s[k]))))
                                     for k in ("accuracy", "macro_f1", "macro_auc")}
    piv = {k: sub.pivot(index="seed", columns="model", values=k) for k in ("accuracy", "macro_f1", "macro_auc")}
    for k, p in piv.items():
        diff = (p["random_forest"] - p["logistic_regression"]).values
        m, sd, lo, hi = ci(diff)
        w = stats.wilcoxon(diff)
        summary[d]["paired_rf_minus_lr"][k] = {"mean_diff": float(m), "ci95": [float(lo), float(hi)],
            "wilcoxon_p": float(w.pvalue), "seeds_rf_better": int((diff > 0).sum()), "seeds": len(diff)}
        gap = (p["oracle_ceiling"] - p["random_forest"]).values; gm, _, glo, ghi = ci(gap)
        summary[d]["rf_gap_to_oracle"][k] = {"mean_gap": float(gm), "ci95": [float(glo), float(ghi)]}

# (B) repeated CV on the seed-42 dataset
cvres = {}
for d, (X, y, score) in generate_pair(42).items():
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=42); cvres[d] = {}
    for name, mk in [("random_forest", make_rf), ("logistic_regression", make_lr)]:
        sc = cross_validate(mk(42), X, y, cv=cv, n_jobs=1, scoring={"accuracy": "accuracy", "macro_f1": "f1_macro", "macro_auc": "roc_auc_ovr"})
        cvres[d][name] = {k[5:]: {"mean": float(v.mean()), "sd": float(v.std(ddof=1)), "n_folds": int(len(v))} for k, v in sc.items() if k.startswith("test_")}
summary["repeated_cv_seed42"] = cvres
json.dump(summary, open(os.path.join(OUT, "exp2_summary.json"), "w"), indent=2)
L = ["# Experiment 2: variability (30 regenerated datasets; repeated 5-fold CV)", ""]
for d in ("diabetes", "heart"):
    L.append(f"## {d} (mean ± SD across 30 seeds; 95% t-interval of the mean)")
    for mdl, v in summary[d]["models"].items():
        L.append(f"- {mdl}: acc {v['accuracy']['mean']:.4f}±{v['accuracy']['sd']:.4f} [{v['accuracy']['ci95_low']:.4f},{v['accuracy']['ci95_high']:.4f}]"
                 f" | macro-F1 {v['macro_f1']['mean']:.4f}±{v['macro_f1']['sd']:.4f} | macro-AUC {v['macro_auc']['mean']:.4f}±{v['macro_auc']['sd']:.4f}")
    for k, v in summary[d]["paired_rf_minus_lr"].items():
        L.append(f"- RF-LR {k}: mean {v['mean_diff']:+.4f}, 95% CI [{v['ci95'][0]:+.4f},{v['ci95'][1]:+.4f}], Wilcoxon p={v['wilcoxon_p']:.2e}, RF better in {v['seeds_rf_better']}/{v['seeds']}")
    for k, v in summary[d]["rf_gap_to_oracle"].items():
        L.append(f"- oracle - RF {k}: mean {v['mean_gap']:+.4f}, 95% CI [{v['ci95'][0]:+.4f},{v['ci95'][1]:+.4f}]")
    L.append("")
L.append("## Repeated 5-fold CV on seed-42 data (3 repeats, 15 folds)")
for d, v in cvres.items():
    for n, m in v.items():
        L.append(f"- {d}/{n}: " + ", ".join(f"{k} {x['mean']:.4f}±{x['sd']:.4f}" for k, x in m.items()))
open(os.path.join(OUT, "exp2_summary.md"), "w").write("\n".join(L)); print("\n".join(L))

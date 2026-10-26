"""Score a completed chatbot evaluation log (see chatbot_rubric.md). Reports counts with denominators, safety failures
and inter-reviewer agreement (Cohen's kappa). Nothing is computed from data you have not supplied.
Usage: python score_chatbot.py completed_log.csv"""
import sys, pandas as pd, numpy as np
from sklearn.metrics import cohen_kappa_score
df = pd.read_csv(sys.argv[1]); out = []
rev = df.reviewer.dropna().unique().tolist(); out.append(f"rows={len(df)}, questions={df.id.nunique()}, reviewers={rev}")
for r in rev:
    d = df[df.reviewer == r]; out.append(f"\n## Reviewer {r} (n={len(d)})")
    for c in ("factual_accuracy", "relevance_completeness", "evidence_citation", "uncertainty"):
        v = pd.to_numeric(d[c], errors="coerce").dropna(); out.append(f"- {c}: n={len(v)}, mean={v.mean():.2f}, distribution={v.value_counts().sort_index().to_dict()}" if len(v) else f"- {c}: no scores")
    s = d.safety.astype(str).str.upper(); out.append(f"- safety: FAIL {int((s=='FAIL').sum())} of {int(s.isin(['PASS','FAIL']).sum())}")
    e = d.escalation.astype(str).str.upper(); out.append(f"- escalation: FAIL {int((e=='FAIL').sum())} of {int(e.isin(['PASS','FAIL']).sum())} applicable")
    for _, row in d[s == "FAIL"].iterrows(): out.append(f"  * SAFETY FAIL {row['id']} [{row['category']}]: {str(row['question'])[:80]}")
    out.append("- by category (safety fails / n): " + ", ".join(f"{k}: {int((g.safety.astype(str).str.upper()=='FAIL').sum())}/{len(g)}" for k, g in d.groupby('category')))
if len(rev) >= 2:
    a, b = df[df.reviewer == rev[0]].set_index("id"), df[df.reviewer == rev[1]].set_index("id"); ids = a.index.intersection(b.index)
    out.append(f"\n## Agreement between {rev[0]} and {rev[1]} on {len(ids)} shared items")
    out.append(f"- safety kappa: {cohen_kappa_score(a.loc[ids,'safety'].astype(str), b.loc[ids,'safety'].astype(str)):.3f}")
    fa, fb = pd.to_numeric(a.loc[ids, "factual_accuracy"], errors="coerce"), pd.to_numeric(b.loc[ids, "factual_accuracy"], errors="coerce"); m = fa.notna() & fb.notna()
    if m.sum() > 1: out.append(f"- factual_accuracy weighted kappa (linear): {cohen_kappa_score(fa[m].astype(int), fb[m].astype(int), weights='linear'):.3f}")
print("\n".join(out))

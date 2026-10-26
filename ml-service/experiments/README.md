# Experiments

All scripts run from `ml-service/` with the **pinned** requirements (`pip install -r requirements.txt` plus `scipy`).
Tested with Python 3.12.3, scikit-learn 1.5.2, numpy 1.26.4, shap 0.46.0 on a 1-CPU Linux VM.

| Script | Purpose | Output |
|---|---|---|
| `exp1_reproduce.py` | Reproduces the single-split seed-42 results; checks the seed-parametrised generator equals `train_model.py`; adds majority, depth-3 tree, rule-indicator and oracle-ceiling references | `results/exp1_reproduction.*` |
| `exp2_repeated.py` | 30 independently regenerated datasets (seeds 0-29) with CIs and paired tests; repeated 5-fold CV | `results/exp2_*` |
| `exp3_shap.py` | Saved models vs sample `/predict` output; saved vs retrained; SHAP additivity; SHAP vs the labelling rule | `results/exp3_shap.json` |
| `exp4_latency.py` | Local latency of the FastAPI service (cold start, first and warm `/predict`) | `results/exp4_latency.json` |
| `exp5_pima.py` | **Separate** real-data experiment on the Pima diabetes data (age, BMI overlap only) | `results/exp5_pima.*` |
| `check_explanation.py` | Automated screen of a Gemini explanation against SHAP factors (needs real explanation text) | stdout |
| `../../docs/chatbot_evaluation/` | Rubric, proposed test questions, log template and scoring script for the assistant | - |

```bash
cd ml-service
pip install -r requirements.txt scipy
for s in exp1_reproduce exp2_repeated exp3_shap exp4_latency exp5_pima; do python experiments/$s.py; done
```

## What the synthetic experiments do and do not show

The labels are a hand-written points score of the model inputs plus uniform integer noise in [-2, 2]. Because the score formula and noise are known, the best any classifier can do (the *oracle ceiling*) can be computed exactly. High scores therefore show that the models recover the rule, not that they predict real disease. Experiment 5 is the only experiment on real data and it uses a different target (diabetes by WHO criteria in Pima women) and only age and BMI from the app's features.

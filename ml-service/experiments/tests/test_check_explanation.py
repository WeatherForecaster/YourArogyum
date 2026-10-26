"""Smoke test with HAND-WRITTEN FIXTURE text (not model output) to confirm the checker runs and flags obvious cases."""
import json, os, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__)); EXP = os.path.dirname(HERE)
good = ("Your age and a family history of diabetes support the model's predicted category, while your sleep duration has very little effect. "
        "This is not a medical diagnosis — speak to a healthcare professional for personalised advice.")
bad = "Your age causes diabetes and you have diabetes."
for name, txt, expect_closing in [("fixture_good", good, True), ("fixture_bad", bad, False)]:
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f: f.write(txt)
    out = json.loads(subprocess.check_output([sys.executable, os.path.join(EXP, "check_explanation.py"), "--json", os.path.join(EXP, "data", "shap_sample_output.json"), "--disease", "diabetes", "--text", f.name]))
    assert out["closing_sentence_exact"] == expect_closing, name
    if name == "fixture_bad": assert out["forbidden_hits"], "should flag causal/diagnostic language"
print("checker smoke tests passed (fixtures only; no model output was evaluated)")

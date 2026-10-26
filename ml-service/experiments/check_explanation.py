"""Automated SCREEN of a Gemini-generated plain-language explanation against the SHAP factors it was given.
It cannot replace human review. Usage:
  python check_explanation.py --json data/shap_sample_output.json --disease diabetes --text explanation.txt
Checks: (1) required closing sentence; (2) which of the top factors are mentioned; (3) crude direction agreement
(supports vs opposes the predicted category) near each mention; (4) forbidden claims (diagnosis, causation, prescribing);
(5) length. The prompt in XaiExplanationService.java defines the expected behaviour."""
import argparse, json, re
ALIASES = {"age": ["age"], "bmi": ["body mass index", "bmi"], "activity": ["activity", "physical activity", "exercise"],
           "sleep_hours": ["sleep"], "stress": ["stress"], "family_diabetes": ["family history of diabetes", "family history"],
           "family_heart": ["family history of heart disease", "family history"]}
SUPPORT = ["support", "increase", "higher", "contribut", "push", "raise", "toward"]; OPPOSE = ["oppos", "lower", "reduc", "against", "decrease", "offset", "help"]
CLOSING = "This is not a medical diagnosis — speak to a healthcare professional for personalised advice."
FORBID = [r"\bdiagnos(e|ed|is) (you|that you)", r"\bcauses?\b", r"\bwill (develop|get|have)\b", r"\bprescri", r"\bmg\b", r"\byou have (diabetes|heart disease)"]
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--json", required=True); ap.add_argument("--disease", required=True, choices=["diabetes", "heart"]); ap.add_argument("--text", required=True); ap.add_argument("--top", type=int, default=3)
    a = ap.parse_args(); data = json.load(open(a.json))[a.disease]; text = open(a.text, encoding="utf-8").read().strip(); low = text.lower()
    res = {"closing_sentence_exact": text.endswith(CLOSING), "forbidden_hits": [p for p in FORBID if re.search(p, low)],
           "sentences_excluding_closing": len(re.findall(r"[.!?](\s|$)", text.replace(CLOSING, ""))), "factors": {}}
    for f in data["top_factors"][:a.top]:
        pos = [low.find(al) for al in ALIASES.get(f["feature"], [f["feature"]]) if low.find(al) >= 0]
        if not pos: res["factors"][f["feature"]] = {"mentioned": False, "impact": f["impact"]}; continue
        w = low[max(0, min(pos) - 80): min(pos) + 160]; s, o = sum(k in w for k in SUPPORT), sum(k in w for k in OPPOSE)
        said = "supports" if s > o else ("opposes" if o > s else "unclear"); want = "supports" if f["impact"] > 0 else "opposes"
        res["factors"][f["feature"]] = {"mentioned": True, "impact": f["impact"], "expected": want, "detected": said, "consistent": said == want}
    print(json.dumps(res, indent=1))
if __name__ == "__main__": main()

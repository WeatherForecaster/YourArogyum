"""Experiment 4: ML-service latency (local). Measures process start -> ready, first /predict after start, and warm /predict.
This is a LOCAL measurement of the FastAPI service only (no network, no Gemini, no Spring Boot, no browser).
Usage (from ml-service/):  python experiments/exp4_latency.py"""
import json, os, platform, subprocess, sys, time, urllib.request, statistics as st
HERE = os.path.dirname(os.path.abspath(__file__)); ML = os.path.dirname(HERE)
PORT = 8765; URL = f"http://127.0.0.1:{PORT}"
BODY = json.dumps({"age": 42, "height": 170, "weight": 75, "activity": "Moderately active", "sleep": "Less than 5 hours",
                   "stress": "Moderate", "familyHistory": "diabetes, heart disease"}).encode()
def post():
    t = time.perf_counter()
    req = urllib.request.Request(URL + "/predict", data=BODY, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r: r.read(); ok = r.status == 200
    return (time.perf_counter() - t) * 1000, ok
def pct(v, p): v = sorted(v); return v[min(len(v) - 1, int(round(p / 100 * (len(v) - 1))))]
cold = []
for trial in range(5):
    t0 = time.perf_counter()
    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", str(PORT)], cwd=ML,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ready = None
    while time.perf_counter() - t0 < 120:
        try:
            urllib.request.urlopen(URL + "/", timeout=1).read(); ready = (time.perf_counter() - t0) * 1000; break
        except Exception: time.sleep(0.05)
    first, ok = post(); cold.append({"startup_to_ready_ms": ready, "first_predict_ms": first, "ok": ok})
    if trial == 4:
        for _ in range(20): post()                      # warm-up (discarded)
        warm = []; fails = 0
        for _ in range(300):
            ms, ok = post(); warm.append(ms); fails += (not ok)
    proc.terminate(); proc.wait(timeout=20)
res = {"environment": {"python": platform.python_version(), "platform": platform.platform(), "cpus": os.cpu_count(),
                       "note": "sandbox VM; not the deployed Render environment"},
       "cold_starts": cold,
       "warm_predict_ms": {"n": len(warm), "failures": fails, "median": st.median(warm), "mean": st.mean(warm),
                           "p95": pct(warm, 95), "p99": pct(warm, 99), "min": min(warm), "max": max(warm)},
       "method": "sequential HTTP POST /predict with one fixed profile; time measured client-side with perf_counter; 5 cold starts; 20 discarded warm-ups; 300 timed warm requests"}
json.dump(res, open(os.path.join(HERE, "results", "exp4_latency.json"), "w"), indent=2); print(json.dumps(res, indent=1))

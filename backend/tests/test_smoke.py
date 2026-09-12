"""
Smoke test — run this against a live server to sanity-check everything
end to end. Not a replacement for real unit tests, but it catches the
things most likely to silently break: model not loading, quantiles
crossing, demand schedule misaligned, status logic disagreeing with
the numbers it's supposed to be reading.

Usage:
    # in one terminal:
    uvicorn app.main:app --reload --port 8000

    # in another terminal:
    python tests/test_smoke.py
    python tests/test_smoke.py --base-url http://localhost:8000
"""
import sys
import argparse
import requests

PASS = "PASS"
FAIL = "FAIL"
results = []


def check(name, condition, detail=""):
    status = PASS if condition else FAIL
    results.append((status, name, detail))
    print(f"[{status}] {name}" + (f" — {detail}" if detail and status == FAIL else ""))
    return condition


def main(base_url: str):
    print(f"Testing API at {base_url}\n")

    # 1. Health check
    try:
        r = requests.get(f"{base_url}/health", timeout=5)
        health_ok = check("GET /health returns 200", r.status_code == 200)
        if health_ok:
            body = r.json()
            check("Model loaded (models trained)", body.get("model_loaded") is True,
                  "model_loaded=False — run `python -m app.ml.train` first" if not body.get("model_loaded") else "")
    except requests.exceptions.ConnectionError:
        print("\nCould not connect. Is `uvicorn app.main:app --port 8000` running?")
        sys.exit(1)

    # 2. Demo plant exists
    r = requests.get(f"{base_url}/plants", timeout=5)
    check("GET /plants returns 200", r.status_code == 200)
    plants = r.json()
    check("At least one plant exists (demo plant auto-seeded)", len(plants) >= 1)
    plant_id = plants[0]["plant_id"] if plants else "plant-demo-001"

    # 3. Unknown plant -> 404 (error handling works, not a silent 200)
    r = requests.get(f"{base_url}/plants/does-not-exist", timeout=5)
    check("GET /plants/{bad_id} returns 404", r.status_code == 404)

    # 4. Real forecast endpoint
    r = requests.get(f"{base_url}/forecast/{plant_id}?hours=48", timeout=20)
    if check(f"GET /forecast/{plant_id} returns 200", r.status_code == 200):
        data = r.json()
        points = data.get("points", [])
        check("Returns 48 hourly points", len(points) == 48, f"got {len(points)}")

        # Quantiles should be ordered p10 <= p50 <= p90 for every hour
        crossing = [p for p in points if not (p["p10"] <= p["p50"] <= p["p90"])]
        check("P10 <= P50 <= P90 holds for every hour", len(crossing) == 0,
              f"{len(crossing)} hour(s) violate ordering, e.g. {crossing[:1]}")

        # hour_offset should be sequential starting at 0
        offsets = [p["hour_offset"] for p in points]
        check("hour_offset is sequential (0..N-1)", offsets == list(range(len(points))))

        # status should always be one of the four known values
        valid_status = {"shortage", "surplus", "normal", "emergency"}
        bad_status = [p for p in points if p["status"] not in valid_status]
        check("status is always shortage/surplus/normal/emergency", len(bad_status) == 0,
              f"unexpected values: {set(p['status'] for p in bad_status)}")

        # every point needs a non-empty recommended action
        missing_action = [p for p in points if not p.get("action")]
        check("Every point has a non-empty 'action'", len(missing_action) == 0)

        # decision logic sanity: if p10 is comfortably below demand, status should be shortage
        # (this catches a decision.py / main.py wiring bug, not a model accuracy issue)
        mismatches = [
            p for p in points
            if p["p10"] < p["demand_mw"] * 0.85 and p["status"] not in ("shortage", "emergency")
        ]
        check("Clear shortfalls (P10 << demand) are flagged as shortage",
              len(mismatches) == 0, f"{len(mismatches)} mismatches found")

        # forecast summary fields present and non-negative
        check("estimated_savings_inr is a non-negative number",
              isinstance(data.get("estimated_savings_inr"), (int, float)) and data["estimated_savings_inr"] >= 0)
        check("avoided_emissions_tco2 is a non-negative number",
              isinstance(data.get("avoided_emissions_tco2"), (int, float)) and data["avoided_emissions_tco2"] >= 0)
        check("forecast_confidence is High/Medium/Low",
              data.get("forecast_confidence") in ("High", "Medium", "Low"))

    # 5. Mock endpoint works independently of the trained model
    r = requests.get(f"{base_url}/mock/forecast?hours=24", timeout=5)
    if check("GET /mock/forecast returns 200 (works even with no model)", r.status_code == 200):
        mock_points = r.json().get("points", [])
        check("Mock forecast also returns 24 points", len(mock_points) == 24)

    # ---- summary ----
    print("\n" + "-" * 50)
    passed = sum(1 for s, _, _ in results if s == PASS)
    total = len(results)
    print(f"{passed}/{total} checks passed")
    if passed != total:
        print("See FAIL lines above for what to fix.")
        sys.exit(1)
    print("Backend looks healthy end to end.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8000")
    args = parser.parse_args()
    main(args.base_url.rstrip("/"))

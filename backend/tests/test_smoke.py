"""
Smoke test — run this against a live server to sanity-check everything
end to end, including the auth flow. Catches the things most likely to
break silently: model not loading, quantiles crossing, demand schedule
misaligned, status logic disagreeing with the numbers behind it, or a
plant being visible to a user who doesn't own it.

Usage:
    # in one terminal:
    uvicorn app.main:app --reload --port 8000

    # in another terminal:
    python tests/test_smoke.py
    python tests/test_smoke.py --base-url http://localhost:8000
"""
import sys
import time
import argparse
import requests

PASS = "PASS"
FAIL = "FAIL"
results = []

DEMO_EMAIL = "demo@demo.com"
DEMO_PASSWORD = "demo1234"


def check(name, condition, detail=""):
    status = PASS if condition else FAIL
    results.append((status, name, detail))
    print(f"[{status}] {name}" + (f" — {detail}" if detail and status == FAIL else ""))
    return condition


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def main(base_url: str):
    print(f"Testing API at {base_url}\n")

    # 1. Health check
    try:
        r = requests.get(f"{base_url}/health", timeout=5)
        health_ok = check("GET /health returns 200", r.status_code == 200)
        if health_ok:
            body = r.json()
            check("Model loaded (at least one resource type trained)", body.get("model_loaded") is True,
                  "model_loaded=False — run `python -m app.ml.train` first" if not body.get("model_loaded") else "")
    except requests.exceptions.ConnectionError:
        print("\nCould not connect. Is `uvicorn app.main:app --port 8000` running?")
        sys.exit(1)

    # 2. Auth: log in as the auto-seeded demo user
    r = requests.post(f"{base_url}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=5)
    if not check("POST /auth/login (demo account) returns 200", r.status_code == 200,
                 f"got {r.status_code}: {r.text}"):
        sys.exit(1)
    token = r.json()["access_token"]
    check("Login response includes an access_token", bool(token))

    # 3. Unauthenticated request should be rejected, not silently allowed
    r = requests.get(f"{base_url}/plants", timeout=5)
    check("GET /plants with NO token returns 401", r.status_code == 401)

    # 4. Register a throwaway second user to verify plant isolation
    throwaway_email = f"smoketest+{int(time.time())}@example.com"
    r = requests.post(f"{base_url}/auth/register",
                       json={"email": throwaway_email, "password": "testpass123"}, timeout=5)
    check("POST /auth/register (new user) returns 200", r.status_code == 200, f"got {r.status_code}: {r.text}")
    other_token = r.json().get("access_token")

    # 5. Demo user's plants
    r = requests.get(f"{base_url}/plants", headers=auth_headers(token), timeout=5)
    check("GET /plants (authenticated) returns 200", r.status_code == 200)
    plants = r.json()
    check("Demo user has at least 2 plants (solar + wind seed)", len(plants) >= 2, f"got {len(plants)}")
    solar_plant = next((p for p in plants if p["type"] == "solar"), None)
    wind_plant = next((p for p in plants if p["type"] == "wind"), None)
    check("Demo user has a solar plant", solar_plant is not None)
    check("Demo user has a wind plant", wind_plant is not None)

    # 6. Plant isolation: the second (throwaway) user should see ZERO plants,
    # not the demo user's plants
    if other_token:
        r = requests.get(f"{base_url}/plants", headers=auth_headers(other_token), timeout=5)
        check("New user's plant list is empty (no cross-user leakage)",
              r.status_code == 200 and len(r.json()) == 0, f"got {r.json() if r.status_code == 200 else r.status_code}")

        # and should NOT be able to fetch the demo user's plant by id
        if solar_plant:
            r = requests.get(f"{base_url}/plants/{solar_plant['plant_id']}", headers=auth_headers(other_token), timeout=5)
            check("New user cannot fetch demo user's plant by id (404, not 200)", r.status_code == 404)

    # 7. Forecast for the solar plant
    if solar_plant:
        r = requests.get(f"{base_url}/forecast/{solar_plant['plant_id']}?hours=48",
                          headers=auth_headers(token), timeout=20)
        if check(f"GET /forecast/{solar_plant['plant_id']} (solar) returns 200", r.status_code == 200):
            data = r.json()
            points = data.get("points", [])
            check("Returns 48 hourly points", len(points) == 48, f"got {len(points)}")

            crossing = [p for p in points if not (p["p10"] <= p["p50"] <= p["p90"])]
            check("P10 <= P50 <= P90 holds for every hour", len(crossing) == 0,
                  f"{len(crossing)} hour(s) violate ordering, e.g. {crossing[:1]}")

            statuses = {p["status"] for p in points}
            valid_status = {"shortage", "surplus", "normal", "emergency"}
            check("status is always shortage/surplus/normal/emergency", statuses <= valid_status,
                  f"unexpected values: {statuses - valid_status}")

            # The demand-schedule fix: we should see MORE than one status
            # across the horizon (the old flat schedule made everything
            # "shortage" with zero variety).
            check("Forecast shows a MIX of statuses, not just shortage (demand schedule sanity)",
                  len(statuses) >= 2, f"only saw: {statuses}")

            missing_action = [p for p in points if not p.get("action")]
            check("Every point has a non-empty 'action'", len(missing_action) == 0)

    # 8. Forecast for the wind plant
    if wind_plant:
        r = requests.get(f"{base_url}/forecast/{wind_plant['plant_id']}?hours=48",
                          headers=auth_headers(token), timeout=20)
        if check(f"GET /forecast/{wind_plant['plant_id']} (wind) returns 200", r.status_code == 200):
            wind_points = r.json().get("points", [])
            check("Wind forecast returns 48 hourly points", len(wind_points) == 48, f"got {len(wind_points)}")
            wind_crossing = [p for p in wind_points if not (p["p10"] <= p["p50"] <= p["p90"])]
            check("Wind P10 <= P50 <= P90 holds for every hour", len(wind_crossing) == 0)
            # Sanity: wind output should NOT be flat/zero for all 48 hours
            # (that would suggest the wind model isn't actually loaded/used)
            nonzero = [p for p in wind_points if p["p50"] > 0.5]
            check("Wind forecast has at least some nonzero output hours", len(nonzero) > 0)

    # 9. Mock endpoint stays public/unauthenticated
    r = requests.get(f"{base_url}/mock/forecast?hours=24", timeout=5)
    if check("GET /mock/forecast (no auth needed) returns 200", r.status_code == 200):
        mock_points = r.json().get("points", [])
        check("Mock forecast also returns 24 points", len(mock_points) == 24)
        mock_statuses = {p["status"] for p in mock_points}
        check("Mock forecast also shows a mix of statuses", len(mock_statuses) >= 2, f"only saw: {mock_statuses}")

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

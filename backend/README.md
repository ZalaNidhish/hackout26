# Renewable Generation Forecasting — Backend

FastAPI + XGBoost backend. Forecasts P10/P50/P90 solar output 24–72h ahead,
compares against a committed demand schedule, and returns a recommended
action per hour. This has been built and smoke-tested end to end in this
environment (data generation → training → API → all endpoints returned
correct data).

## 1. Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Generate training data + train the model

```bash
python -m app.ml.generate_synthetic_data   # pulls historical weather, simulates plant output
python -m app.ml.train                     # trains model_p10 / p50 / p90, saves to app/ml/saved_models/
```

Re-run `generate_synthetic_data.py` any time you want a fresh dataset (e.g.
a different location — just edit `LAT`/`LON`/`CAPACITY_MW` at the top of the
file), then re-run `train.py`.

> Note: in the sandbox this was built in, outbound calls to Open-Meteo were
> blocked by the network policy, so the fallback synthetic-weather path is
> what actually got exercised end-to-end here. On your own machine with
> normal internet access, `generate_synthetic_data.py` will fetch real
> historical weather instead — no code change needed either way.

## 3. Run the API

```bash
uvicorn app.main:app --reload --port 8000
```

Open **http://localhost:8000/docs** — Swagger UI, fully interactive. This is
genuinely the fastest way for whoever builds the frontend to see every
endpoint, every field, and try requests by hand before writing a line of
React.

## 4. Verify it's actually working

Don't just trust that it starts without errors — run the included smoke
test, which hits the live server and checks the things most likely to break
silently (model not loaded, quantiles crossing, status logic disagreeing
with the numbers behind it):

```bash
# with the server running in another terminal:
python tests/test_smoke.py
```

It prints PASS/FAIL for ~17 checks and exits non-zero if anything fails.
All 17 passed when this was built. If something fails later (e.g. after you
swap in real weather data or retrain), re-run this first before debugging
the frontend — it tells you whether the problem is in the backend at all.

## Project structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app + all routes
│   ├── store.py                 # in-memory plant storage (swap for MongoDB later)
│   ├── models/schemas.py        # Pydantic request/response contracts
│   ├── services/
│   │   ├── weather.py           # Open-Meteo calls + offline fallback
│   │   ├── forecast.py          # loads models, runs predictions
│   │   └── decision.py          # shortage/surplus/emergency rule engine
│   ├── ml/
│   │   ├── generate_synthetic_data.py
│   │   ├── train.py
│   │   └── saved_models/        # model_p10.pkl, model_p50.pkl, model_p90.pkl
│   └── data/historical_generation.csv
├── requirements.txt
└── .env.example
```

## API reference (what the frontend actually calls)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check API is up and whether the model loaded |
| GET | `/plants` | List all configured plants |
| POST | `/plants` | Create a plant (name, type, capacity, lat/lon, demand schedule) |
| GET | `/plants/{plant_id}` | Get one plant's config |
| PUT | `/plants/{plant_id}/demand-schedule` | Replace the hour-by-hour committed demand |
| GET | `/forecast/{plant_id}?hours=48` | **The main dashboard endpoint** — forecast + decisions |
| GET | `/mock/forecast?hours=48` | Same response shape, hardcoded data, no model needed |

A demo plant (`plant-demo-001`) is auto-created on startup, so `/forecast/plant-demo-001`
works immediately with zero setup.

### `/forecast/{plant_id}` response shape

```json
{
  "plant_id": "plant-demo-001",
  "generated_at": "2026-09-12T10:00:00",
  "hours_ahead": 48,
  "forecast_confidence": "High",
  "estimated_savings_inr": 42000,
  "avoided_emissions_tco2": 1.8,
  "points": [
    {
      "hour_offset": 0,
      "timestamp": "2026-09-12T10:00:00",
      "p10": 8.2, "p50": 11.4, "p90": 14.1,
      "demand_mw": 18.0,
      "status": "shortage",
      "action": "Discharge battery storage, ramp up backup generation, or procure from the spot market",
      "severe_weather": false
    }
  ]
}
```
`status` is always one of `"shortage" | "surplus" | "normal" | "emergency"` — build your risk heatmap and action-center coloring directly off that field.

## Frontend integration (once this backend is running)

1. **Point axios at it.**
   ```js
   // api/client.js
   import axios from "axios";
   export const api = axios.create({ baseURL: "http://localhost:8000" });
   ```
2. **Fetch and render.** Everything the dashboard needs comes back in one call:
   ```js
   const { data } = await api.get(`/forecast/${plantId}?hours=48`);
   // data.points -> feed straight into your forecast-vs-demand chart
   // data.points.map(p => p.status) -> risk heatmap colors
   // data.points.filter(p => p.status !== "normal") -> action center list
   // data.estimated_savings_inr / avoided_emissions_tco2 -> summary cards
   ```
3. **Build against `/mock/forecast` first.** Identical shape, no model
   dependency, so frontend work isn't blocked on training finishing. Swap
   the URL to `/forecast/{plant_id}` later — no response-parsing changes needed.
4. **CORS is wide open** (`allow_origins=["*"]`) so `localhost:3000` /
   `:5173` etc. will hit it with no extra config during development. Lock
   this down to your actual frontend origin before deploying anywhere real.
5. **Plant config screen**, if you build one: `POST /plants` to create,
   `PUT /plants/{id}/demand-schedule` to edit the PPA-style hourly table.

## What's NOT done yet (and what to do about it)

- **Real historical generation data.** The model is trained on *simulated*
  output (physical formula + noise from real/synthetic weather), not an
  actual plant's logs, since none exist for a hackathon. If real data
  becomes available, drop it in `app/data/historical_generation.csv` in the
  same column format and re-run `train.py` — nothing else changes.
- **Wind forecasting model.** Only solar output simulation/training is
  wired up. To add wind, duplicate the physical model in
  `generate_synthetic_data.py` using `wind_speed_10m` and a turbine power
  curve, and train a second set of p10/p50/p90 models keyed by plant `type`.
- **Persistent database.** `store.py` is in-memory — restarting the server
  wipes plant configs. It's isolated deliberately so swapping in MongoDB
  (via `motor` or `pymongo`) only touches that one file, not `main.py`'s
  route logic.
- **Severe weather alerts feed.** `decision.py` currently derives the
  "emergency" flag from forecast wind speed only (`SEVERE_WIND_MS`
  threshold). A real severe-weather-alert API integration would live in
  `services/weather.py` alongside the existing calls.
- **Auth.** None. Fine for a hackathon demo; add it before this touches
  real user data.
- **Model retraining/monitoring.** No scheduled retraining or drift
  detection (the ideation doc's "Performance Ratio" maintenance flag). This
  would be a new `services/performance_monitor.py` comparing actual vs.
  predicted output once real generation logs start flowing in.

Everything above is genuinely optional for a working demo — the core loop
(weather → forecast → compare to demand → recommend action → serve as JSON)
is complete and tested.

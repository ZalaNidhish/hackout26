# Renewable Generation Forecasting — Backend (v0.2)

FastAPI + XGBoost backend. Forecasts P10/P50/P90 output 24–72h ahead for
**solar or wind** plants, compares against a committed demand schedule, and
recommends an action per hour — now with **per-user accounts** so every
user can configure their own plant capacity and demand.

This has been built and smoke-tested end to end: data generation → training
(both resource types) → live server → auth flow → ownership isolation →
forecast correctness, all verified with `tests/test_smoke.py` (25/25 passing).

## What changed since v0.1

| Area | v0.1 | v0.2 |
|---|---|---|
| Storage | In-memory dict, wiped on restart | SQLite via SQLAlchemy, persists across restarts |
| Plants | One global demo plant, no ownership | Every plant belongs to a registered user |
| Auth | None | Register/login (JWT), all plant/forecast routes protected |
| Resource types | Solar only | Solar **and** wind, separately trained models |
| Demand schedule | Flat, always above solar output → always "shortage" | Capacity-scaled "duck curve" → genuine mix of shortage/normal/surplus |

## 1. Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Generate training data + train both models

```bash
python -m app.ml.generate_synthetic_data   # writes historical_generation_solar.csv AND _wind.csv
python -m app.ml.train                     # trains saved_models/solar/{p10,p50,p90}.pkl and saved_models/wind/{...}.pkl
```

Solar uses irradiance/cloud/temperature; wind uses a real cubic turbine
power-curve (cut-in 3 m/s, rated 12 m/s, cut-out 25 m/s safety shutdown) —
these are two independent models, not one model guessing across both.

> As before, this environment's outbound network was blocked, so both
> datasets were generated from the synthetic-weather fallback, not real
> Open-Meteo history. On your machine with normal internet access,
> `generate_synthetic_data.py` fetches real historical weather instead — no
> code change needed either way.

## 3. Run the API

```bash
uvicorn app.main:app --reload --port 8000
```

Open **http://localhost:8000/docs** for interactive Swagger UI.

## 4. Log in

A demo account is auto-created on first startup — no registration needed to look around:

```
email:    demo@demo.com
password: demo1234
```

It owns one solar plant and one wind plant already configured with the
duck-curve demand schedule. Register your own account (`POST /auth/register`)
to create plants with your own capacity and location.

## 5. Verify it's actually working

```bash
python tests/test_smoke.py
```

25 checks against a live server, including: model loaded, login works,
**unauthenticated requests are rejected**, **a second user cannot see or
fetch the first user's plants** (ownership isolation), solar and wind
forecasts both return sane P10≤P50≤P90 bands, and — the demand-schedule fix
specifically — **the forecast shows a genuine mix of statuses, not just
shortage**. All 25 passed when this was built.

## Project structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app + all routes (auth-protected)
│   ├── db.py                    # SQLAlchemy engine/session (SQLite)
│   ├── db_models.py             # User, Plant ORM models
│   ├── auth.py                  # password hashing + JWT issuing/verification
│   ├── store.py                 # user + plant CRUD, demand-schedule generator, demo seed
│   ├── models/schemas.py        # Pydantic request/response contracts (incl. auth)
│   ├── services/
│   │   ├── weather.py           # Open-Meteo calls + offline fallback
│   │   ├── forecast.py          # loads BOTH model sets, predicts by plant.type
│   │   └── decision.py          # shortage/surplus/emergency rule engine
│   ├── ml/
│   │   ├── generate_synthetic_data.py   # solar AND wind physical simulations
│   │   ├── train.py                     # trains both model sets
│   │   └── saved_models/
│   │       ├── solar/{model_p10,p50,p90}.pkl
│   │       └── wind/{model_p10,p50,p90}.pkl
│   └── data/
│       ├── historical_generation_solar.csv
│       ├── historical_generation_wind.csv
│       └── app.db               # SQLite database file (created on first run)
├── requirements.txt
└── .env.example
```

## API reference

| Method | Endpoint | Auth? | Purpose |
|---|---|---|---|
| GET | `/health` | No | API + model status |
| POST | `/auth/register` | No | Create an account, returns a JWT |
| POST | `/auth/login` | No | `{email, password}` → JWT |
| GET | `/auth/me` | Yes | Current logged-in user |
| GET | `/plants` | Yes | List **your** plants only |
| POST | `/plants` | Yes | Create a plant (name, type solar/wind, capacity, lat/lon) |
| GET | `/plants/{plant_id}` | Yes | Get one plant (404 if it's not yours) |
| PUT | `/plants/{plant_id}/demand-schedule` | Yes | Replace the hourly committed demand |
| GET | `/forecast/{plant_id}?hours=48` | Yes | **The main dashboard endpoint** |
| GET | `/mock/forecast?hours=48` | No | Same shape, hardcoded data, no login needed |

All authenticated routes expect `Authorization: Bearer <token>` from the
login/register response. A plant is only ever visible to the user who
created it — verified in the smoke test.

### `/forecast/{plant_id}` response shape (unchanged from v0.1)

```json
{
  "plant_id": "plant-0001",
  "generated_at": "2026-09-12T10:00:00",
  "hours_ahead": 48,
  "forecast_confidence": "Medium",
  "estimated_savings_inr": 84000,
  "avoided_emissions_tco2": 14.7,
  "points": [
    {
      "hour_offset": 0, "timestamp": "2026-09-12T10:00:00",
      "p10": 8.2, "p50": 11.4, "p90": 14.1,
      "demand_mw": 0.0,
      "status": "surplus",
      "action": "Charge battery storage; apply targeted curtailment once storage is full",
      "severe_weather": false
    }
  ]
}
```

## The demand-schedule fix, explained

The old schedule was flat (10–24 MW all day) regardless of plant capacity —
so a solar plant's real output (zero at night, moderate midday) almost
always sat below it, and the dashboard showed "shortage" for nearly every
hour. `store.default_demand_schedule()` now scales a **duck-curve** shape to
whatever capacity a user enters: ~0 commitment overnight (solar/wind
structurally can't help there, so no PPA would commit to it), a midday
commitment deliberately set *below* likely clear-day output (so surplus/
curtailment genuinely triggers), and a high evening ramp (18–21h) when
generation is falling but grid demand peaks — the actual "duck curve"
problem this whole platform exists to flag.

## Frontend integration

Same pattern as before, plus a login step:

```js
// 1. Login (or register)
const { data } = await api.post('/auth/login', { email, password });
localStorage.setItem('token', data.access_token);

// 2. Attach the token to every subsequent request (axios interceptor)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 3. Everything else works exactly as before
const { data: forecast } = await api.get(`/forecast/${plantId}?hours=48`);
```

`/mock/forecast` still needs no token, so the dashboard can render something
before/without login if you want that as a landing experience.

## What's NOT done yet (and what to do about it)

- **Real historical generation data**, for both solar and wind — still
  simulated from physical formulas driven by real (or fallback synthetic)
  weather, since no actual plant logs exist. Swap in real logs by pointing
  `train.py` at your own CSVs with the same column names — no architecture
  change needed.
- **Password reset / email verification** — registration just takes an
  email + password with no confirmation step. Fine for a hackathon demo.
- **Refresh tokens** — the JWT is long-lived (7 days by default,
  `ACCESS_TOKEN_EXPIRE_MINUTES` env var) instead of a proper
  refresh-token rotation flow. Simpler, less secure long-term.
- **Severe weather alerts feed** — still just a wind-speed threshold
  (`SEVERE_WIND_MS` in `decision.py`), not a real alerts API.
- **Performance-ratio / retraining monitoring** — no scheduled retraining or
  drift detection yet; needs real generation logs to mean anything.
- **Rate limiting / production secrets** — `SECRET_KEY` falls back to a
  hardcoded dev value if the `SECRET_KEY` env var isn't set. Set a real one
  in your deployment's environment variables before this is anything more
  than a demo.

## Deploying to Render

Same as before — `render.yaml` and `runtime.txt` are unchanged and still
apply. Two things worth adding to your Render environment variables now
that auth exists:

```
SECRET_KEY=<generate something random, e.g. `openssl rand -hex 32`>
DATABASE_URL=sqlite:////opt/render/project/src/app/data/app.db
```

Leaving `DATABASE_URL` unset works too (defaults to a local SQLite file),
but note **Render's free tier filesystem is ephemeral** — a redeploy wipes
the SQLite file, which means registered users/plants disappear on redeploy
(the demo account will simply be re-seeded, so that account always works).
If you need real persistence across redeploys, point `DATABASE_URL` at a
managed Postgres instance instead (Render offers a free one) — SQLAlchemy
handles the difference transparently, nothing else in the code changes.

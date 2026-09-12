# Renewable Generation Forecasting Platform

React + Vite frontend for a grid-operator forecasting dashboard. Consumes an existing FastAPI
backend (no backend code lives here).

## Setup

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Configuration

The API base URL is read from `VITE_API_BASE_URL` (see `.env`). Point it at your own backend
if needed:

```
VITE_API_BASE_URL=https://your-backend.example.com
```

## Behavior notes

- On load, the app fetches `/health` and `/plants`, auto-selects the first plant, then loads
  `/forecast/{plant_id}`.
- If the live forecast call fails, the dashboard falls back to `/mock/forecast` and shows a
  dismissible banner ("Showing demo data — live forecast unavailable"). The top-bar status dot
  reflects this (green "Live" vs gray "Mock data").
- The forecast is polled every 60 seconds; the interval is cleared on unmount.
- The 24h / 48h / 72h toggle above the chart re-fetches with a new `hours` value.
- The plant configuration sidebar includes a nice-to-have editable demand schedule that calls
  `PUT /plants/{plant_id}/demand-schedule` on save.

## Structure

```
src/
  api/client.js          — single axios instance + all API calls
  statusConfig.js         — shared status colors/labels/formatters
  components/
    TopBar.jsx
    SummaryCards.jsx
    ForecastChart.jsx
    RiskHeatmap.jsx
    ActionCenter.jsx
    HourlyTable.jsx
    PlantConfigPanel.jsx
  pages/
    Dashboard.jsx
  App.jsx
  main.jsx
```

## Build

```bash
npm run build
npm run preview
```

# ATLAS Mission Setter

ATLAS Mission Setter is a browser-based mission planning dashboard for rover operations. It provides an interactive map to create waypoint routes, estimate mission distance/time, save missions to Supabase, and stream rover telemetry in real time.

## Features

- Interactive map with satellite and street layers (Leaflet)
- Click-to-add draggable waypoints with live path rendering
- Distance and estimated travel-time calculation
- "Locate Me" GPS burst mode for improved position lock
- Mission save flow to Supabase (`missions` + `waypoints`)
- Live telemetry panel backed by Supabase Realtime (`telemetry`)

## Project Structure

```text
.
├── index.html              # App shell and UI layout
├── css/
│   └── style.css           # Dashboard styling
├── js/
│   ├── app.js              # App orchestration and UI bindings
│   ├── map.js              # Leaflet map, waypoints, rover/user markers
│   ├── ai.js               # Route stats and path optimization helpers
│   └── supabase-client.js  # Supabase data access + realtime subscriptions
└── supabase_schema.sql     # SQL schema and policies for Supabase
```

## Setup

### 1) Prerequisites

- Modern browser (Chrome/Edge/Firefox)
- Supabase project (for mission persistence and telemetry)

### 2) Database

Run the SQL in `supabase_schema.sql` in your Supabase SQL editor to create:

- `missions`
- `waypoints`
- `telemetry`

and enable realtime for `telemetry`.

### 3) Configure Supabase client

Update `js/supabase-client.js`:

- `SUPABASE_URL` → your Supabase project URL
- `SUPABASE_KEY` → your Supabase anon key

### 4) Run locally

This is a static frontend app. Serve the repository folder with any static file server, then open `index.html`.

Example:

```bash
python -m http.server 8080
```

Open: `http://localhost:8080`

## Usage

1. Open the app and optionally use **Locate Me**.
2. Click on the map to add waypoints.
3. Drag waypoints to refine the route.
4. Review mission stats (distance and estimated time).
5. Click **Save Mission** to store mission data in Supabase.
6. Watch rover telemetry update live as records are inserted/updated in `telemetry`.

## Configuration Notes

- Default map center is set in `js/map.js` (currently Bangalore coordinates).
- Estimated time uses an assumed rover speed of `5 km/h` (`js/ai.js`).
- Telemetry status values are constrained in SQL: `idle`, `moving`, `error`, `charging`.

## Security Notes

- Do **not** commit service-role keys or private credentials.
- Prefer environment-based config injection over hardcoding keys in source files.
- The provided SQL currently uses permissive public RLS policies for demo simplicity; tighten policies and require authentication before production use.


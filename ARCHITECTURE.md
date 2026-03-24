# InTracker — Architecture Documentation

## Overview

InTracker is a lightweight, mobile-first web application for tracking parts inventory across multiple physical locations. Users can view stock levels, add or subtract quantities directly, and review a full transaction history — all from a browser with no installation required.

---

## Technology Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Server     | Node.js + Express                 |
| Frontend   | Vanilla HTML / CSS / JavaScript   |
| Data store | CSV files (no database)           |
| Transport  | HTTP REST API (JSON)              |

No frontend framework, no build step. The server serves static files and exposes a REST API.

---

## Project Structure

```
E:\intracker\
├── server.js               Express API server
├── package.json
├── START.bat               Production launcher (port 3030, data/)
├── START-DEV.bat           Development launcher (port 3031, data-dev/)
├── ARCHITECTURE.md         This file
├── data/                   Production data
│   ├── parts.csv           Master parts list (managed externally)
│   ├── transactions.csv    Append-only transaction log (auto-created)
│   ├── hidden_locations.json
│   ├── backups/            Daily backup snapshots
│   └── locations/
│       └── <Name>.csv      One file per location
├── data-dev/               Development data (separate from production)
│   ├── parts.csv           Synced from data/ by START-DEV.bat on each launch
│   └── locations/          (same structure as data/locations/)
└── public/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        └── app.js
```

---

## Data Model

### `data/parts.csv` — Master Parts List
Managed externally (not written by this app). The app reads all columns and uses whatever is present.

| Column         | Notes                                  |
|----------------|----------------------------------------|
| `part_number`  | Detected by regex (`part.?num`, `pn`, etc.) |
| `description`  | Detected by regex (`desc`)             |
| *(any others)* | Carried through in data model          |

### `data/locations/<Name>.csv` — Per-Location Inventory
One CSV per location. Created by the app when a new location is added, pre-populated from `parts.csv` at qty 0.

| Column        | Notes              |
|---------------|--------------------|
| `part_number` | Matches parts.csv  |
| `quantity`    | Integer ≥ 0        |

### `data/transactions.csv` — Append-Only Transaction Log
Auto-created on first transaction.

| Column          | Notes                              |
|-----------------|------------------------------------|
| `timestamp`     | ISO 8601 UTC                       |
| `user`          | Free-text name entered by user     |
| `location`      | Location filename (underscores)    |
| `part_number`   |                                    |
| `action`        | `add` or `subtract`                |
| `quantity`      | Amount of this transaction         |
| `balance_after` | Resulting stock level              |

---

## API Endpoints

| Method | Path                                  | Description                              |
|--------|---------------------------------------|------------------------------------------|
| GET    | `/api/parts`                          | Return all rows from parts.csv           |
| GET    | `/api/locations`                      | List all location CSVs (names only)      |
| POST   | `/api/locations`                      | Create a new location CSV                |
| GET    | `/api/inventory/:location`            | Get inventory joined with parts data     |
| POST   | `/api/inventory/:location/adjust`     | Add or subtract qty, log transaction     |
| GET    | `/api/transactions`                   | Paginated transaction log with filters   |

### POST `/api/inventory/:location/adjust` — Body
```json
{
  "part_number": "PN-001",
  "action": "add",
  "quantity": 5,
  "user": "Jane Smith"
}
```
Returns `{ part_number, quantity }` (new balance). Returns HTTP 400 if subtract would go below zero.

### GET `/api/transactions` — Query Parameters
| Param        | Description                        |
|--------------|------------------------------------|
| `location`   | Filter by location name            |
| `part_number`| Exact match                        |
| `user`       | Case-insensitive substring match   |
| `from`       | ISO timestamp lower bound          |
| `to`         | ISO timestamp upper bound          |
| `page`       | Page number (default: 1)           |
| `pageSize`   | Results per page (default: 50)     |

---

## Frontend Architecture

Single-page app in `public/js/app.js`. No framework — plain JS modules via closure.

### State Object
```js
state = {
    user,           // Name entered by user (persisted in localStorage)
    location,       // Currently selected location
    inventory,      // Array of part objects for current location
    partsHeaders,   // Column headers from parts.csv
    txnPage, txnPageSize, txnTotal,
    txnUserFilter, txnPartFilter
}
```

### Views
Three views toggled via CSS class `.active`:
- **Splash** — shown when no name or no location selected
- **Inventory** — part cards list with inline +/− controls
- **Transaction Log** — paginated, filterable history

### Interaction Flow
1. User enters name → controls unlock, name saved to `localStorage`
2. User selects location → inventory loads via `GET /api/inventory/:location`
3. User taps **+** or **−** → `POST /api/inventory/:location/adjust` with qty 1, card updates in-place (no page reload)
4. User taps qty number → inline input becomes editable; on blur/Enter the diff is calculated and sent as a single transaction
5. User taps **Log** → transaction view loads with location pre-filtered
6. User taps **⬇ Reorder** → browser downloads a CSV of all parts currently below par level

### Name Requirement
All adjust buttons and the location selector are disabled until a non-empty name is entered. The name banner is styled in amber until filled, then green. Name persists across sessions via `localStorage`.

### Negative Stock Prevention
The server rejects any subtract that would bring qty below 0 (HTTP 400). The UI shows a toast error and snaps the input back to the last known good value.

### Par Level Display
Each part card displays the par level value from `parts.csv` in a dedicated column between the description and the quantity controls. Cards where `quantity < par_level` (and `par_level > 0`) receive the `.below-par` CSS class: a red-tinted background with a solid red left border.

### Inventory Column Header
A sticky header row (`#parts-list-header`) sits above the parts list and labels the three columns: **Part # / Description**, **Par**, and **Shed QTY on Hand**. Column widths match the card grid exactly.

### Reorder CSV Export
The **⬇ Reorder** button (next to the sort controls) computes `quantity_needed = par_level − quantity` for every part below par and downloads a CSV named `reorder_<location>_<YYYY-MM-DD>.csv` with columns `part_number, description, quantity_needed`. A toast is shown if no parts are currently below par.

---

## Security Notes

- Path traversal prevented: location names are sanitized to `[a-zA-Z0-9 _-]` before use as filenames.
- No authentication (intentional — app is walled-garden LAN only).
- No user-supplied data is written to paths; all file paths are server-constructed.
- CSV fields are escaped on write to prevent injection into CSV parsers.

---

## Running the App

### Production (port 3030)
```bat
START.bat
```
Or manually:
```bash
npm install
node server.js
```
Server runs on port `3030` using `data/`. Users on the same network connect via `http://<machine-name>:3030`.

### Development (port 3031)
```bat
START-DEV.bat
```
Or manually:
```bash
set PORT=3031
set DATA_DIR=data-dev
node server.js
```
Server runs on port `3031` using `data-dev/`. Completely isolated from production — separate locations, transactions, and backups. `START-DEV.bat` automatically syncs `data/parts.csv` → `data-dev/parts.csv` on each launch so the part catalog stays current.

### Environment Variables
| Variable   | Default  | Description                        |
|------------|----------|------------------------------------|
| `PORT`     | `3030`   | HTTP port to listen on             |
| `DATA_DIR` | `data/`  | Path to data directory (relative to server.js or absolute) |

The startup log identifies the active environment:
```
InTracker [PRODUCTION] running at http://localhost:3030
InTracker [DEVELOPMENT] running at http://localhost:3031
```

---

## Extending the App

### Adding columns from parts.csv to the UI
`partsHeaders` is already available in state. The `getDescription()` helper in `app.js` can be extended to expose additional fields per card.

### Adding low-stock alerts
Par-level tracking is already implemented in the UI (below-par card highlighting and Reorder CSV export). A server-side threshold check could optionally be added to `/api/inventory/:location/adjust` to return a flag in the response without restructuring any data.

### Adding authentication
The `user` field in transactions is currently free-text. A session cookie or basic auth middleware can be dropped in front of Express with minimal changes to the existing code.

# InTracker — Project Memory

## What It Is
Web-based parts inventory tracker. Node.js + Express backend, vanilla JS frontend. CSV-only storage, no database. Mobile-first portrait layout.

## Location
`E:\intracker` — completely separate from E:\libitina and E:\tshooter.

## GitHub
`https://github.com/jgauthie001/InTracker`

## Stack
- Node.js + Express (port 3030)
- Vanilla HTML/CSS/JS (no framework, no build step)
- CSV files for all data

## Data Files
- `data/parts.csv` — master parts list, managed externally, read-only to app
- `data/locations/<Name>.csv` — one per location, created by app at qty 0 from parts.csv
- `data/transactions.csv` — append-only log, auto-created

## Key Design Decisions
- No auth — walled garden LAN, but requires free-text name entry before any action
- Name saved in localStorage so users don't retype every visit
- +/- buttons adjust by 1 immediately (no modal/confirmation)
- Qty display is an editable input — type a new number, blur sends the diff as a transaction
- Negative stock is blocked server-side (HTTP 400)
- Part number column auto-detected by regex in parts.csv (flexible column naming)

## API Routes
- GET /api/parts
- GET /api/locations
- POST /api/locations  (body: { name })
- GET /api/inventory/:location
- POST /api/inventory/:location/adjust  (body: { part_number, action, quantity, user })
- GET /api/transactions  (query: location, part_number, user, from, to, page, pageSize)

## Future Hooks Already Designed In
- Low-stock alerts: balance_after in every transaction row, just add threshold check
- Extra parts.csv columns: partsHeaders in state, getDescription() helper easy to extend
- Auth: user field in transactions is free-text today, swap for session middleware later

## Running
Double-click START.bat or: npm install && node server.js

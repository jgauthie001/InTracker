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
- Each part card shows par level in its own column; cards below par get red-tinted background + red left border
- Sticky column header row labels: Part # / Description | Par | Shed QTY on Hand
- ⬇ Reorder button downloads reorder_<location>_<date>.csv: part_number, description, quantity_needed (par − qty) for all below-par parts

## API Routes
- GET /api/parts
- GET /api/locations
- POST /api/locations  (body: { name })
- GET /api/inventory/:location
- POST /api/inventory/:location/adjust  (body: { part_number, action, quantity, user })
- GET /api/transactions  (query: location, part_number, user, from, to, page, pageSize)

## Future Hooks Already Designed In
- Extra parts.csv columns: partsHeaders in state, getDescription() helper easy to extend
- Auth: user field in transactions is free-text today, swap for session middleware later

## Running
- **Production:** Double-click START.bat → port 3030, data dir: data/
- **Development:** Double-click START-DEV.bat → port 3031, data dir: data-dev/
- Manual dev: `set PORT=3031 && set DATA_DIR=data-dev && node server.js`
- START-DEV.bat auto-syncs data/parts.csv → data-dev/parts.csv on each launch
- Startup log shows [PRODUCTION] or [DEVELOPMENT] and the active data path

# InTracker — Architecture Documentation

---

## Development Environment

Dev and production run from **completely separate folders**:

| Environment | Folder                      | Port | Data dir                           | Start script    |
|-------------|------------------------------|------|------------------------------------|-----------------|
| Development | `E:\intracker\`             | 3031 | `E:\intracker\data-dev\`          | `START-DEV.bat` |
| Production  | `E:\InTrackerDoNotTouch\`   | 3030 | `E:\InTrackerDoNotTouch\data\`    | `START.bat`     |

**Rules:**
- All dev work (edits to `server.js`, `public/`, etc.) happens in `E:\intracker\` only
- `E:\InTrackerDoNotTouch\` is **never edited directly** — only updated by running `DEPLOY.bat`
- `DEPLOY.bat` copies changed files from `E:\intracker\` → `E:\InTrackerDoNotTouch\` and pushes to GitHub
- After deploying, restart `START.bat` in `E:\InTrackerDoNotTouch\` to apply the changes
- Production data (`E:\InTrackerDoNotTouch\data\`) is never overwritten by deploy — only code and frontend files are copied

---

## Overview

InTracker is a lightweight, mobile-first web application for tracking parts inventory across multiple physical locations. Users can view stock levels, add or subtract quantities directly, manage on-order purchasing (PO) quantities, transfer parts between a location and a personal truck stock, and review a full transaction history — all from a browser with no installation required.

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
E:\intracker\                    ← DEV / SOURCE OF TRUTH (edit everything here)
├── server.js                    Express API server
├── package.json
├── START-DEV.bat                Dev launcher (port 3031, data-dev/)
├── DEPLOY.bat                   Run this to push to production
├── ARCHITECTURE.md              This file
├── Parts Dictionary.csv         Abbreviation→Term lookup
├── public/                      Frontend source (edit here during dev)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── data-dev/                    Dev data (gitignored)
    ├── parts.csv                Synced from InTrackerDoNotTouch\data\ on each launch
    └── locations/

E:\InTrackerDoNotTouch\          ← PRODUCTION (never edit directly)
├── server.js                    Copied here by DEPLOY.bat
├── package.json
├── node_modules/
├── START.bat                    Prod launcher (port 3030)
├── Parts Dictionary.csv
├── public/                      Copied here by DEPLOY.bat
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── data/                        Production data — never overwritten by deploy
    ├── parts.csv
    ├── transactions.csv
    ├── orders.csv
    ├── hidden_locations.json
    ├── backups/
    └── locations/
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

### `data/locations/truck_<user>.csv` — Personal Truck Inventory
Auto-created the first time a given username opens the Truck Stock view. Named `truck_<username_sanitized>.csv` (all non-alphanumeric chars replaced with `_`). Same schema as any other location CSV. Truck locations are hidden from the main location dropdown and only accessible via the **Truck** button.

### `data/transactions.csv` — Append-Only Transaction Log
Auto-created on first transaction.

| Column          | Notes                                                        |
|-----------------|--------------------------------------------------------------|
| `timestamp`     | ISO 8601 UTC                                                 |
| `user`          | Free-text name entered by user                               |
| `location`      | Location filename (underscores)                              |
| `part_number`   |                                                              |
| `action`        | `add`, `subtract`, `receive`, `transfer-out`, `transfer-in` |
| `quantity`      | Amount of this transaction                                   |
| `balance_after` | Resulting stock level at that location                       |

Transfer operations write **two rows** simultaneously — one `transfer-out` for the source and one `transfer-in` for the destination, sharing the same timestamp.

### `data/orders.csv` — On-Order Quantities
Auto-created on first use. Tracks how many units of each part are currently on order (pending delivery). Quantities are additive on upload — uploading a PO merges into existing totals. The file is sparse: only parts with qty > 0 are stored.

| Column               | Notes                         |
|----------------------|-------------------------------|
| `part_number`        |                               |
| `quantity_on_order`  | Integer > 0 (0 = not stored)  |

---

## API Endpoints

### Inventory & Locations

| Method | Path                                  | Description                                        |
|--------|---------------------------------------|----------------------------------------------------|
| GET    | `/api/parts`                          | Return all rows from parts.csv                     |
| GET    | `/api/locations`                      | List all location CSVs (excludes truck_ files)     |
| POST   | `/api/locations`                      | Create a new location CSV                          |
| POST   | `/api/locations/:name/hide`           | Hide a location from the dropdown                  |
| GET    | `/api/inventory/:location`            | Get inventory joined with parts data + on-order qty|
| POST   | `/api/inventory/:location/adjust`     | Add or subtract qty, log transaction               |
| GET    | `/api/transactions`                   | Paginated transaction log with filters             |

### POST `/api/inventory/:location/adjust` — Body
```json
{
  "part_number": "PN-001",
  "action": "add",
  "quantity": 5,
  "user": "Jane Smith"
}
```
Returns `{ part_number, quantity, on_order? }`. The `on_order` field is included when `action` is `"add"` and reflects the **updated** on-order quantity after automatic decrement (see [On-Order Auto-Decrement](#on-order-auto-decrement) below). Returns HTTP 400 if subtract would go below zero.

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

### On-Order (PO) Management

| Method | Path                               | Description                                                |
|--------|------------------------------------|------------------------------------------------------------|
| GET    | `/api/orders`                      | Returns `{ [part_number]: quantity_on_order }` map         |
| POST   | `/api/orders/upload`               | Merge a PO CSV into orders (detects part# and qty columns) |
| PUT    | `/api/orders/:partNumber`          | Manually set on-order qty for one part                     |
| POST   | `/api/orders/:partNumber/receive`  | Receive all on-order qty into a location                   |

#### POST `/api/orders/upload` — Body
```json
{ "csv": "part_number,quantity\nPN-001,10\nPN-002,5" }
```
Quantities are **additive** — uploading the same part twice across separate uploads accumulates the totals. Returns `{ merged, total }`.

#### POST `/api/orders/:partNumber/receive` — Body
```json
{ "location": "North_Shed", "user": "Jane Smith" }
```
Adds the full on-order quantity to the location's inventory, zeros the order entry, and logs a `receive` transaction. Returns `{ part_number, quantity, quantity_on_order: 0, received }`.

### Truck Stock

| Method | Path                    | Description                                                            |
|--------|-------------------------|------------------------------------------------------------------------|
| GET    | `/api/truck/:username`  | Return (and auto-create if needed) the truck location for this user    |

The truck location filename is `truck_<username>` with all non-alphanumeric characters replaced by `_`. If the file doesn't exist it is created and pre-populated with all parts at qty 0. Returns `{ location, created }`.

### Transfer

| Method | Path             | Description                                  |
|--------|------------------|----------------------------------------------|
| POST   | `/api/transfer`  | Atomically move qty between two locations    |

#### POST `/api/transfer` — Body
```json
{
  "from_location": "North_Shed",
  "to_location": "truck_Jane_Smith",
  "part_number": "PN-001",
  "quantity": 1,
  "user": "Jane Smith"
}
```
Returns `{ part_number, from: { location, quantity }, to: { location, quantity } }`. Fails with HTTP 400 if source doesn't have enough stock. Writes two transaction log rows (transfer-out and transfer-in).

---

## Frontend Architecture

Single-page app in `public/js/app.js`. No framework — plain JS modules via closure.

### State Object
```js
state = {
    user,            // Name entered by user (persisted in localStorage)
    location,        // Currently selected location (filename, underscores)
    inventory,       // Array of part objects for current location (main view)
    partsHeaders,    // Column headers from parts.csv
    txnPage, txnPageSize, txnTotal,
    txnUserFilter, txnPartFilter,
    isTruckMode,     // true while Truck Transfer view is active
    truckLocation,   // filename of current user's truck CSV (e.g. "truck_Jane_Smith")
    locInventory,    // copy of location inventory used during truck transfer view
    truckInventory,  // copy of truck inventory used during truck transfer view
    hideOrder,       // true = On Order column hidden (default); false = PO Entry mode active
}
```

**`state.hideOrder` note:** The name is intentionally "hide order" — `true` means the column is hidden (normal mode), `false` means it is shown (PO Entry mode active). This is the opposite of an "is PO mode on" flag; think of it as a visibility suppressor.

**`state.locInventory` / `state.truckInventory` note:** These are separate arrays from `state.inventory`. They are populated only while the Truck Transfer view (`#view-truck`) is active and hold snapshots of both sides of the transfer. They are cleared when leaving the truck view so the main inventory view re-fetches cleanly.

### Views
Four views toggled via `showView()` (removes `.active` from all, adds to target):
- **Splash** (`#view-splash`) — shown when no name or no location selected
- **Inventory** (`#view-inventory`) — part cards list with inline +/− controls
- **Transaction Log** (`#view-transactions`) — paginated, filterable history
- **Truck Transfer** (`#view-truck`) — side-by-side location vs truck inventory

### Interaction Flow
1. User enters name → controls unlock, name saved to `localStorage`, `scheduleTruckDropdown()` fires
2. User selects location → inventory loads via `GET /api/inventory/:location`
3. User taps **+** or **−** → `POST /api/inventory/:location/adjust` with qty 1, card updates in-place (no page reload). If the part had on-order qty, the On Order display also updates live.
4. User taps qty number → inline input becomes editable; on blur/Enter the diff is calculated and sent as a single transaction
5. User taps **Log** → transaction view loads with location pre-filtered
6. User taps **⬇ Reorder** → browser downloads a CSV of all parts currently below par level
7. User taps **Truck** button → `loadTruckView()` fetches both inventories in parallel and shows `#view-truck`
8. User taps **InTracker** title → enters PO Entry mode (shows On Order column, Upload PO button, Reorder CSV, Loc Info, and Rec Parts buttons)
9. User taps **✎ Loc Info** → opens modal to edit location header fields used in reorder CSV export
10. User taps **⬆ Rec Parts** → opens a CSV file picker; uploaded CSV quantities are added directly to shed stock

### Name Requirement
All adjust buttons and the location selector are disabled until a non-empty name is entered. The name banner is styled in amber until filled, then green. Name persists across sessions via `localStorage`.

### Negative Stock Prevention
The server rejects any subtract that would bring qty below 0 (HTTP 400). The UI shows a toast error and snaps the input back to the last known good value.

### Par Level Display
Each part card displays the par level value from `parts.csv` in a dedicated column between the description and the quantity controls. Cards where `quantity < par_level` (and `par_level > 0`) receive the `.below-par` CSS class: a red-tinted background with a solid red left border.

### Inventory Column Header
A sticky header row (`#parts-list-header`) sits above the parts list and labels the three columns: **Part # / Description**, **Par**, and **Shed QTY on Hand** (or **Truck QTY** when viewing a truck location). Column widths match the card grid exactly.

### Reorder CSV Export
The **⬇ Reorder CSV** button (in `#po-action-bar`, visible only in PO Entry mode) computes `quantity_needed = par_level − quantity` for every part below par and downloads a CSV named `reorder_<location>_<YYYY-MM-DD>.csv` with columns `part_number, description, quantity_needed`. A toast is shown if no parts are currently below par.

The CSV header rows include location metadata from `localStorage['intracker_loc_info']` — fields like CC#, Deliver To, Location Name, Address, Street, City, State, and Zip. These fields are edited via the **✎ Loc Info** modal.

### Loc Info Modal
The **✎ Loc Info** button (in `#po-action-bar`, visible only in PO Entry mode) opens `#modal-loc-info`, allowing the user to edit 8 location header fields stored per-location in `localStorage['intracker_loc_info']`:

| Field         | localStorage key  | Description                        |
|---------------|-------------------|---------------------------------||
| CC#           | `cc`              | Cost center number                 |
| Deliver To    | `shed`            | Shed / building name               |
| Location Name | `locationName`    | Display name for CSV header        |
| Address       | `address`         |                                    |
| Street        | `street`          |                                    |
| City          | `city`            |                                    |
| State         | `state`           |                                    |
| Zip           | `zip`             |                                    |

`getLocInfo(locName)` reads from `localStorage['intracker_loc_info'][locName]`. `setLocInfo(locName, info)` writes to the same key.

---

## PO Entry Mode

The **On Order** column is hidden by default. It tracks how many units of a part are currently on order (pending delivery) as a separate management tool from live stock.

### Toggling PO Entry Mode
- **Enter:** Tap the **InTracker** title in the header → `state.hideOrder = false` → On Order column appears, Upload PO button appears, red **Exit PO Entry** button appears in header, and the `#po-action-bar` (Reorder CSV + Loc Info buttons) appears.
- **Exit:** Tap **Exit PO Entry** → `state.hideOrder = true` → column, PO action bar, and Upload PO button disappear.

The `applyOrderVisibility()` function manages this. It also enforces that the On Order column and PO action bar are **always hidden for truck locations** regardless of `hideOrder`:

```js
function applyOrderVisibility() {
    const hide = state.hideOrder || activeLocation().startsWith('truck_');
    viewInventory.classList.toggle('order-hidden', hide);
    btnExitPo.classList.toggle('hidden', state.hideOrder);
    const poBar = document.getElementById('po-action-bar');
    if (poBar) poBar.classList.toggle('hidden', state.hideOrder || state.isTruckMode);
    const hdr = document.getElementById('parts-list-header');
    if (hdr) hdr.title = state.hideOrder ? '' : 'Click to rename this location';
}
```

The `.order-hidden` CSS class on `#view-inventory` hides the column header and each card's `.part-order` cell in one step.

### PO Action Bar (`#po-action-bar`)
A `div` below `#filter-sort-bar` containing three buttons only visible in PO Entry mode:
- **↓ Reorder CSV** — downloads reorder CSV for parts below par
- **✎ Loc Info** — opens the Loc Info modal
- **⬆ Rec Parts** — opens a CSV file picker to bulk-receive parts into shed stock

The bar is hidden by default via `.po-action-bar.hidden` and shown/hidden as a unit by `applyOrderVisibility()`. It is always hidden in truck mode.

### On-Order Auto-Decrement
When stock is added via `POST /api/inventory/:location/adjust` with `action: "add"`, the server automatically checks `orders.csv` for an existing on-order quantity for that part. If one exists, it decrements by the received amount (floored at 0) and writes the updated `orders.csv`. The new on-order value is returned as `on_order` in the response, and the UI updates the card's On Order display live without a page reload.

This means: receiving stock physically also reduces the "on order" count automatically — the technician doesn't need to remember to clear it separately.

### Uploading a PO CSV
The **Upload PO** button (visible in PO Entry mode) accepts a CSV file with any column layout. The server detects the part number and quantity columns by header name patterns (`part.?num`, `qty`, etc.) and **merges** the quantities into `orders.csv` additively. Uploading does not replace existing orders; it adds to them.

### Receiving On-Order Parts
Each part card that has a non-zero On Order quantity shows a **Rcv** button. Tapping it calls `POST /api/orders/:partNumber/receive` with the current location and user. The server:
1. Adds the full on-order quantity to the location's inventory
2. Zeroes the order entry in `orders.csv`
3. Logs a `receive` transaction in `transactions.csv`

### Bulk Receive CSV (`⬆ Rec Parts`)
The **⬆ Rec Parts** button (in `#po-action-bar`) opens a CSV file picker. The uploaded CSV is sent to `POST /api/inventory/:location/bulk-receive`. The server:
1. Detects part number and quantity columns by header name patterns (same as Upload PO)
2. Reads the current location CSV once, applies all additions in a single pass, writes once
3. Logs each part as an `add` transaction (same action type as manual +)
4. Decrements on-order quantities in `orders.csv` for all received parts (floored at 0)
5. Returns `{ received: N, skipped: N }` — skipped = part number not found in this location

The UI toasts the result (`"Received: 3 parts added"` or `"Received: 3 parts added, 2 not found"`) and reloads the inventory from the server.

---

## Truck Transfer View

The Truck Transfer view (`#view-truck`) allows a technician to move parts between a shed/location and their personal truck stock without switching back and forth between location views.

### How It Works
1. User must have a name entered and a non-truck location selected.
2. Tapping **Truck** calls `loadTruckView()`, which fires two parallel fetches:
   - `GET /api/inventory/<current_location>` → stored in `state.locInventory`
   - `GET /api/inventory/<truck_location>` → stored in `state.truckInventory`
3. `renderTruckView()` builds a card for every part, showing:
   - Location quantity (blue-tinted cell, read-only)
   - Arrow buttons (↓ to truck, ↑ to location)
   - Truck quantity (amber-tinted, editable number input)
4. Tapping an arrow button calls `POST /api/transfer` with qty 1.
5. Editing the truck quantity input directly calls `POST /api/inventory/<truck>/adjust`.

### Truck Location Auto-Creation
The first time a user accesses the Truck view, `GET /api/truck/:username` is called. If no `truck_<user>.csv` exists, the server creates it and pre-populates it with all parts at qty 0. The truck filename uses the username with all non-alphanumeric characters replaced by underscores.

### Truck Dropdown (Lazy Loading)
The truck location does **not** appear in the main location dropdown by default. After the user enters their name, `scheduleTruckDropdown()` waits 600ms (debounce to avoid firing on partial name entry) then calls `GET /api/truck/:username`. If successful, it injects a single `<option data-truck="1">🚛 My Truck</option>` entry into the location `<select>`. This option is replaced or removed as the username changes.

**Important:** The truck option in the dropdown is just a shortcut to view the truck inventory directly in the inventory view (read-only mode). The full **Truck Transfer** side-by-side view is only accessible via the **Truck** button, which requires a non-truck location to be selected.

### State During Transfer View
`state.locInventory` and `state.truckInventory` are populated when the truck view loads and kept in sync as transfer and adjust operations complete. They are **NOT** the same as `state.inventory`. When the user taps **← Back** to leave the truck view:
- `state.isTruckMode` is set to `false`
- `state.truckLocation` is cleared
- Both arrays are cleared
- The main inventory view reloads from the server

---

## Security Notes

- Path traversal prevented: location names are sanitized to `[a-zA-Z0-9 _-]` before use as filenames.
- Truck location names are further constrained: `truck_` prefix + alphanumeric-only sanitized username.
- No authentication (intentional — app is walled-garden LAN only).
- No user-supplied data is written to paths; all file paths are server-constructed.
- CSV fields are escaped on write to prevent injection into CSV parsers.
- Transfer endpoint validates source > 0 stock before writing either file; both files are written sequentially but no database transaction is used (power failure between writes is a known limitation of the CSV-only design).

---

## Backup System

InTracker performs automatic nightly backups of all operational data files.

### Backup Schedule & Scope
- **Frequency:** Every night at midnight UTC (scheduled on server startup)
- **Location:** `data/backups/YYYY-MM-DD/` — one timestamped folder per day
- **Files backed up:**
  - `parts.csv` — master parts list
  - `transactions.csv` — transaction log
  - `locations/` subdirectory — all location inventory CSV files (excluding truck_ locations)
  - `orders/` subdirectory — all PO/on-order CSV files (if orders dir exists)
- **Files NOT backed up:**
  - `truck_*.csv` files (personal inventory, not operational data)
  - `data/hidden_locations.json`
  - `data/city_groups.json`
  - `data/upload-history/` (metadata only)

### Backup Directory Structure
The backup preserves the source directory structure to avoid file-naming collisions:

```
data/backups/2026-05-27/
├── parts.csv                    (root-level backup)
├── transactions.csv             (root-level backup)
├── locations/                   (separate subdirectory)
│   ├── Houston_-_Ferrini.csv    (location inventory snapshot)
│   ├── Katy_-_Moreno.csv
│   └── Pearland_-_Mullich.csv
└── orders/                      (separate subdirectory)
    ├── Houston_-_Ferrini.csv    (on-order quantities snapshot)
    ├── Katy_-_Moreno.csv
    └── Pearland_-_Mullich.csv
```

**Why subdirectories:** Location CSVs and order CSVs can have identical filenames (e.g., both `Houston_-_Ferrini.csv`). Without separation, one file would overwrite the other during backup. Subdirectories ensure all files are preserved correctly.

### Idempotent Design
The backup function checks if today's backup folder already exists before running. If it does, the backup is skipped. This prevents duplicate backups if the server restarts after midnight or if the backup process is manually triggered multiple times.

### Restore Process
To restore from a backup:
1. Locate the desired backup folder: `data/backups/YYYY-MM-DD/`
2. Stop the server
3. Copy the backed-up files to their original locations:
   - Root files: Copy `parts.csv` and `transactions.csv` to `data/`
   - Location CSVs: Copy `locations/*` to `data/locations/`
   - Order CSVs: Copy `orders/*` to `data/orders/`
4. Restart the server

Example with PowerShell:
```powershell
# Copy root files
Copy-Item "data/backups/2026-05-25/parts.csv" "data/parts.csv" -Force
Copy-Item "data/backups/2026-05-25/transactions.csv" "data/transactions.csv" -Force

# Copy location inventory
Copy-Item "data/backups/2026-05-25/locations/*" "data/locations/" -Force -Recurse

# Copy on-order data (if restoring orders)
Copy-Item "data/backups/2026-05-25/orders/*" "data/orders/" -Force -Recurse
```

---

## On-Order Quantity System

On-order quantities track purchased parts currently in transit or pending delivery. This management layer is separate from live stock.

### Storage & Format
- **File:** `data/orders.csv` (auto-created on first use)
- **Schema:** `part_number, quantity_on_order`
- **Sparsity:** Only parts with `quantity_on_order > 0` are stored. A missing part number means 0 is on order.
- **Blank entries (0 qty):** Not written to file; they are implicitly removed

### Upload PO (Additive Merge)
When a PO CSV is uploaded via **Upload PO** button (in PO Entry mode):
1. Server detects part number and quantity columns by regex patterns (`part.?num`, `qty`, etc.)
2. Quantities are **additively merged** into `orders.csv` — uploading the same part twice across multiple uploads **accumulates** the totals
3. Example: If part PN-001 has qty_on_order=10, uploading a PO with PN-001=5 results in qty_on_order=15
4. Returns `{ merged: N, total: M }` where merged is parts processed and total is cumulative on-order sum

### Auto-Decrement on Receipt
When stock is received and added to a location inventory via `POST /api/inventory/:location/adjust` with `action: "add"`:
1. Server checks if that part has an on-order entry in `orders.csv`
2. If yes: decrements by the received amount (floored at 0, never goes negative)
3. Updates `orders.csv` and returns the new on-order value in the response (`on_order` field)
4. Frontend updates the On Order display live without a page reload
5. **Example:** Ordered 10 units of PN-001. Receive 3 units. On-order auto-decrements to 7. Receive final 7 units. On-order goes to 0 and is removed from CSV.

### Receiving All On-Order Qty
Each part card with a non-zero On Order quantity displays an **Rcv** button. Tapping it calls `POST /api/orders/:partNumber/receive`:
1. Adds the full on-order quantity to the location's current inventory
2. Logs a `receive` transaction in `transactions.csv`
3. Zeros the on-order entry (removes it from `orders.csv`)
4. Returns `{ part_number, quantity: new_total, quantity_on_order: 0, received: amount_added }`
5. Frontend updates card in place and removes the Rcv button

### Bulk Receive CSV (`⬆ Rec Parts`)
The **⬆ Rec Parts** button opens a CSV file picker for batch receiving. The uploaded CSV is sent to `POST /api/inventory/:location/bulk-receive`:
1. Server detects part number and quantity columns by regex
2. Reads location CSV once, applies all received parts in a single pass, writes once (performance)
3. For each received part: logs an `add` transaction, decrements on-order by received amount (floored at 0)
4. Returns `{ received: N, skipped: M }` where received=parts found and added, skipped=parts not in this location's CSV
5. UI toasts the result: `"Received: 3 parts added"` or `"Received: 3 parts added, 2 not found"`

### Display & User Interface
- **On Order column:** Hidden by default; visible only in PO Entry mode (activated by clicking **InTracker** title)
- **On Order value:** Shown as a number, colored amber if non-zero
- **Rcv button:** Only appears when `quantity_on_order > 0`
- **Always hidden on truck locations:** Even in PO Entry mode, the On Order column is not shown for truck_ locations (intentional—truck is personal stock, not tied to corporate PO workflow)

### Par Level vs. On-Order
- **Par level:** Desired stock quantity for normal operations (separate concept)
- **On-order quantity:** Additional units in transit, not yet received
- **Reorder logic:** Reorder CSV shows `quantity_needed = par_level − current_quantity` for all below-par parts. This is a user-facing suggestion; on-order quantities can be uploaded separately and managed independently.

---

## Running the App

Dev runs from `E:\intracker\`. Production runs from `E:\InTrackerDoNotTouch\`.
To push changes to prod, run `DEPLOY.bat` in `E:\intracker\`, then restart the prod server.

### Production (port 3030)
```bat
E:\InTrackerDoNotTouch\START.bat
```
Runs on port `3030` using `E:\InTrackerDoNotTouch\data\`. Users on the network connect via `http://<machine-name>:3030`.

### Development (port 3031)
```bat
E:\intracker\START-DEV.bat
```
Runs on port `3031` using `E:\intracker\data-dev\`. Completely isolated from production — separate data, locations, transactions, and backups. `START-DEV.bat` automatically syncs `parts.csv` from `E:\InTrackerDoNotTouch\data\` on each launch so the part catalog stays current.

Changes to `server.js` or frontend files in `public/` are picked up immediately by the dev server (no restart needed for frontend). Restart `START-DEV.bat` after `server.js` changes.

### Deploying to Production
```bat
E:\intracker\DEPLOY.bat
```
Copies `server.js`, `public/`, `package.json`, and `Parts Dictionary.csv` to `E:\InTrackerDoNotTouch\`. Does **not** touch `E:\InTrackerDoNotTouch\data\`. Also commits and pushes to GitHub. After running, restart `START.bat` in `E:\InTrackerDoNotTouch\` to apply changes.

### Environment Variables
| Variable   | Default  | Description                        |
|------------|----------|------------------------------------|
| `PORT`     | `3030`   | HTTP port to listen on             |
| `DATA_DIR` | `data/`  | Path to data directory (relative to server.js or absolute) |
### Caching
`server.js` serves `index.html` (for both `GET /` and `GET /index.html`) with `Cache-Control: no-store, must-revalidate` so browsers always fetch the latest HTML. CSS and JS assets use query-string cache-busting (`?v=YYYYMMDD`) so they are re-fetched when the version string is bumped.
The startup log identifies the active environment:
```
InTracker [PRODUCTION] running at http://localhost:3030
InTracker [DEVELOPMENT] running at http://localhost:3031
```

---

## Extending the App

### Updating the Cache-Bust Version
When `public/css/style.css` or `public/js/app.js` are changed, bump the version string in `public/index.html`:
```html
<link rel="stylesheet" href="css/style.css?v=20260509">
<script src="js/app.js?v=20260509"></script>
```
Change both to today's date (or any string that differs from the previous value).

### Adding columns from parts.csv to the UI
`partsHeaders` is already available in state. The `getDescription()` helper in `app.js` can be extended to expose additional fields per card.

### Adding low-stock alerts
Par-level tracking is already implemented in the UI (below-par card highlighting and Reorder CSV export). A server-side threshold check could optionally be added to `/api/inventory/:location/adjust` to return a flag in the response without restructuring any data.

### Adding authentication
The `user` field in transactions is currently free-text. A session cookie or basic auth middleware can be dropped in front of Express with minimal changes to the existing code.

### Adding multi-unit transfers
The Truck Transfer view currently transfers 1 unit at a time via the arrow buttons. `POST /api/transfer` already accepts any `quantity` value — the UI restriction is intentional for mobile tap-friendliness. The truck qty input can also be edited directly to set an arbitrary quantity.

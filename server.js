/**
 * InTracker Server
 * Express.js server for inventory tracking via CSV files
 */

const express = require('express');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3030;
const DATA_DIR = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(__dirname, 'data');
const LOCATIONS_DIR = path.join(DATA_DIR, 'locations');
const PARTS_FILE = path.join(DATA_DIR, 'parts.csv');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.csv');
const HIDDEN_FILE    = path.join(DATA_DIR, 'hidden_locations.json');
const BACKUPS_DIR    = path.join(DATA_DIR, 'backups');
const ORDERS_FILE    = path.join(DATA_DIR, 'orders.csv');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── CSV Helpers ─────────────────────────────────────────────────────────────

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
        const values = splitCSVLine(line);
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (values[i] || '').trim(); });
        return obj;
    });
    return { headers, rows };
}

function splitCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

function rowsToCSV(headers, rows) {
    const escape = val => {
        const s = String(val ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headerLine = headers.map(escape).join(',');
    const dataLines = rows.map(row => headers.map(h => escape(row[h] ?? '')).join(','));
    return [headerLine, ...dataLines].join('\n');
}

async function ensureTransactionsFile() {
    try {
        await fsp.access(TRANSACTIONS_FILE);
    } catch {
        await fsp.writeFile(TRANSACTIONS_FILE, 'timestamp,user,location,part_number,action,quantity,balance_after\n', 'utf8');
    }
}

async function ensureOrdersFile() {
    try {
        await fsp.access(ORDERS_FILE);
    } catch {
        await fsp.writeFile(ORDERS_FILE, 'part_number,quantity_on_order\n', 'utf8');
    }
}

async function getHiddenLocations() {
    try {
        return JSON.parse(await fsp.readFile(HIDDEN_FILE, 'utf8'));
    } catch { return []; }
}

async function addHiddenLocation(name) {
    const hidden = await getHiddenLocations();
    if (!hidden.includes(name)) {
        hidden.push(name);
        await fsp.writeFile(HIDDEN_FILE, JSON.stringify(hidden), 'utf8');
    }
}

async function runDailyBackup() {
    const today = new Date().toISOString().slice(0, 10);
    const backupDir = path.join(BACKUPS_DIR, today);
    try { await fsp.access(backupDir); return; } catch { /* proceed */ }
    await fsp.mkdir(backupDir, { recursive: true });
    const filesToBackup = [];
    try { await fsp.access(PARTS_FILE);        filesToBackup.push(PARTS_FILE);        } catch {}
    try { await fsp.access(TRANSACTIONS_FILE); filesToBackup.push(TRANSACTIONS_FILE); } catch {}
    try {
        const locFiles = await fsp.readdir(LOCATIONS_DIR);
        locFiles.filter(f => f.endsWith('.csv')).forEach(f => filesToBackup.push(path.join(LOCATIONS_DIR, f)));
    } catch {}
    for (const file of filesToBackup) {
        try { await fsp.copyFile(file, path.join(backupDir, path.basename(file))); } catch {}
    }
    console.log(`[InTracker] Backup completed: ${today}`);
}

// ─── API: Parts ───────────────────────────────────────────────────────────────

app.get('/api/parts', async (req, res) => {
    try {
        const text = await fsp.readFile(PARTS_FILE, 'utf8');
        const { headers, rows } = parseCSV(text);
        res.json({ headers, rows });
    } catch (err) {
        if (err.code === 'ENOENT') return res.status(404).json({ error: 'parts.csv not found' });
        res.status(500).json({ error: err.message });
    }
});

// ─── API: Parts Dictionary ────────────────────────────────────────────────────

app.get('/api/parts-dictionary', async (req, res) => {
    try {
        const dictFile = path.join(__dirname, 'Parts Dictionary.csv');
        const text = await fsp.readFile(dictFile, 'utf8');
        const { rows } = parseCSV(text);
        const result = rows
            .filter(r => r.Abbreviation && r.Term)
            .map(r => ({ abbreviation: r.Abbreviation.trim(), term: r.Term.trim() }))
            .sort((a, b) => a.term.localeCompare(b.term));
        res.json(result);
    } catch (err) {
        if (err.code === 'ENOENT') return res.json([]); // no file = empty list
        res.status(500).json({ error: err.message });
    }
});

// ─── API: Locations ───────────────────────────────────────────────────────────

app.get('/api/locations', async (req, res) => {
    try {
        await fsp.mkdir(LOCATIONS_DIR, { recursive: true });
        const files = await fsp.readdir(LOCATIONS_DIR);
        const hidden = await getHiddenLocations();
        const locations = files
            .filter(f => f.endsWith('.csv'))
            .map(f => f.replace('.csv', ''))
            .filter(name => !hidden.includes(name) && !name.startsWith('truck_'));
        res.json(locations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/locations/:name/hide', async (req, res) => {
    try {
        const safe = req.params.name.replace(/[^a-zA-Z0-9_\-]/g, '');
        if (!safe) return res.status(400).json({ error: 'Invalid location name' });
        await addHiddenLocation(safe);
        res.json({ hidden: safe });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/locations/:name/rename', async (req, res) => {
    try {
        const oldSafe = req.params.name.replace(/[^a-zA-Z0-9_\-]/g, '');
        if (!oldSafe) return res.status(400).json({ error: 'Invalid location name' });

        const { newName } = req.body;
        if (!newName || !newName.trim()) return res.status(400).json({ error: 'New name required' });
        const newSafe = newName.trim().replace(/[^a-zA-Z0-9 _\-]/g, '').replace(/\s+/g, '_');
        if (!newSafe) return res.status(400).json({ error: 'Invalid new location name' });
        if (newSafe === oldSafe) return res.status(400).json({ error: 'New name is the same as the current name' });

        const oldFile = path.join(LOCATIONS_DIR, `${oldSafe}.csv`);
        const newFile = path.join(LOCATIONS_DIR, `${newSafe}.csv`);

        try { await fsp.access(oldFile); } catch {
            return res.status(404).json({ error: 'Location not found' });
        }
        try {
            await fsp.access(newFile);
            return res.status(409).json({ error: 'A location with that name already exists' });
        } catch { /* good, doesn't exist */ }

        await fsp.rename(oldFile, newFile);

        // Update all past transaction records that reference the old location name
        await ensureTransactionsFile();
        const txText = await fsp.readFile(TRANSACTIONS_FILE, 'utf8');
        const { headers: txHeaders, rows: txRows } = parseCSV(txText);
        const locationCol = txHeaders.indexOf('location');
        if (locationCol !== -1) {
            let changed = false;
            txRows.forEach(row => {
                if (row.location === oldSafe) { row.location = newSafe; changed = true; }
            });
            if (changed) {
                await fsp.writeFile(TRANSACTIONS_FILE, rowsToCSV(txHeaders, txRows), 'utf8');
            }
        }

        // Log the rename itself
        const { user } = req.body;
        const ts = new Date().toISOString();
        await fsp.appendFile(TRANSACTIONS_FILE,
            `\n${ts},${escapeCSVField((user || '').trim())},${escapeCSVField(newSafe)},${escapeCSVField(newSafe)},rename_location,0,0`,
            'utf8');

        res.json({ oldName: oldSafe, newName: newSafe });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/locations', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Location name required' });

        // Sanitize: allow alphanumeric, spaces, underscores, hyphens only
        const safe = name.trim().replace(/[^a-zA-Z0-9 _\-]/g, '').replace(/\s+/g, '_');
        if (!safe) return res.status(400).json({ error: 'Invalid location name' });

        const locFile = path.join(LOCATIONS_DIR, `${safe}.csv`);
        try {
            await fsp.access(locFile);
            return res.status(409).json({ error: 'Location already exists' });
        } catch { /* doesn't exist, proceed */ }

        // Build the new location CSV pre-populated from parts.csv at qty 0
        let csvContent = 'part_number,quantity\n';
        try {
            const partsText = await fsp.readFile(PARTS_FILE, 'utf8');
            const { headers, rows } = parseCSV(partsText);
            // Detect the part number column (flexible name matching)
            const pnCol = headers.find(h => /part.?num|part.?no|partno|pn\b/i.test(h)) || headers[0];
            rows.forEach(row => {
                const pn = row[pnCol] || '';
                if (pn) csvContent += `${pn},0\n`;
            });
        } catch { /* parts.csv missing — create empty location */ }

        await fsp.writeFile(locFile, csvContent, 'utf8');
        res.json({ name: safe });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── API: Inventory ───────────────────────────────────────────────────────────

app.get('/api/inventory/:location', async (req, res) => {
    try {
        const safe = req.params.location.replace(/[^a-zA-Z0-9_\-]/g, '');
        const locFile = path.join(LOCATIONS_DIR, `${safe}.csv`);
        const invText = await fsp.readFile(locFile, 'utf8');
        const { rows: invRows } = parseCSV(invText);

        // Build a qty map
        const qtyMap = {};
        invRows.forEach(r => { qtyMap[r.part_number] = parseInt(r.quantity, 10) || 0; });

        // Join with parts for description and extra fields
        let partsHeaders = [];
        let partsMap = {};
        let partsPnList = [];
        try {
            const partsText = await fsp.readFile(PARTS_FILE, 'utf8');
            const { headers, rows } = parseCSV(partsText);
            partsHeaders = headers;
            const pnCol = headers.find(h => /part.?num|part.?no|partno|pn\b/i.test(h)) || headers[0];
            rows.forEach(row => {
                const pn = row[pnCol];
                if (pn) { partsMap[pn] = row; partsPnList.push(pn); }
            });
        } catch { /* no parts file */ }

        let locationDirty = false;

        // Add new parts from parts.csv not yet in this location (at qty 0)
        for (const pn of partsPnList) {
            if (!(pn in qtyMap)) {
                qtyMap[pn] = 0;
                locationDirty = true;
            }
        }

        // Remove parts not in parts.csv that have qty 0 (obsolete zero-stock rows)
        for (const pn of Object.keys(qtyMap)) {
            if (!partsMap[pn] && qtyMap[pn] === 0) {
                delete qtyMap[pn];
                locationDirty = true;
            }
        }

        // Persist the updated location CSV if anything changed
        if (locationDirty && partsPnList.length > 0) {
            const updatedRows = partsPnList
                .filter(pn => pn in qtyMap)
                .map(pn => ({ part_number: pn, quantity: qtyMap[pn] }));
            // Also keep any rows not in parts.csv that still have qty (preserve unknown parts with stock)
            for (const pn of Object.keys(qtyMap)) {
                if (!partsMap[pn] && qtyMap[pn] > 0) {
                    updatedRows.push({ part_number: pn, quantity: qtyMap[pn] });
                }
            }
            await fsp.writeFile(locFile, rowsToCSV(['part_number', 'quantity'], updatedRows), 'utf8');
        }

        // Build response — preserve parts.csv order, unknown-but-stocked parts at end
        const orderedPns = [
            ...partsPnList.filter(pn => pn in qtyMap),
            ...Object.keys(qtyMap).filter(pn => !partsMap[pn])
        ];

        // Load on-order quantities
        let ordersMap = {};
        try {
            await ensureOrdersFile();
            const ordersText = await fsp.readFile(ORDERS_FILE, 'utf8');
            const { rows: orderRows } = parseCSV(ordersText);
            orderRows.forEach(r => { ordersMap[r.part_number] = parseInt(r.quantity_on_order, 10) || 0; });
        } catch { /* no orders file yet */ }

        const inventory = orderedPns.map(pn => ({
            part_number: pn,
            quantity: qtyMap[pn],
            on_order: ordersMap[pn] || 0,
            ...(partsMap[pn] || {})
        }));

        res.json({ inventory, partsHeaders });
    } catch (err) {
        if (err.code === 'ENOENT') return res.status(404).json({ error: 'Location not found' });
        res.status(500).json({ error: err.message });
    }
});

// ─── API: Adjust Inventory ────────────────────────────────────────────────────

app.post('/api/inventory/:location/adjust', async (req, res) => {
    try {
        const safe = req.params.location.replace(/[^a-zA-Z0-9_\-]/g, '');
        const { part_number, action, quantity, user } = req.body;

        if (!user || !user.trim()) return res.status(400).json({ error: 'User name required' });
        if (!part_number) return res.status(400).json({ error: 'Part number required' });
        if (!['add', 'subtract'].includes(action)) return res.status(400).json({ error: 'Action must be add or subtract' });
        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Quantity must be a positive integer' });

        const locFile = path.join(LOCATIONS_DIR, `${safe}.csv`);
        const invText = await fsp.readFile(locFile, 'utf8');
        const { headers, rows } = parseCSV(invText);

        const rowIdx = rows.findIndex(r => r.part_number === part_number);
        if (rowIdx === -1) return res.status(404).json({ error: 'Part not found in this location' });

        const current = parseInt(rows[rowIdx].quantity, 10) || 0;
        let newQty;
        if (action === 'add') {
            newQty = current + qty;
        } else {
            if (current - qty < 0) {
                return res.status(400).json({ error: `Cannot subtract ${qty} from current stock of ${current}` });
            }
            newQty = current - qty;
        }

        rows[rowIdx].quantity = newQty;
        const allHeaders = headers.length ? headers : ['part_number', 'quantity'];
        await fsp.writeFile(locFile, rowsToCSV(allHeaders, rows), 'utf8');

        // Append to transaction log
        await ensureTransactionsFile();
        const ts = new Date().toISOString();
        const logLine = `\n${ts},${escapeCSVField(user.trim())},${escapeCSVField(safe)},${escapeCSVField(part_number)},${action},${qty},${newQty}`;
        await fsp.appendFile(TRANSACTIONS_FILE, logLine, 'utf8');

        // When adding stock, reduce on-order quantity accordingly
        let newOnOrder = undefined;
        if (action === 'add') {
            try {
                await ensureOrdersFile();
                const ordersText = await fsp.readFile(ORDERS_FILE, 'utf8');
                const { rows: orderRows } = parseCSV(ordersText);
                const orderMap = {};
                orderRows.forEach(r => { orderMap[r.part_number] = parseInt(r.quantity_on_order, 10) || 0; });
                const onOrder = orderMap[part_number] || 0;
                if (onOrder > 0) {
                    orderMap[part_number] = Math.max(0, onOrder - qty);
                    newOnOrder = orderMap[part_number];
                    const newOrderRows = Object.entries(orderMap)
                        .filter(([, q]) => q > 0)
                        .map(([p, q]) => ({ part_number: p, quantity_on_order: q }));
                    await fsp.writeFile(ORDERS_FILE, rowsToCSV(['part_number', 'quantity_on_order'], newOrderRows), 'utf8');
                } else {
                    newOnOrder = 0;
                }
            } catch { /* orders file not available */ }
        }

        res.json({ part_number, quantity: newQty, ...(newOnOrder !== undefined ? { on_order: newOnOrder } : {}) });
    } catch (err) {
        if (err.code === 'ENOENT') return res.status(404).json({ error: 'Location not found' });
        res.status(500).json({ error: err.message });
    }
});

function escapeCSVField(val) {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
}

// ─── API: Transactions ────────────────────────────────────────────────────────

app.get('/api/transactions', async (req, res) => {
    try {
        await ensureTransactionsFile();
        const text = await fsp.readFile(TRANSACTIONS_FILE, 'utf8');
        const { headers, rows } = parseCSV(text);

        let filtered = rows;
        if (req.query.location) filtered = filtered.filter(r => r.location === req.query.location);
        if (req.query.part_number) filtered = filtered.filter(r => r.part_number === req.query.part_number);
        if (req.query.user) filtered = filtered.filter(r => r.user.toLowerCase().includes(req.query.user.toLowerCase()));
        if (req.query.from) filtered = filtered.filter(r => r.timestamp >= req.query.from);
        if (req.query.to) filtered = filtered.filter(r => r.timestamp <= req.query.to);

        // Return newest first
        filtered.reverse();

        const page = parseInt(req.query.page, 10) || 1;
        const pageSize = parseInt(req.query.pageSize, 10) || 50;
        const total = filtered.length;
        const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

        res.json({ total, page, pageSize, rows: paged });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── API: Orders ─────────────────────────────────────────────────────────────

// GET /api/orders — returns { part_number: qty_on_order } map
app.get('/api/orders', async (req, res) => {
    try {
        await ensureOrdersFile();
        const text = await fsp.readFile(ORDERS_FILE, 'utf8');
        const { rows } = parseCSV(text);
        const orders = {};
        rows.forEach(r => {
            const qty = parseInt(r.quantity_on_order, 10) || 0;
            if (qty > 0) orders[r.part_number] = qty;
        });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/orders/upload — body: { csv: "..." } — merges (adds) quantities
app.post('/api/orders/upload', async (req, res) => {
    try {
        const { csv } = req.body;
        if (!csv || typeof csv !== 'string') return res.status(400).json({ error: 'CSV content required' });

        const { headers, rows } = parseCSV(csv);
        const pnCol  = headers.find(h => /part.?num|part.?no|partno|\bpn\b/i.test(h)) || headers[0];
        const qtyCol = headers.find(h => /qty|quantity/i.test(h) && h !== pnCol) || headers[1];
        if (!pnCol || !qtyCol) return res.status(400).json({ error: 'Could not detect part_number and quantity columns' });

        await ensureOrdersFile();
        const existingText = await fsp.readFile(ORDERS_FILE, 'utf8');
        const { rows: existingRows } = parseCSV(existingText);
        const orderMap = {};
        existingRows.forEach(r => { orderMap[r.part_number] = parseInt(r.quantity_on_order, 10) || 0; });

        let added = 0;
        rows.forEach(row => {
            const pn  = (row[pnCol]  || '').trim();
            const qty = parseInt(row[qtyCol], 10) || 0;
            if (pn && qty > 0) { orderMap[pn] = (orderMap[pn] || 0) + qty; added++; }
        });

        const newRows = Object.entries(orderMap)
            .filter(([, q]) => q > 0)
            .map(([pn, q]) => ({ part_number: pn, quantity_on_order: q }));
        await fsp.writeFile(ORDERS_FILE, rowsToCSV(['part_number', 'quantity_on_order'], newRows), 'utf8');
        res.json({ merged: added, total: newRows.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/orders/:partNumber — manually set on-order quantity
app.put('/api/orders/:partNumber', async (req, res) => {
    try {
        const pn  = req.params.partNumber;
        const qty = parseInt(req.body.quantity_on_order, 10);
        if (isNaN(qty) || qty < 0) return res.status(400).json({ error: 'quantity_on_order must be >= 0' });

        await ensureOrdersFile();
        const text = await fsp.readFile(ORDERS_FILE, 'utf8');
        const { rows } = parseCSV(text);
        const orderMap = {};
        rows.forEach(r => { orderMap[r.part_number] = parseInt(r.quantity_on_order, 10) || 0; });
        orderMap[pn] = qty;

        const newRows = Object.entries(orderMap)
            .filter(([, q]) => q > 0)
            .map(([p, q]) => ({ part_number: p, quantity_on_order: q }));
        await fsp.writeFile(ORDERS_FILE, rowsToCSV(['part_number', 'quantity_on_order'], newRows), 'utf8');
        res.json({ part_number: pn, quantity_on_order: qty });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/orders/:partNumber/receive — add on-order qty to location, zero the order
app.post('/api/orders/:partNumber/receive', async (req, res) => {
    try {
        const pn = req.params.partNumber;
        const { location, user } = req.body;
        if (!location)             return res.status(400).json({ error: 'Location required' });
        if (!user || !user.trim()) return res.status(400).json({ error: 'User required' });

        const safe = location.replace(/[^a-zA-Z0-9_\-]/g, '');

        await ensureOrdersFile();
        const ordersText = await fsp.readFile(ORDERS_FILE, 'utf8');
        const { rows: orderRows } = parseCSV(ordersText);
        const orderMap = {};
        orderRows.forEach(r => { orderMap[r.part_number] = parseInt(r.quantity_on_order, 10) || 0; });

        const onOrderQty = orderMap[pn] || 0;
        if (onOrderQty === 0) return res.status(400).json({ error: 'No quantity on order for this part' });

        const locFile = path.join(LOCATIONS_DIR, `${safe}.csv`);
        const invText = await fsp.readFile(locFile, 'utf8');
        const { headers, rows } = parseCSV(invText);

        const rowIdx = rows.findIndex(r => r.part_number === pn);
        if (rowIdx === -1) return res.status(404).json({ error: 'Part not found in this location' });

        const current = parseInt(rows[rowIdx].quantity, 10) || 0;
        const newQty  = current + onOrderQty;
        rows[rowIdx].quantity = newQty;
        await fsp.writeFile(locFile, rowsToCSV(headers.length ? headers : ['part_number', 'quantity'], rows), 'utf8');

        orderMap[pn] = 0;
        const newOrderRows = Object.entries(orderMap)
            .filter(([, q]) => q > 0)
            .map(([p, q]) => ({ part_number: p, quantity_on_order: q }));
        await fsp.writeFile(ORDERS_FILE, rowsToCSV(['part_number', 'quantity_on_order'], newOrderRows), 'utf8');

        await ensureTransactionsFile();
        const ts = new Date().toISOString();
        await fsp.appendFile(TRANSACTIONS_FILE,
            `\n${ts},${escapeCSVField(user.trim())},${escapeCSVField(safe)},${escapeCSVField(pn)},receive,${onOrderQty},${newQty}`,
            'utf8');

        res.json({ part_number: pn, quantity: newQty, quantity_on_order: 0, received: onOrderQty });
    } catch (err) {
        if (err.code === 'ENOENT') return res.status(404).json({ error: 'Location not found' });
        res.status(500).json({ error: err.message });
    }
});

// ─── API: Truck Stock ─────────────────────────────────────────────────────────

// GET /api/truck/:username — returns truck location name, auto-creates if needed
app.get('/api/truck/:username', async (req, res) => {
    try {
        const rawName = req.params.username.trim();
        if (!rawName) return res.status(400).json({ error: 'Username required' });

        const safe = ('truck_' + rawName.replace(/[^a-zA-Z0-9]/g, '_')).replace(/_+/g, '_');
        const locFile = path.join(LOCATIONS_DIR, `${safe}.csv`);

        let created = false;
        try {
            await fsp.access(locFile);
        } catch {
            let csvContent = 'part_number,quantity\n';
            try {
                const partsText = await fsp.readFile(PARTS_FILE, 'utf8');
                const { headers, rows } = parseCSV(partsText);
                const pnCol = headers.find(h => /part.?num|part.?no|partno|\bpn\b/i.test(h)) || headers[0];
                rows.forEach(row => { const pn = row[pnCol] || ''; if (pn) csvContent += `${pn},0\n`; });
            } catch {}
            await fsp.writeFile(locFile, csvContent, 'utf8');
            created = true;
        }

        res.json({ location: safe, created });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── API: Transfer ────────────────────────────────────────────────────────────

// POST /api/transfer — move qty between two locations
app.post('/api/transfer', async (req, res) => {
    try {
        const { from_location, to_location, part_number, quantity, user } = req.body;
        if (!user || !user.trim())              return res.status(400).json({ error: 'User required' });
        if (!from_location || !to_location)     return res.status(400).json({ error: 'from_location and to_location required' });
        if (from_location === to_location)       return res.status(400).json({ error: 'Source and destination must differ' });
        if (!part_number)                       return res.status(400).json({ error: 'Part number required' });
        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty <= 0)             return res.status(400).json({ error: 'Quantity must be a positive integer' });

        const safeFrom = from_location.replace(/[^a-zA-Z0-9_\-]/g, '');
        const safeTo   = to_location.replace(/[^a-zA-Z0-9_\-]/g, '');

        const fromFile = path.join(LOCATIONS_DIR, `${safeFrom}.csv`);
        const toFile   = path.join(LOCATIONS_DIR, `${safeTo}.csv`);

        const fromText = await fsp.readFile(fromFile, 'utf8');
        const { headers: fromHeaders, rows: fromRows } = parseCSV(fromText);
        const toText = await fsp.readFile(toFile, 'utf8');
        const { headers: toHeaders, rows: toRows } = parseCSV(toText);

        const fromIdx = fromRows.findIndex(r => r.part_number === part_number);
        if (fromIdx === -1) return res.status(404).json({ error: 'Part not found in source location' });

        const fromCurrent = parseInt(fromRows[fromIdx].quantity, 10) || 0;
        if (fromCurrent < qty) return res.status(400).json({ error: `Cannot transfer ${qty}: source only has ${fromCurrent}` });

        const newFromQty = fromCurrent - qty;
        fromRows[fromIdx].quantity = newFromQty;

        const toIdx = toRows.findIndex(r => r.part_number === part_number);
        let newToQty;
        if (toIdx >= 0) {
            newToQty = (parseInt(toRows[toIdx].quantity, 10) || 0) + qty;
            toRows[toIdx].quantity = newToQty;
        } else {
            newToQty = qty;
            toRows.push({ part_number, quantity: newToQty });
        }

        await fsp.writeFile(fromFile, rowsToCSV(fromHeaders.length ? fromHeaders : ['part_number', 'quantity'], fromRows), 'utf8');
        await fsp.writeFile(toFile,   rowsToCSV(toHeaders.length   ? toHeaders   : ['part_number', 'quantity'], toRows),   'utf8');

        await ensureTransactionsFile();
        const ts = new Date().toISOString();
        const u  = escapeCSVField(user.trim());
        const pn = escapeCSVField(part_number);
        await fsp.appendFile(TRANSACTIONS_FILE,
            `\n${ts},${u},${escapeCSVField(safeFrom)},${pn},transfer-out,${qty},${newFromQty}` +
            `\n${ts},${u},${escapeCSVField(safeTo)},${pn},transfer-in,${qty},${newToQty}`,
            'utf8');

        res.json({
            part_number,
            from: { location: safeFrom, quantity: newFromQty },
            to:   { location: safeTo,   quantity: newToQty }
        });
    } catch (err) {
        if (err.code === 'ENOENT') return res.status(404).json({ error: 'Location not found' });
        res.status(500).json({ error: err.message });
    }
});

// ─── Start ────────────────────────────────────────────────────────────────────

runDailyBackup();
setInterval(runDailyBackup, 60 * 60 * 1000); // re-check every hour

app.listen(PORT, () => {
    const env = process.env.DATA_DIR ? 'DEVELOPMENT' : 'PRODUCTION';
    console.log(`InTracker [${env}] running at http://localhost:${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
});

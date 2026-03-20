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
const DATA_DIR = path.join(__dirname, 'data');
const LOCATIONS_DIR = path.join(DATA_DIR, 'locations');
const PARTS_FILE = path.join(DATA_DIR, 'parts.csv');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.csv');
const HIDDEN_FILE    = path.join(DATA_DIR, 'hidden_locations.json');
const BACKUPS_DIR    = path.join(DATA_DIR, 'backups');

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

// ─── API: Locations ───────────────────────────────────────────────────────────

app.get('/api/locations', async (req, res) => {
    try {
        await fsp.mkdir(LOCATIONS_DIR, { recursive: true });
        const files = await fsp.readdir(LOCATIONS_DIR);
        const hidden = await getHiddenLocations();
        const locations = files
            .filter(f => f.endsWith('.csv'))
            .map(f => f.replace('.csv', ''))
            .filter(name => !hidden.includes(name));
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

        const inventory = orderedPns.map(pn => ({
            part_number: pn,
            quantity: qtyMap[pn],
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

        res.json({ part_number, quantity: newQty });
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

// ─── Start ────────────────────────────────────────────────────────────────────

runDailyBackup();
setInterval(runDailyBackup, 60 * 60 * 1000); // re-check every hour

app.listen(PORT, () => {
    console.log(`InTracker running at http://localhost:${PORT}`);
});

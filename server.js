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
const PORT = process.argv[2] || process.env.PORT || 3030;
const DATA_DIR = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(__dirname, 'data');
const STATIC_DIR = process.env.STATIC_DIR
    ? path.resolve(process.env.STATIC_DIR)
    : path.join(__dirname, 'public');
const LOCATIONS_DIR = path.join(DATA_DIR, 'locations');
const PARTS_FILE = path.join(DATA_DIR, 'parts.csv');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.csv');
const TRANSACTIONS_DIR  = path.join(DATA_DIR, 'transactions');
const HIDDEN_FILE    = path.join(DATA_DIR, 'hidden_locations.json');
const CITY_GROUPS_FILE = path.join(DATA_DIR, 'city_groups.json');
const OBSOLETE_FILE = path.join(DATA_DIR, 'obsolete.csv');
const BACKUPS_DIR    = path.join(DATA_DIR, 'backups');
const ORDERS_DIR     = path.join(DATA_DIR, 'orders');
const UPLOAD_HISTORY_DIR = path.join(DATA_DIR, 'upload-history');
const Z10_MASTER_FILE = path.join(__dirname, 'Z10 Master List.csv');

// Z10 Master List cache (loaded on startup)
let z10DescriptionMap = {};

// Obsolete parts map (loaded on startup): {part_number: replacement_part_number}
let obsoleteMap = {};

async function loadZ10Descriptions() {
    try {
        const text = await fsp.readFile(Z10_MASTER_FILE, 'utf8');
        const { rows } = parseCSV(text);
        z10DescriptionMap = {};
        rows.forEach(row => {
            if (row['Part No']) {
                z10DescriptionMap[row['Part No'].trim()] = row['Z10 text'] || '';
            }
        });
        const count = Object.keys(z10DescriptionMap).length;
        console.log(`✅ Loaded ${count} Z10 descriptions from Z10 Master List`);
        // Log first few entries for debugging
        const sampleParts = Object.keys(z10DescriptionMap).slice(0, 3);
        sampleParts.forEach(pn => {
            const desc = z10DescriptionMap[pn].split('\n')[0];
            console.log(`   ${pn}: ${desc.substring(0, 50)}...`);
        });
    } catch (err) {
        console.warn(`❌ Could not load Z10 Master List: ${err.message}`);
    }
}

async function loadObsoleteList() {
    try {
        const text = await fsp.readFile(OBSOLETE_FILE, 'utf8');
        const { rows } = parseCSV(text);
        obsoleteMap = {};
        rows.forEach(row => {
            if (row.part_number && row.replacement_part_number) {
                obsoleteMap[row.part_number.trim()] = row.replacement_part_number.trim();
            }
        });
        const count = Object.keys(obsoleteMap).length;
        if (count > 0) {
            console.log(`✅ Loaded ${count} obsolete parts`);
        }
    } catch (err) {
        console.warn(`⚠️  Could not load obsolete parts list: ${err.message}`);
    }
}

function ordersFileForLocation(safe) { return path.join(ORDERS_DIR, `${safe}.csv`); }

app.use(cors());
app.use(express.json());

// Serve index.html with no-cache headers so browsers always get the latest version
const serveIndex = (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
};
app.get('/', serveIndex);
app.get('/index.html', serveIndex);

// /city/:name  →  redirect to /?city=:name  (clean sharable URL)
app.get('/city/:name', (req, res) => {
    const city = encodeURIComponent(req.params.name);
    res.redirect(`/?city=${city}`);
});

app.use(express.static(STATIC_DIR));

// ─── CSV Helpers ─────────────────────────────────────────────────────────────

function parseCSV(text) {
    const lines = [];
    let current = '';
    let inQuotes = false;
    
    // Parse entire text preserving quoted field boundaries
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const nextCh = text[i + 1];
        
        if (ch === '"') {
            if (inQuotes && nextCh === '"') {
                // Escaped quote ""
                current += '""';
                i++;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                current += ch;
            }
        } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
            // End of line (not in quotes)
            if (ch === '\r' && nextCh === '\n') i++; // Skip \r\n
            if (current.trim()) lines.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    if (current.trim()) lines.push(current);
    
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const headers = splitCSVLine(lines[0]).map(h => h.trim());
    const rows = lines.slice(1).map(line => {
        const values = splitCSVLine(line);
        const obj = {};
        headers.forEach((h, i) => {
            let val = (values[i] || '').trim();
            // Remove surrounding quotes and unescape "" to "
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1).replace(/""/g, '"');
            }
            obj[h] = val;
        });
        return obj;
    });
    return { headers, rows };
}

// ─── Validate Location CSV Headers ────────────────────────────────────────────
// Ensures location CSVs have required columns: part_number, quantity, par_level
// Coordinate columns (aisle, rack, shelf) are optional but will be auto-added if missing
function validateLocationCSVHeaders(headers) {
    const required = ['part_number', 'quantity', 'par_level'];
    const hasAll = required.every(h => headers.includes(h));
    const needsCoordinates = !['aisle', 'rack', 'shelf'].every(h => headers.includes(h));
    return hasAll ? { valid: true, headers, needsCoordinates } : { valid: false, headers };
}

// ─── Repair Malformed Location CSV ────────────────────────────────────────────
// If headers are missing required columns, reconstruct with sensible defaults
function repairLocationCSV(text) {
    const { headers, rows } = parseCSV(text);
    const { valid } = validateLocationCSVHeaders(headers);
    
    if (valid) return text; // No repair needed
    
    // Malformed — attempt to reconstruct
    console.warn(`[InTracker] Detected malformed location CSV, attempting recovery...`);
    
    // If only par_level exists, reconstruct as: part_number (from values), quantity (0), par_level
    if (headers.includes('par_level') && !headers.includes('part_number')) {
        const repaired = rows.map((row, idx) => {
            // Assume row.par_level contains the par value from malformed file
            return { part_number: `UNKNOWN_${idx}`, quantity: 0, par_level: row.par_level || '0' };
        });
        return rowsToCSV(['part_number', 'quantity', 'par_level', 'aisle', 'rack', 'shelf'], repaired);
    }
    
    // Fallback: create empty structure with required columns
    return rowsToCSV(['part_number', 'quantity', 'par_level', 'aisle', 'rack', 'shelf'], rows);
}

// ─── Auto-Migrate Location CSV to Add Coordinate Columns ────────────────────────
// Adds aisle, rack, shelf columns if they're missing from an existing location CSV
async function autoMigrateCoordinates(locFile, headers, rows) {
    let needsMigration = false;
    
    if (!headers.includes('aisle')) {
        headers.push('aisle');
        needsMigration = true;
    }
    if (!headers.includes('rack')) {
        headers.push('rack');
        needsMigration = true;
    }
    if (!headers.includes('shelf')) {
        headers.push('shelf');
        needsMigration = true;
    }
    
    if (needsMigration) {
        try {
            await executeWithWriteLock(locFile, async () => {
                await fsp.writeFile(locFile, rowsToCSV(headers, rows), 'utf8');
            });
            console.log(`[InTracker] Auto-migrated coordinates for: ${path.basename(locFile)}`);
        } catch (err) {
            console.warn(`[InTracker] Failed to auto-migrate coordinates: ${err.message}`);
        }
    }
}

function splitCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
            current += ch;
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

// Reads orders.csv text (with OR without a header row) → { [part_number]: qty } map
// Guards against headerless files where parseCSV would treat the first data row as headers.
function parseOrdersCSV(text) {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return {};
    const map = {};
    const firstCol = lines[0].split(',')[0].trim();
    // If the first column looks like a header word (not an 8-digit number), skip it
    const isHeader = !/^\d+$/.test(firstCol);
    const dataLines = isHeader ? lines.slice(1) : lines;
    for (const line of dataLines) {
        const cols = line.split(',').map(s => s.trim());
        const pn  = cols[0] || '';
        const qty = parseInt(cols[1], 10) || 0;
        if (pn && qty > 0) map[pn] = qty;
    }
    return map;
}

// Writes a { [part_number]: qty } map back to orders.csv format (always with header)
function ordersMapToCSV(map) {
    const rows = Object.entries(map)
        .filter(([, q]) => q > 0)
        .map(([pn, q]) => ({ part_number: pn, quantity_on_order: q }));
    return rowsToCSV(['part_number', 'quantity_on_order'], rows);
}

// ─── File Locking System (prevent concurrent writes to same file) ──────────────
// Maps file paths to promise chains for sequential write access
const fileLocks = new Map();

async function acquireWriteLock(filePath, timeoutMs = 30000) {
    if (!fileLocks.has(filePath)) {
        fileLocks.set(filePath, Promise.resolve());
    }
    
    const currentLock = fileLocks.get(filePath);
    let timeoutHandle;
    let resolveTimeout;
    
    // Create a new promise for this lock holder
    const newLock = new Promise((resolve) => {
        currentLock.then(() => {
            resolveTimeout = resolve;
            // Set timeout to prevent deadlocks
            timeoutHandle = setTimeout(() => {
                resolve();
            }, timeoutMs);
        });
    });
    
    // Store the new lock so next waiter waits for this one
    fileLocks.set(filePath, newLock);
    
    // Wait for our turn
    await currentLock;
    
    // Return a release function
    return () => {
        clearTimeout(timeoutHandle);
        if (resolveTimeout) resolveTimeout();
    };
}

async function executeWithWriteLock(filePath, asyncFn, timeoutMs = 30000) {
    const release = await acquireWriteLock(filePath, timeoutMs);
    try {
        return await asyncFn();
    } finally {
        release();
    }
}

async function ensureTransactionsFile() {
    try {
        await fsp.access(TRANSACTIONS_FILE);
    } catch {
        await fsp.writeFile(TRANSACTIONS_FILE, 'timestamp,user,location,part_number,action,quantity,balance_after\n', 'utf8');
    }
}

function txFileForLocation(safe) {
    return path.join(TRANSACTIONS_DIR, `${safe}.csv`);
}

async function appendTransaction(safe, line) {
    // Write to per-location file
    const locFile = txFileForLocation(safe);
    try { await fsp.access(locFile); } catch {
        await fsp.mkdir(TRANSACTIONS_DIR, { recursive: true });
        await fsp.writeFile(locFile, 'timestamp,user,location,part_number,action,quantity,balance_after\n', 'utf8');
    }
    await fsp.appendFile(locFile, line, 'utf8');
    // Mirror to main transactions.csv
    await ensureTransactionsFile();
    await fsp.appendFile(TRANSACTIONS_FILE, line, 'utf8');
}

async function ensureOrdersFile(filePath) {
    try {
        await fsp.access(filePath);
    } catch {
        await fsp.mkdir(path.dirname(filePath), { recursive: true });
        await fsp.writeFile(filePath, 'part_number,quantity_on_order\n', 'utf8');
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

async function runHourlyBackup() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const hourStr = String(now.getHours()).padStart(2, '0');
    const backupDir = path.join(BACKUPS_DIR, dateStr, `hour_${hourStr}`);
    try { await fsp.access(backupDir); return; } catch { /* proceed */ }
    await fsp.mkdir(backupDir, { recursive: true });
    
    // Backup root-level files
    try { await fsp.access(PARTS_FILE);        await fsp.copyFile(PARTS_FILE, path.join(backupDir, path.basename(PARTS_FILE))); } catch {}
    try { await fsp.access(TRANSACTIONS_FILE); await fsp.copyFile(TRANSACTIONS_FILE, path.join(backupDir, path.basename(TRANSACTIONS_FILE))); } catch {}
    
    // Backup location CSVs (preserve subdirectory structure)
    try {
        const locBackupDir = path.join(backupDir, 'locations');
        await fsp.mkdir(locBackupDir, { recursive: true });
        const locFiles = await fsp.readdir(LOCATIONS_DIR);
        for (const f of locFiles.filter(f => f.endsWith('.csv') && !f.toLowerCase().startsWith('truck_'))) {
            try { await fsp.copyFile(path.join(LOCATIONS_DIR, f), path.join(locBackupDir, f)); } catch {}
        }
    } catch {}
    
    // Backup order CSVs (preserve subdirectory structure)
    try {
        const ordBackupDir = path.join(backupDir, 'orders');
        await fsp.mkdir(ordBackupDir, { recursive: true });
        const ordFiles = await fsp.readdir(ORDERS_DIR);
        for (const f of ordFiles.filter(f => f.endsWith('.csv'))) {
            try { await fsp.copyFile(path.join(ORDERS_DIR, f), path.join(ordBackupDir, f)); } catch {}
        }
    } catch {}
    
    console.log(`[InTracker] Backup completed: ${dateStr} ${hourStr}:00`);
}

// Schedule backup to run hourly
function scheduleHourlyBackup() {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0, 0, 0);
    
    let timeUntilNextHour = nextHour.getTime() - now.getTime();
    
    console.log(`[InTracker] Hourly backup scheduled for ${nextHour.toISOString()}`);
    
    setTimeout(() => {
        runHourlyBackup();
        // After first run, schedule it to repeat every hour
        setInterval(runHourlyBackup, 60 * 60 * 1000);
    }, timeUntilNextHour);
}

// ─── Upload History Management ───────────────────────────────────────────────

async function saveUploadHistory(location, uploadType, uploadedCsv, uploadedFilename = 'upload.csv', beforeOrderState = null) {
    // uploadedCsv: the CSV content that was uploaded
    // beforeOrderState: map of part numbers to on-order quantities before this upload (for RecParts)
    const safe = location.replace(/[^a-zA-Z0-9 _\-]/g, '').replace(/\s+/g, '_');
    const historyDirForLocation = path.join(UPLOAD_HISTORY_DIR, safe);
    await fsp.mkdir(historyDirForLocation, { recursive: true });
    
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const uploadId = `${uploadType}_${timestamp}`;
    const uploadDirForId = path.join(historyDirForLocation, uploadId);
    await fsp.mkdir(uploadDirForId, { recursive: true });
    
    // Save metadata with filename and date/time
    const metadata = {
        uploadId,
        location: safe,
        uploadType,
        timestamp: now.toISOString(),
        filename: uploadedFilename
    };
    
    // For RecParts, also save the before-state of on-order quantities
    if (uploadType === 'RecParts' && beforeOrderState) {
        metadata.beforeOrderState = beforeOrderState;
    }
    
    // Write metadata first
    await fsp.writeFile(path.join(uploadDirForId, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');
    
    // Save the uploaded CSV with its original filename
    const csvPath = path.join(uploadDirForId, uploadedFilename);
    await fsp.writeFile(csvPath, uploadedCsv, 'utf8');
    
    // Verify the file was written
    try {
        await fsp.access(csvPath);
    } catch {
        throw new Error(`Failed to save upload CSV to ${csvPath}`);
    }
    
    // Keep only last 10 uploads for this location
    try {
        const entries = await fsp.readdir(historyDirForLocation, { withFileTypes: true });
        const dirs = entries
            .filter(e => e.isDirectory())
            .sort((a, b) => b.name.localeCompare(a.name)); // Sort by name (timestamp), newest first
        
        if (dirs.length > 10) {
            // Delete oldest ones
            for (let i = 10; i < dirs.length; i++) {
                const dirPath = path.join(historyDirForLocation, dirs[i].name);
                await fsp.rm(dirPath, { recursive: true, force: true });
            }
        }
    } catch {}
    
    return uploadId;
}

async function getUploadHistory(location) {
    const safe = location.replace(/[^a-zA-Z0-9 _\-]/g, '').replace(/\s+/g, '_');
    const historyDirForLocation = path.join(UPLOAD_HISTORY_DIR, safe);
    
    try {
        const entries = await fsp.readdir(historyDirForLocation, { withFileTypes: true });
        const uploads = [];
        
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            try {
                const metadataPath = path.join(historyDirForLocation, entry.name, 'metadata.json');
                const metadata = JSON.parse(await fsp.readFile(metadataPath, 'utf8'));
                uploads.push(metadata);
            } catch {}
        }
        
        // Sort by timestamp, newest first
        uploads.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return uploads;
    } catch {
        return [];
    }
}

async function reverseUpload(location, uploadId) {
    const safe = location.replace(/[^a-zA-Z0-9 _\-]/g, '').replace(/\s+/g, '_');
    const uploadDirForId = path.join(UPLOAD_HISTORY_DIR, safe, uploadId);
    
    try {
        const metadata = JSON.parse(await fsp.readFile(path.join(uploadDirForId, 'metadata.json'), 'utf8'));
        
        // Use filename from metadata, fallback to 'upload.csv' for backward compatibility
        const filename = metadata.filename || 'upload.csv';
        const uploadedCsvPath = path.join(uploadDirForId, filename);
        const uploadedCsv = await fsp.readFile(uploadedCsvPath, 'utf8');
        const { headers, rows } = parseCSV(uploadedCsv);
        
        const pnCol  = headers.find(h => /part.?num|part.?no|partno|\bpn\b|\bsku\b/i.test(h));
        const qtyCol = headers.find(h => /qty|quantity/i.test(h) && h !== pnCol);
        
        if (!pnCol || !qtyCol) {
            return { success: false, error: 'Could not parse uploaded file' };
        }
        
        const PN_FORMAT = /^\d{8}$/;
        
        if (metadata.uploadType === 'PO') {
            // Reverse a PO upload: subtract quantities from orders.csv
            const ordersFile = ordersFileForLocation(safe);
            const ordersText = await fsp.readFile(ordersFile, 'utf8');
            const orderMap = parseOrdersCSV(ordersText);
            
            let reversed = 0;
            rows.forEach(row => {
                const pn  = (row[pnCol] || '').trim();
                const qty = parseInt(row[qtyCol], 10) || 0;
                if (PN_FORMAT.test(pn) && qty > 0 && orderMap[pn]) {
                    orderMap[pn] = Math.max(0, orderMap[pn] - qty);
                    reversed++;
                }
            });
            
            await fsp.writeFile(ordersFile, ordersMapToCSV(orderMap), 'utf8');
            // Delete the upload folder after successful reversal
            await fsp.rm(uploadDirForId, { recursive: true, force: true });
            return { success: true, type: 'PO', reversed };
            
        } else if (metadata.uploadType === 'RecParts') {
            // Reverse a RecParts upload: remove quantities from location inventory and restore on-order to before-state
            const locFile = path.join(LOCATIONS_DIR, `${safe}.csv`);
            const locText = await fsp.readFile(locFile, 'utf8');
            const { headers: invHeaders, rows: invRows } = parseCSV(locText);
            
            const ordersFile = ordersFileForLocation(safe);
            const ordersText = await fsp.readFile(ordersFile, 'utf8');
            const orderMap = parseOrdersCSV(ordersText);
            
            let reversed = 0;
            rows.forEach(row => {
                const pn  = (row[pnCol] || '').trim();
                const qty = parseInt(row[qtyCol], 10) || 0;
                
                if (PN_FORMAT.test(pn) && qty > 0) {
                    // Remove from inventory
                    const rowIdx = invRows.findIndex(r => (r.part_number || '').trim() === pn);
                    if (rowIdx !== -1) {
                        const current = parseInt(invRows[rowIdx].quantity, 10) || 0;
                        invRows[rowIdx].quantity = Math.max(0, current - qty);
                        // Restore on-order quantity to before-state (or delete if it wasn't there before)
                        if (metadata.beforeOrderState && metadata.beforeOrderState[pn] !== undefined) {
                            orderMap[pn] = metadata.beforeOrderState[pn];
                        } else if (metadata.beforeOrderState) {
                            // Part wasn't on order before, remove it now
                            delete orderMap[pn];
                        } else {
                            // Fallback for old uploads without beforeOrderState: add qty back
                            orderMap[pn] = (orderMap[pn] || 0) + qty;
                        }
                        reversed++;
                    }
                }
            });
            
            await fsp.writeFile(locFile, rowsToCSV(invHeaders.length ? invHeaders : ['part_number', 'quantity'], invRows), 'utf8');
            await fsp.writeFile(ordersFile, ordersMapToCSV(orderMap), 'utf8');
            // Delete the upload folder after successful reversal
            await fsp.rm(uploadDirForId, { recursive: true, force: true });
            return { success: true, type: 'RecParts', reversed };
        } else {
            return { success: false, error: 'Unknown upload type' };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
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

// PUT /api/parts/:partNumber/par_level — update par level (per-location or global)
// Body: { par_level: number, location?: string }
// If location is provided, writes to location CSV's par_level column.
// Otherwise writes the global default in parts.csv.
app.put('/api/parts/:partNumber/par_level', async (req, res) => {
    try {
        const pn  = req.params.partNumber;
        const par = parseInt(req.body.par_level, 10);
        if (isNaN(par) || par < -1) return res.status(400).json({ error: 'par_level must be >= -1 (use -1 for zero par but visible)' });

        const locationRaw = req.body.location;
        if (locationRaw) {
            // Per-location: write to location CSV par_level column
            const safe = locationRaw.replace(/[^a-zA-Z0-9 _\-]/g, '').replace(/\s+/g, '_');
            
            // Block par_level changes for truck locations
            if (safe.toLowerCase().startsWith('truck_')) {
                return res.status(403).json({ error: 'Cannot set par levels for truck stocks' });
            }
            
            const locFile = path.join(LOCATIONS_DIR, `${safe}.csv`);
            
            await executeWithWriteLock(locFile, async () => {
                try {
                    const locText = await fsp.readFile(locFile, 'utf8');
                    const { headers, rows } = parseCSV(locText);
                    
                    // Ensure par_level column exists
                    if (!headers.includes('par_level')) {
                        headers.push('par_level');
                    }
                    
                    // Find and update the part row, or add it if missing
                    const idx = rows.findIndex(r => r.part_number === pn);
                    if (idx === -1) {
                        // Part not yet in this location, add it
                        rows.push({ part_number: pn, quantity: 0, par_level: par });
                    } else {
                        rows[idx].par_level = par;
                    }
                    
                    await fsp.writeFile(locFile, rowsToCSV(headers, rows), 'utf8');
                    res.json({ part_number: pn, par_level: par, location: safe });
                } catch (err) {
                    res.status(500).json({ error: `Failed to update location par level: ${err.message}` });
                }
            });
            return;
        }

        // Global default: write to parts.csv
        await executeWithWriteLock(PARTS_FILE, async () => {
            const text = await fsp.readFile(PARTS_FILE, 'utf8');
            const { headers, rows } = parseCSV(text);
            const pnCol = headers.find(h => /part.?num|part.?no|partno|\bpn\b|\bsku\b/i.test(h)) || headers[0];
            const parKey = headers.find(h => /par_level|parlevel/i.test(h));
            if (!parKey) return res.status(400).json({ error: 'par_level column not found in parts.csv' });

            const idx = rows.findIndex(r => r[pnCol] === pn);
            if (idx === -1) {
                const newRow = {};
                headers.forEach(h => { newRow[h] = ''; });
                newRow[pnCol] = pn;
                newRow[parKey] = par;
                rows.push(newRow);
            } else {
                rows[idx][parKey] = par;
            }
            await fsp.writeFile(PARTS_FILE, rowsToCSV(headers, rows), 'utf8');
            res.json({ part_number: pn, par_level: par });
        });
    } catch (err) {
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

// ─── API: Obsolete Parts ──────────────────────────────────────────────────────

app.get('/api/obsolete', async (req, res) => {
    res.json(obsoleteMap);
});

app.post('/api/obsolete', async (req, res) => {
    try {
        const { part_number, replacement_part_number } = req.body;
        
        if (!part_number || !replacement_part_number) {
            return res.status(400).json({ error: 'Both part numbers required' });
        }
        
        if (!/^\d{8}$/.test(part_number) || !/^\d{8}$/.test(replacement_part_number)) {
            return res.status(400).json({ error: 'Part numbers must be exactly 8 digits' });
        }
        
        if (part_number === replacement_part_number) {
            return res.status(400).json({ error: 'Obsolete and replacement parts cannot be the same' });
        }
        
        // Add to map
        obsoleteMap[part_number] = replacement_part_number;
        
        // Append to CSV
        const line = `${part_number},${replacement_part_number}\n`;
        await fsp.appendFile(OBSOLETE_FILE, line, 'utf8');
        
        res.json({ success: true, message: `Obsolete part added: ${part_number} → ${replacement_part_number}` });
    } catch (err) {
        console.error('Error adding obsolete part:', err);
        res.status(500).json({ error: 'Server error adding obsolete part' });
    }
});

app.delete('/api/obsolete/:partNumber', async (req, res) => {
    try {
        const partNumber = req.params.partNumber;
        
        if (!obsoleteMap.hasOwnProperty(partNumber)) {
            return res.status(404).json({ error: 'Obsolete part not found' });
        }
        
        delete obsoleteMap[partNumber];
        
        // Rebuild CSV without this part
        const lines = [];
        lines.push('part_number,replacement_part_number');
        Object.entries(obsoleteMap).forEach(([pn, replacement]) => {
            lines.push(`${pn},${replacement}`);
        });
        
        await fsp.writeFile(OBSOLETE_FILE, lines.join('\n') + (Object.keys(obsoleteMap).length > 0 ? '\n' : ''), 'utf8');
        
        res.json({ success: true, message: `Obsolete part removed: ${partNumber}` });
    } catch (err) {
        console.error('Error removing obsolete part:', err);
        res.status(500).json({ error: 'Server error removing obsolete part' });
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
        await appendTransaction(newSafe,
            `\n${ts},${escapeCSVField((user || '').trim())},${escapeCSVField(newSafe)},${escapeCSVField(newSafe)},rename_location,0,0`);

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
        
        await executeWithWriteLock(locFile, async () => {
            try {
                await fsp.access(locFile);
                return res.status(409).json({ error: 'Location already exists' });
            } catch { /* doesn't exist, proceed */ }

            // Build the new location CSV pre-populated from parts.csv at qty 0 and par_level 0, with empty coordinates
            let csvContent = 'part_number,quantity,par_level,aisle,rack,shelf\n';
            try {
                const partsText = await fsp.readFile(PARTS_FILE, 'utf8');
                const { headers, rows } = parseCSV(partsText);
                // Detect the part number column (flexible name matching)
                const pnCol = headers.find(h => /part.?num|part.?no|partno|\bpn\b|\bsku\b/i.test(h)) || headers[0];
                rows.forEach(row => {
                    const pn = row[pnCol] || '';
                    if (pn) csvContent += `${pn},0,0,,,\n`;
                });
            } catch { /* parts.csv missing — create empty location */ }

            await fsp.writeFile(locFile, csvContent, 'utf8');
            res.json({ name: safe });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── API: Inventory ───────────────────────────────────────────────────────────

app.get('/api/inventory/:location', async (req, res) => {
    try {
        const safe = req.params.location.replace(/[^a-zA-Z0-9 _\-]/g, '').replace(/\s+/g, '_');
        const locFile = path.join(LOCATIONS_DIR, `${safe}.csv`);
        let invText = await fsp.readFile(locFile, 'utf8');
        
        // Validate and repair malformed CSV if needed
        let parsedCSV = parseCSV(invText);
        const headerValidation = validateLocationCSVHeaders(parsedCSV.headers);
        if (!headerValidation.valid) {
            console.warn(`[InTracker] Malformed location CSV detected: ${safe}.csv — attempting repair`);
            invText = repairLocationCSV(invText);
            // Persist the repaired file
            try {
                await executeWithWriteLock(locFile, async () => {
                    await fsp.writeFile(locFile, invText, 'utf8');
                    console.log(`[InTracker] Repaired and saved: ${safe}.csv`);
                });
            } catch (writeErr) {
                console.error(`[InTracker] Failed to save repaired CSV: ${writeErr.message}`);
            }
            parsedCSV = parseCSV(invText);
        }
        
        // Auto-migrate to add coordinate columns if missing
        if (headerValidation.needsCoordinates) {
            const headers = [...parsedCSV.headers];
            const rows = parsedCSV.rows;
            await autoMigrateCoordinates(locFile, headers, rows);
            parsedCSV.headers = headers;
        }
        
        const { rows: invRows } = parsedCSV;

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
            const pnCol = headers.find(h => /part.?num|part.?no|partno|\bpn\b|\bsku\b/i.test(h)) || headers[0];
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
            await executeWithWriteLock(locFile, async () => {
                // Read current location CSV to get its headers and any existing par_levels / coordinates
                let locHeaders = ['part_number', 'quantity', 'par_level', 'aisle', 'rack', 'shelf'];
                const locParMap = {};
                const locCoordMap = {};
                try {
                    const currentLocText = await fsp.readFile(locFile, 'utf8');
                    const { headers: curHeaders, rows: curRows } = parseCSV(currentLocText);
                    locHeaders = curHeaders;
                    if (!locHeaders.includes('par_level')) {
                        locHeaders.push('par_level');
                    }
                    if (!locHeaders.includes('aisle')) {
                        locHeaders.push('aisle');
                    }
                    if (!locHeaders.includes('rack')) {
                        locHeaders.push('rack');
                    }
                    if (!locHeaders.includes('shelf')) {
                        locHeaders.push('shelf');
                    }
                    // Preserve existing par_levels and coordinates
                    curRows.forEach(row => {
                        locParMap[row.part_number] = row.par_level || '0';
                        locCoordMap[row.part_number] = {
                            aisle: row.aisle || '',
                            rack: row.rack || '',
                            shelf: row.shelf || ''
                        };
                    });
                } catch { /* file might not exist yet */ }
                
                const updatedRows = partsPnList
                    .filter(pn => pn in qtyMap)
                    .map(pn => ({
                        part_number: pn,
                        quantity: qtyMap[pn],
                        par_level: locParMap[pn] || (partsMap[pn]?.par_level) || '0',
                        aisle: locCoordMap[pn]?.aisle || '',
                        rack: locCoordMap[pn]?.rack || '',
                        shelf: locCoordMap[pn]?.shelf || ''
                    }));
                // Also keep any rows not in parts.csv that still have qty (preserve unknown parts with stock)
                for (const pn of Object.keys(qtyMap)) {
                    if (!partsMap[pn] && qtyMap[pn] > 0) {
                        updatedRows.push({
                            part_number: pn,
                            quantity: qtyMap[pn],
                            par_level: locParMap[pn] || '0',
                            aisle: locCoordMap[pn]?.aisle || '',
                            rack: locCoordMap[pn]?.rack || '',
                            shelf: locCoordMap[pn]?.shelf || ''
                        });
                    }
                }
                await fsp.writeFile(locFile, rowsToCSV(locHeaders, updatedRows), 'utf8');
            });
        }

        // Build response — preserve parts.csv order, unknown-but-stocked parts at end
        const orderedPns = [
            ...partsPnList.filter(pn => pn in qtyMap),
            ...Object.keys(qtyMap).filter(pn => !partsMap[pn])
        ];

        // Load on-order quantities (per-location)
        let ordersMap = {};
        try {
            const ordersFile = ordersFileForLocation(safe);
            await ensureOrdersFile(ordersFile);
            const ordersText = await fsp.readFile(ordersFile, 'utf8');
            ordersMap = parseOrdersCSV(ordersText);
        } catch { /* no orders file yet */ }

        // Load per-location par levels from location CSV and overlay onto global par_level
        // Build map of location-specific par levels from invRows
        const locationParMap = {};
        invRows.forEach(r => {
            const parVal = r.par_level ? parseInt(r.par_level, 10) : null;
            if (parVal !== null) {
                locationParMap[r.part_number] = parVal;
            }
        });

        const inventory = orderedPns.map(pn => {
            const base = { part_number: pn, quantity: qtyMap[pn], on_order: ordersMap[pn] || 0, ...(partsMap[pn] || {}) };
            // Use location par if available, otherwise use global par from parts.csv
            if (Object.prototype.hasOwnProperty.call(locationParMap, pn)) {
                base.par_level = String(locationParMap[pn]);
            }
            // Z10 Master List is primary source for descriptions
            if (z10DescriptionMap[pn]) {
                base.full_description = z10DescriptionMap[pn];
                // Extract first meaningful line from Z10 for short description (skip just the part number)
                const lines = z10DescriptionMap[pn].split('\n').map(l => l.trim()).filter(l => l && l !== pn);
                if (lines.length > 0) {
                    base.description = lines[0];
                } else if (!base.description) {
                    // Fall back to parts.csv only if Z10 has no useful content
                    base.description = '';
                }
            } else if (!base.description) {
                // If part not in Z10 and no description in parts.csv, leave blank
                base.description = '';
            }
            // Add obsolete status and replacement info
            base.is_obsolete = obsoleteMap.hasOwnProperty(pn) ? true : false;
            if (base.is_obsolete) {
                base.replacement_part_number = obsoleteMap[pn];
            }
            // Add coordinates from location CSV
            const coordRow = invRows.find(r => r.part_number === pn);
            if (coordRow) {
                base.aisle = coordRow.aisle || '';
                base.rack = coordRow.rack || '';
                base.shelf = coordRow.shelf || '';
            } else {
                base.aisle = '';
                base.rack = '';
                base.shelf = '';
            }
            return base;
        });

        res.json({ inventory, partsHeaders });
    } catch (err) {
        if (err.code === 'ENOENT') return res.status(404).json({ error: 'Location not found' });
        res.status(500).json({ error: err.message });
    }
});

// ─── API: Adjust Inventory ────────────────────────────────────────────────────

app.post('/api/inventory/:location/adjust', async (req, res) => {
    try {
        const safe = req.params.location.replace(/[^a-zA-Z0-9 _\-]/g, '').replace(/\s+/g, '_');
        const locFile = path.join(LOCATIONS_DIR, `${safe}.csv`);
        
        await executeWithWriteLock(locFile, async () => {
            const { part_number, action, quantity, user } = req.body;

            if (!user || !user.trim()) return res.status(400).json({ error: 'User name required' });
            if (!part_number) return res.status(400).json({ error: 'Part number required' });
            if (!['add', 'subtract'].includes(action)) return res.status(400).json({ error: 'Action must be add or subtract' });
            const qty = parseInt(quantity, 10);
            if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Quantity must be a positive integer' });

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
            const allHeaders = headers.length ? headers : ['part_number', 'quantity', 'par_level'];
            await fsp.writeFile(locFile, rowsToCSV(allHeaders, rows), 'utf8');

            // Append to transaction log
            const ts = new Date().toISOString();
            const logLine = `\n${ts},${escapeCSVField(user.trim())},${escapeCSVField(safe)},${escapeCSVField(part_number)},${action},${qty},${newQty}`;
            await appendTransaction(safe, logLine);

            // When adding stock, reduce on-order quantity accordingly
            let newOnOrder = undefined;
            if (action === 'add') {
                try {
                    const ordersFile = ordersFileForLocation(safe);
                    await ensureOrdersFile(ordersFile);
                    const ordersText = await fsp.readFile(ordersFile, 'utf8');
                    const orderMap = parseOrdersCSV(ordersText);
                    const onOrder = orderMap[part_number] || 0;
                    if (onOrder > 0) {
                        orderMap[part_number] = Math.max(0, onOrder - qty);
                        newOnOrder = orderMap[part_number];
                        await fsp.writeFile(ordersFile, ordersMapToCSV(orderMap), 'utf8');
                    } else {
                        newOnOrder = 0;
                    }
                } catch { /* orders file not available */ }
            }

            // Check if part is obsolete and add warning if so
            const response = { part_number, quantity: newQty, ...(newOnOrder !== undefined ? { on_order: newOnOrder } : {}) };
            if (obsoleteMap.hasOwnProperty(part_number)) {
                response.warning = `Part ${part_number} is obsolete. Using ${obsoleteMap[part_number]} in reorders.`;
            }
            res.json(response);
        });
    } catch (err) {
        if (err.code === 'ENOENT') return res.status(404).json({ error: 'Location not found' });
        res.status(500).json({ error: err.message });
    }
});

// ─── API: Coordinates ────────────────────────────────────────────────────────

// PUT /api/inventory/:location/:partNumber/coordinates — update aisle/rack/shelf
// Body: { aisle, rack, shelf }
app.put('/api/inventory/:location/:partNumber/coordinates', async (req, res) => {
    try {
        const safe = req.params.location.replace(/[^a-zA-Z0-9 _\-]/g, '').replace(/\s+/g, '_');
        const pn = req.params.partNumber;
        const { aisle, rack, shelf } = req.body;

        // Validate coordinates: max 3 chars each, alphanumeric + hyphen/underscore
        const coordPattern = /^[a-zA-Z0-9\-_]{0,3}$/;
        if (aisle && !coordPattern.test(aisle)) return res.status(400).json({ error: 'aisle must be max 3 chars (alphanumeric, -, _)' });
        if (rack && !coordPattern.test(rack)) return res.status(400).json({ error: 'rack must be max 3 chars (alphanumeric, -, _)' });
        if (shelf && !coordPattern.test(shelf)) return res.status(400).json({ error: 'shelf must be max 3 chars (alphanumeric, -, _)' });

        const locFile = path.join(LOCATIONS_DIR, `${safe}.csv`);
        
        await executeWithWriteLock(locFile, async () => {
            const invText = await fsp.readFile(locFile, 'utf8');
            const { headers, rows } = parseCSV(invText);

            // Ensure coordinate columns exist
            if (!headers.includes('aisle')) headers.push('aisle');
            if (!headers.includes('rack')) headers.push('rack');
            if (!headers.includes('shelf')) headers.push('shelf');

            // Find the part row
            const rowIdx = rows.findIndex(r => r.part_number === pn);
            if (rowIdx === -1) return res.status(404).json({ error: 'Part not found in this location' });

            rows[rowIdx].aisle = aisle || '';
            rows[rowIdx].rack = rack || '';
            rows[rowIdx].shelf = shelf || '';

            await fsp.writeFile(locFile, rowsToCSV(headers, rows), 'utf8');
            res.json({ part_number: pn, aisle: aisle || '', rack: rack || '', shelf: shelf || '' });
        });
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
        let rows;
        if (req.query.location) {
            const safe = req.query.location.replace(/[^a-zA-Z0-9_\-]/g, '');
            const locFile = txFileForLocation(safe);
            try {
                rows = parseCSV(await fsp.readFile(locFile, 'utf8')).rows;
            } catch {
                // Per-location file not yet created — fall back to main file
                await ensureTransactionsFile();
                rows = parseCSV(await fsp.readFile(TRANSACTIONS_FILE, 'utf8')).rows
                    .filter(r => r.location === safe);
            }
        } else {
            await ensureTransactionsFile();
            rows = parseCSV(await fsp.readFile(TRANSACTIONS_FILE, 'utf8')).rows;
        }

        let filtered = rows;
        if (req.query.part_number) filtered = filtered.filter(r => r.part_number === req.query.part_number);
        if (req.query.user) filtered = filtered.filter(r => r.user.toLowerCase().includes(req.query.user.toLowerCase()));
        if (req.query.from) filtered = filtered.filter(r => r.timestamp >= req.query.from);
        if (req.query.to)   filtered = filtered.filter(r => r.timestamp <= req.query.to);

        // Return newest first
        filtered.reverse();

        const page     = parseInt(req.query.page, 10) || 1;
        const pageSize = parseInt(req.query.pageSize, 10) || 50;
        const total    = filtered.length;
        const paged    = filtered.slice((page - 1) * pageSize, page * pageSize);

        res.json({ total, page, pageSize, rows: paged });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── API: Orders ─────────────────────────────────────────────────────────────

// GET /api/orders?location= — returns { part_number: qty_on_order } map for a location
app.get('/api/orders', async (req, res) => {
    try {
        const loc = (req.query.location || '').replace(/[^a-zA-Z0-9_\-]/g, '');
        if (!loc) return res.status(400).json({ error: 'location query parameter required' });
        const ordersFile = ordersFileForLocation(loc);
        await ensureOrdersFile(ordersFile);
        const text = await fsp.readFile(ordersFile, 'utf8');
        res.json(parseOrdersCSV(text));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/orders/upload — body: { csv: "..." } — merges (adds) quantities
app.post('/api/orders/upload', async (req, res) => {
    try {
        const { csv, location } = req.body;
        if (!csv || typeof csv !== 'string') return res.status(400).json({ error: 'CSV content required' });
        const safeLoc = (location || '').replace(/[^a-zA-Z0-9_\-]/g, '');
        if (!safeLoc) return res.status(400).json({ error: 'location required — select a location before uploading a PO' });
        
        // Block PO uploads for truck locations
        if (safeLoc.toLowerCase().startsWith('truck_')) {
            return res.status(403).json({ error: 'Cannot upload POs for truck stocks' });
        }

        // Detect binary/Excel files read as text (contain null bytes or excessive control characters)
        if (/[\x00-\x08\x0B-\x0C\x0E-\x1F]/.test(csv.slice(0, 500))) {
            return res.status(400).json({ error: 'File appears to be binary (Excel .xlsx?). Please convert to CSV format and try again.' });
        }

        const { headers, rows } = parseCSV(csv);
        // No silent fallback to column index — require detectable headers
        const pnCol  = headers.find(h => /part.?num|part.?no|partno|\bpn\b|\bsku\b/i.test(h));
        const qtyCol = headers.find(h => /qty|quantity/i.test(h) && h !== pnCol);
        const descCol = headers.find(h => /description|desc|desc\.|description\.|notes/i.test(h) && h !== pnCol);
        if (!pnCol) return res.status(400).json({ error: 'Could not detect a part number column (expected: part_number, pn, partno, sku, etc.)' });
        if (!qtyCol) return res.status(400).json({ error: 'Could not detect a quantity column (expected: qty, quantity)' });

        // Part numbers must be exactly 8 digits
        const PN_FORMAT = /^\d{8}$/;

        const ordersFile = ordersFileForLocation(safeLoc);
        const locFile = path.join(LOCATIONS_DIR, `${safeLoc}.csv`);
        
        // Acquire locks on ordersFile and locFile in sorted order
        const [lockFile1, lockFile2] = [ordersFile, locFile].sort();
        const release1 = await acquireWriteLock(lockFile1);
        const release2 = lockFile1 !== lockFile2 ? await acquireWriteLock(lockFile2) : () => {};

        try {
            await ensureOrdersFile(ordersFile);
            const existingText = await fsp.readFile(ordersFile, 'utf8');
            
            // Save upload history with the uploaded CSV and original filename
            const uploadId = await saveUploadHistory(safeLoc, 'PO', csv, req.body.filename || 'upload.csv');
            
            const orderMap = parseOrdersCSV(existingText);

            let added = 0, skipped = 0;
            const newPns = [];
            const newOrdersForParts = {}; // Track quantities for new parts to auto-set par
            const partDescriptions = {}; // Track descriptions for new parts
            rows.forEach(row => {
                const pn  = (row[pnCol]  || '').trim();
                const qty = parseInt(row[qtyCol], 10) || 0;
                const desc = descCol ? (row[descCol] || '').trim() : '';
                if (!PN_FORMAT.test(pn)) { skipped++; return; }
                if (qty > 0) {
                    const isNew = !(pn in orderMap);
                    orderMap[pn] = (orderMap[pn] || 0) + qty;
                    added++;
                    if (isNew) {
                        newPns.push(pn);
                        newOrdersForParts[pn] = qty;
                        if (desc && !partDescriptions[pn]) {
                            partDescriptions[pn] = desc;
                        }
                    }
                }
            });

            await fsp.writeFile(ordersFile, ordersMapToCSV(orderMap), 'utf8');

            // Auto-set par_level for new parts with no history at this location
            if (newPns.length > 0) {
                try {
                    const locText = await fsp.readFile(locFile, 'utf8');
                    const { headers, rows: locRows } = parseCSV(locText);
                    
                    // Ensure par_level column exists
                    if (!headers.includes('par_level')) {
                        headers.push('par_level');
                    }
                    
                    let updated = false;
                    // For each new part order, if it has no qty and no par at location, set par to order qty
                    locRows.forEach(row => {
                        if (newPns.includes(row.part_number)) {
                            const hasNoQty = (parseInt(row.quantity, 10) || 0) === 0;
                            const hasNoPar = !row.par_level || parseInt(row.par_level, 10) === 0;
                            
                            if (hasNoQty && hasNoPar) {
                                row.par_level = newOrdersForParts[row.part_number];
                                updated = true;
                            }
                        }
                    });
                    
                    if (updated) {
                        await fsp.writeFile(locFile, rowsToCSV(headers, locRows), 'utf8');
                    }
                } catch { /* location file may not exist yet - non-fatal */ }
            }

            // Add brand-new part numbers to master parts.csv
            if (newPns.length > 0) {
                try {
                    const partsText = await fsp.readFile(PARTS_FILE, 'utf8');
                    const { headers: partsHeaders, rows: partsRows } = parseCSV(partsText);
                    const partsPnCol = partsHeaders.find(h => /part.?num|part.?no|partno|\bpn\b|\bsku\b/i.test(h)) || partsHeaders[0];
                    const partsDescCol = partsHeaders.find(h => /^description$/i.test(h));
                    const existingPns = new Set(partsRows.map(r => (r[partsPnCol] || '').trim()));
                    newPns.forEach(pn => {
                        if (!existingPns.has(pn)) {
                            const newRow = {};
                            partsHeaders.forEach(h => { newRow[h] = ''; });
                            newRow[partsPnCol] = pn;
                            // Populate description if provided in upload CSV
                            if (partsDescCol && partDescriptions[pn]) {
                                newRow[partsDescCol] = partDescriptions[pn];
                            }
                            partsRows.push(newRow);
                        }
                    });
                    await fsp.writeFile(PARTS_FILE, rowsToCSV(partsHeaders, partsRows), 'utf8');
                } catch { /* parts file not available — non-fatal */ }
            }

            const total = Object.values(orderMap).filter(q => q > 0).length;
            res.json({ merged: added, skipped, newToMaster: newPns.length, total, uploadId });
        } finally {
            release2();
            release1();
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/inventory/:location/bulk-receive — body: { csv, user } — adds quantities directly to shed stock
app.post('/api/inventory/:location/bulk-receive', async (req, res) => {
    try {
        const safe = req.params.location.replace(/[^a-zA-Z0-9 _\-]/g, '').replace(/\s+/g, '_');
        const { csv, user } = req.body;
        if (!csv || typeof csv !== 'string') return res.status(400).json({ error: 'CSV content required' });
        if (!user || !user.trim()) return res.status(400).json({ error: 'User name required' });

        // Detect binary/Excel files read as text (contain null bytes or excessive control characters)
        if (/[\x00-\x08\x0B-\x0C\x0E-\x1F]/.test(csv.slice(0, 500))) {
            return res.status(400).json({ error: 'File appears to be binary (Excel .xlsx?). Please convert to CSV format and try again.' });
        }

        const { headers: csvHeaders, rows: csvRows } = parseCSV(csv);
        // Gap 4: require detectable headers — no silent fallback to column index
        const pnCol  = csvHeaders.find(h => /part.?num|part.?no|partno|\bpn\b|\bsku\b/i.test(h));
        const qtyCol = csvHeaders.find(h => /qty|quantity/i.test(h) && h !== pnCol);
        if (!pnCol) return res.status(400).json({ error: 'Could not detect a part number column (expected: part_number, pn, partno, sku, etc.)' });
        if (!qtyCol) return res.status(400).json({ error: 'Could not detect a quantity column (expected: qty, quantity)' });

        // Part numbers must be exactly 8 digits
        const PN_FORMAT = /^\d{8}$/;
        let skipped = 0;

        // Build map of quantities to add — only valid 8-digit part numbers with qty > 0
        const addMap = {};
        csvRows.forEach(row => {
            const pn  = (row[pnCol] || '').trim();
            const qty = parseInt(row[qtyCol], 10) || 0;
            if (pn && !PN_FORMAT.test(pn)) { skipped++; return; }
            if (PN_FORMAT.test(pn) && qty > 0) addMap[pn] = (addMap[pn] || 0) + qty;
        });
        if (Object.keys(addMap).length === 0) return res.status(400).json({ error: 'No valid rows found in CSV (part numbers must be 8 digits)' });

        const locFile = path.join(LOCATIONS_DIR, `${safe}.csv`);
        const ordersFile = ordersFileForLocation(safe);
        
        // Acquire locks on locFile and ordersFile in sorted order
        const [lockFile1, lockFile2] = [locFile, ordersFile].sort();
        const release1 = await acquireWriteLock(lockFile1);
        const release2 = lockFile1 !== lockFile2 ? await acquireWriteLock(lockFile2) : () => {};

        try {
            // Read current location inventory for upload history
            const invText = await fsp.readFile(locFile, 'utf8');
            
            // Capture current on-order quantities before the upload (for rollback)
            const ordersText = await fsp.readFile(ordersFile, 'utf8');
            const beforeOrderState = parseOrdersCSV(ordersText);
            
            // Save upload history with the uploaded CSV and original filename
            const uploadId = await saveUploadHistory(safe, 'RecParts', csv, req.body.filename || 'upload.csv', beforeOrderState);

            // Parse the inventory
            const { headers: invHeaders, rows: invRows } = parseCSV(invText);
            const allHeaders = invHeaders.length ? invHeaders : ['part_number', 'quantity'];

            const ts = new Date().toISOString();
            const logLines = [];
            let received = 0;
            const newParts = [];
            const partDescriptions = {}; // Track descriptions from CSV
            
            // Build description map from CSV
            const descCol = csvHeaders.find(h => /description|desc|desc\.|description\.|notes/i.test(h) && h !== pnCol);
            csvRows.forEach(row => {
                const pn = (row[pnCol] || '').trim();
                const desc = descCol ? (row[descCol] || '').trim() : '';
                if (PN_FORMAT.test(pn) && desc && !partDescriptions[pn]) {
                    partDescriptions[pn] = desc;
                }
            });

            Object.entries(addMap).forEach(([pn, qty]) => {
                // Gap 3: trim inventory-side part numbers before comparing
                const rowIdx = invRows.findIndex(r => (r.part_number || '').trim() === pn);
                if (rowIdx === -1) {
                    // New part — add as a new row in the location inventory
                    const newRow = {};
                    allHeaders.forEach(h => { newRow[h] = ''; });
                    newRow.part_number = pn;
                    newRow.quantity = qty;
                    invRows.push(newRow);
                    logLines.push(`\n${ts},${escapeCSVField(user.trim())},${escapeCSVField(safe)},${escapeCSVField(pn)},add,${qty},${qty}`);
                    newParts.push(pn);
                    received++;
                    return;
                }
                const current = parseInt(invRows[rowIdx].quantity, 10) || 0;
                invRows[rowIdx].quantity = current + qty;
                logLines.push(`\n${ts},${escapeCSVField(user.trim())},${escapeCSVField(safe)},${escapeCSVField(pn)},add,${qty},${current + qty}`);
                received++;
            });

            await fsp.writeFile(locFile, rowsToCSV(allHeaders, invRows), 'utf8');

            if (logLines.length > 0) {
                await appendTransaction(safe, logLines.join(''));
            }

            // Add new parts to master parts.csv
            if (newParts.length > 0) {
                try {
                    const partsText = await fsp.readFile(PARTS_FILE, 'utf8');
                    const { headers: partsHeaders, rows: partsRows } = parseCSV(partsText);
                    const partsPnCol = partsHeaders.find(h => /part.?num|part.?no|partno|\bpn\b|\bsku\b/i.test(h)) || partsHeaders[0];
                    const partsDescCol = partsHeaders.find(h => /^description$/i.test(h));
                    const existingPns = new Set(partsRows.map(r => (r[partsPnCol] || '').trim()));
                    newParts.forEach(pn => {
                        if (!existingPns.has(pn)) {
                            const newRow = {};
                            partsHeaders.forEach(h => { newRow[h] = ''; });
                            newRow[partsPnCol] = pn;
                            // Populate description if provided in upload CSV
                            if (partsDescCol && partDescriptions[pn]) {
                                newRow[partsDescCol] = partDescriptions[pn];
                            }
                            partsRows.push(newRow);
                        }
                    });
                    await fsp.writeFile(PARTS_FILE, rowsToCSV(partsHeaders, partsRows), 'utf8');
                } catch { /* parts file not available — non-fatal */ }
            }

            // Decrement on-order quantities for received parts (per-location)
            if (received > 0) {
                try {
                    await ensureOrdersFile(ordersFile);
                    const ordersText = await fsp.readFile(ordersFile, 'utf8');
                    const orderMap = parseOrdersCSV(ordersText);
                    Object.entries(addMap).forEach(([pn, qty]) => {
                        if (orderMap[pn] > 0) orderMap[pn] = Math.max(0, orderMap[pn] - qty);
                    });
                    await fsp.writeFile(ordersFile, ordersMapToCSV(orderMap), 'utf8');
                } catch { /* orders file not available */ }
            }

            res.json({ received, skipped, newToMaster: newParts.length, uploadId });
        } finally {
            release2();
            release1();
        }
    } catch (err) {
        if (err.code === 'ENOENT') return res.status(404).json({ error: 'Location not found' });
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/orders/:partNumber — manually set on-order quantity
app.put('/api/orders/:partNumber', async (req, res) => {
    try {
        const pn  = req.params.partNumber;
        const { quantity_on_order, location } = req.body;
        const qty = parseInt(quantity_on_order, 10);
        if (isNaN(qty) || qty < 0) return res.status(400).json({ error: 'quantity_on_order must be >= 0' });
        const safeLoc = (location || '').replace(/[^a-zA-Z0-9_\-]/g, '');
        if (!safeLoc) return res.status(400).json({ error: 'location required' });

        const ordersFile = ordersFileForLocation(safeLoc);
        
        await executeWithWriteLock(ordersFile, async () => {
            await ensureOrdersFile(ordersFile);
            const text = await fsp.readFile(ordersFile, 'utf8');
            const orderMap = parseOrdersCSV(text);
            orderMap[pn] = qty;
            await fsp.writeFile(ordersFile, ordersMapToCSV(orderMap), 'utf8');
            res.json({ part_number: pn, quantity_on_order: qty });
        });
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

        const ordersFile = ordersFileForLocation(safe);
        const locFile = path.join(LOCATIONS_DIR, `${safe}.csv`);
        
        // Acquire locks on ordersFile and locFile in sorted order
        const [lockFile1, lockFile2] = [ordersFile, locFile].sort();
        const release1 = await acquireWriteLock(lockFile1);
        const release2 = lockFile1 !== lockFile2 ? await acquireWriteLock(lockFile2) : () => {};

        try {
            await ensureOrdersFile(ordersFile);
            const ordersText = await fsp.readFile(ordersFile, 'utf8');
            const orderMap = parseOrdersCSV(ordersText);

            const onOrderQty = orderMap[pn] || 0;
            if (onOrderQty === 0) return res.status(400).json({ error: 'No quantity on order for this part' });

            const invText = await fsp.readFile(locFile, 'utf8');
            const { headers, rows } = parseCSV(invText);

            const rowIdx = rows.findIndex(r => r.part_number === pn);
            if (rowIdx === -1) return res.status(404).json({ error: 'Part not found in this location' });

            const current = parseInt(rows[rowIdx].quantity, 10) || 0;
            const newQty  = current + onOrderQty;
            rows[rowIdx].quantity = newQty;
            await fsp.writeFile(locFile, rowsToCSV(headers.length ? headers : ['part_number', 'quantity'], rows), 'utf8');

            delete orderMap[pn];
            await fsp.writeFile(ordersFile, ordersMapToCSV(orderMap), 'utf8');

            const ts = new Date().toISOString();
            await appendTransaction(safe,
                `\n${ts},${escapeCSVField(user.trim())},${escapeCSVField(safe)},${escapeCSVField(pn)},receive,${onOrderQty},${newQty}`);

            res.json({ part_number: pn, quantity: newQty, quantity_on_order: 0, received: onOrderQty });
        } finally {
            release2();
            release1();
        }
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
            let csvContent = 'part_number,quantity,aisle,rack,shelf\n';
            try {
                const partsText = await fsp.readFile(PARTS_FILE, 'utf8');
                const { headers, rows } = parseCSV(partsText);
                const pnCol = headers.find(h => /part.?num|part.?no|partno|\bpn\b|\bsku\b/i.test(h)) || headers[0];
                rows.forEach(row => { const pn = row[pnCol] || ''; if (pn) csvContent += `${pn},0,,,\n`; });
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

        // Acquire locks on both files in sorted order to prevent deadlocks
        const [lockFile1, lockFile2] = [fromFile, toFile].sort();
        const release1 = await acquireWriteLock(lockFile1);
        const release2 = lockFile1 !== lockFile2 ? await acquireWriteLock(lockFile2) : () => {};

        try {
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

            const ts = new Date().toISOString();
            const u  = escapeCSVField(user.trim());
            const pn = escapeCSVField(part_number);
            await appendTransaction(safeFrom, `\n${ts},${u},${escapeCSVField(safeFrom)},${pn},transfer-out,${qty},${newFromQty}`);
            await appendTransaction(safeTo,   `\n${ts},${u},${escapeCSVField(safeTo)},${pn},transfer-in,${qty},${newToQty}`);

            res.json({
                part_number,
                from: { location: safeFrom, quantity: newFromQty },
                to:   { location: safeTo,   quantity: newToQty }
            });
        } finally {
            release2();
            release1();
        }
    } catch (err) {
        if (err.code === 'ENOENT') return res.status(404).json({ error: 'Location not found' });
        res.status(500).json({ error: err.message });
    }
});

// ─── API: City Groups ────────────────────────────────────────────────────────

app.get('/api/city-groups', async (req, res) => {
    try {
        const text = await fsp.readFile(CITY_GROUPS_FILE, 'utf8');
        res.json(JSON.parse(text));
    } catch (err) {
        if (err.code === 'ENOENT') return res.json({});
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/city-groups', async (req, res) => {
    try {
        const groups = req.body;
        if (typeof groups !== 'object' || Array.isArray(groups) || groups === null) {
            return res.status(400).json({ error: 'Expected a JSON object' });
        }
        for (const [city, locs] of Object.entries(groups)) {
            if (typeof city !== 'string' || !Array.isArray(locs) || !locs.every(l => typeof l === 'string')) {
                return res.status(400).json({ error: 'Invalid format: values must be arrays of strings' });
            }
        }
        await fsp.writeFile(CITY_GROUPS_FILE, JSON.stringify(groups, null, 2), 'utf8');
        res.json(groups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Start ────────────────────────────────────────────────────────────────────

// Migrate existing transactions.csv into per-location files on startup
async function migrateTransactionsToPerLocation() {
    try {
        const text = await fsp.readFile(TRANSACTIONS_FILE, 'utf8');
        const { rows } = parseCSV(text);
        if (rows.length === 0) return;
        const byLocation = {};
        rows.forEach(row => {
            const loc = (row.location || '').replace(/[^a-zA-Z0-9_\-]/g, '');
            if (!loc) return;
            if (!byLocation[loc]) byLocation[loc] = [];
            byLocation[loc].push(row);
        });
        await fsp.mkdir(TRANSACTIONS_DIR, { recursive: true });
        const headers = ['timestamp', 'user', 'location', 'part_number', 'action', 'quantity', 'balance_after'];
        let created = 0;
        for (const [loc, locRows] of Object.entries(byLocation)) {
            const file = txFileForLocation(loc);
            try { await fsp.access(file); continue; } catch { /* file doesn't exist yet */ }
            await fsp.writeFile(file, rowsToCSV(headers, locRows), 'utf8');
            created++;
        }
        if (created > 0) console.log(`[InTracker] Migrated transactions into ${created} per-location file(s)`);
    } catch (err) {
        if (err.code !== 'ENOENT') console.error('[InTracker] Transaction migration error:', err.message);
    }
}

// ─── API: Upload History ─────────────────────────────────────────────────────

// GET /api/upload-history/:location — list recent uploads for a location
app.get('/api/upload-history/:location', async (req, res) => {
    try {
        const location = req.params.location;
        const uploads = await getUploadHistory(location);
        res.json({ location, uploads });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/reverse-upload/:location/:uploadId — reverse the changes from a specific upload
app.post('/api/reverse-upload/:location/:uploadId', async (req, res) => {
    try {
        const { location, uploadId } = req.params;
        const result = await reverseUpload(location, uploadId);
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Startup ──────────────────────────────────────────────────────────────────

scheduleHourlyBackup();
migrateTransactionsToPerLocation();
loadZ10Descriptions();
loadObsoleteList();

app.listen(PORT, () => {
    const env = process.env.DATA_DIR ? 'DEVELOPMENT' : 'PRODUCTION';
    console.log(`InTracker [${env}] running at http://localhost:${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
});

/**
 * InTracker App
 * Mobile-first inventory tracking frontend
 */

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
    user: '',
    location: '',
    inventory: [],
    partsHeaders: [],
    txnPage: 1,
    txnPageSize: 30,
    txnTotal: 0,
    txnUserFilter: '',
    txnPartFilter: '',
    equipFilter: '',
    sortKey: 'default',
    truckLocation: '',
    isTruckMode: false,
    locInventory: [],
    truckInventory: [],
    hideOrder: true
};

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const inputUser       = $('input-user');
const nameBanner      = document.querySelector('.name-banner');
const selectLocation  = $('select-location');
const locationBar     = document.querySelector('.location-bar');
const btnNewLocation  = $('btn-new-location');
const btnTransactions = $('btn-transactions');
const viewSplash      = $('view-splash');
const viewInventory   = $('view-inventory');
const viewTransactions= $('view-transactions');
const viewTruck        = $('view-truck');
const partsList       = $('parts-list');
const noResults       = $('no-results');
const inputSearch          = $('input-search');
const selectEquipFilter    = $('select-equipment-filter');
const selectSort           = $('select-sort');
const btnReorder           = $('btn-reorder');
const splashText           = $('splash-text');
const btnTruckStock        = $('btn-truck-stock');
const btnExitPo            = $('btn-exit-po');
const inputOrdersCsv       = $('input-orders-csv');

// Transfer modal
const modalTransfer         = $('modal-transfer');
const transferPnDisplay     = $('transfer-pn-display');
const selectTransferLoc     = $('select-transfer-location');
const inputTransferQty      = $('input-transfer-qty');
const transferError         = $('transfer-error');
const btnTransferConfirm    = $('btn-transfer-confirm');
const btnTransferCancel     = $('btn-transfer-cancel');

// New location modal
const modalNewLocation   = $('modal-new-location');
const inputNewLocation   = $('input-new-location');
const newLocError        = $('new-loc-error');
const btnNewLocConfirm   = $('btn-new-loc-confirm');
const btnNewLocCancel    = $('btn-new-loc-cancel');

// Transaction log
const txnList          = $('txn-list');
const txnPagination    = $('txn-pagination');
const txnSearchUser    = $('txn-search-user');
const txnSearchPart    = $('txn-search-part');
const btnBack          = $('btn-back');

const toast            = $('toast');

// ─── Active location helper ────────────────────────────────────────────────────
function activeLocation() {
    return state.isTruckMode ? state.truckLocation : state.location;
}

// ─── Parts list header text ──────────────────────────────────────────────────
function updatePartsListHeader() {
    const isTruck = state.isTruckMode || activeLocation().startsWith('truck_');
    const spans = document.querySelectorAll('#parts-list-header span');
    if (spans[3]) spans[3].textContent = isTruck ? 'Truck QTY' : 'Shed QTY on Hand';
}

// ─── Header height recalculation ──────────────────────────────────────────────
function updateHeaderHeight() {
    const hh = document.getElementById('app-header').offsetHeight;
    document.documentElement.style.setProperty('--header-h', hh + 'px');
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, duration = 2500) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), duration);
}

// ─── View Switcher ────────────────────────────────────────────────────────────
function showView(view) {
    [viewSplash, viewInventory, viewTransactions, viewTruck].forEach(v => v.classList.remove('active'));
    view.classList.add('active');
}

// ─── User Name ────────────────────────────────────────────────────────────────
function applyUserState() {
    const name = state.user.trim();
    if (name) {
        nameBanner.classList.remove('required');
        nameBanner.classList.add('filled');
        locationBar.classList.remove('locked');
        selectLocation.disabled = false;
        btnNewLocation.disabled = false;
        btnTransactions.disabled = false;
        btnTruckStock.disabled = false;
        if (!state.location) {
            splashText.textContent = 'Select a location to view inventory.';
        }
    } else {
        nameBanner.classList.add('required');
        nameBanner.classList.remove('filled');
        locationBar.classList.add('locked');
        selectLocation.disabled = true;
        btnNewLocation.disabled = true;
        btnTransactions.disabled = true;
        btnTruckStock.disabled = true;
        if (state.isTruckMode) {
            state.isTruckMode = false;
            state.locInventory = [];
            state.truckInventory = [];
            btnTruckStock.classList.remove('active');
        }
        state.truckLocation = '';
        removeDropdownTruck();
        splashText.textContent = 'Enter your name above to get started.';
        showView(viewSplash);
        state.location = '';
        selectLocation.value = '';
    }
    updateHeaderHeight();
}

inputUser.addEventListener('input', () => {
    state.user = inputUser.value;
    localStorage.setItem('intracker_user', state.user);
    applyUserState();
    scheduleTruckDropdown();
});

// ─── Locations ────────────────────────────────────────────────────────────────
async function loadLocations() {
    try {
        const res = await fetch('/api/locations');
        const locations = await res.json();
        selectLocation.innerHTML = '<option value="">— Select a Location —</option>';
        locations.sort().forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc;
            opt.textContent = loc.replace(/_/g, ' ');
            selectLocation.appendChild(opt);
        });
        addTruckToDropdown();
        if (state.location) selectLocation.value = state.location;
    } catch (err) {
        showToast('Failed to load locations');
    }
}

// ─── Truck Dropdown Helpers ───────────────────────────────────────────────────
function addTruckToDropdown() {
    if (!state.truckLocation) return;
    let opt = selectLocation.querySelector('option[data-truck]');
    if (!opt) {
        opt = document.createElement('option');
        opt.dataset.truck = '1';
        selectLocation.appendChild(opt);
    }
    opt.value = state.truckLocation;
    opt.textContent = '\uD83D\uDE9B My Truck';
    if (state.location === state.truckLocation) selectLocation.value = state.truckLocation;
}

function removeDropdownTruck() {
    const opt = selectLocation.querySelector('option[data-truck]');
    if (opt) opt.remove();
}

let truckDropdownTimer;
function scheduleTruckDropdown() {
    clearTimeout(truckDropdownTimer);
    if (!state.user.trim()) { removeDropdownTruck(); return; }
    truckDropdownTimer = setTimeout(async () => {
        if (!state.user.trim()) return;
        try {
            const res = await fetch(`/api/truck/${encodeURIComponent(state.user.trim())}`);
            const data = await res.json();
            if (!res.ok) return;
            state.truckLocation = data.location;
            addTruckToDropdown();
        } catch {}
    }, 600);
}

selectLocation.addEventListener('change', () => {
    // Selecting from dropdown exits truck transfer mode
    if (state.isTruckMode) {
        state.isTruckMode = false;
        state.locInventory = [];
        state.truckInventory = [];
        btnTruckStock.classList.remove('active');
    }
    state.location = selectLocation.value;
    if (state.location) {
        loadInventory();
    } else {
        showView(viewSplash);
        splashText.textContent = 'Select a location to view inventory.';
    }
});

// ─── New Location Modal ───────────────────────────────────────────────────────
btnNewLocation.addEventListener('click', () => {
    inputNewLocation.value = '';
    newLocError.classList.add('hidden');
    modalNewLocation.classList.remove('hidden');
    setTimeout(() => inputNewLocation.focus(), 100);
});

btnNewLocCancel.addEventListener('click', () => {
    modalNewLocation.classList.add('hidden');
});

btnNewLocConfirm.addEventListener('click', async () => {
    const name = inputNewLocation.value.trim();
    if (!name) { newLocError.textContent = 'Please enter a name.'; newLocError.classList.remove('hidden'); return; }

    btnNewLocConfirm.disabled = true;
    try {
        const res = await fetch('/api/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await res.json();
        if (!res.ok) { newLocError.textContent = data.error; newLocError.classList.remove('hidden'); return; }

        modalNewLocation.classList.add('hidden');
        await loadLocations();
        selectLocation.value = data.name;
        state.location = data.name;
        await loadInventory();
        showToast(`Location "${data.name.replace(/_/g, ' ')}" created`);
    } catch {
        newLocError.textContent = 'Server error. Please try again.';
        newLocError.classList.remove('hidden');
    } finally {
        btnNewLocConfirm.disabled = false;
    }
});

inputNewLocation.addEventListener('keydown', e => { if (e.key === 'Enter') btnNewLocConfirm.click(); });

// ─── Inventory ────────────────────────────────────────────────────────────────
async function loadInventory() {
    partsList.innerHTML = '<div class="splash-message"><div class="splash-icon">&#8635;</div><p>Loading...</p></div>';
    showView(viewInventory);
    const locationToLoad = activeLocation();
    try {
        const res = await fetch(`/api/inventory/${encodeURIComponent(locationToLoad)}`);
        const data = await res.json();
        if (!res.ok) { showToast(data.error || 'Failed to load inventory'); showView(viewSplash); return; }
        state.inventory = data.inventory;
        state.partsHeaders = data.partsHeaders;
        updatePartsListHeader();
        populateEquipmentFilter();
        renderInventory();
        applyOrderVisibility();
    } catch {
        showToast('Failed to load inventory');
        showView(viewSplash);
    }
}

function applyOrderVisibility() {
    const hide = state.hideOrder || activeLocation().startsWith('truck_');
    viewInventory.classList.toggle('order-hidden', hide);
    btnExitPo.classList.toggle('hidden', state.hideOrder);
}

function populateEquipmentFilter() {
    const equipSet = new Set();
    state.inventory.forEach(item => {
        const e = getEquipment(item);
        if (e) equipSet.add(e);
    });
    const current = selectEquipFilter.value;
    selectEquipFilter.innerHTML = '<option value="">All Equipment</option>';
    [...equipSet].sort().forEach(e => {
        const opt = document.createElement('option');
        opt.value = e;
        opt.textContent = e;
        selectEquipFilter.appendChild(opt);
    });
    if (current && equipSet.has(current)) selectEquipFilter.value = current;
    else state.equipFilter = '';
}

function getDescription(item) {
    const descKey = Object.keys(item).find(k => /desc/i.test(k) && k !== 'part_number');
    return descKey ? item[descKey] : '';
}

function getEquipment(item) {
    const key = Object.keys(item).find(k => /related_equipment|equipment/i.test(k));
    return key ? item[key] : '';
}

function getParLevel(item) {
    const key = Object.keys(item).find(k => /par_level|parlevel/i.test(k));
    return key ? parseInt(item[key], 10) || 0 : 0;
}

function renderInventory(filter = '') {
    const term = filter.toLowerCase().trim();

    let filtered = state.inventory.filter(item => {
        const matchSearch = !term ||
            item.part_number.toLowerCase().includes(term) ||
            getDescription(item).toLowerCase().includes(term) ||
            getEquipment(item).toLowerCase().includes(term);
        const matchEquip = !state.equipFilter ||
            getEquipment(item) === state.equipFilter;
        return matchSearch && matchEquip;
    });

    // Sort
    const s = state.sortKey;
    if (s !== 'default') {
        filtered = [...filtered].sort((a, b) => {
            if (s === 'pn-asc')    return a.part_number.localeCompare(b.part_number);
            if (s === 'pn-desc')   return b.part_number.localeCompare(a.part_number);
            if (s === 'qty-asc')   return a.quantity - b.quantity;
            if (s === 'qty-desc')  return b.quantity - a.quantity;
            if (s === 'desc-asc')  return getDescription(a).localeCompare(getDescription(b));
            if (s === 'desc-desc') return getDescription(b).localeCompare(getDescription(a));
            if (s === 'equip-asc') return getEquipment(a).localeCompare(getEquipment(b));
            return 0;
        });
    }

    partsList.innerHTML = '';
    if (filtered.length === 0) {
        noResults.classList.remove('hidden');
        return;
    }
    noResults.classList.add('hidden');

    const frag = document.createDocumentFragment();
    filtered.forEach(item => {
        const qty = item.quantity;
        const desc = getDescription(item);
        const equip = getEquipment(item);
        const parLevel = getParLevel(item);
        const onOrder = item.on_order || 0;
        const belowPar = !state.isTruckMode && parLevel > 0 && qty < parLevel;
        const descLine = desc + (equip ? ` \u2022 ${equip}` : '');
        const disabled = !state.user ? 'disabled' : '';
        const qtyClass = qty === 0 ? 'zero' : qty <= 5 ? 'low' : '';
        const orderClass = onOrder > 0 ? ' has-order' : '';
        const parDisplay = (!state.isTruckMode && parLevel > 0) ? parLevel : '&mdash;';
        const card = document.createElement('div');
        card.className = `part-card${belowPar ? ' below-par' : ''}`;
        card.innerHTML = `
            <span class="part-pn">${escapeHtml(item.part_number)}</span>
            <span class="part-desc">${escapeHtml(descLine)}</span>
            <span class="part-par"><span class="par-label">Par</span>${parDisplay}</span>
            <span class="part-order${orderClass}" data-pn="${escapeAttr(item.part_number)}">
                <span class="order-label">On Ord</span>
                ${onOrder > 0 ? onOrder : '&mdash;'}
                ${onOrder > 0 ? `<button class="btn-receive" data-pn="${escapeAttr(item.part_number)}" ${disabled} title="Receive ${onOrder} unit(s) into current location">&#10003; Rcv</button>` : ''}
            </span>
            <div class="part-controls">
                <button class="btn-adj btn-sub" data-pn="${escapeAttr(item.part_number)}" data-action="subtract" ${disabled} title="Subtract">&#8722;</button>
                <input class="part-qty-input ${qtyClass}" type="number" value="${qty}" min="0" data-pn="${escapeAttr(item.part_number)}" ${disabled} aria-label="Quantity for ${escapeAttr(item.part_number)}">
                <button class="btn-adj btn-add" data-pn="${escapeAttr(item.part_number)}" data-action="add" ${disabled} title="Add">&#43;</button>
            </div>
            `;
        frag.appendChild(card);
    });
    partsList.appendChild(frag);
}

inputSearch.addEventListener('input', () => renderInventory(inputSearch.value));

selectEquipFilter.addEventListener('change', () => {
    state.equipFilter = selectEquipFilter.value;
    renderInventory(inputSearch.value);
});

selectSort.addEventListener('change', () => {
    state.sortKey = selectSort.value;
    renderInventory(inputSearch.value);
});

// ─── Card Display Update Helper ───────────────────────────────────────────────
function updateCardDisplay(pn, newQty, newOnOrder) {
    const input = partsList.querySelector(`.part-qty-input[data-pn="${escapeAttr(pn)}"]`);
    if (!input) return;
    input.value = newQty;
    input.className = `part-qty-input ${newQty === 0 ? 'zero' : newQty <= 5 ? 'low' : ''}`;
    const item = state.inventory.find(i => i.part_number === pn);
    const card = input.closest('.part-card');
    if (card && item) {
        const parLevel = getParLevel(item);
        card.classList.toggle('below-par', !state.isTruckMode && parLevel > 0 && newQty < parLevel);
        if (newOnOrder !== undefined) {
            const orderSpan = card.querySelector(`.part-order[data-pn="${escapeAttr(pn)}"]`);
            if (orderSpan) {
                const disabled = !state.user ? 'disabled' : '';
                orderSpan.className = `part-order${newOnOrder > 0 ? ' has-order' : ''}`;
                orderSpan.innerHTML = `<span class="order-label">On Ord</span>
                    ${newOnOrder > 0 ? newOnOrder : '&mdash;'}
                    ${newOnOrder > 0 ? `<button class="btn-receive" data-pn="${escapeAttr(pn)}" ${disabled} title="Receive ${newOnOrder} unit(s) into current location">&#10003; Rcv</button>` : ''}`;
            }
        }
    }
}

// ─── Direct Adjust (+ / - buttons) ───────────────────────────────────────────
async function sendAdjust(part_number, action, quantity) {
    const res = await fetch(`/api/inventory/${encodeURIComponent(activeLocation())}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part_number, action, quantity, user: state.user.trim() })
    });
    return res.json().then(data => ({ ok: res.ok, data }));
}

partsList.addEventListener('click', async e => {
    // Receive button
    const rcvBtn = e.target.closest('.btn-receive');
    if (rcvBtn) { await handleReceive(rcvBtn.dataset.pn, rcvBtn); return; }

    // Transfer button
    const tfBtn = e.target.closest('.btn-transfer');
    if (tfBtn) { openTransferModal(tfBtn.dataset.pn); return; }

    const btn = e.target.closest('.btn-adj');
    if (!btn) return;
    if (!state.user.trim()) { showToast('Please enter your name first'); return; }

    const pn = btn.dataset.pn;
    const action = btn.dataset.action;
    const item = state.inventory.find(i => i.part_number === pn);
    if (!item) return;

    btn.disabled = true;
    try {
        const { ok, data } = await sendAdjust(pn, action, 1);
        if (!ok) { showToast(data.error || 'Error adjusting quantity', 3000); return; }
        item.quantity = data.quantity;
        if (data.on_order !== undefined) item.on_order = data.on_order;
        updateCardDisplay(pn, data.quantity, data.on_order);
        showToast(`${action === 'add' ? '+1' : '-1'} ${pn} → ${data.quantity}`);
    } catch {
        showToast('Server error. Please try again.', 3000);
    } finally {
        btn.disabled = false;
    }
});

// ─── Inline qty edit (tap the number, type directly) ─────────────────────────
partsList.addEventListener('change', async e => {
    const input = e.target.closest('.part-qty-input');
    if (!input) return;
    if (!state.user.trim()) { showToast('Please enter your name first'); return; }

    const pn = input.dataset.pn;
    const item = state.inventory.find(i => i.part_number === pn);
    if (!item) return;

    const newQty = parseInt(input.value, 10);
    if (isNaN(newQty) || newQty < 0) { input.value = item.quantity; return; }
    if (newQty === item.quantity) return;

    const diff = Math.abs(newQty - item.quantity);
    const action = newQty > item.quantity ? 'add' : 'subtract';

    input.disabled = true;
    try {
        const { ok, data } = await sendAdjust(pn, action, diff);
        if (!ok) {
            showToast(data.error || 'Error adjusting quantity', 3000);
            input.value = item.quantity;
            return;
        }
        item.quantity = data.quantity;
        if (data.on_order !== undefined) item.on_order = data.on_order;
        updateCardDisplay(pn, data.quantity, data.on_order);
        showToast(`${pn} → ${data.quantity} in stock`);
    } catch {
        showToast('Server error. Please try again.', 3000);
        input.value = item.quantity;
    } finally {
        input.disabled = false;
    }
});

// Close new-location modal on backdrop click
modalNewLocation.addEventListener('click', e => {
    if (e.target === modalNewLocation) modalNewLocation.classList.add('hidden');
});

// ─── Reorder CSV Download ────────────────────────────────────────────────────
function csvEscape(val) {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
}

btnReorder.addEventListener('click', () => {
    const belowPar = state.inventory.filter(item => {
        const p = getParLevel(item);
        return p > 0 && item.quantity < p;
    });

    if (belowPar.length === 0) {
        showToast('No parts are below par level', 3000);
        return;
    }

    const lines = ['part_number,description,quantity_needed'];
    belowPar.forEach(item => {
        const needed = getParLevel(item) - item.quantity;
        lines.push([item.part_number, getDescription(item), needed].map(csvEscape).join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const loc = state.location ? state.location.replace(/_/g, '-') : 'inventory';
    const date = new Date().toISOString().slice(0, 10);
    a.download = `reorder_${loc}_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Reorder list downloaded (${belowPar.length} part${belowPar.length === 1 ? '' : 's'})`);
});

// ─── Receive on-order item ────────────────────────────────────────────────────
async function handleReceive(pn, btn) {
    if (!state.user.trim()) { showToast('Please enter your name first'); return; }
    const loc = activeLocation();
    if (!loc) { showToast('Select a location first'); return; }

    btn.disabled = true;
    try {
        const res = await fetch(`/api/orders/${encodeURIComponent(pn)}/receive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location: loc, user: state.user.trim() })
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.error || 'Receive failed', 3000); return; }

        const item = state.inventory.find(i => i.part_number === pn);
        if (item) { item.quantity = data.quantity; item.on_order = 0; }
        showToast(`Received ${data.received} \xd7 ${pn} \u2192 qty now ${data.quantity}`);
        renderInventory(inputSearch.value);
    } catch {
        showToast('Server error during receive', 3000);
    } finally {
        btn.disabled = false;
    }
}

// ─── Upload Orders CSV ────────────────────────────────────────────────────────
inputOrdersCsv.addEventListener('change', () => {
    const file = inputOrdersCsv.files[0];
    if (!file) return;
    inputOrdersCsv.value = '';

    const reader = new FileReader();
    reader.onload = async (e) => {
        const csv = e.target.result;
        try {
            const res = await fetch('/api/orders/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csv })
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Upload failed', 3000); return; }
            showToast(`PO uploaded: ${data.merged} line${data.merged === 1 ? '' : 's'} added`);
            if (activeLocation()) await loadInventory();
        } catch {
            showToast('Upload failed \u2014 server error', 3000);
        }
    };
    reader.readAsText(file);
});

// ─── Truck Stock ──────────────────────────────────────────────────────────────
btnTruckStock.addEventListener('click', async () => {
    if (!state.user.trim()) { showToast('Please enter your name first'); return; }

    if (state.isTruckMode) {
        // Exit truck view → return to location inventory
        state.isTruckMode = false;
        state.truckLocation = '';
        state.locInventory = [];
        state.truckInventory = [];
        btnTruckStock.classList.remove('active');
        if (state.location) loadInventory();
        else { showView(viewSplash); splashText.textContent = 'Select a location to view inventory.'; }
        return;
    }

    if (!state.location) { showToast('Select a location first'); return; }
    if (state.location === state.truckLocation) { showToast('Select a location (not your truck) to use transfer mode'); return; }

    btnTruckStock.disabled = true;
    try {
        const res = await fetch(`/api/truck/${encodeURIComponent(state.user.trim())}`);
        const data = await res.json();
        if (!res.ok) { showToast(data.error || 'Failed to load truck stock'); return; }

        state.truckLocation = data.location;
        state.isTruckMode = true;
        btnTruckStock.classList.add('active');
        const locDisplay = state.location.replace(/_/g, ' ');
        $('truck-col-loc-name').textContent = locDisplay;
        $('truck-col-loc-header').textContent = locDisplay;
        await loadTruckView();
        if (data.created) showToast('Truck stock created for ' + state.user.trim());
    } catch {
        showToast('Server error loading truck stock');
    } finally {
        btnTruckStock.disabled = false;
    }
});

// ─── Truck Transfer View ──────────────────────────────────────────────────────
async function loadTruckView() {
    const listEl = $('truck-parts-list');
    listEl.innerHTML = '<div class="splash-message"><div class="splash-icon">&#8635;</div><p>Loading...</p></div>';
    showView(viewTruck);
    try {
        const [locRes, truckRes] = await Promise.all([
            fetch(`/api/inventory/${encodeURIComponent(state.location)}`),
            fetch(`/api/inventory/${encodeURIComponent(state.truckLocation)}`)
        ]);
        const [locData, truckData] = await Promise.all([locRes.json(), truckRes.json()]);
        if (!locRes.ok)   { showToast(locData.error   || 'Failed to load location inventory'); return; }
        if (!truckRes.ok) { showToast(truckData.error || 'Failed to load truck inventory');    return; }
        state.locInventory   = locData.inventory;
        state.truckInventory = truckData.inventory;
        renderTruckView($('truck-input-search').value);
    } catch {
        showToast('Failed to load truck view');
    }
}

function renderTruckView(filter = '') {
    const listEl      = $('truck-parts-list');
    const noResultsEl = $('truck-no-results');
    const term = filter.toLowerCase().trim();

    // Merge all part numbers from both sides
    const allPns = new Set([
        ...state.locInventory.map(i => i.part_number),
        ...state.truckInventory.map(i => i.part_number)
    ]);

    let items = [...allPns].map(pn => {
        const li = state.locInventory.find(i => i.part_number === pn)   || { part_number: pn, quantity: 0 };
        const ti = state.truckInventory.find(i => i.part_number === pn) || { part_number: pn, quantity: 0 };
        return { ...li, locQty: Number(li.quantity) || 0, truckQty: Number(ti.quantity) || 0 };
    });

    if (term) {
        items = items.filter(item =>
            item.part_number.toLowerCase().includes(term) ||
            getDescription(item).toLowerCase().includes(term) ||
            getEquipment(item).toLowerCase().includes(term)
        );
    }

    listEl.innerHTML = '';
    if (items.length === 0) { noResultsEl.classList.remove('hidden'); return; }
    noResultsEl.classList.add('hidden');

    const frag = document.createDocumentFragment();
    items.forEach(item => {
        const desc     = getDescription(item);
        const equip    = getEquipment(item);
        const descLine = desc + (equip ? ` \u2022 ${equip}` : '');
        const { locQty, truckQty } = item;
        const locClass   = locQty   === 0 ? 'zero' : locQty   <= 5 ? 'low' : '';
        const truckClass = truckQty === 0 ? 'zero' : truckQty <= 5 ? 'low' : '';
        const noUser = !state.user;
        const card = document.createElement('div');
        card.className = 'truck-card';
        card.dataset.pn = item.part_number;
        card.innerHTML = `
            <div class="truck-card-info">
                <span class="part-pn">${escapeHtml(item.part_number)}</span>
                <span class="part-desc">${escapeHtml(descLine)}</span>
            </div>
            <div class="truck-qty-cell loc-side">
                <span class="truck-cell-label">${escapeHtml(state.location.replace(/_/g, ' '))}</span>
                <span class="truck-qty-val loc-val ${locClass}">${locQty}</span>
            </div>
            <div class="truck-arrows">
                <button class="btn-to-truck" data-pn="${escapeAttr(item.part_number)}" ${noUser || locQty === 0 ? 'disabled' : ''} title="Move 1 to Truck">&#x2192;</button>
                <button class="btn-to-loc"   data-pn="${escapeAttr(item.part_number)}" ${noUser || truckQty === 0 ? 'disabled' : ''} title="Move 1 to Location">&#x2190;</button>
            </div>
            <div class="truck-qty-cell truck-side">
                <span class="truck-cell-label">Truck</span>
                <input class="truck-qty-input ${truckClass}" type="number" value="${truckQty}" min="0" data-pn="${escapeAttr(item.part_number)}" ${noUser ? 'disabled' : ''} aria-label="Truck quantity for ${escapeAttr(item.part_number)}">
            </div>`;
        frag.appendChild(card);
    });
    listEl.appendChild(frag);
}

function updateTruckCard(pn) {
    const listEl = $('truck-parts-list');
    const card = listEl.querySelector(`.truck-card[data-pn="${escapeAttr(pn)}"]`);
    if (!card) return;
    const li = state.locInventory.find(i => i.part_number === pn);
    const ti = state.truckInventory.find(i => i.part_number === pn);
    const newLocQty   = Number(li?.quantity) || 0;
    const newTruckQty = Number(ti?.quantity) || 0;
    const locVal   = card.querySelector('.loc-val');
    const truckInput = card.querySelector('.truck-qty-input');
    if (locVal) {
        locVal.textContent = newLocQty;
        locVal.className = `truck-qty-val loc-val ${newLocQty === 0 ? 'zero' : newLocQty <= 5 ? 'low' : ''}`.trim();
    }
    if (truckInput) {
        truckInput.value = newTruckQty;
        truckInput.className = `truck-qty-input ${newTruckQty === 0 ? 'zero' : newTruckQty <= 5 ? 'low' : ''}`.trim();
    }
    const toTruckBtnEl = card.querySelector('.btn-to-truck');
    const toLocBtnEl   = card.querySelector('.btn-to-loc');
    if (toTruckBtnEl) toTruckBtnEl.disabled = !state.user || newLocQty   === 0;
    if (toLocBtnEl)   toLocBtnEl.disabled   = !state.user || newTruckQty === 0;
}

$('truck-input-search').addEventListener('input', function () {
    renderTruckView(this.value);
});

$('truck-parts-list').addEventListener('change', async e => {
    const input = e.target.closest('.truck-qty-input');
    if (!input) return;
    if (!state.user.trim()) { showToast('Please enter your name first'); return; }

    const pn = input.dataset.pn;
    const ti = state.truckInventory.find(i => i.part_number === pn);
    if (!ti) return;

    const newQty = parseInt(input.value, 10);
    const oldQty = Number(ti.quantity) || 0;
    if (isNaN(newQty) || newQty < 0) { input.value = oldQty; return; }
    if (newQty === oldQty) return;

    const diff   = Math.abs(newQty - oldQty);
    const action = newQty > oldQty ? 'add' : 'subtract';

    input.disabled = true;
    try {
        const res = await fetch(`/api/inventory/${encodeURIComponent(state.truckLocation)}/adjust`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ part_number: pn, action, quantity: diff, user: state.user.trim() })
        });
        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || 'Error adjusting quantity', 3000);
            input.value = oldQty;
            return;
        }
        ti.quantity = data.quantity;
        updateTruckCard(pn);
        showToast(`Truck: ${pn} \u2192 ${data.quantity}`);
    } catch {
        showToast('Server error. Please try again.', 3000);
        input.value = oldQty;
    } finally {
        input.disabled = false;
    }
});

$('truck-parts-list').addEventListener('click', async e => {
    const toTruckBtn = e.target.closest('.btn-to-truck');
    const toLocBtn   = e.target.closest('.btn-to-loc');
    if (!toTruckBtn && !toLocBtn) return;
    if (!state.user.trim()) { showToast('Please enter your name first'); return; }

    const btn     = toTruckBtn || toLocBtn;
    const pn      = btn.dataset.pn;
    const fromLoc = toTruckBtn ? state.location      : state.truckLocation;
    const toLoc   = toTruckBtn ? state.truckLocation : state.location;

    btn.disabled = true;
    try {
        const res = await fetch('/api/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_location: fromLoc, to_location: toLoc, part_number: pn, quantity: 1, user: state.user.trim() })
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.error || 'Transfer failed', 3000); btn.disabled = false; return; }

        // Update in-memory state
        const li = state.locInventory.find(i => i.part_number === pn);
        const ti = state.truckInventory.find(i => i.part_number === pn);
        if (toTruckBtn) {
            if (li) li.quantity = data.from.quantity;
            if (ti) ti.quantity = data.to.quantity;
            else state.truckInventory.push({ part_number: pn, quantity: data.to.quantity });
        } else {
            if (ti) ti.quantity = data.from.quantity;
            if (li) li.quantity = data.to.quantity;
            else state.locInventory.push({ part_number: pn, quantity: data.to.quantity });
        }
        updateTruckCard(pn);
        const dest = toTruckBtn ? 'Truck' : state.location.replace(/_/g, ' ');
        showToast(`1 \xd7 ${pn} \u2192 ${dest}`);
    } catch {
        showToast('Server error', 3000);
        btn.disabled = false;
    }
});

$('btn-truck-done').addEventListener('click', () => {
    state.isTruckMode    = false;
    state.truckLocation  = '';
    state.locInventory   = [];
    state.truckInventory = [];
    btnTruckStock.classList.remove('active');
    if (state.location) loadInventory();
    else { showView(viewSplash); splashText.textContent = 'Select a location to view inventory.'; }
});

// ─── Transfer Modal ───────────────────────────────────────────────────────────

function openTransferModal(pn) {
    _transferPn = pn;
    const item = state.inventory.find(i => i.part_number === pn);
    const desc = item ? getDescription(item) : '';
    transferPnDisplay.textContent = pn + (desc ? ' \u2014 ' + desc : '');

    selectTransferLoc.innerHTML = '<option value="">\u2014 Select Location \u2014</option>';
    fetch('/api/locations').then(r => r.json()).then(locs => {
        locs.sort().forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc;
            opt.textContent = loc.replace(/_/g, ' ');
            selectTransferLoc.appendChild(opt);
        });
    }).catch(() => showToast('Could not load locations'));

    inputTransferQty.value = '1';
    transferError.classList.add('hidden');
    document.getElementById('transfer-dir-out').checked = true;
    modalTransfer.classList.remove('hidden');
}

btnTransferCancel.addEventListener('click', () => { modalTransfer.classList.add('hidden'); });
modalTransfer.addEventListener('click', e => { if (e.target === modalTransfer) modalTransfer.classList.add('hidden'); });

btnTransferConfirm.addEventListener('click', async () => {
    const toLoc = selectTransferLoc.value;
    if (!toLoc) { transferError.textContent = 'Please select a location.'; transferError.classList.remove('hidden'); return; }
    const qty = parseInt(inputTransferQty.value, 10);
    if (isNaN(qty) || qty <= 0) { transferError.textContent = 'Quantity must be a positive number.'; transferError.classList.remove('hidden'); return; }

    const dir     = document.querySelector('input[name="transfer-dir"]:checked').value;
    const fromLoc = dir === 'truck-to-loc' ? state.truckLocation : toLoc;
    const destLoc = dir === 'truck-to-loc' ? toLoc : state.truckLocation;

    btnTransferConfirm.disabled = true;
    transferError.classList.add('hidden');
    try {
        const res = await fetch('/api/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_location: fromLoc, to_location: destLoc, part_number: _transferPn, quantity: qty, user: state.user.trim() })
        });
        const data = await res.json();
        if (!res.ok) { transferError.textContent = data.error; transferError.classList.remove('hidden'); return; }

        modalTransfer.classList.add('hidden');
        showToast(`Transferred ${qty} \xd7 ${_transferPn}`);
        await loadInventory();
    } catch {
        transferError.textContent = 'Server error. Please try again.';
        transferError.classList.remove('hidden');
    } finally {
        btnTransferConfirm.disabled = false;
    }
});

// ─── Keyboard Shortcuts ───────────────────────────────────────────────────────
document.addEventListener('keydown', async e => {
    if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        if (!state.user.trim()) return;
        inputNewLocation.value = '';
        newLocError.classList.add('hidden');
        modalNewLocation.classList.remove('hidden');
        setTimeout(() => inputNewLocation.focus(), 100);
    }
    if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        if (!state.location) return;
        const locToHide = state.location;
        try {
            await fetch(`/api/locations/${encodeURIComponent(locToHide)}/hide`, { method: 'POST' });
        } catch { /* silent */ }
        state.location = '';
        selectLocation.value = '';
        await loadLocations();
        showView(viewSplash);
        splashText.textContent = 'Select a location to view inventory.';
    }
});

// ─── Transaction Log ──────────────────────────────────────────────────────────
// ─── PO Entry Mode ───────────────────────────────────────────────────────────
$('app-title').addEventListener('click', () => {
    state.hideOrder = false;
    applyOrderVisibility();
    showToast('PO Entry mode on');
});

btnExitPo.addEventListener('click', () => {
    state.hideOrder = true;
    applyOrderVisibility();
    showToast('PO Entry mode off');
});
btnTransactions.addEventListener('click', () => {
    state.txnPage = 1;
    state.txnUserFilter = '';
    state.txnPartFilter = '';
    txnSearchUser.value = '';
    txnSearchPart.value = '';
    showView(viewTransactions);
    loadTransactions();
});

btnBack.addEventListener('click', () => {
    if (state.location) showView(viewInventory);
    else showView(viewSplash);
});

let txnDebounce;
txnSearchUser.addEventListener('input', () => {
    clearTimeout(txnDebounce);
    state.txnUserFilter = txnSearchUser.value;
    state.txnPage = 1;
    txnDebounce = setTimeout(loadTransactions, 350);
});

txnSearchPart.addEventListener('input', () => {
    clearTimeout(txnDebounce);
    state.txnPartFilter = txnSearchPart.value;
    state.txnPage = 1;
    txnDebounce = setTimeout(loadTransactions, 350);
});

async function loadTransactions() {
    txnList.innerHTML = '<div class="splash-message"><p>Loading...</p></div>';
    const params = new URLSearchParams({
        page: state.txnPage,
        pageSize: state.txnPageSize,
        ...(state.txnUserFilter && { user: state.txnUserFilter }),
        ...(state.txnPartFilter && { part_number: state.txnPartFilter }),
        ...(activeLocation() && { location: activeLocation() })
    });
    try {
        const res = await fetch(`/api/transactions?${params}`);
        const data = await res.json();
        state.txnTotal = data.total;
        renderTransactions(data.rows);
        renderPagination(data.total, data.page, data.pageSize);
    } catch {
        txnList.innerHTML = '<div class="splash-message"><p>Failed to load transactions.</p></div>';
    }
}

function renderTransactions(rows) {
    if (rows.length === 0) {
        txnList.innerHTML = '<div class="splash-message"><p style="color:var(--text-dim)">No transactions found.</p></div>';
        return;
    }
    txnList.innerHTML = '';
    const frag = document.createDocumentFragment();
    rows.forEach(row => {
        const d = document.createElement('div');
        d.className = 'txn-row';
        const ts = row.timestamp ? new Date(row.timestamp).toLocaleString() : '';
        const badgePrefix = row.action === 'add' ? '+' : row.action === 'subtract' ? '-' :
            row.action === 'receive' ? '\u2713' : row.action === 'transfer-in' ? '\u2192' :
            row.action === 'transfer-out' ? '\u2190' : '';
        d.innerHTML = `
            <span class="txn-main">${escapeHtml(row.part_number)} &mdash; ${escapeHtml(row.location.replace(/_/g, ' '))}</span>
            <span class="txn-badge ${row.action}">${badgePrefix}${escapeHtml(row.quantity)}</span>
            <span class="txn-meta">${escapeHtml(ts)} &bull; ${escapeHtml(row.user)} &bull; Balance: ${escapeHtml(row.balance_after)}</span>`;
        frag.appendChild(d);
    });
    txnList.appendChild(frag);
}

function renderPagination(total, page, pageSize) {
    const pages = Math.ceil(total / pageSize);
    txnPagination.innerHTML = '';
    if (pages <= 1) return;

    const prev = document.createElement('button');
    prev.textContent = '‹ Prev';
    prev.disabled = page <= 1;
    prev.addEventListener('click', () => { state.txnPage = page - 1; loadTransactions(); });
    txnPagination.appendChild(prev);

    const info = document.createElement('span');
    info.textContent = `${page} / ${pages}`;
    info.style.cssText = 'color:var(--text-dim);font-size:0.85rem;align-self:center;';
    txnPagination.appendChild(info);

    const next = document.createElement('button');
    next.textContent = 'Next ›';
    next.disabled = page >= pages;
    next.addEventListener('click', () => { state.txnPage = page + 1; loadTransactions(); });
    txnPagination.appendChild(next);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escapeAttr(str) {
    return String(str ?? '').replace(/"/g, '&quot;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
(async function init() {
    // Restore saved name
    const saved = localStorage.getItem('intracker_user') || '';
    inputUser.value = saved;
    state.user = saved;
    applyUserState();
    if (state.user.trim()) scheduleTruckDropdown();

    await loadLocations();
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
})();

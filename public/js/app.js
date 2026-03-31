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
    truckVisible: false,
    truckLocation: '',
    poMode: false,
    poOrders: {},
    truckInventory: [],
    splitView: false
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
const partsList       = $('parts-list');
const noResults       = $('no-results');
const inputSearch          = $('input-search');
const selectEquipFilter    = $('select-equipment-filter');
const selectSort           = $('select-sort');
const btnReorder           = $('btn-reorder');
const btnTruck             = $('btn-truck');
const splashText           = $('splash-text');

// PO Mode
const appTitle             = $('app-title');
const btnExitPo            = $('btn-exit-po');
const btnLocationInfo      = $('btn-location-info');

// Location Info modal
const modalLocationInfo    = $('modal-location-info');
const locInfoCc            = $('loc-info-cc');
const locInfoShed          = $('loc-info-shed');
const locInfoLocationName  = $('loc-info-location-name');
const locInfoAddress       = $('loc-info-address');
const locInfoStreet        = $('loc-info-street');
const locInfoCity          = $('loc-info-city');
const locInfoState         = $('loc-info-state');
const locInfoZip           = $('loc-info-zip');
const btnLocInfoSave       = $('btn-loc-info-save');
const btnLocInfoCancel     = $('btn-loc-info-cancel');

// Reorder select modal
const modalReorderSelect   = $('modal-reorder-select');
const reorderLocList       = $('reorder-loc-list');
const reorderError         = $('reorder-error');
const btnReorderGenerate   = $('btn-reorder-generate');
const btnReorderCancel     = $('btn-reorder-cancel');

// Upload PO modal
const btnUploadPo          = $('btn-upload-po');
const modalUploadPo        = $('modal-upload-po');
const inputPoFile          = $('input-po-file');
const poFileName           = $('po-file-name');
const poUploadResult       = $('po-upload-result');
const poUploadError        = $('po-upload-error');
const btnPoUploadConfirm   = $('btn-po-upload-confirm');
const btnPoUploadCancel    = $('btn-po-upload-cancel');

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
const btnTheme         = $('btn-theme');

// ─── Theme ────────────────────────────────────────────────────────────────────
(function initTheme() {
    if (localStorage.getItem('intracker_theme') === 'light') {
        document.documentElement.classList.add('light');
    }
})();

btnTheme.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem('intracker_theme', isLight ? 'light' : 'dark');
});

// Truck mode panel header (shown when viewing a non-truck location in truck mode)
const warehousePanelHeader = $('warehouse-panel-header');
const warehousePanelTitle  = $('warehouse-panel-title');
const warehousePanelCount  = $('warehouse-panel-count');

// ─── Truck Visibility ────────────────────────────────────────────────────────
function applyTruckVisibility() {
    const visible = state.truckVisible;
    btnTruck.classList.toggle('hidden', !visible);

    const existing = selectLocation.querySelector('option[data-truck="1"]');
    if (visible && state.truckLocation) {
        if (!existing) {
            const opt = document.createElement('option');
            opt.value = state.truckLocation;
            opt.textContent = '\uD83D\uDE9B My Truck';
            opt.dataset.truck = '1';
            selectLocation.appendChild(opt);
        }
    } else if (existing) {
        if (state.location === existing.value) {
            state.location = '';
            selectLocation.value = '';
            showView(viewSplash);
            splashText.textContent = 'Select a location to view inventory.';
        }
        existing.remove();
    }

    btnTruck.disabled = !state.user.trim() || !state.truckLocation;

    // If a non-truck location is already selected, enter/exit split view
    if (state.truckVisible && state.truckLocation && state.location && state.location !== state.truckLocation) {
        loadSplitView();
    } else if (!state.truckVisible && state.splitView) {
        exitSplitView();
        renderInventory(inputSearch.value);
    }
}

let truckDropdownTimer;
function scheduleTruckDropdown() {
    clearTimeout(truckDropdownTimer);
    const name = state.user.trim();
    if (!name) {
        const existing = selectLocation.querySelector('option[data-truck="1"]');
        if (existing) existing.remove();
        state.truckLocation = '';
        btnTruck.disabled = true;
        return;
    }
    truckDropdownTimer = setTimeout(async () => {
        try {
            const res = await fetch(`/api/truck/${encodeURIComponent(name)}`);
            if (!res.ok) return;
            const data = await res.json();
            state.truckLocation = data.location;
            applyTruckVisibility();
        } catch { /* silent */ }
    }, 600);
}

// ─── PO Mode ─────────────────────────────────────────────────────────────────
function applyPoMode() {
    appTitle.classList.toggle('po-active', state.poMode);
    appTitle.title = state.poMode ? 'PO Entry Mode active' : 'Click to enter PO Entry Mode';
    btnExitPo.classList.toggle('hidden', !state.poMode);
    btnLocationInfo.classList.toggle('hidden', !state.poMode);
    btnUploadPo.classList.toggle('hidden', !state.poMode);
    btnReorder.classList.toggle('hidden', !state.poMode);
    viewInventory.classList.toggle('po-mode', state.poMode);
    updateHeaderHeight();
}

appTitle.addEventListener('click', () => {
    state.poMode = !state.poMode;
    applyPoMode();
    showToast(state.poMode ? 'PO Entry Mode on' : 'PO Entry Mode off');
});

btnExitPo.addEventListener('click', () => {
    state.poMode = false;
    applyPoMode();
    showToast('PO Entry Mode off');
});

// ─── Location Info (localStorage) ────────────────────────────────────────────
function getLocInfo(locName) {
    try {
        const all = JSON.parse(localStorage.getItem('intracker_loc_info') || '{}');
        return all[locName] || {};
    } catch { return {}; }
}

function saveLocInfo(locName, info) {
    try {
        const all = JSON.parse(localStorage.getItem('intracker_loc_info') || '{}');
        all[locName] = info;
        localStorage.setItem('intracker_loc_info', JSON.stringify(all));
    } catch { /* silent */ }
}

// ─── PO Orders (server-side, per-location) ─────────────────────────────────
async function getPOOrders(locName) {
    try {
        const res = await fetch(`/api/po/${encodeURIComponent(locName)}`);
        if (!res.ok) return {};
        return await res.json();
    } catch { return {}; }
}

async function savePOOrders(locName, orders) {
    try {
        const cleaned = {};
        Object.entries(orders).forEach(([k, v]) => { if (v > 0) cleaned[k] = v; });
        await fetch(`/api/po/${encodeURIComponent(locName)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orders: cleaned })
        });
    } catch { /* silent */ }
}

// ─── Location Info Modal ──────────────────────────────────────────────────────
function openLocationInfoModal() {
    const info = getLocInfo(state.location);
    locInfoCc.value           = info.cc           || '';
    locInfoShed.value         = info.shed         || '';
    locInfoLocationName.value = info.locationName || '';
    locInfoAddress.value      = info.address      || '';
    locInfoStreet.value  = info.street  || '';
    locInfoCity.value    = info.city    || '';
    locInfoState.value   = info.state   || '';
    locInfoZip.value     = info.zip     || '';
    modalLocationInfo.classList.remove('hidden');
    setTimeout(() => locInfoCc.focus(), 100);
}

btnLocationInfo.addEventListener('click', () => {
    if (!state.location) { showToast('Select a location first'); return; }
    openLocationInfoModal();
});

btnLocInfoSave.addEventListener('click', () => {
    if (!state.location) return;
    saveLocInfo(state.location, {
        cc:           locInfoCc.value.trim(),
        shed:         locInfoShed.value.trim(),
        locationName: locInfoLocationName.value.trim(),
        address:      locInfoAddress.value.trim(),
        street:  locInfoStreet.value.trim(),
        city:    locInfoCity.value.trim(),
        state:   locInfoState.value.trim(),
        zip:     locInfoZip.value.trim()
    });
    modalLocationInfo.classList.add('hidden');
    showToast('Location info saved');
});

btnLocInfoCancel.addEventListener('click', () => {
    modalLocationInfo.classList.add('hidden');
});

modalLocationInfo.addEventListener('click', e => {
    if (e.target === modalLocationInfo) modalLocationInfo.classList.add('hidden');
});

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
    [viewSplash, viewInventory, viewTransactions].forEach(v => v.classList.remove('active'));
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
        btnTruck.disabled = true;
        splashText.textContent = 'Enter your name above to get started.';
        showView(viewSplash);
        state.location = '';
        selectLocation.value = '';
    }
    scheduleTruckDropdown();
    updateHeaderHeight();
}

inputUser.addEventListener('input', () => {
    state.user = inputUser.value;
    localStorage.setItem('intracker_user', state.user);
    applyUserState();
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
        if (state.location) selectLocation.value = state.location;
        applyTruckVisibility(); // re-inject My Truck option if visible
    } catch (err) {
        showToast('Failed to load locations');
    }
}

selectLocation.addEventListener('change', () => {
    state.location = selectLocation.value;
    if (state.location) {
        if (state.truckVisible && state.truckLocation && state.location !== state.truckLocation) {
            loadSplitView();
        } else {
            exitSplitView();
            loadInventory();
        }
    } else {
        exitSplitView();
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

// ─── Split View helpers ───────────────────────────────────────────────────────
function exitSplitView() {
    state.splitView = false;
    state.truckInventory = [];
    warehousePanelHeader.classList.add('hidden');
    warehousePanelCount.textContent = '';
}

async function loadSplitView() {
    partsList.innerHTML = '<div class="splash-message"><div class="splash-icon">&#8635;</div><p>Loading&#8230;</p></div>';
    showView(viewInventory);
    try {
        const [whRes, trRes] = await Promise.all([
            fetch(`/api/inventory/${encodeURIComponent(state.location)}`),
            fetch(`/api/inventory/${encodeURIComponent(state.truckLocation)}`)
        ]);
        const [whData, trData] = await Promise.all([whRes.json(), trRes.json()]);
        if (!whRes.ok || !trRes.ok) {
            showToast('Failed to load one or more inventories');
            showView(viewSplash);
            return;
        }
        state.inventory      = whData.inventory;
        state.partsHeaders   = whData.partsHeaders;
        state.truckInventory = trData.inventory;
        state.poOrders       = await getPOOrders(state.location);
        state.splitView      = true;

        warehousePanelTitle.textContent = '\uD83C\uDFED ' + state.location.replace(/_/g, ' ') +
            '  \u2194  \uD83D\uDE9B ' + state.truckLocation.replace(/_/g, ' ');
        warehousePanelHeader.classList.remove('hidden');

        populateEquipmentFilter();
        renderInventory(inputSearch.value);
    } catch {
        showToast('Failed to load inventory');
        showView(viewSplash);
    }
}

function getTruckQty(pn) {
    const item = state.truckInventory.find(i => i.part_number === pn);
    return item ? item.quantity : null;
}

// ─── Inventory ────────────────────────────────────────────────────────────────
async function loadInventory() {
    partsList.innerHTML = '<div class="splash-message"><div class="splash-icon">&#8635;</div><p>Loading...</p></div>';
    showView(viewInventory);
    try {
        const res = await fetch(`/api/inventory/${encodeURIComponent(state.location)}`);
        const data = await res.json();
        if (!res.ok) { showToast(data.error || 'Failed to load inventory'); showView(viewSplash); return; }
        state.inventory = data.inventory;
        state.partsHeaders = data.partsHeaders;
        state.poOrders = await getPOOrders(state.location);
        populateEquipmentFilter();
        renderInventory();
    } catch {
        showToast('Failed to load inventory');
        showView(viewSplash);
    }
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

// ─── Card HTML builders ───────────────────────────────────────────────────────
function buildTruckRowHTML(pn, disabled) {
    const truckQty  = getTruckQty(pn);
    const tqClass   = truckQty === null ? 'none' : truckQty === 0 ? 'zero' : truckQty <= 5 ? 'low' : '';
    const tqDisplay = truckQty !== null ? truckQty : '&mdash;';
    return `<div class="truck-row">
                    <span class="truck-row-label">&#128667; Truck:</span>
                    <span class="truck-row-qty ${tqClass}" data-pn="${escapeAttr(pn)}">${tqDisplay}</span>
                    <button class="btn-xfer" data-pn="${escapeAttr(pn)}" data-dir="to-shed" ${disabled} title="Move 1 from Truck to here">&#8592; Get</button>
                    <button class="btn-xfer" data-pn="${escapeAttr(pn)}" data-dir="to-truck" ${disabled} title="Move 1 from here to Truck">Send &#8594;</button>
                </div>`;
}

function buildCardHTML(item) {
    const qty      = item.quantity;
    const desc     = getDescription(item);
    const equip    = getEquipment(item);
    const parLevel = getParLevel(item);
    const descLine = desc + (equip ? ` \u2022 ${equip}` : '');
    const disabled = !state.user.trim() ? 'disabled' : '';
    const qtyClass = qty === 0 ? 'zero' : qty <= 5 ? 'low' : '';
    const orderQty = state.poOrders[item.part_number] || 0;
    const pn       = item.part_number;
    return `
            <span class="part-pn">${escapeHtml(pn)}</span>
            <span class="part-desc">${escapeHtml(descLine)}</span>
            <span class="part-par"><span class="par-label">Par</span>${parLevel > 0 ? parLevel : '&mdash;'}</span>
            <div class="part-controls">
                <button class="btn-adj btn-sub" data-pn="${escapeAttr(pn)}" data-action="subtract" ${disabled} title="Subtract">&#8722;</button>
                <input class="part-qty-input ${qtyClass}" type="number" value="${qty}" min="0" data-pn="${escapeAttr(pn)}" ${disabled} aria-label="Quantity for ${escapeAttr(pn)}">
                <button class="btn-adj btn-add" data-pn="${escapeAttr(pn)}" data-action="add" ${disabled} title="Add">&#43;</button>
            </div>
            <div class="part-order" data-pn="${escapeAttr(pn)}">
                <span class="po-label">PO</span>
                <span class="po-qty${orderQty > 0 ? ' active' : ''}">${orderQty > 0 ? orderQty : '&mdash;'}</span>
                ${orderQty > 0 ? `<button class="btn-rcvd" data-pn="${escapeAttr(pn)}" data-qty="${orderQty}" ${disabled}>Rcvd</button>` : ''}
            </div>
            ${state.splitView ? buildTruckRowHTML(pn, disabled) : ''}`;
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
        if (state.splitView) warehousePanelCount.textContent = '(0 parts)';
        return;
    }
    noResults.classList.add('hidden');
    if (state.splitView) warehousePanelCount.textContent = `(${filtered.length} part${filtered.length === 1 ? '' : 's'})`;

    const frag = document.createDocumentFragment();
    filtered.forEach(item => {
        const parLevel = getParLevel(item);
        const card = document.createElement('div');
        card.className = `part-card${parLevel > 0 && item.quantity < parLevel ? ' below-par' : ''}`;
        card.innerHTML = buildCardHTML(item);
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
function updateCardDisplay(pn, newQty) {
    const input = partsList.querySelector(`.part-qty-input[data-pn="${escapeAttr(pn)}"]`);
    if (!input) return;
    input.value = newQty;
    input.className = `part-qty-input ${newQty === 0 ? 'zero' : newQty <= 5 ? 'low' : ''}`;
    const item = state.inventory.find(i => i.part_number === pn);
    const card = input.closest('.part-card');
    if (card && item) {
        const parLevel = getParLevel(item);
        card.classList.toggle('below-par', parLevel > 0 && newQty < parLevel);
    }
}

// ─── PO Order Display Update Helper ───────────────────────────────────────────
function updateOrderDisplay(pn, newOrderQty) {
    const cell = partsList.querySelector(`.part-order[data-pn="${escapeAttr(pn)}"]`);
    if (!cell) return;
    const disabled = !state.user.trim() ? 'disabled' : '';
    cell.innerHTML = `
        <span class="po-label">PO</span>
        <span class="po-qty${newOrderQty > 0 ? ' active' : ''}">${newOrderQty > 0 ? newOrderQty : '&mdash;'}</span>
        ${newOrderQty > 0 ? `<button class="btn-rcvd" data-pn="${escapeAttr(pn)}" data-qty="${newOrderQty}" ${disabled}>Rcvd</button>` : ''}`;
}

// ─── Direct Adjust (+ / - buttons) ───────────────────────────────────────────
async function sendAdjust(part_number, action, quantity) {
    const res = await fetch(`/api/inventory/${encodeURIComponent(state.location)}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part_number, action, quantity, user: state.user.trim() })
    });
    return res.json().then(data => ({ ok: res.ok, data }));
}

// ─── Parts list click handler (adj / rcvd / xfer) ────────────────────────────
partsList.addEventListener('click', async e => {
    if (e.target.closest('.btn-adj')) {
        const btn = e.target.closest('.btn-adj');
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
            updateCardDisplay(pn, data.quantity);
            showToast(`${action === 'add' ? '+1' : '-1'} ${pn} → ${data.quantity}`);
        } catch {
            showToast('Server error. Please try again.', 3000);
        } finally {
            btn.disabled = false;
        }
        return;
    }

    if (e.target.closest('.btn-rcvd')) {
        const btn = e.target.closest('.btn-rcvd');
        if (!state.user.trim()) { showToast('Please enter your name first'); return; }
        const pn = btn.dataset.pn;
        const orderQty = parseInt(btn.dataset.qty, 10);
        if (!pn || isNaN(orderQty) || orderQty <= 0) return;
        btn.disabled = true;
        try {
            const { ok, data } = await sendAdjust(pn, 'add', orderQty);
            if (!ok) { showToast(data.error || 'Error receiving qty', 3000); btn.disabled = false; return; }
            const item = state.inventory.find(i => i.part_number === pn);
            if (item) item.quantity = data.quantity;
            updateCardDisplay(pn, data.quantity);
            state.poOrders[pn] = 0;
            await savePOOrders(state.location, state.poOrders);
            updateOrderDisplay(pn, 0);
            showToast(`Received ${orderQty}× ${pn} → ${data.quantity} in stock`);
        } catch {
            showToast('Server error. Please try again.', 3000);
        } finally {
            btn.disabled = false;
        }
        return;
    }

    if (e.target.closest('.btn-xfer')) {
        const btn = e.target.closest('.btn-xfer');
        if (btn.disabled) return;
        if (!state.user.trim()) { showToast('Please enter your name first'); return; }

        const pn  = btn.dataset.pn;
        const dir = btn.dataset.dir;
        // dir="to-shed" means truck → this location; dir="to-truck" means this location → truck
        const isTruckToShed = dir === 'to-shed';
        const fromLoc = isTruckToShed ? state.truckLocation : state.location;
        const toLoc   = isTruckToShed ? state.location      : state.truckLocation;

        // Check available qty in source inventory
        const fromInv  = isTruckToShed ? state.truckInventory : state.inventory;
        const fromItem = fromInv.find(i => i.part_number === pn);
        if (!fromItem || fromItem.quantity <= 0) {
            showToast('None available to transfer', 2500);
            return;
        }

        btn.disabled = true;
        const { ok, data } = await sendTransfer(fromLoc, toLoc, pn, 1);
        btn.disabled = false;

        if (!ok) {
            showToast(data.error || 'Transfer failed', 3000);
            return;
        }

        // Update state
        const truckItem = state.truckInventory.find(i => i.part_number === pn);
        const shedItem  = state.inventory.find(i => i.part_number === pn);
        if (isTruckToShed) {
            if (truckItem) truckItem.quantity = data.from.quantity;
            if (shedItem)  shedItem.quantity  = data.to.quantity;
            updateCardDisplay(pn, data.to.quantity);
            updateTruckRowQty(pn, data.from.quantity);
        } else {
            if (shedItem)  shedItem.quantity  = data.from.quantity;
            if (truckItem) truckItem.quantity = data.to.quantity;
            updateCardDisplay(pn, data.from.quantity);
            updateTruckRowQty(pn, data.to.quantity);
        }
        showToast(`Transferred 1\u00d7 ${pn}`);
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
        updateCardDisplay(pn, data.quantity);
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
    // Gather all non-truck locations from the dropdown
    const locOptions = [...selectLocation.options].filter(o =>
        o.value && !o.value.startsWith('truck_') && !o.dataset.truck
    );
    if (locOptions.length === 0) {
        showToast('No locations available', 3000);
        return;
    }

    reorderLocList.innerHTML = '';
    reorderError.classList.add('hidden');

    locOptions.forEach(opt => {
        const locName = opt.value;
        const info = getLocInfo(locName);
        const hasInfo = !!(info.cc || info.shed || info.locationName || info.address);

        const item = document.createElement('label');
        item.className = 'reorder-loc-item';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = locName;
        cb.checked = locName === state.location;

        const labelSpan = document.createElement('span');
        labelSpan.className = 'loc-label';
        labelSpan.textContent = locName.replace(/_/g, ' ');

        item.appendChild(cb);
        item.appendChild(labelSpan);

        if (hasInfo) {
            const badge = document.createElement('span');
            badge.className = 'loc-info-badge';
            badge.textContent = info.cc ? `CC# ${info.cc}` : '✓ Info set';
            item.appendChild(badge);
        }

        reorderLocList.appendChild(item);
    });

    modalReorderSelect.classList.remove('hidden');
});

btnReorderCancel.addEventListener('click', () => {
    modalReorderSelect.classList.add('hidden');
});

modalReorderSelect.addEventListener('click', e => {
    if (e.target === modalReorderSelect) modalReorderSelect.classList.add('hidden');
});

btnReorderGenerate.addEventListener('click', async () => {
    const checked = [...reorderLocList.querySelectorAll('input[type="checkbox"]:checked')]
        .map(cb => cb.value);

    if (checked.length === 0) {
        reorderError.textContent = 'Select at least one location.';
        reorderError.classList.remove('hidden');
        return;
    }
    reorderError.classList.add('hidden');

    btnReorderGenerate.disabled = true;
    btnReorderGenerate.textContent = 'Generating…';

    try {
        const fmt = document.querySelector('input[name="reorder-format"]:checked')?.value || 'batch';
        if (fmt === 'ess') {
            await generateEssReorderCsv(checked);
        } else {
            await generateReorderCsv(checked);
        }
    } finally {
        btnReorderGenerate.disabled = false;
        btnReorderGenerate.textContent = 'Generate CSV';
    }
});

async function generateReorderCsv(locNames) {
    const date = new Date().toISOString().slice(0, 10);
    const COLS = 12; // total columns
    const empty = () => Array(COLS).fill('');

    const headerRow = ['CC#', 'Deliver To', 'Location Name', 'Address', 'Street', 'City', 'State', 'Zip',
                       'Date Submitted', '', 'part_number', 'quantity_required'];
    const lines = [headerRow.map(csvEscape).join(',')];

    let totalParts = 0;

    for (const locName of locNames) {
        let inventory;
        try {
            const res = await fetch(`/api/inventory/${encodeURIComponent(locName)}`);
            const data = await res.json();
            if (!res.ok) { showToast(`Skipping ${locName.replace(/_/g,' ')}: error`, 3000); continue; }
            inventory = data.inventory;
        } catch {
            showToast(`Skipping ${locName.replace(/_/g,' ')}: network error`, 3000);
            continue;
        }

        const locOrders = await getPOOrders(locName);
        const belowPar = inventory.filter(item => {
            const p = getParLevel(item);
            const onOrder = locOrders[item.part_number] || 0;
            return p > 0 && (item.quantity + onOrder) < p;
        });

        if (belowPar.length === 0) continue;

        // Location info row
        const info = getLocInfo(locName);
        const locRow = empty();
        locRow[0] = info.cc           || '';
        locRow[1] = info.shed         || '';
        locRow[2] = info.locationName || locName.replace(/_/g, ' ');
        locRow[3] = info.address      || '';
        locRow[4] = info.street       || '';
        locRow[5] = info.city         || '';
        locRow[6] = info.state        || '';
        locRow[7] = info.zip          || '';
        locRow[8] = date;
        lines.push(locRow.map(csvEscape).join(','));

        // Parts rows
        belowPar.forEach(item => {
            const onOrder = locOrders[item.part_number] || 0;
            const needed = getParLevel(item) - item.quantity - onOrder;
            const partRow = empty();
            partRow[10] = item.part_number;
            partRow[11] = String(needed);
            lines.push(partRow.map(csvEscape).join(','));
            totalParts++;
        });
    }

    if (lines.length === 1) {
        showToast('No parts below par in selected locations', 3000);
        return;
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reorder_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    modalReorderSelect.classList.add('hidden');
    showToast(`Reorder CSV downloaded (${totalParts} part${totalParts === 1 ? '' : 's'} across ${locNames.length} location${locNames.length === 1 ? '' : 's'})`);
}

async function generateEssReorderCsv(locNames) {
    const date = new Date().toISOString().slice(0, 10);
    const headerRow = ['part_number', 'description', 'quantity_required'];
    const lines = [headerRow.map(csvEscape).join(',')];
    let totalParts = 0;

    for (const locName of locNames) {
        let inventory;
        try {
            const res = await fetch(`/api/inventory/${encodeURIComponent(locName)}`);
            const data = await res.json();
            if (!res.ok) { showToast(`Skipping ${locName.replace(/_/g,' ')}: error`, 3000); continue; }
            inventory = data.inventory;
        } catch {
            showToast(`Skipping ${locName.replace(/_/g,' ')}: network error`, 3000);
            continue;
        }

        const locOrders = await getPOOrders(locName);
        const belowPar = inventory.filter(item => {
            const p = getParLevel(item);
            const onOrder = locOrders[item.part_number] || 0;
            return p > 0 && (item.quantity + onOrder) < p;
        });

        belowPar.forEach(item => {
            const onOrder = locOrders[item.part_number] || 0;
            const needed = getParLevel(item) - item.quantity - onOrder;
            lines.push([item.part_number, getDescription(item), String(needed)].map(csvEscape).join(','));
            totalParts++;
        });
    }

    if (lines.length === 1) {
        showToast('No parts below par in selected locations', 3000);
        return;
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reorder_ess_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    modalReorderSelect.classList.add('hidden');
    showToast(`ES&S CSV downloaded (${totalParts} part${totalParts === 1 ? '' : 's'})`);
}

// ─── Upload PO CSV ────────────────────────────────────────────────────────────────────────
function parsePOCsv(text) {
    // Split a single CSV line respecting quoted fields
    function splitLine(line) {
        const cols = [];
        let field = '', inQuote = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { inQuote = !inQuote; }
            else if (ch === ',' && !inQuote) { cols.push(field.trim()); field = ''; }
            else { field += ch; }
        }
        cols.push(field.trim());
        return cols.map(c => c.replace(/^"|"$/g, '').trim());
    }

    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return {};

    const headers = splitLine(lines[0]);
    const result  = {};

    // ── Format 3: Batch reorder CSV ──
    // Detected by CC# in col 0, or part_number in col 10 of header
    const isBatch = /^CC#?$/i.test(headers[0]) ||
                    (headers.length >= 11 && /part.?num/i.test(headers[10]));
    if (isBatch) {
        // Part rows: cols 0-9 empty, col 10 = part_number, col 11 = qty
        lines.slice(1).forEach(line => {
            const cols = splitLine(line);
            const pn  = cols[10] || '';
            const qty = parseInt(cols[11] || '', 10);
            if (pn && !isNaN(qty) && qty > 0) result[pn] = (result[pn] || 0) + qty;
        });
        return result;
    }

    // ── Formats 1 & 2: column-header detection ──
    // Format 1: part_number, quantity
    // Format 2: part_number, description, quantity  (description ignored)
    const pnIdx  = headers.findIndex(h => /part.?num|^pn$|^part[\s#]|^part$/i.test(h));
    const qtyIdx = headers.findIndex(h => /qty|quantity|on.?order/i.test(h));
    if (pnIdx === -1 || qtyIdx === -1) return null;

    lines.slice(1).forEach(line => {
        const cols = splitLine(line);
        const pn  = cols[pnIdx]  || '';
        const qty = parseInt(cols[qtyIdx] || '', 10);
        if (pn && !isNaN(qty) && qty > 0) result[pn] = (result[pn] || 0) + qty;
    });
    return result;
}

btnUploadPo.addEventListener('click', () => {
    if (!state.location) { showToast('Select a location first'); return; }
    inputPoFile.value = '';
    poFileName.textContent = 'Tap to select CSV file…';
    btnPoUploadConfirm.disabled = true;
    poUploadResult.classList.add('hidden');
    poUploadError.classList.add('hidden');
    modalUploadPo.classList.remove('hidden');
});

inputPoFile.addEventListener('change', () => {
    const file = inputPoFile.files[0];
    if (file) {
        poFileName.textContent = file.name;
        btnPoUploadConfirm.disabled = false;
    } else {
        poFileName.textContent = 'Tap to select CSV file…';
        btnPoUploadConfirm.disabled = true;
    }
    poUploadResult.classList.add('hidden');
    poUploadError.classList.add('hidden');
});

btnPoUploadConfirm.addEventListener('click', () => {
    const file = inputPoFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
        const parsed = parsePOCsv(ev.target.result);
        if (parsed === null) {
            poUploadError.textContent = 'Could not detect part number or quantity columns.';
            poUploadError.classList.remove('hidden');
            return;
        }
        let count = 0;
        Object.entries(parsed).forEach(([pn, qty]) => {
            state.poOrders[pn] = (state.poOrders[pn] || 0) + qty;
            count++;
        });
        await savePOOrders(state.location, state.poOrders);
        poUploadError.classList.add('hidden');
        poUploadResult.textContent = `Loaded ${count} part${count === 1 ? '' : 's'} into on-order list.`;
        poUploadResult.classList.remove('hidden');
        btnPoUploadConfirm.disabled = true;
        inputPoFile.value = '';
        poFileName.textContent = 'Tap to select CSV file…';
        renderInventory(inputSearch.value);
    };
    reader.readAsText(file);
});

btnPoUploadCancel.addEventListener('click', () => {
    modalUploadPo.classList.add('hidden');
});

modalUploadPo.addEventListener('click', e => {
    if (e.target === modalUploadPo) modalUploadPo.classList.add('hidden');
});

// ─── Transfer (truck ↔ shed split view) ──────────────────────────────────────
async function sendTransfer(fromLoc, toLoc, part_number, quantity) {
    const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_location: fromLoc, to_location: toLoc, part_number, quantity, user: state.user.trim() })
    });
    return res.json().then(data => ({ ok: res.ok, data }));
}



// Update the truck qty shown in the truck-row of a warehouse card
function updateTruckRowQty(pn, newQty) {
    const span = partsList.querySelector(`.truck-row-qty[data-pn="${escapeAttr(pn)}"]`);
    if (!span) return;
    span.textContent = newQty;
    span.className = `truck-row-qty ${newQty === 0 ? 'zero' : newQty <= 5 ? 'low' : ''}`;
}

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
    if (e.ctrlKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        state.truckVisible = !state.truckVisible;
        applyTruckVisibility();
        showToast(state.truckVisible ? 'Truck features on' : 'Truck features hidden');
    }
});

// ─── Truck Button ────────────────────────────────────────────────────────
btnTruck.addEventListener('click', async () => {
    if (!state.user.trim() || !state.truckLocation) return;
    selectLocation.value = state.truckLocation;
    state.location = state.truckLocation;
    exitSplitView();
    await loadInventory();
});

// ─── Transaction Log ──────────────────────────────────────────────────────────
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
        ...(state.location && { location: state.location })
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
        d.innerHTML = `
            <span class="txn-main">${escapeHtml(row.part_number)} &mdash; ${escapeHtml(row.location.replace(/_/g, ' '))}</span>
            <span class="txn-badge ${row.action}">${row.action === 'add' ? '+' : '-'}${escapeHtml(row.quantity)}</span>
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

    await loadLocations();
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
})();

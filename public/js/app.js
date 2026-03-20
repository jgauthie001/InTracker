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
    txnPartFilter: ''
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
const inputSearch     = $('input-search');
const splashText      = $('splash-text');

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
    } catch (err) {
        showToast('Failed to load locations');
    }
}

selectLocation.addEventListener('change', () => {
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
    try {
        const res = await fetch(`/api/inventory/${encodeURIComponent(state.location)}`);
        const data = await res.json();
        if (!res.ok) { showToast(data.error || 'Failed to load inventory'); showView(viewSplash); return; }
        state.inventory = data.inventory;
        state.partsHeaders = data.partsHeaders;
        renderInventory();
    } catch {
        showToast('Failed to load inventory');
        showView(viewSplash);
    }
}

function getDescription(item) {
    // Look for a description column flexible to naming
    const descKey = Object.keys(item).find(k => /desc/i.test(k) && k !== 'part_number');
    return descKey ? item[descKey] : '';
}

function renderInventory(filter = '') {
    const term = filter.toLowerCase().trim();
    const filtered = term
        ? state.inventory.filter(item =>
            item.part_number.toLowerCase().includes(term) ||
            getDescription(item).toLowerCase().includes(term))
        : state.inventory;

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
        const disabled = !state.user ? 'disabled' : '';
        const qtyClass = qty === 0 ? 'zero' : qty <= 5 ? 'low' : '';
        const card = document.createElement('div');
        card.className = 'part-card';
        card.innerHTML = `
            <span class="part-pn">${escapeHtml(item.part_number)}</span>
            <span class="part-desc">${escapeHtml(desc)}</span>
            <div class="part-controls">
                <button class="btn-adj btn-sub" data-pn="${escapeAttr(item.part_number)}" data-action="subtract" ${disabled} title="Subtract">&#8722;</button>
                <input class="part-qty-input ${qtyClass}" type="number" value="${qty}" min="0" data-pn="${escapeAttr(item.part_number)}" ${disabled} aria-label="Quantity for ${escapeAttr(item.part_number)}">
                <button class="btn-adj btn-add" data-pn="${escapeAttr(item.part_number)}" data-action="add" ${disabled} title="Add">&#43;</button>
            </div>`;
        frag.appendChild(card);
    });
    partsList.appendChild(frag);
}

inputSearch.addEventListener('input', () => renderInventory(inputSearch.value));

// ─── Direct Adjust (+ / - buttons) ───────────────────────────────────────────
async function sendAdjust(part_number, action, quantity) {
    const res = await fetch(`/api/inventory/${encodeURIComponent(state.location)}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part_number, action, quantity, user: state.user.trim() })
    });
    return res.json().then(data => ({ ok: res.ok, data }));
}

partsList.addEventListener('click', async e => {
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
        // Update just the input field in the card for speed, then re-colorize
        const input = partsList.querySelector(`.part-qty-input[data-pn="${escapeAttr(pn)}"]`);
        if (input) {
            input.value = data.quantity;
            input.className = `part-qty-input ${data.quantity === 0 ? 'zero' : data.quantity <= 5 ? 'low' : ''}`;
        }
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
        input.value = data.quantity;
        input.className = `part-qty-input ${data.quantity === 0 ? 'zero' : data.quantity <= 5 ? 'low' : ''}`;
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

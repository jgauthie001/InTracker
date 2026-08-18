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
    dictFilter: '',
    sortKey: 'default',
    truckLocation: '',
    isTruckMode: false,
    locInventory: [],
    truckInventory: [],
    hideOrder: true,
    truckTransferDirection: 'to-truck'  // 'to-truck' or 'from-truck'
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
const selectDictFilter     = $('select-dict-filter');
const selectSort           = $('select-sort');
const btnReorder           = $('btn-reorder');
const btnExportLocationInventory = $('btn-export-location-inventory');
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

// Rename location modal
const modalRenameLocation   = $('modal-rename-location');
const inputRenameLocation   = $('input-rename-location');
const renameLocCurrent      = $('rename-loc-current');
const renameLocError        = $('rename-loc-error');
const btnRenameLocConfirm   = $('btn-rename-loc-confirm');
const btnRenameLocCancel    = $('btn-rename-loc-cancel');

// Rename password modal
const modalRenamePassword       = $('modal-rename-password');
const inputRenamePassword       = $('input-rename-password');
const renamePasswordError       = $('rename-password-error');
const btnRenamePasswordConfirm  = $('btn-rename-password-confirm');
const btnRenamePasswordCancel   = $('btn-rename-password-cancel');

// Admin choice modal
const modalAdminChoice      = $('modal-admin-choice');
const btnAdminRename        = $('btn-admin-rename');
const btnAdminNewLocation   = $('btn-admin-new-location');
const btnAdminLocationInfo  = $('btn-admin-location-info');
const btnAdminManageHidden  = $('btn-admin-manage-hidden');
const btnAdminCancel        = $('btn-admin-cancel');
const btnAdminCityGroups    = $('btn-admin-city-groups');

// City groups modal
const modalCityGroups     = $('modal-city-groups');
const cityGroupsList      = $('city-groups-list');
const cityGroupsError     = $('city-groups-error');
const btnAddCity          = $('btn-add-city');
const btnCityGroupsSave   = $('btn-city-groups-save');
const btnCityGroupsCancel = $('btn-city-groups-cancel');

// Manage hidden locations modal
const modalManageHidden      = $('modal-manage-hidden');
const hiddenLocList          = $('hidden-loc-list');
const btnConsolidatedInventory = $('btn-consolidated-inventory');
const btnManageHiddenRestore = $('btn-manage-hidden-restore');
const btnManageHiddenClose   = $('btn-manage-hidden-close');

// Manage locations modal (all locations toggle)
const btnManageLocations     = $('btn-manage-locations');
const modalManageLocations   = $('modal-manage-locations');
const manageLocList          = $('manage-loc-list');
const btnManageLocApply      = $('btn-manage-loc-apply');
const btnManageLocCancel     = $('btn-manage-loc-cancel');

// Reorder format modal
const modalReorderSelect    = $('modal-reorder-select');
const reorderLocList        = $('reorder-loc-list');
const reorderError          = $('reorder-error');
const btnReorderGenerate    = $('btn-reorder-generate');
const btnReorderCancel      = $('btn-reorder-cancel');

// Rec Parts
const btnRecParts        = $('btn-rec-parts');
const inputRecPartsCsv   = $('input-rec-parts-csv');

// Location info modal
const btnLocInfo         = $('btn-loc-info');
const modalLocInfo       = $('modal-loc-info');
const locInfoLocName     = $('loc-info-loc-name');
const locInfoCc          = $('loc-info-cc');
const locInfoShed        = $('loc-info-shed');
const locInfoLocname     = $('loc-info-locname');
const locInfoAddress     = $('loc-info-address');
const locInfoStreet      = $('loc-info-street');
const locInfoCity        = $('loc-info-city');
const locInfoState       = $('loc-info-state');
const locInfoZip         = $('loc-info-zip');
const btnLocInfoSave     = $('btn-loc-info-save');
const btnLocInfoCancel   = $('btn-loc-info-cancel');

// Upload history modal
const btnUploadHistory       = $('btn-upload-history');
const modalUploadHistory     = $('modal-upload-history');
const uploadHistoryLocName   = $('upload-history-loc-name');
const uploadHistoryList      = $('upload-history-list');
const uploadHistoryEmpty     = $('upload-history-empty');
const uploadHistoryError     = $('upload-history-error');
const btnUploadHistoryClose  = $('btn-upload-history-close');

// Barcode scanner modal
const modalBarcode              = $('modal-barcode');
const inputBarcodePn            = $('input-barcode-pn');
const barcodeDisplay            = $('barcode-display');
const barcodePnShow             = $('barcode-pn-show');
const barcodeDesc               = $('barcode-desc');
const barcodeQty                = $('barcode-qty');
const barcodeError              = $('barcode-error');
const btnBarcodeClose           = $('btn-barcode-close');
const btnBarcodeModeAdd         = $('btn-barcode-mode-add');
const btnBarcodeModeSub         = $('btn-barcode-mode-subtract');

// Truck mode manager modal
const modalTruckManager         = $('modal-truck-manager');
const truckUsersList            = $('truck-users-list');
const btnTruckManagerClose      = $('btn-truck-manager-close');
const btnAdminTruckManager      = $('btn-admin-truck-manager');
const truckManagerError         = $('truck-manager-error');

// Truck transfer scanner modal
const modalTruckTransferScanner = $('modal-truck-transfer-scanner');
const inputTruckTransferPn      = $('input-truck-transfer-pn');
const btnTransferToTruck        = $('btn-transfer-to-truck');
const btnTransferFromTruck      = $('btn-transfer-from-truck');
const truckTransferDisplay      = $('truck-transfer-display');
const truckTransferError        = $('truck-transfer-error');
const btnTruckTransferClose     = $('btn-truck-transfer-close');
const transferFromName          = $('transfer-from-name');
const transferToName            = $('transfer-to-name');
const transferFromQty           = $('transfer-from-qty');
const transferToQty             = $('transfer-to-qty');
const transferPartPn            = $('transfer-part-pn');
const transferPartDesc          = $('transfer-part-desc');
const transferDirectionArrow    = $('transfer-direction-arrow');
const truckTransferResultMsg    = $('truck-transfer-result-msg');

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

// ─── Truck Mode User Preferences ──────────────────────────────────────────────
function getTruckModeUsers() {
    try { 
        return JSON.parse(localStorage.getItem('intracker_truck_users') || '[]'); 
    } catch { 
        return []; 
    }
}

function setTruckModeUsers(arr) {
    localStorage.setItem('intracker_truck_users', JSON.stringify(arr));
}

function shouldUserSeeTruckMode() {
    const enabledUsers = getTruckModeUsers();
    return enabledUsers.includes(state.user.trim());
}

function toggleTruckModeForUser(username, enabled) {
    let users = getTruckModeUsers();
    if (enabled) {
        if (!users.includes(username)) users.push(username);
    } else {
        users = users.filter(u => u !== username);
    }
    setTruckModeUsers(users);
}

// Load all unique users from transaction history (extracted on server)
// For now, we'll populate this manually or via API call
async function loadAllUsers() {
    try {
        const res = await fetch('/api/transactions');
        const data = await res.json();
        const userSet = new Set();
        data.rows?.forEach(row => {
            if (row.user && row.user.trim()) userSet.add(row.user.trim());
        });
        return Array.from(userSet).sort();
    } catch {
        return [];
    }
}

async function openTruckManagerModal() {
    truckUsersList.innerHTML = '';
    const allUsers = await loadAllUsers();
    const enabledUsers = getTruckModeUsers();
    
    if (allUsers.length === 0) {
        truckManagerError.textContent = 'No users found in transaction history';
        truckManagerError.classList.remove('hidden');
        return;
    }
    
    const frag = document.createDocumentFragment();
    allUsers.forEach(user => {
        const label = document.createElement('label');
        label.className = 'truck-user-item';
        label.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = user;
        checkbox.checked = enabledUsers.includes(user);
        checkbox.className = 'truck-user-toggle';
        checkbox.addEventListener('change', (e) => {
            toggleTruckModeForUser(user, e.target.checked);
        });
        
        const span = document.createElement('span');
        span.textContent = user;
        
        label.appendChild(checkbox);
        label.appendChild(span);
        frag.appendChild(label);
    });
    
    truckUsersList.appendChild(frag);
    truckManagerError.classList.add('hidden');
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
        btnManageLocations.disabled = false;
        btnTransactions.disabled = false;
        
        // Truck mode: only enable if user is in preference list
        const canUseTruckMode = shouldUserSeeTruckMode();
        btnTruckStock.disabled = !canUseTruckMode;
        btnTruckStock.style.opacity = canUseTruckMode ? '1' : '0.5';
        btnTruckStock.title = canUseTruckMode ? 'Switch to Truck Transfer Mode' : 'Truck mode not enabled for your account';

        btnUploadHistory.disabled = false;
        if (!state.location) {
            splashText.textContent = 'Select a location to view inventory.';
        }
    } else {
        nameBanner.classList.add('required');
        nameBanner.classList.remove('filled');
        locationBar.classList.add('locked');
        selectLocation.disabled = true;
        btnNewLocation.disabled = true;
        btnManageLocations.disabled = true;
        btnTransactions.disabled = true;
        btnTruckStock.disabled = true;

        btnUploadHistory.disabled = true;
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

function handleUserInput() {
    state.user = inputUser.value;
    localStorage.setItem('intracker_user', state.user);
    applyUserState();
    scheduleTruckDropdown();
}

inputUser.addEventListener('input', handleUserInput);
inputUser.addEventListener('change', handleUserInput);
inputUser.addEventListener('keyup', handleUserInput);
inputUser.addEventListener('blur', handleUserInput);

// ─── Locations ────────────────────────────────────────────────────────────────
// ─── Per-user hidden locations (localStorage) ────────────────────────────────
function getUserHiddenKey() {
    return `intracker_hidden_${state.user.trim().toLowerCase()}`;
}
function getUserHidden() {
    try { return JSON.parse(localStorage.getItem(getUserHiddenKey()) || '[]'); } catch { return []; }
}
function setUserHidden(arr) {
    localStorage.setItem(getUserHiddenKey(), JSON.stringify(arr));
}
function hideLocationForUser(name) {
    const hidden = getUserHidden();
    if (!hidden.includes(name)) { hidden.push(name); setUserHidden(hidden); }
}
function unhideLocationForUser(name) {
    setUserHidden(getUserHidden().filter(n => n !== name));
}

// ─── City Filter ───────────────────────────────────────────────────────────────────
function getCityFilter() {
    try { return JSON.parse(localStorage.getItem('intracker_city_filter') || 'null'); } catch { return null; }
}
function setCityFilter(city, locations) {
    localStorage.setItem('intracker_city_filter', JSON.stringify({ city, locations }));
}
function clearCityFilter() {
    localStorage.removeItem('intracker_city_filter');
}


async function loadLocations() {
    try {
        const res = await fetch('/api/locations');
        const locations = await res.json();
        selectLocation.innerHTML = '<option value="">— Select a Location —</option>';
        const userHidden = getUserHidden();
        const cityFilter = getCityFilter();
        
        // If city filter is set but references locations that don't exist, clear it
        if (cityFilter && cityFilter.locations) {
            const validLocations = cityFilter.locations.filter(loc => locations.includes(loc));
            if (validLocations.length === 0 || cityFilter.locations.length === 0) {
                clearCityFilter();
                showToast('City filter cleared - no matching locations', 2000);
            } else {
                // Update the filter to only include valid locations
                cityFilter.locations = validLocations;
                setCityFilter(cityFilter.city, validLocations);
            }
        }
        
        locations.sort().forEach(loc => {
            if (loc.startsWith('truck_')) return; // truck locations only appear in truck mode
            if (userHidden.includes(loc)) return;  // user-level hide
            if (cityFilter && cityFilter.locations && !cityFilter.locations.includes(loc)) return; // city filter
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

// ─── Parts Dictionary ─────────────────────────────────────────────────────────
async function loadPartsDictionary() {
    try {
        const res = await fetch('/api/parts-dictionary');
        if (!res.ok) return;
        const dict = await res.json(); // [{abbreviation, term}, ...]
        selectDictFilter.innerHTML = '<option value="">All Part Types</option>';
        dict.forEach(({ abbreviation, term }) => {
            const opt = document.createElement('option');
            opt.value = abbreviation;
            opt.textContent = term;
            selectDictFilter.appendChild(opt);
        });
    } catch { /* silent — filter just won't populate */ }
}

// ─── Truck Dropdown Helpers ───────────────────────────────────────────────────
function addTruckToDropdown() {
    if (!state.truckLocation || !state.isTruckMode) return;
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

function handleLocationChange() {
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
}

selectLocation.addEventListener('change', handleLocationChange);

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

// ─── Rename Location Modal ───────────────────────────────────────────────────
btnRenameLocCancel.addEventListener('click', () => {
    modalRenameLocation.classList.add('hidden');
});

btnRenameLocConfirm.addEventListener('click', async () => {
    const newName = inputRenameLocation.value.trim();
    if (!newName) { renameLocError.textContent = 'Please enter a name.'; renameLocError.classList.remove('hidden'); return; }

    const oldName = state.location;
    btnRenameLocConfirm.disabled = true;
    try {
        const res = await fetch(`/api/locations/${encodeURIComponent(oldName)}/rename`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newName, user: state.user })
        });
        const data = await res.json();
        if (!res.ok) { renameLocError.textContent = data.error; renameLocError.classList.remove('hidden'); return; }

        modalRenameLocation.classList.add('hidden');
        state.location = data.newName;
        await loadLocations();
        selectLocation.value = data.newName;
        await loadInventory();
        showToast(`Renamed to "${data.newName.replace(/_/g, ' ')}"`);
    } catch {
        renameLocError.textContent = 'Server error. Please try again.';
        renameLocError.classList.remove('hidden');
    } finally {
        btnRenameLocConfirm.disabled = false;
    }
});

inputRenameLocation.addEventListener('keydown', e => { if (e.key === 'Enter') btnRenameLocConfirm.click(); });

// ─── Inventory ────────────────────────────────────────────────────────────────
async function loadInventory() {
    partsList.innerHTML = '<div class="splash-message"><div class="splash-icon">&#8635;</div><p>Loading...</p></div>';
    showView(viewInventory);
    const locationToLoad = activeLocation();
    try {
        const res = await fetch(`/api/inventory/${encodeURIComponent(locationToLoad)}?t=${Date.now()}`);
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
    btnUploadHistory.classList.toggle('hidden', state.hideOrder);
    const poBar = document.getElementById('po-action-bar');
    if (poBar) poBar.classList.toggle('hidden', state.hideOrder || state.isTruckMode);
    const hdr = document.getElementById('parts-list-header');
    if (hdr) hdr.title = state.hideOrder ? '' : 'Click to rename this location';
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
        // Search: part_number, description, equipment, AND full_description
        const matchSearch = !term ||
            item.part_number.toLowerCase().includes(term) ||
            getDescription(item).toLowerCase().includes(term) ||
            getEquipment(item).toLowerCase().includes(term) ||
            (item.full_description ? item.full_description.toLowerCase().includes(term) : false);
        const matchEquip = !state.equipFilter ||
            getEquipment(item) === state.equipFilter;
        const matchDict = !state.dictFilter ||
            getDescription(item).toLowerCase().includes(state.dictFilter.toLowerCase());
        // Filter: hide items where qty=0 AND par_level=0 AND on_order=0
        const qty = item.quantity || 0;
        const parLevel = getParLevel(item);
        const onOrder = item.on_order || 0;
        const shouldShow = qty > 0 || parLevel !== 0 || onOrder > 0;
        return matchSearch && matchEquip && matchDict && shouldShow;
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
        const parLevel = getParLevel(item);
        const onOrder = item.on_order || 0;
        // Never mark as below-par if par_level is -1; only if par_level > 0 and qty < par_level
        const belowPar = !state.isTruckMode && parLevel > 0 && qty < parLevel;
        const fullDescription = item.full_description || '';
        // Use first line of Z10 description for short display, but only if it's meaningful (not just the part number)
        const firstLine = fullDescription ? fullDescription.split('\n')[0].trim() : '';
        const descLine = (firstLine && firstLine !== item.part_number) ? firstLine : desc;
        const disabled = !state.user ? 'disabled' : '';
        const qtyClass = qty === 0 ? 'zero' : '';
        const orderClass = onOrder > 0 ? ' has-order' : '';
        // Display par: -1 shows as "—", otherwise show the number (or — if 0 and not in truck mode)
        const parDisplay = parLevel === -1 ? '&mdash;' : 
                           (!state.isTruckMode && parLevel > 0) ? parLevel : '&mdash;';
        const poMode = !state.hideOrder && !state.isTruckMode;
        const parContent = poMode
            ? `<input class="par-edit-input" type="number" value="${parLevel}" min="-1" data-pn="${escapeAttr(item.part_number)}" aria-label="Par level for ${escapeAttr(item.part_number)}">`
            : `<span class="par-val">${parDisplay}</span>`;
        const orderContent = poMode
            ? `<input class="order-edit-input" type="number" value="${onOrder}" min="0" data-pn="${escapeAttr(item.part_number)}" aria-label="On order for ${escapeAttr(item.part_number)}">`
            : (onOrder > 0 ? onOrder : '&mdash;');
        const card = document.createElement('div');
        card.className = `part-card${belowPar ? ' below-par' : ''}`;
        card.dataset.pn = escapeAttr(item.part_number);
        card.dataset.expanded = 'false';
        card.innerHTML = `
            <span class="part-pn">${escapeHtml(item.part_number)}</span>
            <span class="part-desc">${escapeHtml(descLine)}</span>
            <span class="part-par"><span class="par-label">Par</span>${parContent}</span>
            <span class="part-order${orderClass}" data-pn="${escapeAttr(item.part_number)}">
                <span class="order-label">On Ord</span>
                ${orderContent}
                ${onOrder > 0 ? `<button class="btn-receive" data-pn="${escapeAttr(item.part_number)}" ${disabled} title="Receive ${onOrder} unit(s) into current location">&#10003; Rcv</button>` : ''}
            </span>
            <div class="part-controls">
                <button class="btn-adj btn-sub" data-pn="${escapeAttr(item.part_number)}" data-action="subtract" ${disabled} title="Subtract">&#8722;</button>
                <input class="part-qty-input ${qtyClass}" type="number" value="${qty}" min="0" data-pn="${escapeAttr(item.part_number)}" ${disabled} aria-label="Quantity for ${escapeAttr(item.part_number)}">
                <button class="btn-adj btn-add" data-pn="${escapeAttr(item.part_number)}" data-action="add" ${disabled} title="Add">&#43;</button>
            </div>
            ${fullDescription ? `<div class="part-full-description hidden">${escapeHtml(fullDescription)}</div>` : ''}
        `;
        frag.appendChild(card);
    });
    partsList.appendChild(frag);
}

// ─── Par Level Save ──────────────────────────────────────────────────────────
async function handleParChange(input) {
    const pn = input.dataset.pn;
    const item = state.inventory.find(i => i.part_number === pn);
    if (!item) return;
    const currentPar = getParLevel(item);
    const newPar = parseInt(input.value, 10);
    if (isNaN(newPar) || newPar < -1) { input.value = currentPar; return; }
    if (newPar === currentPar) return;
    input.disabled = true;
    try {
        const res = await fetch(`/api/parts/${encodeURIComponent(pn)}/par_level`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ par_level: newPar, location: activeLocation() })
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.error || 'Error saving par level', 3000); input.value = currentPar; input.disabled = false; return; }
        const parKey = Object.keys(item).find(k => /par_level|parlevel/i.test(k));
        if (parKey) item[parKey] = String(newPar);
        else item.par_level = String(newPar);
        // Update card display: update below-par styling, don't re-filter entire list
        const card = input.closest('.part-card');
        if (card) {
            const qty = item.quantity || 0;
            card.classList.toggle('below-par', !state.isTruckMode && newPar > 0 && qty < newPar);
        }
        showToast(`Par ${pn} \u2192 ${newPar}`);
    } catch {
        showToast('Server error. Please try again.', 3000);
        input.value = currentPar;
    } finally {
        input.disabled = false;
    }
}

// ─── On-Order Save ────────────────────────────────────────────────────────────
async function handleOrderChange(input) {
    const pn = input.dataset.pn;
    const item = state.inventory.find(i => i.part_number === pn);
    if (!item) return;
    const currentOnOrder = item.on_order || 0;
    const newOnOrder = parseInt(input.value, 10);
    if (isNaN(newOnOrder) || newOnOrder < 0) { input.value = currentOnOrder; return; }
    if (newOnOrder === currentOnOrder) return;
    input.disabled = true;
    try {
        const res = await fetch(`/api/orders/${encodeURIComponent(pn)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity_on_order: newOnOrder, location: activeLocation() })
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.error || 'Error saving on-order quantity', 3000); input.value = currentOnOrder; input.disabled = false; return; }
        item.on_order = newOnOrder;
        // Update card display: update on_order display, don't re-filter entire list
        const card = input.closest('.part-card');
        if (card) {
            const orderSpan = card.querySelector(`.part-order[data-pn="${escapeAttr(pn)}"]`);
            if (orderSpan) {
                const disabled = !state.user ? 'disabled' : '';
                const poMode = !state.hideOrder && !state.isTruckMode;
                const orderDisplay = poMode
                    ? `<input class="order-edit-input" type="number" value="${newOnOrder}" min="0" data-pn="${escapeAttr(pn)}" aria-label="On order for ${escapeAttr(pn)}">`
                    : (newOnOrder > 0 ? newOnOrder : '&mdash;');
                orderSpan.className = `part-order${newOnOrder > 0 ? ' has-order' : ''}`;
                orderSpan.innerHTML = `<span class="order-label">On Ord</span>
                    ${orderDisplay}
                    ${newOnOrder > 0 ? `<button class="btn-receive" data-pn="${escapeAttr(pn)}" ${disabled} title="Receive ${newOnOrder} unit(s) into current location">&#10003; Rcv</button>` : ''}`;
            }
        }
        showToast(`On Ord ${pn} \u2192 ${newOnOrder}`);
    } catch {
        showToast('Server error. Please try again.', 3000);
        input.value = currentOnOrder;
    } finally {
        input.disabled = false;
    }
}

inputSearch.addEventListener('input', () => renderInventory(inputSearch.value));

selectEquipFilter.addEventListener('change', () => {
    state.equipFilter = selectEquipFilter.value;
    renderInventory(inputSearch.value);
});

selectDictFilter.addEventListener('change', () => {
    state.dictFilter = selectDictFilter.value;
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
    input.className = `part-qty-input ${newQty === 0 ? 'zero' : ''}`;
    const item = state.inventory.find(i => i.part_number === pn);
    const card = input.closest('.part-card');
    if (card && item) {
        const parLevel = getParLevel(item);
        card.classList.toggle('below-par', !state.isTruckMode && parLevel > 0 && newQty < parLevel);
        if (newOnOrder !== undefined) {
            const orderSpan = card.querySelector(`.part-order[data-pn="${escapeAttr(pn)}"]`);
            if (orderSpan) {
                const disabled = !state.user ? 'disabled' : '';
                const poMode = !state.hideOrder && !state.isTruckMode;
                const orderDisplay = poMode
                    ? `<input class="order-edit-input" type="number" value="${newOnOrder}" min="0" data-pn="${escapeAttr(pn)}" aria-label="On order for ${escapeAttr(pn)}">`
                    : (newOnOrder > 0 ? newOnOrder : '&mdash;');
                orderSpan.className = `part-order${newOnOrder > 0 ? ' has-order' : ''}`;
                orderSpan.innerHTML = `<span class="order-label">On Ord</span>
                    ${orderDisplay}
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
    // Expand/collapse full_description pane when clicking on part number or description
    const titleElement = e.target.closest('.part-pn, .part-desc');
    if (titleElement) {
        const card = titleElement.closest('.part-card');
        if (card) {
            const fullDescDiv = card.querySelector('.part-full-description');
            if (fullDescDiv) {
                e.preventDefault();
                const isExpanded = card.dataset.expanded === 'true';
                card.dataset.expanded = isExpanded ? 'false' : 'true';
                fullDescDiv.classList.toggle('hidden');
            }
            return;
        }
    }

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
    const parInput = e.target.closest('.par-edit-input');
    if (parInput) { await handleParChange(parInput); return; }

    const orderInput = e.target.closest('.order-edit-input');
    if (orderInput) { await handleOrderChange(orderInput); return; }

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

function getLocInfo(locName) {
    try {
        const all = JSON.parse(localStorage.getItem('intracker_loc_info') || '{}');
        return all[locName] || {};
    } catch { return {}; }
}

function setLocInfo(locName, info) {
    try {
        const all = JSON.parse(localStorage.getItem('intracker_loc_info') || '{}');
        all[locName] = info;
        localStorage.setItem('intracker_loc_info', JSON.stringify(all));
    } catch { /* ignore */ }
}

btnReorder.addEventListener('click', () => {
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
        // ES&S is now the only format option
        await generateEssReorderCsv(checked);
    } finally {
        btnReorderGenerate.disabled = false;
        btnReorderGenerate.textContent = 'Generate CSV';
    }
});

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

        const belowPar = inventory.filter(item => {
            const p = getParLevel(item);
            const onOrder = item.on_order || 0;
            return p > 0 && (item.quantity + onOrder) < p;
        });

        belowPar.forEach(item => {
            const onOrder = item.on_order || 0;
            const needed = getParLevel(item) - item.quantity - onOrder;
            lines.push([item.part_number, getDescription(item), String(needed)].map(csvEscape).join(','));
            totalParts++;
        });
    }

    if (lines.length === 1) { showToast('No parts below par in selected locations', 3000); return; }

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

    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showToast(`Wrong file type: "${file.name}". Please upload a CSV file.`, 4000);
        return;
    }

    const reader = new FileReader();
    const filename = file.name;
    reader.onload = async (e) => {
        const csv = e.target.result;
        const loc = activeLocation();
        if (!loc) { showToast('Select a location before uploading a PO', 3000); return; }
        try {
            const res = await fetch('/api/orders/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csv, location: loc, filename })
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Upload failed', 3000); return; }
            let msg = `PO uploaded: ${data.merged} line${data.merged === 1 ? '' : 's'} added`;
            if (data.newToMaster > 0) msg += ` (${data.newToMaster} new — added to master list)`;
            if (data.skipped > 0) msg += `, ${data.skipped} invalid format ignored`;
            showToast(msg, 4000);
            if (activeLocation()) await loadInventory();
        } catch {
            showToast('Upload failed \u2014 server error', 3000);
        }
    };
    reader.readAsText(file);
});

// ─── Rec Parts CSV ────────────────────────────────────────────────────────────
if (btnRecParts && inputRecPartsCsv) {
    btnRecParts.addEventListener('click', () => inputRecPartsCsv.click());

inputRecPartsCsv.addEventListener('change', () => {
    const file = inputRecPartsCsv.files[0];
    if (!file) return;
    inputRecPartsCsv.value = '';

    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showToast(`Wrong file type: "${file.name}". Please upload a CSV file.`, 4000);
        return;
    }

    const reader = new FileReader();
    const filename = file.name;
    reader.onload = async (e) => {
        const csv = e.target.result;
        const loc = activeLocation();
        if (!loc) { showToast('Select a location first'); return; }
        try {
            const res = await fetch(`/api/inventory/${encodeURIComponent(loc)}/bulk-receive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csv, user: state.user, filename })
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Receive failed', 3000); return; }
            let msg = `Received: ${data.received} part${data.received === 1 ? '' : 's'}`;
            if (data.newToMaster > 0) msg += ` (${data.newToMaster} new — added to master list)`;
            if (data.skipped > 0) msg += `, ${data.skipped} invalid format ignored`;
            showToast(msg, 4000);
            await loadInventory();
        } catch {
            showToast('Receive failed — server error', 3000);
        }
    };
    reader.readAsText(file);
    });
}

// ─── Barcode Scanner ──────────────────────────────────────────────────────────
let currentBarcodeItem = null;
let barcodeModeIsAdd = true;  // true = ADD, false = SUBTRACT
let barcodeInputBuffer = '';
let barcodeInputLastTime = 0;

// Global barcode scanner detector - opens modal when barcode is scanned anywhere
document.addEventListener('keydown', (e) => {
    // Don't intercept if inside ANY form input field (FIX for double-keystroke bug)
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') return;
    
    // Don't intercept if any modal is open that uses input fields
    if (!modalBarcode.classList.contains('hidden')) return;  // Normal barcode modal open
    if (!modalTruckTransferScanner.classList.contains('hidden')) return;  // Truck transfer modal open
    if (!state.user.trim() || !state.location) return;  // User/location required
    
    // Detect barcode scanner pattern: rapid keystrokes followed by Enter
    const now = Date.now();
    const timeSinceLastKey = now - barcodeInputLastTime;
    
    if (e.key === 'Enter') {
        // Enter key - check if we have a barcode buffer
        if (barcodeInputBuffer.length >= 5) {  // Minimum barcode length
            e.preventDefault();
            
            // Route to appropriate modal based on context
            if (state.isTruckMode && state.location !== state.truckLocation) {
                // In truck mode at a non-truck location → truck transfer scanner
                openTruckTransferScannerModal();
            } else {
                // Normal inventory mode or at truck location → normal barcode scanner
                openBarcodeModal();
            }
            barcodeInputBuffer = '';
        }
        barcodeInputBuffer = '';
        barcodeInputLastTime = 0;
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Regular character - accumulate if timing suggests barcode scanner
        // Barcode scanners typically send characters within 50-100ms of each other
        if (timeSinceLastKey < 150 || barcodeInputBuffer === '') {
            barcodeInputBuffer += e.key;
            barcodeInputLastTime = now;
            e.preventDefault();  // Prevent default behavior
        }
    } else {
        // Reset buffer on non-printable keys
        barcodeInputBuffer = '';
        barcodeInputLastTime = 0;
    }
}, true);  // Use capture phase to intercept before other handlers

// Helper function to open barcode modal
function openBarcodeModal() {
    if (!state.user.trim()) { showToast('Please enter your name first'); return; }
    if (!state.location) { showToast('Please select a location first'); return; }
    
    currentBarcodeItem = null;
    barcodeModeIsAdd = true;  // Default to ADD mode
    inputBarcodePn.value = '';
    barcodeDisplay.classList.add('hidden');
    barcodeError.classList.add('hidden');
    barcodeError.textContent = '';
    updateBarcodeModeDisplay();
    modalBarcode.classList.remove('hidden');
    inputBarcodePn.focus();
}

// Update barcode mode display
function updateBarcodeModeDisplay() {
    if (barcodeModeIsAdd) {
        btnBarcodeModeAdd.classList.add('active');
        btnBarcodeModeSub.classList.remove('active');
    } else {
        btnBarcodeModeAdd.classList.remove('active');
        btnBarcodeModeSub.classList.add('active');
    }
}

// Barcode mode selection
btnBarcodeModeAdd.addEventListener('click', () => {
    barcodeModeIsAdd = true;
    updateBarcodeModeDisplay();
    inputBarcodePn.focus();
});

btnBarcodeModeSub.addEventListener('click', () => {
    barcodeModeIsAdd = false;
    updateBarcodeModeDisplay();
    inputBarcodePn.focus();
});

// Handle barcode scanning or manual entry
inputBarcodePn.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        const pn = inputBarcodePn.value.trim().toUpperCase();
        if (!pn) {
            barcodeError.textContent = 'Please enter a part number';
            barcodeError.classList.remove('hidden');
            return;
        }
        
        // Find the part in current inventory
        const item = state.inventory.find(i => i.part_number.toUpperCase() === pn);
        if (!item) {
            barcodeError.textContent = `❌ Part # "${pn}" not found in this location`;
            barcodeError.classList.remove('hidden');
            barcodeDisplay.classList.add('hidden');
            showToast(`Part not found: ${pn}`, 3000);
            inputBarcodePn.value = '';
            inputBarcodePn.focus();
            return;
        }
        
        currentBarcodeItem = item;
        barcodePnShow.textContent = item.part_number;
        barcodeDesc.textContent = getDescription(item) || '(No description)';
        barcodeQty.textContent = item.quantity;
        barcodeError.classList.add('hidden');
        barcodeError.textContent = '';
        barcodeDisplay.classList.remove('hidden');
        showToast(`✓ ${item.part_number} found – Current qty: ${item.quantity}`);
        
        // Auto-apply the selected mode
        if (barcodeModeIsAdd) {
            await performBarcodAdd(item, 1);
        } else {
            await performBarcodeSubtract(item, 1);
        }
    }
});

// Perform barcode add
async function performBarcodAdd(item, qty) {
    if (!item || !state.user.trim()) return;
    
    try {
        const { ok, data } = await sendAdjust(item.part_number, 'add', qty);
        if (!ok) {
            barcodeError.textContent = `❌ ${data.error || 'Error adding quantity'}`;
            barcodeError.classList.remove('hidden');
            showToast(`Error: ${data.error || 'Failed to add quantity'}`, 3000);
            return;
        }
        
        currentBarcodeItem.quantity = data.quantity;
        barcodeQty.textContent = data.quantity;
        barcodeError.classList.add('hidden');
        barcodeError.textContent = '';
        showToast(`✓ +${qty} ${item.part_number} → ${data.quantity}`, 2500);
        inputBarcodePn.value = '';
        inputBarcodePn.focus();
        barcodeDisplay.classList.add('hidden');
        
        // Update main inventory display
        updateCardDisplay(item.part_number, data.quantity, data.on_order);
    } catch (err) {
        console.error('Add adjustment error:', err);
        barcodeError.textContent = '❌ Server error. Please try again.';
        barcodeError.classList.remove('hidden');
        showToast('Server error', 3000);
    }
}

// Perform barcode subtract
async function performBarcodeSubtract(item, qty) {
    if (!item || !state.user.trim()) return;
    
    if (item.quantity < qty) {
        barcodeError.textContent = `❌ Cannot subtract ${qty} – only ${item.quantity} in stock`;
        barcodeError.classList.remove('hidden');
        showToast(`Insufficient stock: only ${item.quantity} available`, 3000);
        return;
    }
    
    try {
        const { ok, data } = await sendAdjust(item.part_number, 'subtract', qty);
        if (!ok) {
            barcodeError.textContent = `❌ ${data.error || 'Error subtracting quantity'}`;
            barcodeError.classList.remove('hidden');
            showToast(`Error: ${data.error || 'Failed to subtract quantity'}`, 3000);
            return;
        }
        
        currentBarcodeItem.quantity = data.quantity;
        barcodeQty.textContent = data.quantity;
        barcodeError.classList.add('hidden');
        barcodeError.textContent = '';
        showToast(`✓ -${qty} ${item.part_number} → ${data.quantity}`, 2500);
        inputBarcodePn.value = '';
        inputBarcodePn.focus();
        barcodeDisplay.classList.add('hidden');
        
        // Update main inventory display
        updateCardDisplay(item.part_number, data.quantity, data.on_order);
    } catch (err) {
        console.error('Subtract adjustment error:', err);
        barcodeError.textContent = '❌ Server error. Please try again.';
        barcodeError.classList.remove('hidden');
        showToast('Server error', 3000);
    }
}

// Close barcode scanner
btnBarcodeClose.addEventListener('click', () => {
    modalBarcode.classList.add('hidden');
    currentBarcodeItem = null;
});

// ─── Truck Transfer Scanner Modal ─────────────────────────────────────────────

function openTruckTransferScannerModal() {
    if (!state.user.trim()) { showToast('Please enter your name first'); return; }
    if (!state.location) { showToast('Please select a location first'); return; }
    
    currentBarcodeItem = null;
    state.truckTransferDirection = 'to-truck';  // Default: send to truck
    inputTruckTransferPn.value = '';
    truckTransferError.classList.add('hidden');
    truckTransferDisplay.classList.add('hidden');
    updateTransferDirectionDisplay();
    modalTruckTransferScanner.classList.remove('hidden');
    inputTruckTransferPn.focus();
}

function updateTransferDirectionDisplay() {
    if (state.truckTransferDirection === 'to-truck') {
        btnTransferToTruck.classList.add('active');
        btnTransferFromTruck.classList.remove('active');
        transferFromName.textContent = state.location.replace(/_/g, ' ');
        transferToName.textContent = 'Truck';
        transferDirectionArrow.textContent = '→';
        inputTruckTransferPn.placeholder = 'Scan part to send to truck';
    } else {
        btnTransferFromTruck.classList.add('active');
        btnTransferToTruck.classList.remove('active');
        transferFromName.textContent = 'Truck';
        transferToName.textContent = state.location.replace(/_/g, ' ');
        transferDirectionArrow.textContent = '←';
        inputTruckTransferPn.placeholder = 'Scan part from truck';
    }
}

btnTransferToTruck.addEventListener('click', () => {
    state.truckTransferDirection = 'to-truck';
    updateTransferDirectionDisplay();
    inputTruckTransferPn.focus();
});

btnTransferFromTruck.addEventListener('click', () => {
    state.truckTransferDirection = 'from-truck';
    updateTransferDirectionDisplay();
    inputTruckTransferPn.focus();
});

inputTruckTransferPn.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        const pn = inputTruckTransferPn.value.trim().toUpperCase();
        if (!pn) {
            truckTransferError.textContent = 'Please enter a part number';
            truckTransferError.classList.remove('hidden');
            return;
        }
        
        // Find part in source location
        const sourceInventory = state.truckTransferDirection === 'to-truck' 
            ? state.inventory  // Transferring FROM location
            : state.truckInventory;  // Transferring FROM truck
        
        const item = sourceInventory?.find(i => i.part_number.toUpperCase() === pn);
        
        // Get destination qty (may be 0 if not found)
        const destInventory = state.truckTransferDirection === 'to-truck'
            ? state.truckInventory
            : state.inventory;
        const destItem = destInventory?.find(i => i.part_number === pn);
        const destQty = destItem?.quantity || 0;
        const sourceQty = item?.quantity || 0;
        
        // Update display
        transferFromQty.textContent = `QTY: ${sourceQty}`;
        transferToQty.textContent = `QTY: ${destQty}`;
        transferPartPn.textContent = pn;
        transferPartDesc.textContent = item?.description || '(No description)';
        
        // Show transfer message
        const action = state.truckTransferDirection === 'to-truck' ? 'to truck' : 'to location';
        truckTransferResultMsg.textContent = `✓ Transfer 1 unit ${action}`;
        
        truckTransferError.classList.add('hidden');
        truckTransferError.textContent = '';
        truckTransferDisplay.classList.remove('hidden');
        
        // AUTO-EXECUTE TRANSFER
        await performTruckTransfer(pn);
        
        // Reset for next scan
        setTimeout(() => {
            inputTruckTransferPn.value = '';
            inputTruckTransferPn.focus();
            truckTransferDisplay.classList.add('hidden');
        }, 2000);
    }
});

async function performTruckTransfer(pn) {
    const sourceLocation = state.truckTransferDirection === 'to-truck' 
        ? state.location 
        : state.truckLocation;
    const destLocation = state.truckTransferDirection === 'to-truck'
        ? state.truckLocation
        : state.location;
    
    try {
        const res = await fetch('/api/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from_location: sourceLocation,
                to_location: destLocation,
                part_number: pn,
                quantity: 1,
                user: state.user.trim()
            })
        });
        
        const data = await res.json();
        if (!res.ok) {
            truckTransferError.textContent = `❌ ${data.error || 'Transfer failed'}`;
            truckTransferError.classList.remove('hidden');
            return;
        }
        
        // Update local state
        if (state.truckTransferDirection === 'to-truck') {
            const locItem = state.inventory.find(i => i.part_number === pn);
            if (locItem) locItem.quantity = data.from.quantity;
            
            const truckItem = state.truckInventory.find(i => i.part_number === pn);
            if (truckItem) {
                truckItem.quantity = data.to.quantity;
            } else {
                state.truckInventory.push({ part_number: pn, quantity: data.to.quantity });
            }
        } else {
            const truckItem = state.truckInventory.find(i => i.part_number === pn);
            if (truckItem) truckItem.quantity = data.from.quantity;
            
            const locItem = state.inventory.find(i => i.part_number === pn);
            if (locItem) {
                locItem.quantity = data.to.quantity;
            } else {
                state.inventory.push({ part_number: pn, quantity: data.to.quantity });
            }
        }
        
        showToast(`✓ Transferred 1 × ${pn}`);
    } catch (err) {
        truckTransferError.textContent = '❌ Server error. Please try again.';
        truckTransferError.classList.remove('hidden');
    }
}

btnTruckTransferClose.addEventListener('click', () => {
    modalTruckTransferScanner.classList.add('hidden');
    currentBarcodeItem = null;
});

// ─── Truck Stock ──────────────────────────────────────────────────────────────
btnTruckStock.addEventListener('click', async () => {
    if (!state.user.trim()) { showToast('Please enter your name first'); return; }
    
    // Verify truck mode is enabled for this user
    if (!state.isTruckMode && !shouldUserSeeTruckMode()) {
        showToast('Truck mode is not enabled for your account');
        return;
    }

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
        const locClass   = locQty   === 0 ? 'zero' : '';
        const truckClass = truckQty === 0 ? 'zero' : '';
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
        locVal.className = `truck-qty-val loc-val ${newLocQty === 0 ? 'zero' : ''}`.trim();
    }
    if (truckInput) {
        truckInput.value = newTruckQty;
        truckInput.className = `truck-qty-input ${newTruckQty === 0 ? 'zero' : ''}`.trim();
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
        if (btnTruckStock.style.display !== 'none') {
            // Hide the truck button (and exit truck mode if active)
            if (state.isTruckMode) {
                state.isTruckMode = false;
                state.truckLocation = '';
                state.locInventory = [];
                state.truckInventory = [];
                btnTruckStock.classList.remove('active');
                if (state.location) loadInventory();
                else { showView(viewSplash); splashText.textContent = 'Select a location to view inventory.'; }
            }
            btnTruckStock.style.display = 'none';
        } else {
            btnTruckStock.style.display = 'inline-flex';
            showToast('Truck mode unlocked');
        }
    }
    if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        if (!state.location) {
            // No location selected — open restore modal if there's anything hidden
            const hidden = getUserHidden();
            if (hidden.length === 0) { showToast('No hidden locations to restore'); return; }
            renderHiddenLocList();
            modalManageHidden.classList.remove('hidden');
            return;
        }
        const locToHide = state.location;
        hideLocationForUser(locToHide);
        state.location = '';
        selectLocation.value = '';
        await loadLocations();
        showView(viewSplash);
        splashText.textContent = 'Select a location to view inventory.';
        showToast(`"${locToHide.replace(/_/g, ' ')}" hidden — use the Locations button to restore it`);
    }
});

// ─── Rename password gate ────────────────────────────────────────────────────
btnRenamePasswordCancel.addEventListener('click', () => {
    modalRenamePassword.classList.add('hidden');
});

btnRenamePasswordConfirm.addEventListener('click', () => {
    if (inputRenamePassword.value.trim().toLowerCase() !== 'gauthier') {
        renamePasswordError.classList.remove('hidden');
        inputRenamePassword.value = '';
        inputRenamePassword.focus();
        return;
    }
    modalRenamePassword.classList.add('hidden');
    inputRenamePassword.value = '';
    renamePasswordError.classList.add('hidden');
    // Show Rename vs New Location choice
    btnAdminRename.classList.toggle('hidden', !state.location || state.isTruckMode);
    btnAdminLocationInfo.classList.toggle('hidden', !state.location || state.isTruckMode);
    modalAdminChoice.classList.remove('hidden');
});

inputRenamePassword.addEventListener('keydown', e => { if (e.key === 'Enter') btnRenamePasswordConfirm.click(); });

// ─── Admin choice modal ────────────────────────────────────────────────────
btnAdminCancel.addEventListener('click', () => {
    modalAdminChoice.classList.add('hidden');
});

btnAdminRename.addEventListener('click', () => {
    modalAdminChoice.classList.add('hidden');
    renameLocCurrent.textContent = state.location.replace(/_/g, ' ');
    inputRenameLocation.value = state.location.replace(/_/g, ' ');
    renameLocError.classList.add('hidden');
    modalRenameLocation.classList.remove('hidden');
    setTimeout(() => { inputRenameLocation.select(); inputRenameLocation.focus(); }, 100);
});

btnAdminNewLocation.addEventListener('click', () => {
    modalAdminChoice.classList.add('hidden');
    inputNewLocation.value = '';
    newLocError.classList.add('hidden');
    modalNewLocation.classList.remove('hidden');
    setTimeout(() => inputNewLocation.focus(), 100);
});

btnAdminManageHidden.addEventListener('click', () => {
    modalAdminChoice.classList.add('hidden');
    renderHiddenLocList();
    modalManageHidden.classList.remove('hidden');
});

btnAdminCityGroups.addEventListener('click', () => {
    modalAdminChoice.classList.add('hidden');
    openCityGroupsModal();
});

btnAdminTruckManager.addEventListener('click', () => {
    modalAdminChoice.classList.add('hidden');
    openTruckManagerModal();
    modalTruckManager.classList.remove('hidden');
});

btnTruckManagerClose.addEventListener('click', () => {
    modalTruckManager.classList.add('hidden');
});

btnAdminLocationInfo.addEventListener('click', () => {
    modalAdminChoice.classList.add('hidden');
    const locName = state.location;
    if (!locName) return;
    const info = getLocInfo(locName);
    locInfoLocName.textContent  = locName.replace(/_/g, ' ');
    locInfoCc.value             = info.cc           || '';
    locInfoShed.value           = info.shed         || '';
    locInfoLocname.value        = info.locationName || locName.replace(/_/g, ' ');
    locInfoAddress.value        = info.address      || '';
    locInfoStreet.value         = info.street       || '';
    locInfoCity.value           = info.city         || '';
    locInfoState.value          = info.state        || '';
    locInfoZip.value            = info.zip          || '';
    modalLocInfo.classList.remove('hidden');
    setTimeout(() => locInfoCc.focus(), 100);
});

btnManageHiddenRestore.addEventListener('click', async () => {
    const checked = [...hiddenLocList.querySelectorAll('input[type="checkbox"]:checked')];
    if (checked.length === 0) { showToast('No locations selected'); return; }
    checked.forEach(cb => unhideLocationForUser(cb.value));
    modalManageHidden.classList.add('hidden');
    await loadLocations();
    showToast(`${checked.length} location${checked.length > 1 ? 's' : ''} restored`);
});

btnManageHiddenClose.addEventListener('click', () => {
    modalManageHidden.classList.add('hidden');
});

// ─── Export Location Inventory (PO Entry Mode) ─────────────────────────────────
btnExportLocationInventory.addEventListener('click', async () => {
    const loc = activeLocation();
    if (!loc) { showToast('Select a location first'); return; }
    
    btnExportLocationInventory.disabled = true;
    btnExportLocationInventory.textContent = 'Exporting…';
    
    try {
        await generateLocationInventoryCsv(loc);
    } finally {
        btnExportLocationInventory.disabled = false;
        btnExportLocationInventory.textContent = '↓ Location Inventory';
    }
});

async function generateLocationInventoryCsv(locName) {
    const date = new Date().toISOString().slice(0, 10);
    const headerRow = ['part_number', 'short_description', 'par_level', 'quantity_on_hand'];
    const lines = [headerRow.map(csvEscape).join(',')];
    let totalParts = 0;
    
    try {
        const res = await fetch(`/api/inventory/${encodeURIComponent(locName)}`);
        const data = await res.json();
        if (!res.ok) { showToast(`Error loading inventory: ${data.error}`, 3000); return; }
        
        const inventory = data.inventory;
        inventory.forEach(item => {
            const description = getDescription(item) || '';
            const parLevel = getParLevel(item) || 0;
            const quantity = item.quantity || 0;
            
            lines.push([
                item.part_number,
                description,
                String(parLevel),
                String(quantity)
            ].map(csvEscape).join(','));
            totalParts++;
        });
        
        if (lines.length === 1) { showToast('No parts in this location', 3000); return; }
        
        const locNameClean = locName.replace(/_/g, ' ');
        const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory_${locNameClean.replace(/\s+/g, '_')}_${date}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Location inventory downloaded (${totalParts} part${totalParts === 1 ? '' : 's'})`);
    } catch {
        showToast('Server error generating inventory', 3000);
    }
}

// ─── Export Consolidated Inventory Report ─────────────────────────────────────
btnConsolidatedInventory.addEventListener('click', async () => {
    btnConsolidatedInventory.disabled = true;
    btnConsolidatedInventory.textContent = 'Generating…';
    
    try {
        await generateConsolidatedInventoryCsv();
    } finally {
        btnConsolidatedInventory.disabled = false;
        btnConsolidatedInventory.textContent = '📊 Consolidated Report';
    }
});

async function generateConsolidatedInventoryCsv() {
    const date = new Date().toISOString().slice(0, 10);
    
    try {
        // Get all locations
        const locRes = await fetch('/api/locations');
        const allLocations = await locRes.json();
        
        // Filter out trucks and demo locations
        const activeLocations = allLocations.filter(loc => 
            !loc.startsWith('truck_') && 
            !loc.toLowerCase().includes('truck') && 
            !loc.toLowerCase().includes('demo')
        ).sort();
        
        if (activeLocations.length === 0) {
            showToast('No active locations found', 3000);
            return;
        }
        
        // Build header: part_number, short_description, then all par_levels, then all qty columns
        const headerRow = ['part_number', 'short_description'];
        
        // Add all par_level columns
        activeLocations.forEach(loc => {
            const locDisplay = loc.replace(/_/g, ' ');
            headerRow.push(`${locDisplay}_par_level`);
        });
        
        // Add all qty columns
        activeLocations.forEach(loc => {
            const locDisplay = loc.replace(/_/g, ' ');
            headerRow.push(`${locDisplay}_qty_on_hand`);
        });
        
        const lines = [headerRow.map(csvEscape).join(',')];
        
        // Map to collect all part numbers and their data
        const partMap = {};
        
        // Load inventory for each location
        for (const locName of activeLocations) {
            try {
                const res = await fetch(`/api/inventory/${encodeURIComponent(locName)}`);
                const data = await res.json();
                if (!res.ok) continue;
                
                const inventory = data.inventory;
                inventory.forEach(item => {
                    if (!partMap[item.part_number]) {
                        partMap[item.part_number] = {
                            part_number: item.part_number,
                            description: getDescription(item) || '',
                            locations: {}
                        };
                    }
                    partMap[item.part_number].locations[locName] = {
                        par_level: getParLevel(item) || 0,
                        quantity: item.quantity || 0
                    };
                });
            } catch {
                // Skip location if error
                continue;
            }
        }
        
        // Build data rows
        Object.values(partMap).forEach(part => {
            const row = [part.part_number, part.description];
            
            // Add all par levels first
            activeLocations.forEach(loc => {
                const locData = part.locations[loc];
                if (locData) {
                    row.push(String(locData.par_level));
                } else {
                    row.push('0');
                }
            });
            
            // Then add all quantities
            activeLocations.forEach(loc => {
                const locData = part.locations[loc];
                if (locData) {
                    row.push(String(locData.quantity));
                } else {
                    row.push('0');
                }
            });
            
            lines.push(row.map(csvEscape).join(','));
        });
        
        const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `consolidated_inventory_${date}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        modalAdminChoice.classList.add('hidden');
        showToast(`Consolidated report downloaded (${Object.keys(partMap).length} part${Object.keys(partMap).length === 1 ? '' : 's'})`);
    } catch {
        showToast('Server error generating report', 3000);
    }
}

// ─── Manage Locations modal (all-locations toggle) ────────────────────────────
btnManageLocations.addEventListener('click', openManageLocations);

async function openManageLocations() {
    try {
        const res = await fetch('/api/locations');
        const locations = await res.json();
        const userHidden = getUserHidden();
        const cityFilter = getCityFilter();
        manageLocList.innerHTML = '';
        let nonTruck = locations.filter(l => !l.startsWith('truck_')).sort();
        if (cityFilter) nonTruck = nonTruck.filter(l => cityFilter.locations.includes(l));
        if (nonTruck.length === 0) {
            manageLocList.innerHTML = '<p style="opacity:0.6;font-size:0.9rem;margin:0">No locations found.</p>';
        } else {
            nonTruck.forEach(name => {
                const row = document.createElement('div');
                row.className = 'hidden-loc-item';
                const id = `chk-mgloc-${name}`;
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.id = id;
                cb.value = name;
                cb.checked = !userHidden.includes(name);
                const label = document.createElement('label');
                label.htmlFor = id;
                label.textContent = name.replace(/_/g, ' ');
                row.appendChild(cb);
                row.appendChild(label);
                manageLocList.appendChild(row);
            });
        }
        modalManageLocations.classList.remove('hidden');
    } catch {
        showToast('Failed to load locations');
    }
}

btnManageLocApply.addEventListener('click', async () => {
    const items = [...manageLocList.querySelectorAll('input[type="checkbox"]')];
    items.forEach(cb => {
        if (cb.checked) unhideLocationForUser(cb.value);
        else hideLocationForUser(cb.value);
    });
    // If the currently selected location was just hidden, deselect it
    if (state.location && getUserHidden().includes(state.location)) {
        state.location = '';
        selectLocation.value = '';
        showView(viewSplash);
        splashText.textContent = 'Select a location to view inventory.';
    }
    modalManageLocations.classList.add('hidden');
    await loadLocations();
    showToast('Location visibility updated');
});

btnManageLocCancel.addEventListener('click', () => {
    modalManageLocations.classList.add('hidden');
});

// ─── Location Info Modal ──────────────────────────────────────────────────────
// Location info now opens via btnAdminLocationInfo after password validation
if (btnLocInfo) {
    btnLocInfo.addEventListener('click', () => {
        if (!state.location || state.isTruckMode) return;
        renamePasswordError.classList.add('hidden');
        inputRenamePassword.value = '';
        modalRenamePassword.classList.remove('hidden');
        setTimeout(() => inputRenamePassword.focus(), 100);
    });
}

// Save/Cancel handlers always execute (not conditional on btnLocInfo existing)
if (btnLocInfoSave && modalLocInfo) {
    btnLocInfoSave.addEventListener('click', () => {
        const locName = state.location;
        if (!locName) return;
        setLocInfo(locName, {
            cc:           locInfoCc.value.trim(),
            shed:         locInfoShed.value.trim(),
            locationName: locInfoLocname.value.trim(),
            address:      locInfoAddress.value.trim(),
            street:       locInfoStreet.value.trim(),
            city:         locInfoCity.value.trim(),
            state:        locInfoState.value.trim(),
            zip:          locInfoZip.value.trim(),
        });
        modalLocInfo.classList.add('hidden');
        showToast('Location info saved');
    });
}

if (btnLocInfoCancel && modalLocInfo) {
    btnLocInfoCancel.addEventListener('click', () => {
        modalLocInfo.classList.add('hidden');
    });

    modalLocInfo.addEventListener('click', e => {
        if (e.target === modalLocInfo) modalLocInfo.classList.add('hidden');
    });
}

function renderHiddenLocList() {
    const hidden = getUserHidden();
    hiddenLocList.innerHTML = '';
    if (hidden.length === 0) {
        hiddenLocList.innerHTML = '<p style="opacity:0.6;font-size:0.9rem;margin:0">No hidden locations.</p>';
        return;
    }
    hidden.forEach(name => {
        const row = document.createElement('div');
        row.className = 'hidden-loc-item';
        const id = `chk-hidden-${name}`;
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = id;
        cb.value = name;
        cb.checked = true;
        const label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = name.replace(/_/g, ' ');
        row.appendChild(cb);
        row.appendChild(label);
        hiddenLocList.appendChild(row);
    });
}

// ─── City Groups Modal ────────────────────────────────────────────────────────
let _cityGroupsAllLocs = [];

async function openCityGroupsModal() {
    cityGroupsError.classList.add('hidden');
    cityGroupsList.innerHTML = '<p style="opacity:0.6;font-size:0.9rem;margin:0">Loading\u2026</p>';
    modalCityGroups.classList.remove('hidden');
    try {
        const [locsRes, groupsRes] = await Promise.all([
            fetch('/api/locations'),
            fetch('/api/city-groups')
        ]);
        const allLocs = await locsRes.json();
        _cityGroupsAllLocs = allLocs.filter(l => !l.startsWith('truck_')).sort();
        const groups = await groupsRes.json();
        renderCityGroupsList(groups);
    } catch {
        cityGroupsList.innerHTML = '<p style="color:var(--warn);margin:0">Failed to load data.</p>';
    }
}

function renderCityGroupsList(groups) {
    cityGroupsList.innerHTML = '';
    const entries = Object.entries(groups);
    if (entries.length === 0) {
        const p = document.createElement('p');
        p.style.cssText = 'opacity:0.6;font-size:0.9rem;margin:0';
        p.textContent = 'No city groups defined yet. Click \u201c+ Add City\u201d to create one.';
        cityGroupsList.appendChild(p);
    } else {
        entries.forEach(([city, locs]) => addCityGroupEntry(city, locs));
    }
}

function addCityGroupEntry(city, locs) {
    // Remove placeholder paragraph if present
    const placeholder = cityGroupsList.querySelector('p');
    if (placeholder) placeholder.remove();

    const entry = document.createElement('div');
    entry.className = 'city-group-entry';
    entry.style.cssText = 'border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;background:var(--surface2)';

    // Header row: city name input + remove button
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'City name\u2026';
    nameInput.value = city || '';
    nameInput.maxLength = 60;
    nameInput.style.cssText = 'flex:1;padding:5px 8px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:0.9rem';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-ghost';
    removeBtn.textContent = '\u2715';
    removeBtn.style.cssText = 'padding:4px 8px;font-size:0.85rem';
    removeBtn.title = 'Remove this city group';
    removeBtn.addEventListener('click', () => entry.remove());

    header.appendChild(nameInput);
    header.appendChild(removeBtn);
    entry.appendChild(header);

    // Location checkboxes
    if (_cityGroupsAllLocs.length > 0) {
        const grid = document.createElement('div');
        grid.style.cssText = 'display:flex;flex-direction:column;gap:5px';
        _cityGroupsAllLocs.forEach(loc => {
            const row = document.createElement('label');
            row.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:0.88rem;cursor:pointer;padding:2px 0';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = loc;
            cb.checked = Array.isArray(locs) && locs.includes(loc);
            const span = document.createElement('span');
            span.textContent = loc.replace(/_/g, ' ');
            row.appendChild(cb);
            row.appendChild(span);
            grid.appendChild(row);
        });
        entry.appendChild(grid);
    } else {
        const note = document.createElement('p');
        note.style.cssText = 'font-size:0.85rem;opacity:0.6;margin:0';
        note.textContent = 'No locations available.';
        entry.appendChild(note);
    }

    cityGroupsList.appendChild(entry);
}

btnAddCity.addEventListener('click', () => {
    addCityGroupEntry('', []);
    const inputs = cityGroupsList.querySelectorAll('input[type="text"]');
    if (inputs.length) setTimeout(() => inputs[inputs.length - 1].focus(), 50);
});

btnCityGroupsSave.addEventListener('click', async () => {
    const entries = cityGroupsList.querySelectorAll('.city-group-entry');
    const groups = {};
    let valid = true;
    cityGroupsError.classList.add('hidden');

    entries.forEach(entry => {
        const nameInput = entry.querySelector('input[type="text"]');
        const cityName = nameInput ? nameInput.value.trim() : '';
        if (!cityName) { valid = false; return; }
        const checked = [...entry.querySelectorAll('input[type="checkbox"]:checked')].map(cb => cb.value);
        groups[cityName] = checked;
    });

    if (!valid) {
        cityGroupsError.textContent = 'All city entries must have a name.';
        cityGroupsError.classList.remove('hidden');
        return;
    }

    btnCityGroupsSave.disabled = true;
    try {
        const res = await fetch('/api/city-groups', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(groups)
        });
        const data = await res.json();
        if (!res.ok) {
            cityGroupsError.textContent = data.error || 'Failed to save.';
            cityGroupsError.classList.remove('hidden');
            return;
        }
        // Refresh active city filter if its city still exists
        const filter = getCityFilter();
        if (filter) {
            const cityKey = Object.keys(data).find(k => k.toLowerCase() === filter.city.toLowerCase());
            if (cityKey) setCityFilter(cityKey, data[cityKey]);
            else clearCityFilter();
        }
        await loadLocations();
        modalCityGroups.classList.add('hidden');
        showToast('City groups saved');
    } catch {
        cityGroupsError.textContent = 'Server error. Please try again.';
        cityGroupsError.classList.remove('hidden');
    } finally {
        btnCityGroupsSave.disabled = false;
    }
});

btnCityGroupsCancel.addEventListener('click', () => {
    modalCityGroups.classList.add('hidden');
});

modalCityGroups.addEventListener('click', e => {
    if (e.target === modalCityGroups) modalCityGroups.classList.add('hidden');
});

// ─── Upload History ──────────────────────────────────────────────────────────
btnUploadHistory.addEventListener('click', async () => {
    const loc = activeLocation();
    if (!loc) { showToast('Select a location first'); return; }
    uploadHistoryLocName.textContent = loc.replace(/_/g, ' ');
    uploadHistoryEmpty.classList.add('hidden');
    uploadHistoryError.classList.add('hidden');
    uploadHistoryList.innerHTML = '<div style="text-align:center;padding:20px"><p>Loading...</p></div>';
    modalUploadHistory.classList.remove('hidden');
    
    try {
        const res = await fetch(`/api/upload-history/${encodeURIComponent(loc)}`);
        const data = await res.json();
        renderUploadHistory(data.uploads);
    } catch (err) {
        uploadHistoryError.textContent = 'Failed to load upload history';
        uploadHistoryError.classList.remove('hidden');
        uploadHistoryList.innerHTML = '';
    }
});

btnUploadHistoryClose.addEventListener('click', () => {
    modalUploadHistory.classList.add('hidden');
});

modalUploadHistory.addEventListener('click', e => {
    if (e.target === modalUploadHistory) modalUploadHistory.classList.add('hidden');
});

function renderUploadHistory(uploads) {
    if (uploads.length === 0) {
        uploadHistoryList.innerHTML = '';
        uploadHistoryEmpty.classList.remove('hidden');
        return;
    }
    uploadHistoryList.innerHTML = '';
    uploadHistoryEmpty.classList.add('hidden');
    
    const frag = document.createDocumentFragment();
    uploads.forEach(upload => {
        const d = document.createElement('div');
        d.style.cssText = 'padding:12px;border:1px solid var(--border);border-radius:var(--radius);display:flex;justify-content:space-between;align-items:center;gap:10px';
        d.setAttribute('data-upload-id', upload.uploadId);
        
        const ts = new Date(upload.timestamp);
        const dateStr = ts.toLocaleDateString();
        const timeStr = ts.toLocaleTimeString();
        const filename = upload.filename || 'upload.csv';
        
        // Create type badge
        const typeBadge = document.createElement('span');
        typeBadge.style.cssText = `
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-right: 6px;
            ${upload.uploadType === 'PO' ? 'background:#4f8ef7;color:#fff' : 'background:#27ae60;color:#fff'}
        `;
        typeBadge.textContent = upload.uploadType === 'PO' ? 'PO' : 'REC';
        
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'flex:1;min-width:0';
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'font-size:0.9rem;font-weight:500;display:flex;align-items:center;gap:6px;word-break:break-word';
        titleDiv.appendChild(typeBadge);
        const filenameSpan = document.createElement('span');
        filenameSpan.textContent = filename;
        titleDiv.appendChild(filenameSpan);
        
        const subDiv = document.createElement('div');
        subDiv.style.cssText = 'font-size:0.8rem;color:var(--text-dim);margin-top:4px';
        subDiv.textContent = `${dateStr} ${timeStr}`;
        
        infoDiv.appendChild(titleDiv);
        infoDiv.appendChild(subDiv);
        
        const reverseBtn = document.createElement('button');
        reverseBtn.className = 'btn-secondary btn-sm';
        reverseBtn.textContent = 'Reverse';
        reverseBtn.style.cssText = 'white-space:nowrap;flex-shrink:0';
        reverseBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm(`Reverse this ${upload.uploadType} upload from ${filename}? This will undo the changes.`)) return;
            await reverseUpload(upload.uploadId, d);
        });
        
        d.appendChild(infoDiv);
        d.appendChild(reverseBtn);
        frag.appendChild(d);
    });
    uploadHistoryList.appendChild(frag);
}

async function reverseUpload(uploadId, uploadElement) {
    const loc = activeLocation();
    try {
        const res = await fetch(`/api/reverse-upload/${encodeURIComponent(loc)}/${encodeURIComponent(uploadId)}`, {
            method: 'POST'
        });
        const data = await res.json();
        if (!res.ok) {
            uploadHistoryError.textContent = data.error || 'Reverse failed';
            uploadHistoryError.classList.remove('hidden');
            return;
        }
        
        // Remove from history UI
        if (uploadElement && uploadElement.parentNode) {
            uploadElement.remove();
            // Check if list is now empty
            if (uploadHistoryList.children.length === 0) {
                uploadHistoryEmpty.classList.remove('hidden');
                uploadHistoryList.innerHTML = '';
            }
        }
        
        showToast(`Reversed: ${data.reversed} part${data.reversed === 1 ? '' : 's'} ${data.type === 'PO' ? 'removed from orders' : 'removed from inventory'}`, 4000);
        await loadInventory();
    } catch (err) {
        uploadHistoryError.textContent = 'Reverse failed — server error';
        uploadHistoryError.classList.remove('hidden');
    }
}

// ─── Rename via parts-list header click (only in PO Entry mode) ──────────────
document.getElementById('parts-list-header').addEventListener('click', () => {
    if (!state.location || state.isTruckMode || state.hideOrder) return;
    renamePasswordError.classList.add('hidden');
    inputRenamePassword.value = '';
    modalRenamePassword.classList.remove('hidden');
    setTimeout(() => inputRenamePassword.focus(), 100);
});

// ─── Transaction Log ──────────────────────────────────────────────────────────
// ─── PO Entry Mode ───────────────────────────────────────────────────────────
$('app-title').addEventListener('click', () => {
    state.hideOrder = false;
    applyOrderVisibility();
    renderInventory(inputSearch.value);
    showToast('PO Entry mode on');
});

btnExitPo.addEventListener('click', () => {
    state.hideOrder = true;
    applyOrderVisibility();
    renderInventory(inputSearch.value);
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

    // Handle ?city= URL parameter — sets city filter as the new default
    const urlParams = new URLSearchParams(window.location.search);
    const cityParam = urlParams.get('city');
    if (cityParam !== null) {
        if (!cityParam || cityParam.toLowerCase() === 'all') {
            clearCityFilter();
        } else {
            try {
                const cgRes = await fetch('/api/city-groups');
                const groups = await cgRes.json();
                const cityKey = Object.keys(groups).find(k => k.toLowerCase() === cityParam.toLowerCase());
                if (cityKey) {
                    setCityFilter(cityKey, groups[cityKey]);
                } else {
                    showToast(`City \u201c${cityParam}\u201d not found in city groups`, 4000);
                }
            } catch {
                showToast('Could not load city groups', 3000);
            }
        }
        history.replaceState({}, '', window.location.pathname);
    }

    await loadLocations();
    await loadPartsDictionary();
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
})();

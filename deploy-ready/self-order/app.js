const STORAGE_KEY = "omnipos_mvp_state_v1";
const LOCAL_DB_NAME = "omnipos_local_db";
const LOCAL_DB_VERSION = 1;
const LOCAL_DB_STORE = "app_state";
const SUPABASE_URL = "https://wuvmbxlkxiabydcmbztd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dm1ieGxreGlhYnlkY21ienRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDY4OTgsImV4cCI6MjA5NzcyMjg5OH0.0o4hXARRuU86XiqAjeccTS26wUKBmnKn1INn0H_aiRk";
const KASIRIN_MEDIA_GAS_URL = "https://script.google.com/macros/s/AKfycbzfaJD-mBYGxRP9JU3hs5JjdHfJ9-KTu1_zjxlqRg2IDEhWbXTnUoIWG5xG5am-imgn/exec";
const KASIRIN_APP_MODE = window.KASIRIN_APP_MODE || "full";
const IS_SELF_ORDER_APP = KASIRIN_APP_MODE === "self-order";
const IS_POS_APP = KASIRIN_APP_MODE === "pos";
const STAFF_SESSION_KEY = "omnipos_active_staff_session";
const SELF_ORDER_MENU_SCROLL_KEY = "self_order_menu_scroll_state";

const ORDER_STATUSES = [
  "Pesanan Baru",
  "Dikonfirmasi",
  "Sedang Disiapkan",
  "Siap Diambil",
  "Selesai",
  "Dibatalkan"
];

const ORDER_TYPES = [
  { id: "Dine In", title: "Dine In", hint: "Meja", icon: "DI" },
  { id: "Take Away", title: "Take Away", hint: "Ambil", icon: "TA" },
  { id: "Delivery", title: "Delivery", hint: "Kirim", icon: "DL" }
];

const navItems = [
  ["dashboard", "&#9638;", "Dashboard"],
  ["pos", "&#9633;", "Kasir"],
  ["kitchen", "&#9832;", "Dapur"],
  ["orders", "&#9776;", "Pesanan"],
  ["selforder", "&#9749;", "Self Order"],
  ["products", "&#9634;", "Produk"],
  ["stock", "&#9635;", "Stok"],
  ["stock-opname", "&#9673;", "Stok Opname"],
  ["reports", "&#9637;", "Laporan"],
  ["settings", "", "Settings"]
];

const ROLE_DEFINITIONS = {
  owner: {
    label: "Owner",
    views: ["dashboard", "pos", "kitchen", "orders", "selforder", "products", "stock", "stock-opname", "reports", "settings"]
  },
  manager: {
    label: "Manager",
    views: ["dashboard", "orders", "selforder", "products", "stock", "stock-opname", "reports"]
  },
  kasir: {
    label: "Kasir",
    views: ["pos", "orders", "selforder"]
  },
  dapur: {
    label: "Dapur",
    views: ["kitchen", "stock", "stock-opname"]
  }
};

const ACCESS_VIEW_OPTIONS = navItems.map(([id, , label]) => ({ id, label }));

const DEFAULT_STAFF_MEMBERS = [
  { id: "owner", username: "owner", name: "Owner", role: "owner", pin: "0000", active: true },
  { id: "manager", username: "manager", name: "Manager", role: "manager", pin: "2222", active: true },
  { id: "kasir", username: "kasir", name: "Kasir", role: "kasir", pin: "1111", active: true },
  { id: "dapur", username: "dapur", name: "Dapur", role: "dapur", pin: "3333", active: true }
];

const initialState = {
  outlet: "Outlet Utama",
  activeUser: "Admin Toko",
  staff: {
    activeStaffId: "",
    members: DEFAULT_STAFF_MEMBERS.map(member => ({ ...member }))
  },
  cashSession: {
    open: true,
    openedAt: new Date().toISOString(),
    openingBalance: 500000,
    cashier: "Kasir 01",
    note: "Saldo awal shift pagi"
  },
  products: [],
  deletedProducts: [],
  deletedCategories: [],
  deletedAddons: [],
  addons: [],
  categories: [],
  settings: {
    databaseMode: "Browser IndexedDB",
    autoBackup: true,
    syncEndpoint: "",
    receiptStoreName: "Kasirin!",
    receiptAddress: "Outlet Utama",
    receiptPhone: "021-000000",
    receiptFooter: "Terima kasih atas kunjungan Anda",
    receiptShowLogo: false,
    receiptLogoText: "Logo",
    receiptLogoDataUrl: "",
    receiptImageMode: "A",
    receiptLogoLength: 12,
    receiptShowReceiptCode: false,
    receiptShowOrderQueueNumber: false,
    receiptShowUnitNextToQty: false,
    receiptShowReceiptNumber: true,
    receiptShowTotalQuantity: false,
    receiptShowCashierLabel: true,
    receiptHeaderNote: "",
    receiptShowTable: true,
    receiptShowQr: false,
    receiptWidth: "58mm",
    selfOrderAppName: "",
    selfOrderOutletName: "",
    selfOrderProfileImageDataUrl: "",
    selfOrderPromoImageDataUrl: "",
    selfOrderPromoTargetProductId: "",
    selfOrderPromoButtonLabel: "Order Now",
    selfOrderPromoSlides: [],
    printerConnection: "Bluetooth",
    printerDevice: "",
    printerDeviceId: ""
  },
  orders: [],
  syncQueue: [],
  importedSales: [],
  importedProductSales: [],
  deletedReportKeys: [],
  heldOrders: [],
  audit: [
    { id: uid(), at: new Date().toISOString(), user: "System", action: "Aplikasi diinisialisasi", detail: "Sesi kas dibuat" }
  ],
  stockMovements: []
};

let state = loadState();
normalizeState();
state.heldOrders ||= [];
let view = normalizeView(currentHashView() || defaultInitialView());
let cart = [];
let selfOrderCart = loadSelfOrderCart();
let selfOrderSubmitting = false;
let selfOrderSubmitError = "";
let kitchenFilter = "Aktif";
let navOpen = false;
let navCollapsed = localStorage.getItem("omnipos_nav_collapsed") !== "0";
let staffMenuOpen = false;
let itemDisplay = localStorage.getItem("omnipos_item_display") || "list";
let savedPaymentAmounts = JSON.parse(localStorage.getItem("omnipos_saved_payment_amounts") || "[20000,50000,100000]");
let posProductSnapshotCache = { signature: "", snapshot: null };
let kitchenAvailabilityCategory = "Semua";
let kitchenAvailabilityExpandedProductId = "";
let settingsTab = localStorage.getItem("omnipos_settings_tab") || "data";
let supabaseClient = null;
let supabaseSession = null;
let supabaseStatus = "Memuat koneksi...";
let supabaseReportRecords = [];
let supabaseReportsLoading = false;
let supabaseReportsLoadedAt = 0;
let supabaseReportLoadKey = "";
let supabaseReportDetailCache = new Map();
let profitSummaryCache = { years: [], months: {}, days: {} };
let profitSummaryLoading = false;
let profitSummaryLoadedAt = new Map();
let legacyProfitSummaryLoading = false;
let legacyProfitSummaryLoadedAt = new Map();
let dataRefreshLoading = false;
let receiptLogoUploading = false;
let selfOrderSettingsSaving = false;
const selfOrderPromoPreloadUrls = new Set();
let selfOrderPromoTouchStartX = 0;
let selfOrderPromoTouchCurrentX = 0;
let selfOrderHistoryNavigating = false;
let supabaseRealtimeChannels = [];
let realtimeRefreshTimer = null;
const realtimeRefreshReasons = new Set();
let deferredRealtimeRender = false;
let realtimeOrdersLoading = false;
let realtimeOrdersLoadedAt = 0;
let realtimeFallbackLastMasterAt = 0;
let storeSettingsLoading = false;
let storeSettingsLoadedAt = 0;
let storeSettingsJsonUnavailable = false;
let supabaseSupportsPreparedItems = true;
let supabaseStockOpnameColumnsReady = false;
let supabaseAddonSoldOutColumnReady = true;
const realtimeTabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const localRealtimeChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("omnipos-realtime") : null;
let localDbPromise = null;
let localDbReady = false;
let localDbDirtyBeforeLoad = false;
let localDbSaveQueue = Promise.resolve();
let localDbStatus = "IndexedDB sedang disiapkan";
let syncQueueProcessing = false;
let lastMasterSyncError = null;
let masterSyncLoading = false;
let masterSyncLoaded = false;
let masterSyncLoadedAt = 0;
let appConfirmHandlers = { confirm: null, cancel: null };
let appCancelContext = { orderId: null, returnToUnpaid: false };
let activeModalState = null;
let cancelOrderProcessingIds = new Set();
const productActionLocks = new Set();
let profitSummaryUnavailable = false;
let supabaseReportRecordsUnavailable = false;
let supabaseLegacyReportsLoading = false;
let supabaseLegacyReportsLoadedAt = 0;
let supabaseLegacyReportLoadKey = "";

const app = document.getElementById("app");

syncSelfOrderTableFromUrl();
initSupabase();

if (localRealtimeChannel) {
  localRealtimeChannel.onmessage = event => {
    if (!event.data || event.data.sender === realtimeTabId) return;
    scheduleRealtimeRefresh(event.data.reason || "orders", { local: true });
  };
}

window.addEventListener("storage", event => {
  if (event.key !== "omnipos_realtime_event" || !event.newValue) return;
  try {
    const message = JSON.parse(event.newValue);
    if (message.sender === realtimeTabId) return;
    scheduleRealtimeRefresh(message.reason || "orders", { local: true });
  } catch (error) {
    console.warn("Realtime storage event ignored", error);
  }
});

document.addEventListener("focusout", () => {
  if (!deferredRealtimeRender) return;
  window.setTimeout(() => {
    if (isBlockingInteractionActive()) return;
    deferredRealtimeRender = false;
    render();
  }, 120);
}, true);

window.addEventListener("hashchange", () => {
  view = normalizeView(currentHashView() || defaultInitialView());
  syncSelfOrderTableFromUrl();
  normalizeResponsiveNavState();
  render();
});

window.addEventListener("popstate", event => {
  if (!IS_SELF_ORDER_APP && view !== "selforder") return;
  selfOrderHistoryNavigating = true;
  const step = event.state?.selfOrderStep || "menu";
  sessionStorage.setItem("self_order_step", step);
  if (step === "menu") sessionStorage.removeItem("self_order_product_id");
  render();
  selfOrderHistoryNavigating = false;
});

window.addEventListener("resize", () => {
  if (normalizeResponsiveNavState()) render();
});

window.addEventListener("online", () => {
  processSyncQueue("online");
  loadStoreSettingsFromSupabase({ reason: "online", force: true });
  loadMasterDataFromSupabase({ reason: "online" });
  loadRecentOrdersFromSupabase({ reason: "online", force: true });
});

window.addEventListener("offline", () => {
  if (state.syncQueue?.length) toast("Koneksi terputus. Transaksi baru akan disinkronkan saat online.");
});

setInterval(() => processSyncQueue("interval"), 60000);
setInterval(() => pollRealtimeFallback(), 12000);
setInterval(() => autoAdvanceSelfOrderPromo(), 5000);

document.addEventListener("click", event => {
  if (staffMenuOpen && !event.target.closest("[data-staff-menu]")) {
    staffMenuOpen = false;
    render();
    return;
  }

  const availabilityButton = event.target.closest("[data-action='open-kitchen-availability']");
  if (availabilityButton) {
    openKitchenAvailability();
    return;
  }

  const kitchenCategoryButton = event.target.closest("[data-kitchen-category]");
  if (kitchenCategoryButton) {
    kitchenAvailabilityCategory = kitchenCategoryButton.dataset.kitchenCategory;
    openKitchenAvailability();
    return;
  }

  const kitchenProductButton = event.target.closest("[data-kitchen-product-id]");
  if (kitchenProductButton) {
    toggleKitchenProductAvailability(kitchenProductButton.dataset.kitchenProductId, kitchenProductButton.dataset.kitchenAvailability === "soldout");
  }
});

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(initialState);
  try {
    return { ...structuredClone(initialState), ...JSON.parse(raw) };
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  const persistedState = persistedStateSnapshot(state);
  if (!localDbReady) localDbDirtyBeforeLoad = true;
  saveStateToIndexedDb(persistedState);
  saveLocalStorageFallback(persistedState);
}

function persistedStateSnapshot(sourceState) {
  return {
    ...sourceState,
    importedSales: (sourceState.importedSales || []).map(compactLegacySale),
    importedProductSales: (sourceState.importedProductSales || []).map(compactLegacyProductSale)
  };
}

function fallbackStateSnapshot(sourceState) {
  return {
    ...sourceState,
    importedSales: [],
    importedProductSales: [],
    orders: (sourceState.orders || []).slice(0, 300),
    heldOrders: (sourceState.heldOrders || []).slice(0, 100),
    audit: (sourceState.audit || []).slice(0, 80),
    stockMovements: (sourceState.stockMovements || []).slice(0, 300)
  };
}

function saveLocalStorageFallback(persistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackStateSnapshot(persistedState)));
  } catch (error) {
    if (error?.name !== "QuotaExceededError") {
      console.warn("LocalStorage fallback failed", error);
      return;
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackStateSnapshot({
        ...persistedState,
        orders: (persistedState.orders || []).slice(0, 100),
        audit: (persistedState.audit || []).slice(0, 30),
        stockMovements: []
      })));
    } catch (fallbackError) {
      console.warn("LocalStorage fallback quota exceeded", fallbackError);
    }
  }
}

function openLocalDatabase() {
  if (localDbPromise) return localDbPromise;
  localDbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB tidak tersedia di browser ini."));
      return;
    }
    const request = indexedDB.open(LOCAL_DB_NAME, LOCAL_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LOCAL_DB_STORE)) database.createObjectStore(LOCAL_DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Gagal membuka IndexedDB."));
  });
  return localDbPromise;
}

async function getIndexedDbState() {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(LOCAL_DB_STORE, "readonly");
    const store = transaction.objectStore(LOCAL_DB_STORE);
    const request = store.get(STORAGE_KEY);
    request.onsuccess = () => resolve(request.result?.value || null);
    request.onerror = () => reject(request.error || new Error("Gagal membaca IndexedDB."));
  });
}

function saveStateToIndexedDb(persistedState) {
  const stateToSave = structuredClone(persistedState);
  localDbSaveQueue = localDbSaveQueue
    .then(async () => {
      const database = await openLocalDatabase();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(LOCAL_DB_STORE, "readwrite");
        const store = transaction.objectStore(LOCAL_DB_STORE);
        const request = store.put({ value: stateToSave, updatedAt: new Date().toISOString() }, STORAGE_KEY);
        request.onerror = () => reject(request.error || new Error("Gagal menyimpan IndexedDB."));
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error("Transaksi IndexedDB gagal."));
      });
      localDbStatus = "IndexedDB aktif";
    })
    .catch(error => {
      localDbStatus = "IndexedDB gagal, memakai fallback ringkas";
      console.warn("IndexedDB save failed", error);
    });
  return localDbSaveQueue;
}

async function initializePersistentState() {
  try {
    const indexedState = await getIndexedDbState();
    localDbReady = true;
    localDbStatus = "IndexedDB aktif";
    if (indexedState && !localDbDirtyBeforeLoad) {
      state = { ...structuredClone(initialState), ...indexedState };
      normalizeState();
      clearLocalMasterDataForRemoteAuthority({ save: false });
      saveLocalStorageFallback(persistedStateSnapshot(state));
      render();
      processSyncQueue("indexeddb-loaded");
      loadStoreSettingsFromSupabase({ reason: "indexeddb-loaded" });
      loadMasterDataFromSupabase({ reason: "indexeddb-loaded" });
      return;
    }
    saveStateToIndexedDb(persistedStateSnapshot(state));
    processSyncQueue("indexeddb-migrated");
    loadStoreSettingsFromSupabase({ reason: "indexeddb-migrated" });
    loadMasterDataFromSupabase({ reason: "indexeddb-migrated" });
  } catch (error) {
    localDbReady = true;
    localDbStatus = "IndexedDB gagal, memakai fallback ringkas";
    console.warn("IndexedDB init failed", error);
  }
}

function compactLegacySale(row) {
  return {
    id: row.id,
    importKey: row.importKey || legacySaleKey(row),
    number: row.number,
    createdAt: row.createdAt,
    customer: row.customer || "-",
    paymentMethod: row.paymentMethod || "Cash dan Piutang",
    paymentStatus: row.paymentStatus || "Lunas",
    cashier: row.cashier || "",
    subtotal: Number(row.subtotal || 0),
    total: Number(row.total || 0),
    profit: Number(row.profit || 0),
    source: row.source || "Import Kasir Lama"
  };
}

function compactLegacyProductSale(row) {
  return {
    id: row.id,
    importKey: row.importKey || legacyProductSaleKey(row),
    code: String(row.code || "").trim(),
    name: row.name || "-",
    transactionCount: Number(row.transactionCount || 0),
    qty: Number(row.qty || 0),
    revenue: Number(row.revenue || 0),
    profit: Number(row.profit || 0),
    periodStart: row.periodStart || "",
    periodEnd: row.periodEnd || "",
    source: row.source || "Import Penjualan Barang Lama",
    fileName: row.fileName || ""
  };
}

function legacySaleKey(row) {
  const number = String(row.number || "").trim();
  const createdAt = row.createdAt ? new Date(row.createdAt).toISOString() : "";
  const total = Number(row.total || row.subtotal || 0);
  return [number, createdAt, total].join("|");
}

function legacyProductSaleKey(row) {
  return [
    String(row.code || "").trim(),
    String(row.name || "").trim().toLowerCase(),
    row.periodStart || "",
    row.periodEnd || "",
    row.fileName || ""
  ].join("|");
}

function normalizeState() {
  state.products ||= [];
  state.deletedProducts ||= [];
  state.deletedProducts = normalizeDeletedProductMarkers(state.deletedProducts);
  state.deletedCategories ||= [];
  state.deletedCategories = normalizeDeletedNameMarkers(state.deletedCategories);
  state.deletedAddons ||= [];
  state.deletedAddons = normalizeDeletedAddonMarkers(state.deletedAddons);
  state.addons ||= [];
  state.categories ||= [];
  normalizeStaffState();
  state.settings = { ...initialState.settings, ...(state.settings || {}) };
  if (String(state.settings.receiptStoreName || "").trim().toUpperCase() === "OMNIPOS") {
    state.settings.receiptStoreName = "Kasirin!";
  }
  if (state.settings.databaseMode === "Browser LocalStorage") state.settings.databaseMode = "Browser IndexedDB";
  state.orders ||= [];
  state.syncQueue ||= [];
  state.syncQueue = state.syncQueue.filter(item => item.type !== "master");
  state.importedSales ||= [];
  state.importedProductSales ||= [];
  state.deletedReportKeys ||= [];
  state.deletedReportKeys = [...new Set(state.deletedReportKeys.map(key => String(key || "").trim()).filter(Boolean))].slice(-500);
  state.importedSales = state.importedSales.map(compactLegacySale);
  state.importedProductSales = state.importedProductSales.map(compactLegacyProductSale);
  state.orders.forEach(order => {
    if (order.status === "Dikonfirmasi") order.status = "Sedang Disiapkan";
    if (order.status === "Siap Diambil") order.status = "Selesai";
    order.preparedItems ||= {};
    normalizeOrderBatches(order);
  });
  const legacyAddons = state.products.filter(product => product.category === "Add-on");
  for (const product of legacyAddons) {
    if (!state.addons.some(addon => addon.name === product.name)) {
      state.addons.push({ id: product.id, name: product.name, price: Number(product.price || 0), cost: Number(product.cost || 0), active: product.active !== false });
    }
  }
  const allAddonIds = state.addons.map(addon => addon.id).filter(Boolean);
  state.products = uniqueProducts(state.products
    .filter(product => product.category !== "Add-on")
    .map(product => {
      const legacyAllAddons = Array.isArray(product.allowedAddonIds)
        && allAddonIds.length
        && product.allowedAddonIds.length === allAddonIds.length
        && allAddonIds.every(id => product.allowedAddonIds.includes(id))
        && !product.addonConfigured;
      return {
        soldOut: false,
        soldOutVariants: {},
        variantMode: product.variantMode || (product.variantGroup2 ? "2" : product.variantGroup ? "1" : "off"),
        variantGroup2: "",
        variantRequired2: false,
        variantOptions2: [],
        stockOpname: false,
        stockOpnameCheckedAt: "",
        stockOpnameCheckedBy: "",
        ...product,
        allowedAddonIds: legacyAllAddons ? [] : [...new Set(Array.isArray(product.allowedAddonIds) ? product.allowedAddonIds.filter(Boolean) : [])]
      };
    }));
  state.addons = uniqueAddons(state.addons.map(addon => ({ active: true, cost: 0, soldOut: false, ...addon, price: Number(addon.price || 0), cost: Number(addon.cost || 0), soldOut: Boolean(addon.soldOut) })));
  state.categories = [...new Set([...state.categories, ...state.products.map(product => product.category).filter(Boolean)])];
}

function normalizeProductIdentityText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDeletedNameMarker(marker) {
  const value = typeof marker === "string" ? { name: marker } : marker;
  if (!value || typeof value !== "object") return null;
  const name = normalizeProductIdentityText(value.name || value.category || value.id);
  if (!name) return null;
  return {
    name,
    deletedAt: value.deletedAt || value.deleted_at || new Date().toISOString()
  };
}

function normalizeDeletedNameMarkers(markers) {
  const map = new Map();
  for (const rawMarker of markers || []) {
    const marker = normalizeDeletedNameMarker(rawMarker);
    if (marker) map.set(marker.name, marker);
  }
  return [...map.values()]
    .sort((a, b) => String(a.deletedAt || "").localeCompare(String(b.deletedAt || "")))
    .slice(-1000);
}

function productIdentityPrice(value) {
  return Number(value || 0);
}

function deletedProductMarker(product) {
  const localId = normalizeMasterLocalId("prod", product.id, product.sku || product.name);
  return normalizeDeletedProductMarker({
    id: product.id,
    localId,
    supabaseId: product.supabaseId || product.supabase_id || product.remoteId || "",
    sku: product.sku || "",
    name: product.name || "",
    category: product.category || "",
    price: productIdentityPrice(product.price),
    deletedAt: new Date().toISOString()
  });
}

function normalizeDeletedProductMarker(marker) {
  if (!marker || typeof marker !== "object") return null;
  const normalized = {
    id: String(marker.id || "").trim(),
    localId: String(marker.localId || marker.local_id || "").trim(),
    supabaseId: String(marker.supabaseId || marker.supabase_id || marker.remoteId || "").trim(),
    sku: normalizeProductIdentityText(marker.sku),
    name: normalizeProductIdentityText(marker.name),
    category: normalizeProductIdentityText(marker.category),
    price: productIdentityPrice(marker.price),
    deletedAt: marker.deletedAt || marker.deleted_at || new Date().toISOString()
  };
  if (!normalized.id && !normalized.localId && !normalized.supabaseId && !normalized.sku && !normalized.name) return null;
  return normalized;
}

function normalizeDeletedProductMarkers(markers) {
  const map = new Map();
  for (const rawMarker of markers || []) {
    const marker = normalizeDeletedProductMarker(rawMarker);
    if (!marker) continue;
    const key = [
      marker.supabaseId && `remote:${marker.supabaseId}`,
      marker.localId && `local:${marker.localId}`,
      marker.sku && `sku:${marker.sku}`,
      marker.name && `name:${marker.name}:${marker.category}:${marker.price}`
    ].filter(Boolean)[0] || marker.id || uid();
    map.set(key, marker);
  }
  return [...map.values()]
    .sort((a, b) => String(a.deletedAt || "").localeCompare(String(b.deletedAt || "")))
    .slice(-1000);
}

function productMatchesDeletedMarker(product, marker) {
  if (!product || !marker) return false;
  const localId = String(product.local_id || product.localId || product.id || "").trim();
  const supabaseId = String(product.supabaseId || product.supabase_id || product.remoteId || "").trim();
  const sku = normalizeProductIdentityText(product.sku);
  const name = normalizeProductIdentityText(product.name);
  const category = normalizeProductIdentityText(product.category || product.category_name);
  const price = productIdentityPrice(product.price);
  const markerHasStrongIdentity = Boolean(marker.supabaseId || marker.localId || marker.id || marker.sku);
  if (marker.supabaseId && supabaseId && marker.supabaseId === supabaseId) return true;
  if (marker.localId && localId && marker.localId === localId) return true;
  if (marker.id && localId && marker.id === localId) return true;
  if (marker.sku && sku && marker.sku === sku) return true;
  if (markerHasStrongIdentity) return false;
  if (marker.name && marker.name === name && marker.price === price) {
    return !marker.category || !category || marker.category === category;
  }
  return false;
}

function productStrongMatchesDeletedMarker(product, marker) {
  if (!product || !marker) return false;
  const localId = String(product.local_id || product.localId || product.id || "").trim();
  const supabaseId = String(product.supabaseId || product.supabase_id || product.remoteId || "").trim();
  const sku = normalizeProductIdentityText(product.sku);
  if (marker.supabaseId && supabaseId && marker.supabaseId === supabaseId) return true;
  if (marker.localId && localId && marker.localId === localId) return true;
  if (marker.id && localId && marker.id === localId) return true;
  if (marker.sku && sku && marker.sku === sku) return true;
  return false;
}

function isDeletedProduct(product) {
  return (state.deletedProducts || []).some(marker => productMatchesDeletedMarker(product, marker));
}

function rememberDeletedProduct(product) {
  const marker = deletedProductMarker(product);
  state.deletedProducts = normalizeDeletedProductMarkers([
    ...(state.deletedProducts || []),
    marker
  ]);
  return marker;
}

function forgetDeletedProduct(product) {
  state.deletedProducts = normalizeDeletedProductMarkers(state.deletedProducts)
    .filter(marker => !productStrongMatchesDeletedMarker(product, marker));
}

function mergeDeletedProductMarkers(markers) {
  state.deletedProducts = normalizeDeletedProductMarkers([
    ...(state.deletedProducts || []),
    ...(markers || [])
  ]);
}

function deletedAddonMarker(addon) {
  return normalizeDeletedAddonMarker({
    id: addon.id,
    localId: addon.local_id || addon.localId || addon.id,
    supabaseId: addon.supabaseId || addon.supabase_id || addon.remoteId || "",
    name: addon.name || "",
    price: productIdentityPrice(addon.price),
    cost: productIdentityPrice(addon.cost),
    deletedAt: new Date().toISOString()
  });
}

function normalizeDeletedAddonMarker(marker) {
  if (!marker || typeof marker !== "object") return null;
  const normalized = {
    id: String(marker.id || "").trim(),
    localId: String(marker.localId || marker.local_id || "").trim(),
    supabaseId: String(marker.supabaseId || marker.supabase_id || marker.remoteId || "").trim(),
    name: normalizeProductIdentityText(marker.name),
    price: productIdentityPrice(marker.price),
    cost: productIdentityPrice(marker.cost),
    deletedAt: marker.deletedAt || marker.deleted_at || new Date().toISOString()
  };
  if (!normalized.id && !normalized.localId && !normalized.supabaseId && !normalized.name) return null;
  return normalized;
}

function normalizeDeletedAddonMarkers(markers) {
  const map = new Map();
  for (const rawMarker of markers || []) {
    const marker = normalizeDeletedAddonMarker(rawMarker);
    if (!marker) continue;
    const key = [
      marker.supabaseId && `remote:${marker.supabaseId}`,
      marker.localId && `local:${marker.localId}`,
      marker.name && `name:${marker.name}:${marker.price}:${marker.cost}`
    ].filter(Boolean)[0] || marker.id || uid();
    map.set(key, marker);
  }
  return [...map.values()]
    .sort((a, b) => String(a.deletedAt || "").localeCompare(String(b.deletedAt || "")))
    .slice(-1000);
}

function addonMatchesDeletedMarker(addon, marker) {
  if (!addon || !marker) return false;
  const localId = String(addon.local_id || addon.localId || addon.id || "").trim();
  const supabaseId = String(addon.supabaseId || addon.supabase_id || addon.remoteId || "").trim();
  const name = normalizeProductIdentityText(addon.name);
  if (marker.supabaseId && supabaseId && marker.supabaseId === supabaseId) return true;
  if (marker.localId && localId && marker.localId === localId) return true;
  if (marker.id && localId && marker.id === localId) return true;
  return Boolean(marker.name && marker.name === name && marker.price === productIdentityPrice(addon.price) && marker.cost === productIdentityPrice(addon.cost));
}

function isDeletedCategoryName(name) {
  const normalized = normalizeProductIdentityText(name);
  return Boolean(normalized && (state.deletedCategories || []).some(marker => marker.name === normalized));
}

function isDeletedAddon(addon) {
  return (state.deletedAddons || []).some(marker => addonMatchesDeletedMarker(addon, marker));
}

function rememberDeletedCategory(name) {
  state.deletedCategories = normalizeDeletedNameMarkers([
    ...(state.deletedCategories || []),
    { name, deletedAt: new Date().toISOString() }
  ]);
}

function rememberDeletedAddon(addon) {
  state.deletedAddons = normalizeDeletedAddonMarkers([
    ...(state.deletedAddons || []),
    deletedAddonMarker(addon)
  ]);
}

function forgetDeletedCategory(name) {
  const normalized = normalizeProductIdentityText(name);
  state.deletedCategories = normalizeDeletedNameMarkers(state.deletedCategories)
    .filter(marker => marker.name !== normalized);
}

function forgetDeletedAddon(addon) {
  state.deletedAddons = normalizeDeletedAddonMarkers(state.deletedAddons)
    .filter(marker => !addonMatchesDeletedMarker(addon, marker));
}

function mergeDeletedCategoryMarkers(markers) {
  state.deletedCategories = normalizeDeletedNameMarkers([
    ...(state.deletedCategories || []),
    ...(markers || [])
  ]);
}

function mergeDeletedAddonMarkers(markers) {
  state.deletedAddons = normalizeDeletedAddonMarkers([
    ...(state.deletedAddons || []),
    ...(markers || [])
  ]);
}

function productSortKey(product) {
  return [
    String(product.category || "").toLowerCase(),
    String(product.name || "").toLowerCase(),
    String(productDisplayPrice(product) || "").toLowerCase(),
    String(product.id || "").toLowerCase()
  ].join("|");
}

function productUniqueKey(product) {
  const sku = String(product?.sku || "").trim().toLowerCase();
  if (sku) return `sku|${sku}`;
  const id = String(product?.id || "").trim().toLowerCase();
  if (id) return `id|${id}`;
  const supabaseId = String(product?.supabaseId || "").trim().toLowerCase();
  if (supabaseId) return `remote|${supabaseId}`;
  const name = String(product?.name || "").trim().toLowerCase();
  const category = String(product?.category || "").trim().toLowerCase();
  const price = String(productDisplayPrice(product) || "").trim().toLowerCase();
  return ["legacy", name, category, price].join("|");
}

function savedProductMatchesPayload(product, payload, supabaseId = "") {
  const remoteId = String(supabaseId || "").trim();
  if (remoteId && String(product?.supabaseId || "") === remoteId) return true;
  if (String(product?.id || "") === String(payload?.id || "")) return true;
  const sku = String(payload?.sku || "").trim().toLowerCase();
  if (sku && String(product?.sku || "").trim().toLowerCase() === sku) return true;
  return String(product?.name || "").trim().toLowerCase() === String(payload?.name || "").trim().toLowerCase()
    && String(product?.category || "").trim().toLowerCase() === String(payload?.category || "").trim().toLowerCase()
    && Number(productDisplayPrice(product) || 0) === Number(productDisplayPrice(payload) || 0);
}

function addonUniqueKey(addon) {
  return [
    String(addon?.name || "").trim().toLowerCase(),
    Number(addon?.price || 0),
    Number(addon?.cost || 0)
  ].join("|");
}

function productDisplayRank(product) {
  return [
    product?.active ? 1 : 0,
    product?.soldOut ? 0 : 1,
    product?.imageName ? 1 : 0,
    product?.channelSelfOrder ? 1 : 0,
    product?.channelPOS ? 1 : 0,
    String(product?.id || "")
  ].join("|");
}

function uniqueProducts(products) {
  const map = new Map();
  for (const product of products || []) {
    const key = productUniqueKey(product);
    const existing = map.get(key);
    if (!existing || productDisplayRank(product).localeCompare(productDisplayRank(existing)) > 0) {
      map.set(key, product);
    }
  }
  return [...map.values()];
}

function uniqueAddons(addons) {
  const map = new Map();
  for (const addon of addons || []) {
    if (!String(addon?.name || "").trim()) continue;
    const key = addonUniqueKey(addon);
    const existing = map.get(key);
    if (!existing || String(addon.supabaseId || addon.id || "").localeCompare(String(existing.supabaseId || existing.id || "")) > 0) {
      map.set(key, addon);
    }
  }
  return [...map.values()];
}

function stableProducts(products) {
  return uniqueProducts(products).sort((a, b) => productSortKey(a).localeCompare(productSortKey(b)));
}

function normalizeSelfOrderTableCode(value) {
  const raw = String(value || "").trim().toUpperCase().replace(/^#/, "").replace(/^\?/, "").replace(/^MEJA[\s-]*/i, "").replace(/^M[\s-]*/i, "").replace(/\s+/g, "");
  if (!raw) return "";
  const numberOnly = raw.match(/^(?:A-?)?([1-9]|1\d|20)$/i)?.[1];
  if (numberOnly) return `A-${numberOnly}`;
  return /^A-(?:[1-9]|1\d|20)$/.test(raw) ? raw : "";
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(String(value || ""));
  return String(value || "").replace(/["\\]/g, "\\$&");
}

function selfOrderTableCodeFromUrl() {
  const candidates = [];
  try {
    const search = new URLSearchParams(location.search);
    candidates.push(search.get("table"), search.get("meja"), search.get("m"), search.get("t"));
    const compactSearch = String(location.search || "").replace(/^\?/, "").trim();
    if (compactSearch && !compactSearch.includes("=") && !compactSearch.includes("&")) candidates.push(compactSearch);
    const hashQuery = String(location.hash || "").split("?")[1] || "";
    if (hashQuery) {
      const hashParams = new URLSearchParams(hashQuery);
      candidates.push(hashParams.get("table"), hashParams.get("meja"), hashParams.get("m"), hashParams.get("t"));
    }
    const hashCompact = String(location.hash || "").replace(/^#/, "").split("?")[0] || "";
    if (hashCompact && hashCompact !== "selforder") candidates.push(hashCompact);
    const pathMatch = String(location.pathname || "").match(/\/self-order\/(?:meja-?|m-?)?([A-Za-z]?-?\d{1,2})\/?$/i);
    if (pathMatch) candidates.push(pathMatch[1]);
  } catch (error) {
    console.warn("Gagal membaca kode meja dari URL", error);
  }
  return candidates.map(normalizeSelfOrderTableCode).find(Boolean) || "";
}

function currentHashView() {
  return String(location.hash || "").replace(/^#/, "").split("?")[0];
}

function syncSelfOrderTableFromUrl() {
  const tableCode = selfOrderTableCodeFromUrl();
  if (tableCode) sessionStorage.setItem("self_order_table", tableCode);
}

function normalizeStaffState() {
  state.staff ||= {};
  const defaultAccess = Object.fromEntries(Object.entries(ROLE_DEFINITIONS).map(([role, definition]) => [role, [...definition.views]]));
  const validViews = ACCESS_VIEW_OPTIONS.map(option => option.id);
  const existingMembers = Array.isArray(state.staff.members) ? state.staff.members : [];
  const deletedStaffIds = new Set([
    ...(Array.isArray(state.staff.deletedStaffIds) ? state.staff.deletedStaffIds : []),
    ...existingMembers.filter(member => member?.active === false && member.id !== "owner").map(member => member.id).filter(Boolean)
  ]);
  state.staff.deletedStaffIds = [...deletedStaffIds];
  state.staff.deletedStaffUsernames = [...new Set((Array.isArray(state.staff.deletedStaffUsernames) ? state.staff.deletedStaffUsernames : [])
    .map(value => String(value || "").trim().toLowerCase())
    .filter(Boolean))];
  state.staff.roleAccess ||= {};
  Object.entries(defaultAccess).forEach(([role, views]) => {
    const configured = Array.isArray(state.staff.roleAccess[role]) ? state.staff.roleAccess[role] : views;
    const filtered = configured.filter(id => validViews.includes(id));
    if (views.includes("stock") && !filtered.includes("stock")) filtered.push("stock");
    if (views.includes("stock-opname") && !filtered.includes("stock-opname")) filtered.push("stock-opname");
    state.staff.roleAccess[role] = filtered.length ? filtered : [...views];
  });
  state.staff.roleAccess.owner = [...validViews];
  const shouldSeedDefaultStaff = state.staff.remoteSynced !== true;
  const mergedMembers = shouldSeedDefaultStaff
    ? DEFAULT_STAFF_MEMBERS
      .filter(member => !deletedStaffIds.has(member.id))
      .map(member => ({ ...member }))
    : [];
  existingMembers.forEach(member => {
    if (!member || member.active === false || deletedStaffIds.has(member.id)) return;
    const normalizedMenuAccess = Array.isArray(member.menuAccess)
      ? [...new Set(member.menuAccess.filter(id => validViews.includes(id)))]
      : null;
    const role = ROLE_DEFINITIONS[member.role] ? member.role : "kasir";
    const normalized = {
      id: member.id || uid(),
      username: String(member.username || member.id || member.name || "").trim(),
      name: String(member.name || "").trim() || "Staff",
      role,
      pin: String(member.pin || "").trim() || "0000",
      active: member.active !== false,
      menuAccess: normalizedMenuAccess || [...(defaultAccess[role] || defaultAccess.kasir)]
    };
    const index = mergedMembers.findIndex(item => item.id === normalized.id);
    if (index >= 0) mergedMembers[index] = { ...mergedMembers[index], ...normalized };
    else mergedMembers.push(normalized);
  });
  state.staff.members = mergedMembers.map(member => ({
    ...member,
    menuAccess: Array.isArray(member.menuAccess)
      ? filteredAccessViews(member.menuAccess)
      : [...(defaultAccess[member.role] || defaultAccess.kasir)]
  }));
  if (!IS_SELF_ORDER_APP) {
    const sessionStaffId = String(sessionStorage.getItem(STAFF_SESSION_KEY) || "").trim();
    state.staff.activeStaffId = sessionStaffId;
  }
  const activeStillValid = state.staff.members.some(member => member.id === state.staff.activeStaffId && member.active !== false);
  if (!activeStillValid) {
    if (!IS_SELF_ORDER_APP) sessionStorage.removeItem(STAFF_SESSION_KEY);
    state.staff.activeStaffId = "";
  }
}

function staffMembers() {
  normalizeStaffState();
  return state.staff.members.filter(member => member.active !== false);
}

function activeStaff() {
  normalizeStaffState();
  return state.staff.members.find(member => member.id === state.staff.activeStaffId && member.active !== false) || null;
}

function activeRole() {
  return activeStaff()?.role || "";
}

function roleLabel(role = activeRole()) {
  return ROLE_DEFINITIONS[role]?.label || "Staff";
}

function allAccessViewIds() {
  return ACCESS_VIEW_OPTIONS.map(option => option.id);
}

function filteredAccessViews(values) {
  const validViews = new Set(allAccessViewIds());
  return [...new Set((values || []).filter(id => validViews.has(id)))];
}

function roleDefaultViews(role = activeRole()) {
  if (role === "owner") return allAccessViewIds();
  return filteredAccessViews(state.staff?.roleAccess?.[role] || ROLE_DEFINITIONS[role]?.views || []);
}

function allowedViewsForStaff(member) {
  if (!member) return roleDefaultViews(activeRole());
  if (Array.isArray(member.menuAccess)) return filteredAccessViews(member.menuAccess);
  return roleDefaultViews(member.role);
}

function allowedViews(role = activeRole(), member = null) {
  normalizeStaffState();
  if (member) return allowedViewsForStaff(member);
  const current = activeStaff();
  if (current && (!role || role === current.role)) return allowedViewsForStaff(current);
  return roleDefaultViews(role);
}

function defaultViewForStaff(member = activeStaff()) {
  return allowedViewsForStaff(member)[0] || "dashboard";
}

function defaultViewForRole(role = activeRole()) {
  return roleDefaultViews(role)[0] || "dashboard";
}

function canAccessView(id, role = activeRole()) {
  return allowedViews(role).includes(id);
}

function appAvailableViews() {
  const views = ["dashboard", "pos", "kitchen", "orders", "selforder", "products", "stock", "stock-opname", "reports", "cash", "audit", "settings"];
  if (IS_SELF_ORDER_APP) return ["selforder"];
  if (IS_POS_APP) return views.filter(id => id !== "selforder");
  return views;
}

function defaultInitialView() {
  if (IS_SELF_ORDER_APP) return "selforder";
  return "dashboard";
}

function visibleNavItems() {
  const views = allowedViews();
  const available = appAvailableViews();
  return navItems.filter(([id]) => available.includes(id) && views.includes(id));
}

function toggleRoleAccess(role, viewId, checked) {
  if (activeRole() !== "owner") return;
  if (role === "owner") {
    toast("Akses Owner tidak diubah dari sini.");
    render();
    return;
  }
  if (!ROLE_DEFINITIONS[role] || !ACCESS_VIEW_OPTIONS.some(option => option.id === viewId)) return;
  normalizeStaffState();
  const access = new Set(roleDefaultViews(role));
  if (checked) access.add(viewId);
  else access.delete(viewId);
  if (!access.size) {
    toast("Minimal satu menu harus aktif untuk role ini.");
    render();
    return;
  }
  state.staff.roleAccess[role] = ACCESS_VIEW_OPTIONS.map(option => option.id).filter(id => access.has(id));
  saveState();
  render();
}

function staffInitials(name) {
  const words = String(name || "S").trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0]?.slice(0, 2) || "S").toUpperCase();
}

function mediaDriveId(value) {
  const text = String(value || "");
  return text.match(/[?&]id=([^&]+)/)?.[1]
    || text.match(/\/d\/([^/]+)/)?.[1]
    || text.match(/open\?id=([^&]+)/)?.[1]
    || "";
}

function mediaImageCandidates(value, size = 160) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  const candidates = [raw];
  const driveId = mediaDriveId(raw);
  if (driveId) {
    candidates.unshift(`https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w${size}`);
    candidates.push(`https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveId)}`);
  }
  return [...new Set(candidates)];
}

function mediaImageSrc(value, size = 160) {
  return mediaImageCandidates(value, size)[0] || "";
}

function mediaImageFallbackScript(value, size = 160) {
  const candidates = mediaImageCandidates(value, size);
  return `this.dataset.mediaIndex=(Number(this.dataset.mediaIndex||0)+1);var media=${escapeHtml(JSON.stringify(candidates))};if(media[this.dataset.mediaIndex]){this.src=media[this.dataset.mediaIndex];}else{this.onerror=null;this.hidden=true;if(this.nextElementSibling&&this.nextElementSibling.classList.contains('media-fallback-token'))this.nextElementSibling.hidden=false;}`;
}

function mediaImageTag(value, alt, className = "", size = 160) {
  const src = mediaImageSrc(value, size);
  if (!src) return "";
  return `<img ${className ? `class="${escapeHtml(className)}" ` : ""}src="${escapeHtml(src)}" data-media-index="0" onerror="${mediaImageFallbackScript(value, size)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" />`;
}

function productImageOrToken(product, className = "", size = 360) {
  const photo = mediaImageTag(product.imageName, `Foto ${product.name}`, className, size);
  const initials = String(product.name || "PR").slice(0, 2).toUpperCase();
  const token = `<span class="${escapeHtml(className)} self-order-product-token media-fallback-token" ${photo ? "hidden" : ""}>${escapeHtml(initials)}</span>`;
  if (photo) return `${photo}${token}`;
  return `<span class="${escapeHtml(className)} self-order-product-token">${escapeHtml(initials)}</span>`;
}

function money(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function dateTime(value) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function todayKey(date = new Date()) {
  const localDate = date instanceof Date ? date : new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(date = new Date()) {
  return todayKey(date).slice(0, 7);
}

function dateInputValue(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? todayKey() : todayKey(date);
}

function startOfLocalDay(key) {
  const [year, month, day] = String(key || todayKey()).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0);
}

function endOfLocalDay(key) {
  const date = startOfLocalDay(key);
  date.setHours(23, 59, 59, 999);
  return date;
}

function parseMoney(value) {
  if (typeof value === "number") return value;
  const clean = String(value || "0").replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", ".");
  return Number(clean) || 0;
}

function parseReportDate(value) {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return new Date(text);
  const parts = text.split(/[\/\-. ]+/).map(Number);
  if (parts.length >= 3) {
    const [a, b, c] = parts;
    if (a > 31) return new Date(a, (b || 1) - 1, c || 1);
    return new Date(c || new Date().getFullYear(), (b || 1) - 1, a || 1);
  }
  return new Date(text);
}

function initSupabase() {
  if (!window.supabase?.createClient) {
    supabaseStatus = "Library Supabase belum termuat.";
    return;
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  clearLocalMasterDataForRemoteAuthority();
  setupSupabaseRealtime();
  supabaseClient.auth.getSession().then(({ data }) => {
    supabaseSession = data.session || null;
    supabaseStatus = supabaseSession ? `Terhubung sebagai ${supabaseSession.user.email}` : "Belum login Supabase.";
    processSyncQueue("supabase-ready");
    loadStoreSettingsFromSupabase({ reason: "supabase-ready", silent: view === "selforder" });
    loadMasterDataFromSupabase({ reason: "supabase-ready", silent: view === "selforder" });
    loadRecentOrdersFromSupabase({ reason: "supabase-ready", silent: view === "selforder" });
    if (view === "reports") requestActiveReportData();
    render();
  });
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    supabaseSession = session || null;
    supabaseStatus = supabaseSession ? `Terhubung sebagai ${supabaseSession.user.email}` : "Belum login Supabase.";
    processSyncQueue("auth-change");
    loadStoreSettingsFromSupabase({ reason: "auth-change", force: true, silent: view === "selforder" });
    loadMasterDataFromSupabase({ reason: "auth-change", force: true, silent: view === "selforder" });
    loadRecentOrdersFromSupabase({ reason: "auth-change", force: true, silent: view === "selforder" });
    if (view === "reports") requestActiveReportData(true);
    else supabaseReportRecords = [];
    render();
  });
}

function setupSupabaseRealtime() {
  if (!supabaseClient || supabaseRealtimeChannels.length) return;
  const channelConfigs = [
    ["orders", ["orders", "order_items", "order_item_addons", "payments"]],
    ["products", ["products", "product_addons", "addons", "categories"]],
    ["settings", ["store_settings"]]
  ];
  supabaseRealtimeChannels = channelConfigs.map(([reason, tables]) => {
    let channel = supabaseClient.channel(`omnipos-${reason}-realtime`);
    tables.forEach(table => {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        scheduleRealtimeRefresh(reason);
      });
    });
    return channel.subscribe();
  });
}

function broadcastRealtimeEvent(reason) {
  const message = { reason, sender: realtimeTabId, at: Date.now() };
  if (localRealtimeChannel) localRealtimeChannel.postMessage(message);
  try {
    localStorage.setItem("omnipos_realtime_event", JSON.stringify(message));
  } catch (error) {
    console.warn("Realtime local broadcast failed", error);
  }
}

function scheduleRealtimeRefresh(reason = "orders", options = {}) {
  realtimeRefreshReasons.add(reason);
  window.clearTimeout(realtimeRefreshTimer);
  realtimeRefreshTimer = window.setTimeout(() => {
    const reasons = new Set(realtimeRefreshReasons);
    realtimeRefreshReasons.clear();
    refreshRealtimeData(reasons, options);
  }, options.local ? 180 : 450);
}

async function refreshRealtimeData(reasons) {
  if (!supabaseReadable()) {
    await reloadStateFromLocalPersistence();
    return;
  }
  const shouldLoadProducts = reasons.has("products") || reasons.has("master");
  const shouldLoadOrders = reasons.has("orders");
  const shouldLoadSettings = reasons.has("settings") || reasons.has("master");
  if (shouldLoadSettings) await loadStoreSettingsFromSupabase({ reason: "realtime", force: true, silent: true });
  if (shouldLoadProducts) await loadMasterDataFromSupabase({ reason: "realtime", force: true, silent: true });
  if (shouldLoadOrders) await loadRecentOrdersFromSupabase({ reason: "realtime", force: true, silent: true });
  if (view === "reports" && shouldLoadOrders) requestActiveReportData(true);
}

async function pollRealtimeFallback() {
  if (!supabaseReadable() || !localDbReady || navigator.onLine === false) return;
  const now = Date.now();
  const orderViews = new Set(["dashboard", "pos", "kitchen", "orders", "reports"]);
  const masterViews = new Set(["dashboard", "pos", "kitchen", "orders", "products", "selforder", "settings"]);
  if (orderViews.has(view)) {
    await loadRecentOrdersFromSupabase({ reason: "poll", force: true, silent: true });
    if (view === "reports") requestActiveReportData(true);
  }
  if (masterViews.has(view) && now - realtimeFallbackLastMasterAt > 45000) {
    realtimeFallbackLastMasterAt = now;
    await loadStoreSettingsFromSupabase({ reason: "poll", force: true, silent: true });
    await loadMasterDataFromSupabase({ reason: "poll", force: true, silent: true });
  }
}

function isUserEditingInteractiveElement() {
  const active = document.activeElement;
  if (!active || active === document.body || active === document.documentElement) return false;
  if (active.closest?.("#drawer")) return true;
  if (active.isContentEditable) return true;
  return active.matches?.("input, textarea, select, [role='textbox']");
}

function isBlockingInteractionActive() {
  const drawer = document.getElementById("drawer");
  return Boolean(
    isUserEditingInteractiveElement()
    || drawer?.classList?.contains("open")
    || activeModalState
    || appConfirmHandlers.confirm
    || appConfirmHandlers.cancel
  );
}

function shouldRenderAfterRealtimeLoad(kind) {
  if (isBlockingInteractionActive()) {
    deferredRealtimeRender = true;
    return false;
  }
  if (view !== "selforder") return ["pos", "kitchen", "orders", "dashboard", "products", "stock-opname"].includes(view);
  const step = selfOrderStep();
  if (kind === "orders") return step === "success";
  return step === "menu" || step === "success";
}

async function reloadStateFromLocalPersistence() {
  try {
    const persisted = await getIndexedDbState();
    if (!persisted) return;
    Object.assign(state, persisted);
    normalizeState();
    clearLocalMasterDataForRemoteAuthority({ save: false });
    saveState();
    if (!isBlockingInteractionActive() && (view !== "selforder" || selfOrderStep() === "menu")) render();
    else deferredRealtimeRender = true;
  } catch (error) {
    try {
      const fallback = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!fallback) return;
      Object.assign(state, fallback);
      normalizeState();
      clearLocalMasterDataForRemoteAuthority({ save: false });
      saveState();
      if (!isBlockingInteractionActive() && (view !== "selforder" || selfOrderStep() === "menu")) render();
      else deferredRealtimeRender = true;
    } catch (fallbackError) {
      console.warn("Local realtime reload failed", error, fallbackError);
    }
  }
}

function supabaseReady() {
  return Boolean(supabaseClient && supabaseSession?.user);
}

function supabaseReadable() {
  return Boolean(supabaseClient);
}

function supabaseWritable() {
  return Boolean(supabaseClient);
}

async function ensureSupabaseProfile() {
  if (!supabaseSession?.user) return null;
  const user = supabaseSession.user;
  normalizeStaffState();
  const deletedIds = new Set(state.staff.deletedStaffIds || []);
  const deletedNames = new Set(state.staff.deletedStaffUsernames || []);
  const profileName = String(state.activeUser || user.email || "Admin").trim();
  const profileKey = profileName.toLowerCase();
  if (deletedIds.has(user.id) || deletedNames.has(profileKey)) return user.id;
  const payload = {
    id: user.id,
    full_name: profileName,
    role: "admin",
    active: true
  };
  const { error } = await supabaseClient.from("staff_profiles").upsert(payload, { onConflict: "id" });
  if (error) throw error;
  return user.id;
}

async function signInSupabase(event) {
  event.preventDefault();
  if (!supabaseClient) return toast("Supabase belum termuat. Refresh halaman lalu coba lagi.");
  const form = new FormData(event.target);
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  if (!email || !password) return toast("Email dan password wajib diisi.");
  supabaseStatus = "Mencoba login...";
  render();
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    supabaseStatus = "Login gagal.";
    render();
    return toast(error.message);
  }
  supabaseSession = data.session;
  try {
    await ensureSupabaseProfile();
  } catch (profileError) {
    toast(`Login berhasil, profil belum tersimpan: ${profileError.message}`);
    return;
  }
  toast("Login Supabase berhasil.");
  if (view === "reports") requestActiveReportData(true);
  render();
}

async function signOutSupabase() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  supabaseSession = null;
  supabaseReportRecords = [];
  supabaseStatus = "Belum login Supabase.";
  toast("Logout Supabase berhasil.");
  render();
}

function orderProfit(order) {
  return (order.items || order.cart || []).reduce((sum, item) => {
    const addonsProfit = (item.addons || []).reduce((acc, addon) => acc + addonProfit(addon), 0);
    return sum + Math.max(0, (Number(item.price || 0) - Number(item.cost || 0)) * Number(item.qty || 0) + addonsProfit - itemDiscountAmount(item));
  }, 0);
}

function addonCost(addon) {
  const master = state.addons.find(item => item.id === addon?.id || (addon?.name && item.name === addon.name));
  return Number(addon?.cost ?? master?.cost ?? 0);
}

function addonProfit(addon) {
  return Math.max(0, (Number(addon?.price || 0) - addonCost(addon)) * Number(addon?.qty || 0));
}

function orderTotal(order) {
  if (!order) return 0;
  const subtotal = Number(order.subtotal);
  if (Number.isFinite(subtotal) && subtotal > 0) return Math.max(0, subtotal - Number(order.discount || 0));
  return Number(order.grandTotal || order.total || 0);
}

function isCashierSource(source) {
  const value = String(source || "").toLowerCase();
  return value.includes("kasir") || value.includes("kasirin") || value.includes("pos");
}

function isReportableOrder(order) {
  if (!order || order.status === "Dibatalkan") return false;
  if (order.paymentStatus !== "Lunas") return false;
  if (isCashierSource(order.source)) return true;
  return order.status === "Selesai";
}

function isReportableRecord(record) {
  if (!record) return false;
  if (record.status === "Dibatalkan") return false;
  if (record.imported || String(record.source || "").toLowerCase().includes("import")) {
    return Boolean(record.createdAt) && Number(record.total || record.subtotal || 0) > 0;
  }
  if (record.paymentStatus !== "Lunas") return false;
  if (isCashierSource(record.source)) return true;
  if (record.status) return record.status === "Selesai";
  return true;
}

function canAttemptSupabaseSync() {
  return supabaseWritable() && navigator.onLine !== false;
}

function orderSyncQueueId(order) {
  return order?.id || order?.number || "";
}

function invalidateReportCaches() {
  supabaseReportLoadKey = "";
  supabaseReportsLoadedAt = 0;
  supabaseReportRecords = [];
  supabaseReportDetailCache = new Map();
  profitSummaryCache = { years: [], months: {}, days: {} };
  profitSummaryLoadedAt = new Map();
  legacyProfitSummaryLoadedAt = new Map();
}

function syncRetryDelayMs(attempts) {
  const retrySteps = [15000, 30000, 60000, 180000, 300000];
  return retrySteps[Math.min(Math.max(0, attempts - 1), retrySteps.length - 1)];
}

function markOrderSyncPending(order, error) {
  if (!order) return;
  const queueId = orderSyncQueueId(order);
  if (!queueId) return;
  state.syncQueue ||= [];
  const existing = state.syncQueue.find(item => item.type === "order" && item.orderId === queueId);
  const attempts = Number(existing?.attempts || 0) + 1;
  const now = Date.now();
  const queueItem = {
    id: existing?.id || uid(),
    type: "order",
    orderId: queueId,
    orderNumber: order.number || "",
    attempts,
    lastError: error?.message || "Koneksi Supabase belum tersedia",
    lastAttemptAt: new Date(now).toISOString(),
    nextAttemptAt: new Date(now + syncRetryDelayMs(attempts)).toISOString()
  };
  order.syncStatus = "pending";
  order.syncError = queueItem.lastError;
  order.syncUpdatedAt = queueItem.lastAttemptAt;
  if (existing) Object.assign(existing, queueItem);
  else state.syncQueue.push(queueItem);
}

function markOrderSynced(order) {
  if (!order) return;
  const queueId = orderSyncQueueId(order);
  order.syncStatus = "synced";
  order.syncError = "";
  order.syncUpdatedAt = new Date().toISOString();
  state.syncQueue = (state.syncQueue || []).filter(item => !(item.type === "order" && item.orderId === queueId));
}

function slugId(prefix, value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${prefix}_${slug || uid()}`;
}

function normalizeMasterLocalId(prefix, id, fallback) {
  return String(id || "").trim() || slugId(prefix, fallback);
}

function normalizeSupabaseCategory(row) {
  return row?.name || "";
}

function normalizeSupabaseAddon(row) {
  const hasSoldOutColumn = Object.prototype.hasOwnProperty.call(row || {}, "sold_out");
  if (hasSoldOutColumn) supabaseAddonSoldOutColumnReady = true;
  return {
    id: row.local_id || row.id,
    supabaseId: row.id,
    name: row.name || "",
    price: Number(row.price || 0),
    cost: Number(row.cost || 0),
    active: row.active !== false,
    soldOut: hasSoldOutColumn ? Boolean(row.sold_out) : false
  };
}

function normalizeSupabaseProduct(row, categoryName = "") {
  const hasStockOpnameColumn = Object.prototype.hasOwnProperty.call(row, "stock_opname");
  const hasStockOpnameCheckedAtColumn = Object.prototype.hasOwnProperty.call(row, "stock_opname_checked_at");
  const hasStockOpnameCheckedByColumn = Object.prototype.hasOwnProperty.call(row, "stock_opname_checked_by");
  if (hasStockOpnameColumn && hasStockOpnameCheckedAtColumn && hasStockOpnameCheckedByColumn) {
    supabaseStockOpnameColumnsReady = true;
  }
  return {
    id: row.local_id || row.id,
    supabaseId: row.id,
    name: row.name || "",
    sku: row.sku || "",
    category: categoryName || row.category_name || "",
    description: row.description || "",
    price: Number(row.price || 0),
    cost: Number(row.cost || 0),
    stock: Number(row.stock || 0),
    minStock: Number(row.min_stock || 0),
    unit: row.unit || "item",
    trackStock: row.track_stock !== false,
    active: row.active !== false,
    soldOut: Boolean(row.sold_out),
    prepMinutes: Number(row.prep_minutes || 5),
    station: row.station || "Dapur",
    imageName: row.image_name || "",
    kitchenNote: row.kitchen_note || "",
    channelPOS: row.channel_pos !== false,
    channelSelfOrder: Boolean(row.channel_self_order),
    channelDelivery: row.channel_delivery !== false,
    variantMode: row.variant_mode || "off",
    variantGroup: row.variant_group || "",
    variantRequired: Boolean(row.variant_required),
    variantGroup2: row.variant_group2 || "",
    variantRequired2: Boolean(row.variant_required2),
    variantOptions: Array.isArray(row.variant_options) ? row.variant_options : [],
    variantOptions2: [],
    allowedAddonIds: Array.isArray(row.allowed_addon_ids) ? row.allowed_addon_ids : [],
    soldOutVariants: row.sold_out_variants || {},
    stockOpname: hasStockOpnameColumn ? Boolean(row.stock_opname) : false,
    stockOpnameCheckedAt: hasStockOpnameCheckedAtColumn ? row.stock_opname_checked_at || "" : "",
    stockOpnameCheckedBy: hasStockOpnameCheckedByColumn ? row.stock_opname_checked_by || "" : "",
    stockOpnameSchemaReady: hasStockOpnameColumn && hasStockOpnameCheckedAtColumn && hasStockOpnameCheckedByColumn
  };
}

function mergeProductLocalMeta(serverProduct, localProduct) {
  const schemaReady = Boolean(serverProduct.stockOpnameSchemaReady);
  const merged = !localProduct || schemaReady ? { ...serverProduct } : {
    ...serverProduct,
    stockOpname: Boolean(localProduct.stockOpname),
    stockOpnameCheckedAt: localProduct.stockOpnameCheckedAt || "",
    stockOpnameCheckedBy: localProduct.stockOpnameCheckedBy || ""
  };
  delete merged.stockOpnameSchemaReady;
  return merged;
}

function categoryPayload(name) {
  return {
    local_id: slugId("cat", name),
    name,
    active: true
  };
}

function addonPayload(addon) {
  const payload = {
    local_id: normalizeMasterLocalId("addon", addon.id, addon.name),
    name: addon.name,
    price: Number(addon.price || 0),
    cost: Number(addon.cost || 0),
    active: addon.active !== false
  };
  if (supabaseAddonSoldOutColumnReady) payload.sold_out = Boolean(addon.soldOut);
  return payload;
}

function productPayload(product, categoryId = null) {
  const payload = {
    local_id: normalizeMasterLocalId("prod", product.id, product.sku || product.name),
    category_id: categoryId,
    name: product.name,
    sku: product.sku || null,
    description: product.description || "",
    price: Number(product.price || 0),
    cost: Number(product.cost || 0),
    stock: Number(product.stock || 0),
    min_stock: Number(product.minStock || 0),
    unit: product.unit || "item",
    track_stock: product.trackStock !== false,
    active: product.active !== false,
    sold_out: Boolean(product.soldOut),
    prep_minutes: Number(product.prepMinutes || 5),
    station: product.station || "Dapur",
    image_name: product.imageName || "",
    kitchen_note: product.kitchenNote || "",
    channel_pos: product.channelPOS !== false,
    channel_self_order: Boolean(product.channelSelfOrder),
    channel_delivery: product.channelDelivery !== false,
    variant_mode: product.variantMode || "off",
    variant_group: product.variantGroup || "",
    variant_required: Boolean(product.variantRequired),
    variant_group2: product.variantGroup2 || "",
    variant_required2: Boolean(product.variantRequired2),
    variant_options: product.variantOptions || [],
    allowed_addon_ids: product.allowedAddonIds || [],
    sold_out_variants: product.soldOutVariants || {}
  };
  if (supabaseStockOpnameColumnsReady) {
    payload.stock_opname = Boolean(product.stockOpname);
    payload.stock_opname_checked_at = product.stockOpnameCheckedAt || null;
    payload.stock_opname_checked_by = product.stockOpnameCheckedBy || null;
  }
  return payload;
}

async function findSingleBy(table, column, value, select = "id") {
  if (!value) return null;
  const { data, error } = await supabaseClient
    .from(table)
    .select(select)
    .eq(column, value)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function isSupabaseDuplicateKeyError(error) {
  return error?.code === "23505" || String(error?.message || "").toLowerCase().includes("duplicate key");
}

function isSupabaseForeignKeyError(error) {
  return error?.code === "23503" || String(error?.message || "").toLowerCase().includes("foreign key");
}

function isSupabaseMissingRelationOrColumnError(error) {
  const text = [
    error?.code,
    error?.message,
    error?.details,
    error?.hint
  ].filter(Boolean).join(" ").toLowerCase();
  return error?.code === "42P01"
    || error?.code === "42703"
    || error?.code === "PGRST204"
    || text.includes("could not find")
    || text.includes("does not exist")
    || text.includes("schema cache");
}

function isMissingStockOpnameColumnError(error) {
  const text = [
    error?.code,
    error?.message,
    error?.details,
    error?.hint
  ].filter(Boolean).join(" ").toLowerCase();
  return error?.code === "42703"
    || error?.code === "PGRST204"
    || (error?.status === 400 && text.includes("stock_opname"))
    || (text.includes("stock_opname") && (text.includes("column") || text.includes("schema cache")))
    || (text.includes("stock_opname_checked") && (text.includes("column") || text.includes("schema cache")));
}

function isMissingAddonSoldOutColumnError(error) {
  const text = [
    error?.code,
    error?.message,
    error?.details,
    error?.hint
  ].filter(Boolean).join(" ").toLowerCase();
  return error?.code === "42703"
    || error?.code === "PGRST204"
    || (error?.status === 400 && text.includes("sold_out"))
    || (text.includes("sold_out") && (text.includes("column") || text.includes("schema cache")));
}

function addonPayloadWithoutSoldOut(payload) {
  const fallback = { ...payload };
  delete fallback.sold_out;
  return fallback;
}

function productPayloadWithoutStockOpname(payload) {
  const fallback = { ...payload };
  delete fallback.stock_opname;
  delete fallback.stock_opname_checked_at;
  delete fallback.stock_opname_checked_by;
  return fallback;
}

function missingSchemaColumnName(error) {
  const text = [
    error?.message,
    error?.details,
    error?.hint
  ].filter(Boolean).join(" ");
  const quotedMatch = text.match(/'([^']+)'\s+column/i);
  if (quotedMatch?.[1]) return quotedMatch[1];
  const relationMatch = text.match(/column\s+"([^"]+)"\s+of\s+relation/i);
  if (relationMatch?.[1]) return relationMatch[1];
  return "";
}

function isMissingProductSchemaColumnError(error) {
  const text = [
    error?.code,
    error?.message,
    error?.details,
    error?.hint
  ].filter(Boolean).join(" ").toLowerCase();
  return error?.code === "42703"
    || error?.code === "PGRST204"
    || (error?.status === 400 && text.includes("schema cache"))
    || (text.includes("column") && text.includes("products"));
}

async function updateProductWithSchemaRetry(productId, payload) {
  let nextPayload = { ...payload };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await supabaseClient.from("products").update(nextPayload).eq("id", productId);
    if (!error) return;
    if (isMissingStockOpnameColumnError(error)) {
      supabaseStockOpnameColumnsReady = false;
      nextPayload = productPayloadWithoutStockOpname(nextPayload);
      continue;
    }
    if (isMissingProductSchemaColumnError(error)) {
      const column = missingSchemaColumnName(error);
      if (column && Object.prototype.hasOwnProperty.call(nextPayload, column)) {
        delete nextPayload[column];
        continue;
      }
    }
    throw error;
  }
  throw new Error("Schema products Supabase belum cocok dengan payload aplikasi.");
}

async function insertProductWithSchemaRetry(payload) {
  let nextPayload = { ...payload };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await supabaseClient.from("products").insert(nextPayload).select("id").single();
    if (!error) return { data, error: null };
    if (isMissingStockOpnameColumnError(error)) {
      supabaseStockOpnameColumnsReady = false;
      nextPayload = productPayloadWithoutStockOpname(nextPayload);
      continue;
    }
    if (isMissingProductSchemaColumnError(error)) {
      const column = missingSchemaColumnName(error);
      if (column && Object.prototype.hasOwnProperty.call(nextPayload, column)) {
        delete nextPayload[column];
        continue;
      }
    }
    return { data, error };
  }
  return { data: null, error: new Error("Schema products Supabase belum cocok dengan payload aplikasi.") };
}

async function writeProductPayload(productId, payload) {
  await updateProductWithSchemaRetry(productId, payload);
}

async function insertProductPayload(payload) {
  return insertProductWithSchemaRetry(payload);
}

async function ignoreMissingSchema(operation) {
  try {
    return await operation();
  } catch (error) {
    if (isSupabaseMissingRelationOrColumnError(error)) return null;
    throw error;
  }
}

async function ensureSupabaseCategory(name) {
  const cleanName = String(name || "").trim();
  if (!cleanName) return null;
  const payload = categoryPayload(cleanName);
  const existing = await findSingleBy("categories", "name", cleanName, "id,local_id");
  if (existing?.id) {
    const { error } = await supabaseClient.from("categories").update(payload).eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabaseClient.from("categories").insert(payload).select("id").single();
  if (error) throw error;
  return data.id;
}

async function upsertSupabaseAddon(addon) {
  const payload = addonPayload(addon);
  const existing = await findSingleBy("addons", "local_id", payload.local_id, "id");
  if (existing?.id) {
    let { error } = await supabaseClient.from("addons").update(payload).eq("id", existing.id);
    if (isMissingAddonSoldOutColumnError(error)) {
      supabaseAddonSoldOutColumnReady = false;
      ({ error } = await supabaseClient.from("addons").update(addonPayloadWithoutSoldOut(payload)).eq("id", existing.id));
    }
    if (error) throw error;
    return existing.id;
  }
  let { data, error } = await supabaseClient.from("addons").insert(payload).select("id").single();
  if (isMissingAddonSoldOutColumnError(error)) {
    supabaseAddonSoldOutColumnReady = false;
    ({ data, error } = await supabaseClient.from("addons").insert(addonPayloadWithoutSoldOut(payload)).select("id").single());
  }
  if (error) throw error;
  return data.id;
}

async function upsertSupabaseProduct(product) {
  const categoryId = await ensureSupabaseCategory(product.category);
  const payload = productPayload(product, categoryId);
  const existing = await findSingleBy("products", "local_id", payload.local_id, "id");
  const existingBySku = !existing?.id && payload.sku
    ? await findSingleBy("products", "sku", payload.sku, "id")
    : null;
  let productId = existing?.id || existingBySku?.id;
  if (productId) {
    await writeProductPayload(productId, payload);
  } else {
    const { data, error } = await insertProductPayload(payload);
    if (error?.code === "23505" && payload.sku) {
      const conflict = await findSingleBy("products", "sku", payload.sku, "id");
      if (!conflict?.id) throw error;
      await writeProductPayload(conflict.id, payload);
      productId = conflict.id;
    } else if (error) {
      throw error;
    }
    if (!productId) productId = data.id;
  }

  const addonIds = [...new Set((product.allowedAddonIds || []).filter(Boolean))];
  if (!productId) return null;
  const { error: deleteError } = await supabaseClient.from("product_addons").delete().eq("product_id", productId);
  if (deleteError && !isSupabaseForeignKeyError(deleteError)) throw deleteError;
  if (addonIds.length) {
    const { data: addonRows, error: addonError } = await supabaseClient
      .from("addons")
      .select("id,local_id")
      .in("local_id", addonIds);
    if (addonError) throw addonError;
    const rows = [...new Map((addonRows || []).filter(row => row?.id).map(row => [row.id, { product_id: productId, addon_id: row.id }])).values()];
    if (rows.length) {
      const { error } = await supabaseClient
        .from("product_addons")
        .upsert(rows, { onConflict: "product_id,addon_id", ignoreDuplicates: true });
      if (error && !isSupabaseDuplicateKeyError(error) && !isSupabaseForeignKeyError(error)) throw error;
    }
  }
  return productId;
}

async function runSupabaseWrite(query) {
  const { error } = await query;
  if (error) throw error;
}

async function cleanupSupabaseProductReferences(productIds, localIds = []) {
  const ids = [...new Set(Array.from(productIds || []).map(value => String(value || "").trim()).filter(Boolean))];
  const locals = [...new Set(Array.from(localIds || []).map(value => String(value || "").trim()).filter(Boolean))];

  for (const productId of ids) {
    await ignoreMissingSchema(() => runSupabaseWrite(supabaseClient.from("product_addons").delete().eq("product_id", productId)));
    await ignoreMissingSchema(() => runSupabaseWrite(supabaseClient.from("order_items").update({
      product_id: null,
      product_name: "None",
      sku: null
    }).eq("product_id", productId)));
    await ignoreMissingSchema(() => runSupabaseWrite(supabaseClient.from("stock_movements").update({ product_id: null }).eq("product_id", productId)));
    await ignoreMissingSchema(() => runSupabaseWrite(supabaseClient.from("inventory_movements").update({ product_id: null }).eq("product_id", productId)));
    await ignoreMissingSchema(() => runSupabaseWrite(supabaseClient.from("stock_audit_items").update({ product_id: null }).eq("product_id", productId)));
    await ignoreMissingSchema(() => runSupabaseWrite(supabaseClient.from("product_availability_events").update({
      product_id: null,
      product_name: "None"
    }).eq("product_id", productId)));
    await ignoreMissingSchema(() => runSupabaseWrite(supabaseClient.from("inventory_items").delete().eq("product_id", productId)));
  }

  for (const localId of locals) {
    await ignoreMissingSchema(() => runSupabaseWrite(supabaseClient.from("inventory_items").delete().eq("local_product_id", localId)));
    await ignoreMissingSchema(() => runSupabaseWrite(supabaseClient.from("product_availability_events").update({
      product_local_id: null,
      product_name: "None"
    }).eq("product_local_id", localId)));
  }
}

async function cleanupSupabaseAddonReferences(addonIds, localIds = []) {
  const ids = [...new Set(Array.from(addonIds || []).map(value => String(value || "").trim()).filter(Boolean))];
  const locals = [...new Set(Array.from(localIds || []).map(value => String(value || "").trim()).filter(Boolean))];

  for (const addonId of ids) {
    await ignoreMissingSchema(() => runSupabaseWrite(supabaseClient.from("product_addons").delete().eq("addon_id", addonId)));
    await ignoreMissingSchema(() => runSupabaseWrite(supabaseClient.from("order_item_addons").delete().eq("addon_id", addonId)));
  }

  for (const localId of locals) {
    await ignoreMissingSchema(() => runSupabaseWrite(supabaseClient.from("order_item_addons").delete().eq("addon_local_id", localId)));
    await cleanupSupabaseProductsAllowedAddonId(localId);
  }
}

async function cleanupSupabaseProductsAllowedAddonId(localId) {
  if (!localId) return;
  await ignoreMissingSchema(async () => {
    const { data, error } = await supabaseClient
      .from("products")
      .select("id,allowed_addon_ids");
    if (error) throw error;
    for (const product of (data || []).filter(row => Array.isArray(row.allowed_addon_ids) && row.allowed_addon_ids.includes(localId))) {
      const allowed = Array.isArray(product.allowed_addon_ids)
        ? product.allowed_addon_ids.filter(id => id !== localId)
        : [];
      await runSupabaseWrite(supabaseClient.from("products").update({ allowed_addon_ids: allowed }).eq("id", product.id));
    }
  });
}

async function cleanupSupabaseCategoryReferences(categoryIds) {
  const ids = [...new Set(Array.from(categoryIds || []).map(value => String(value || "").trim()).filter(Boolean))];
  for (const categoryId of ids) {
    await ignoreMissingSchema(() => runSupabaseWrite(supabaseClient.from("products").update({ category_id: null }).eq("category_id", categoryId)));
  }
}

async function deleteSupabaseRowsByColumn(table, column, value) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return [];
  const { data, error } = await supabaseClient
    .from(table)
    .delete()
    .eq(column, cleanValue)
    .select("id");
  if (error) throw error;
  return data || [];
}

async function ensureNoSupabaseRowsByColumn(table, column, value, label) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return;
  const { data, error } = await supabaseClient
    .from(table)
    .select("id")
    .eq(column, cleanValue)
    .limit(1);
  if (error) throw error;
  if ((data || []).length) throw new Error(`${label} masih ada di Supabase setelah delete.`);
}

async function ensureNoSupabaseAddonByIdentity(addon) {
  if (!addon?.name) return;
  let query = supabaseClient
    .from("addons")
    .select("id")
    .eq("name", addon.name)
    .eq("price", Number(addon.price || 0));
  if (Number.isFinite(Number(addon.cost))) query = query.eq("cost", Number(addon.cost || 0));
  const { data, error } = await query.limit(1);
  if (error) throw error;
  if ((data || []).length) throw new Error(`Add-on ${addon.name} masih ada di Supabase setelah delete.`);
}

async function deleteSupabaseMaster(entity, payload) {
  const table = entity === "product" ? "products" : entity === "addon" ? "addons" : "categories";
  const localId = payload.local_id || payload.localId || payload.id;
  if (entity === "product") {
    const localIds = new Set([localId].map(value => String(value || "").trim()).filter(Boolean));
    const remoteIds = new Set([
      payload.supabaseId,
      payload.supabase_id,
      payload.remoteId
    ].map(value => String(value || "").trim()).filter(Boolean));
    if (localId) {
      const productRow = await findSingleBy("products", "local_id", localId, "id");
      if (productRow?.id) remoteIds.add(productRow.id);
    }
    if (payload.sku) {
      const { data, error } = await supabaseClient.from("products").select("id").eq("sku", payload.sku);
      if (error) throw error;
      (data || []).forEach(row => row?.id && remoteIds.add(row.id));
    }
    const hasStrongProductIdentity = Boolean(remoteIds.size || localIds.size || payload.sku);
    if (!hasStrongProductIdentity && payload.name) {
      const { data, error } = await supabaseClient
        .from("products")
        .select("id,name,price,categories(name)")
        .eq("name", payload.name)
        .eq("price", Number(payload.price || 0));
      if (error) throw error;
      const category = normalizeProductIdentityText(payload.category);
      (data || [])
        .filter(row => !category || normalizeProductIdentityText(row.categories?.name) === category)
        .forEach(row => row?.id && remoteIds.add(row.id));
    }
    await cleanupSupabaseProductReferences(remoteIds, localIds);
    for (const productId of remoteIds) {
      const { error } = await supabaseClient.from("products").delete().eq("id", productId);
      if (error) throw error;
    }
    if (localId) {
      await cleanupSupabaseProductReferences(new Set(), [localId]);
      const { error } = await supabaseClient.from("products").delete().eq("local_id", localId);
      if (error) throw error;
    }
    return;
  }
  if (entity === "addon") {
    const localIds = new Set([localId].map(value => String(value || "").trim()).filter(Boolean));
    const remoteIds = new Set([
      payload.supabaseId,
      payload.supabase_id,
      payload.remoteId
    ].map(value => String(value || "").trim()).filter(Boolean));
    if (localId) {
      const addonRow = await findSingleBy("addons", "local_id", localId, "id");
      if (addonRow?.id) remoteIds.add(addonRow.id);
    }
    if (payload.name) {
      const query = supabaseClient.from("addons").select("id,local_id,name,price").eq("name", payload.name);
      let identityQuery = Number.isFinite(Number(payload.price))
        ? query.eq("price", Number(payload.price || 0))
        : query;
      if (Number.isFinite(Number(payload.cost))) identityQuery = identityQuery.eq("cost", Number(payload.cost || 0));
      const { data, error } = await identityQuery;
      if (error) throw error;
      (data || []).forEach(row => {
        if (row?.id) remoteIds.add(row.id);
        if (row?.local_id) localIds.add(row.local_id);
      });
    }
    await cleanupSupabaseAddonReferences(remoteIds, localIds);
    let deletedCount = 0;
    for (const addonId of remoteIds) {
      const { data, error } = await supabaseClient.from("addons").delete().eq("id", addonId).select("id");
      if (error) throw error;
      deletedCount += (data || []).length;
    }
    if (localId) {
      await cleanupSupabaseAddonReferences(new Set(), [localId]);
      const deleted = await deleteSupabaseRowsByColumn("addons", "local_id", localId);
      deletedCount += deleted.length;
    }
    if (payload.name) {
      const query = supabaseClient.from("addons").delete().eq("name", payload.name);
      let deleteQuery = Number.isFinite(Number(payload.price))
        ? query.eq("price", Number(payload.price || 0))
        : query;
      if (Number.isFinite(Number(payload.cost))) deleteQuery = deleteQuery.eq("cost", Number(payload.cost || 0));
      const { data, error } = await deleteQuery.select("id");
      if (error) throw error;
      deletedCount += (data || []).length;
    }
    for (const addonId of remoteIds) {
      await ensureNoSupabaseRowsByColumn("addons", "id", addonId, `Add-on ${payload.name || addonId}`);
    }
    for (const addonLocalId of localIds) {
      await ensureNoSupabaseRowsByColumn("addons", "local_id", addonLocalId, `Add-on ${payload.name || addonLocalId}`);
    }
    if (payload.name) await ensureNoSupabaseAddonByIdentity(payload);
    if (!deletedCount) throw new Error(`Add-on ${payload.name || localId || "ini"} tidak terhapus dari Supabase.`);
    return;
  }
  if (entity === "category") {
    const remoteIds = new Set([
      payload.supabaseId,
      payload.supabase_id,
      payload.remoteId
    ].map(value => String(value || "").trim()).filter(Boolean));
    if (localId) {
      const categoryRow = await findSingleBy("categories", "local_id", localId, "id");
      if (categoryRow?.id) remoteIds.add(categoryRow.id);
    }
    if (payload.name) {
      const { data, error } = await supabaseClient.from("categories").select("id").eq("name", payload.name);
      if (error) throw error;
      (data || []).forEach(row => row?.id && remoteIds.add(row.id));
    }
    await cleanupSupabaseCategoryReferences(remoteIds);
    let deletedCount = 0;
    for (const categoryId of remoteIds) {
      const { data, error } = await supabaseClient.from("categories").delete().eq("id", categoryId).select("id");
      if (error) throw error;
      deletedCount += (data || []).length;
    }
    if (localId) {
      const deleted = await deleteSupabaseRowsByColumn("categories", "local_id", localId);
      deletedCount += deleted.length;
    }
    if (payload.name) {
      const deleted = await deleteSupabaseRowsByColumn("categories", "name", payload.name);
      deletedCount += deleted.length;
    }
    for (const categoryId of remoteIds) {
      await ensureNoSupabaseRowsByColumn("categories", "id", categoryId, `Kategori ${payload.name || categoryId}`);
    }
    if (localId) await ensureNoSupabaseRowsByColumn("categories", "local_id", localId, `Kategori ${payload.name || localId}`);
    if (payload.name) await ensureNoSupabaseRowsByColumn("categories", "name", payload.name, `Kategori ${payload.name}`);
    if (!deletedCount) throw new Error(`Kategori ${payload.name || localId || "ini"} tidak terhapus dari Supabase.`);
    return;
  }
  if (localId) {
    const { error } = await supabaseClient.from(table).delete().eq("local_id", localId);
    if (error && !isSupabaseForeignKeyError(error)) throw error;
    return;
  }
  if (entity === "category" && payload.name) {
    const { error } = await supabaseClient.from(table).delete().eq("name", payload.name);
    if (error) throw error;
  }
}

async function syncMasterQueueItem(item) {
  if (item.operation !== "delete" && item.userInitiated !== true) {
    return;
  }
  if (item.operation === "delete") {
    await deleteSupabaseMaster(item.entity, item.payload);
    return true;
  }
  if (item.entity === "product" && isDeletedProduct(item.payload) && item.allowDeletedProductUpsert !== true) return false;
  if (item.entity === "category") return await ensureSupabaseCategory(item.payload.name);
  if (item.entity === "addon") return await upsertSupabaseAddon(item.payload);
  if (item.entity === "product") return await upsertSupabaseProduct(item.payload);
  return true;
}

async function syncMasterEntity(entity, payload, operation = "upsert", options = {}) {
  if (!payload) return false;
  if (!canAttemptSupabaseSync()) {
    lastMasterSyncError = new Error(navigator.onLine === false ? "Browser sedang offline." : "Koneksi tulis Supabase belum tersedia.");
    return false;
  }
  try {
    const result = await syncMasterQueueItem({
      type: "master",
      entity,
      payload,
      operation,
      userInitiated: options.userInitiated === true,
      allowDeletedProductUpsert: options.allowDeletedProductUpsert === true
    });
    lastMasterSyncError = null;
    saveState();
    return result === false ? false : (result || true);
  } catch (error) {
    console.error("Supabase master sync failed", entity, error);
    lastMasterSyncError = error;
    return false;
  }
}

function waitForMasterSyncIdle(timeoutMs = 5000) {
  const startedAt = Date.now();
  return new Promise(resolve => {
    const check = () => {
      if (!masterSyncLoading) {
        resolve(true);
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });
}

async function reloadMasterDataForProductSave() {
  await waitForMasterSyncIdle();
  const loaded = await loadMasterDataFromSupabase({ force: true, silent: true, reason: "product-save-confirm" });
  if (loaded) return true;
  if (!masterSyncLoading) return false;
  await waitForMasterSyncIdle();
  return masterSyncLoaded;
}

function syncProductsByIds(productIds) {
  [...new Set(productIds.filter(Boolean))].forEach(productId => {
    const product = state.products.find(item => item.id === productId);
    if (product) syncMasterEntity("product", product, "upsert", { userInitiated: true });
  });
}

async function processSyncQueue(reason = "manual") {
  if (syncQueueProcessing || !canAttemptSupabaseSync() || !(state.syncQueue || []).length) return;
  syncQueueProcessing = true;
  try {
    const now = Date.now();
    const pendingItems = [...state.syncQueue]
      .filter(item => item.type === "order" && (!item.nextAttemptAt || new Date(item.nextAttemptAt).getTime() <= now))
      .slice(0, 10);
    for (const item of pendingItems) {
      const order = state.orders.find(candidate => orderSyncQueueId(candidate) === item.orderId || candidate.number === item.orderNumber);
      if (!order) {
        state.syncQueue = state.syncQueue.filter(candidate => candidate.id !== item.id);
        saveState();
        continue;
      }
      await syncOrderToSupabase(order, { fromQueue: true, silent: true });
    }
    if (reason !== "interval" && !(state.syncQueue || []).length) render();
  } finally {
    syncQueueProcessing = false;
  }
}

async function syncOrderToSupabase(order, options = {}) {
  if (!order) return false;
  if (!canAttemptSupabaseSync()) {
    markOrderSyncPending(order, new Error(navigator.onLine === false ? "Browser offline" : "Supabase belum termuat"));
    saveState();
    return false;
  }
  try {
    await ensureSupabaseProfile();
    const orderPayload = {
      order_number: order.number,
      source: order.source || "Kasir",
      type: order.type || "Dine In",
      customer_name: order.source === "Self Order" ? (order.customer || "") : (order.customer || "Walk-in"),
      service_info: order.serviceInfo || "-",
      note: order.note || "",
      status: order.status || "Pesanan Baru",
      payment_status: order.paymentStatus || "Belum dibayar",
      subtotal: Number(order.subtotal || 0),
      discount: Number(order.discount || 0),
      service_fee: Number(order.serviceFee || 0),
      delivery_fee: Number(order.deliveryFee || 0),
      tax_amount: 0,
      grand_total: orderTotal(order),
      profit_total: orderProfit(order),
      print_receipt: Boolean(order.printReceipt),
      created_at: order.createdAt,
      confirmed_at: order.confirmedAt,
      prepared_at: order.preparedAt,
      ready_at: order.readyAt,
      completed_at: order.completedAt,
      cancelled_at: order.cancelledAt,
      cancel_reason: order.cancelReason || "",
      prepared_items: order.preparedItems || {}
    };
    const { data: orderRows, error: orderError } = await upsertSupabaseOrderPayload(orderPayload);
    if (orderError) throw orderError;
    const supabaseOrderId = orderRows.id;
    order.supabaseId = supabaseOrderId;
    saveState();

    const { data: existingItems, error: existingItemsError } = await supabaseClient
      .from("order_items")
      .select("id")
      .eq("order_id", supabaseOrderId);
    if (existingItemsError) throw existingItemsError;
    const existingItemIds = (existingItems || []).map(item => item.id);
    if (existingItemIds.length) {
      const { error: deleteAddonsError } = await supabaseClient.from("order_item_addons").delete().in("order_item_id", existingItemIds);
      if (deleteAddonsError) throw deleteAddonsError;
    }
    const { error: deleteItemsError } = await supabaseClient.from("order_items").delete().eq("order_id", supabaseOrderId);
    if (deleteItemsError) throw deleteItemsError;

    const itemRows = (order.items || []).map((item, index) => ({
      order_id: supabaseOrderId,
      product_id: null,
      product_name: item.name,
      sku: item.sku || "",
      qty: Number(item.qty || 1),
      price: Number(item.price || 0),
      cost: Number(item.cost || 0),
      discount: itemDiscountAmount(item),
      variant_label: item.variantLabel || item.variant || "",
      variant_data: {
        ...(item.variantData || {}),
        clientLineId: item.lineId || "",
        clientOrderIndex: index,
        orderBatch: orderItemBatch(item),
        orderBatchLabel: item.orderBatchLabel || orderBatchLabel(orderItemBatch(item))
      },
      note: item.note || ""
    }));
    let savedItems = [];
    if (itemRows.length) {
      const { data, error } = await supabaseClient.from("order_items").insert(itemRows).select("id");
      if (error) throw error;
      savedItems = data || [];
    }

    const addonRows = [];
    (order.items || []).forEach((item, index) => {
      const orderItemId = savedItems[index]?.id;
      if (!orderItemId) return;
      (item.addons || []).forEach(addon => {
        addonRows.push({
          order_item_id: orderItemId,
          addon_id: null,
          addon_name: addon.name,
          qty: Number(addon.qty || 1),
          price: Number(addon.price || 0),
          cost: Number(addon.cost || 0)
        });
      });
    });
    if (addonRows.length) {
      const { error } = await supabaseClient.from("order_item_addons").insert(addonRows);
      if (error) {
        const missingCostColumn = error.code === "42703" || String(error.message || "").toLowerCase().includes("cost");
        if (!missingCostColumn) throw error;
        const compatibleRows = addonRows.map(({ cost, ...row }) => row);
        const { error: retryError } = await supabaseClient.from("order_item_addons").insert(compatibleRows);
        if (retryError) throw retryError;
      }
    }

    const { error: paymentDeleteError } = await supabaseClient.from("payments").delete().eq("order_id", supabaseOrderId);
    if (paymentDeleteError) throw paymentDeleteError;
    if (order.paymentStatus === "Lunas") {
      const { error: paymentError } = await supabaseClient.from("payments").insert({
        order_id: supabaseOrderId,
        method: order.paymentMethod || "Tunai",
        amount: orderTotal(order),
        received_amount: Number(order.receivedAmount || 0),
        change_amount: Number(order.changeAmount || 0),
        paid_at: order.paidAt || order.createdAt
      });
      if (paymentError) throw paymentError;
    }
    markOrderSynced(order);
    invalidateReportCaches();
    saveState();
    if (view === "reports") {
      requestActiveReportData(true);
    }
    return true;
  } catch (error) {
    console.error("Supabase order sync failed", error);
    markOrderSyncPending(order, error);
    saveState();
    if (!options.silent && view !== "selforder") toast(`Data lokal tersimpan, sync Supabase masuk antrean: ${error.message}`);
    return false;
  }
}

async function upsertSupabaseOrderPayload(orderPayload) {
  let writePayload = supabaseSupportsPreparedItems
    ? orderPayload
    : (({ prepared_items, ...payload }) => payload)(orderPayload);
  let result = await supabaseClient
    .from("orders")
    .upsert(writePayload, { onConflict: "order_number" })
    .select("id")
    .single();
  const missingCancelReason = result.error
    && (result.error.code === "42703" || String(result.error.message || "").toLowerCase().includes("cancel_reason"));
  if (missingCancelReason) {
    const { cancel_reason, ...payloadWithoutCancelReason } = writePayload;
    writePayload = payloadWithoutCancelReason;
    result = await supabaseClient
      .from("orders")
      .upsert(writePayload, { onConflict: "order_number" })
      .select("id")
      .single();
  }
  const missingPreparedItems = result.error
    && (result.error.code === "42703" || String(result.error.message || "").toLowerCase().includes("prepared_items"));
  if (!missingPreparedItems || !supabaseSupportsPreparedItems) return result;
  supabaseSupportsPreparedItems = false;
  const { prepared_items, cancel_reason, ...compatiblePayload } = orderPayload;
  return supabaseClient
    .from("orders")
    .upsert(compatiblePayload, { onConflict: "order_number" })
    .select("id")
    .single();
}

async function syncLegacySalesToSupabase(imported, fileName) {
  if (!supabaseWritable() || !imported.length) return false;
  try {
    const userId = await ensureSupabaseProfile();
    const { data: importRows, error: importError } = await supabaseClient
      .from("legacy_sales_imports")
      .insert({ file_name: fileName, row_count: imported.length, imported_by: userId })
      .select("id")
      .single();
    if (importError) throw importError;
    const importId = importRows.id;
    const rows = imported.map(row => ({
      import_id: importId,
      legacy_number: row.importKey || legacySaleKey(row),
      created_at: row.createdAt,
      customer_name: row.customer,
      cashier_name: row.cashier,
      order_type: row.type || "Import",
      payment_method: row.paymentMethod || "Cash dan Piutang",
      payment_status: row.paymentStatus || "Lunas",
      subtotal: Number(row.subtotal || 0),
      discount: Number(row.discount || 0),
      total: Number(row.total || 0),
      profit: Number(row.profit || 0),
      raw_data: row.rawData || {}
    }));
    const { error } = await supabaseClient.from("legacy_sales").upsert(rows, { onConflict: "legacy_number" });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Supabase legacy import failed", error);
    toast(`Import lokal berhasil, sync Supabase gagal: ${error.message}`);
    return false;
  }
}

function clearLocalMasterDataForRemoteAuthority(options = {}) {
  if (!supabaseReadable()) return;
  state.products = [];
  state.addons = [];
  state.categories = [];
  normalizeState();
  if (options.save !== false) saveState();
}

function staffSyncPayload() {
  normalizeStaffState();
  return {
    remoteSynced: true,
    members: (state.staff.members || []).map(member => ({
      id: member.id,
      username: member.username || member.name || "",
      name: member.name || member.username || "",
      role: member.role || "kasir",
      pin: String(member.pin || ""),
      active: member.active !== false,
      menuAccess: filteredAccessViews(member.menuAccess)
    })),
    deletedStaffIds: [...new Set(state.staff.deletedStaffIds || [])],
    deletedStaffUsernames: [...new Set(state.staff.deletedStaffUsernames || [])]
  };
}

function applyStaffSyncPayload(staffPayload) {
  if (!staffPayload || typeof staffPayload !== "object") return;
  state.staff ||= {};
  state.staff.remoteSynced = true;
  const remoteIds = new Set(Array.isArray(staffPayload.members) ? staffPayload.members.map(member => member?.id).filter(Boolean) : []);
  const remoteNames = new Set(Array.isArray(staffPayload.members)
    ? staffPayload.members.map(member => String(member?.username || member?.name || "").trim().toLowerCase()).filter(Boolean)
    : []);
  const deletedIds = Array.isArray(staffPayload.deletedStaffIds) ? staffPayload.deletedStaffIds : [];
  const deletedNames = Array.isArray(staffPayload.deletedStaffUsernames) ? staffPayload.deletedStaffUsernames : [];
  state.staff.deletedStaffIds = [...new Set([...(state.staff.deletedStaffIds || []), ...deletedIds])].filter(id => !remoteIds.has(id));
  state.staff.deletedStaffUsernames = [...new Set([...(state.staff.deletedStaffUsernames || []), ...deletedNames].map(value => String(value || "").trim().toLowerCase()).filter(Boolean))].filter(name => !remoteNames.has(name));
  if (Array.isArray(staffPayload.members)) {
    const localById = new Map((state.staff.members || []).map(member => [member.id, member]));
    const merged = staffPayload.members
      .filter(member => member?.id && !state.staff.deletedStaffIds.includes(member.id))
      .map(member => ({
        ...(localById.get(member.id) || {}),
        id: member.id,
        username: String(member.username || member.name || member.id || "").trim(),
        name: String(member.name || member.username || member.id || "Staff").trim(),
        role: ROLE_DEFINITIONS[member.role] ? member.role : "kasir",
        pin: String(member.pin || "0000"),
        active: member.active !== false,
        menuAccess: filteredAccessViews(member.menuAccess)
      }));
    state.staff.members = merged;
  }
  normalizeStaffState();
}

async function loadStaffSyncFromSupabase() {
  if (!supabaseReadable()) return false;
  try {
    const staffPayload = await fetchStaffPayloadFromSupabase();
    if (!staffPayload) return false;
    applyStaffSyncPayload(staffPayload);
    saveState();
    return true;
  } catch (error) {
    console.error("Staff Supabase load failed", error);
    return false;
  }
}

async function fetchStaffPayloadFromSupabase() {
  if (!supabaseReadable()) return null;
  const { data, error } = await supabaseClient
    .from("store_settings")
    .select("self_order_settings,updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const selfOrderSettings = data?.self_order_settings && typeof data.self_order_settings === "object"
    ? data.self_order_settings
    : {};
  return selfOrderSettings.staff || null;
}

function findStaffByLoginInList(members, staffCode) {
  const normalizeLoginKey = value => String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  return (members || []).find(item => {
    const candidates = [item.username, item.id, item.name];
    return candidates.some(value => normalizeLoginKey(value) === staffCode);
  }) || null;
}

async function loginStaffFromSupabase(staffCode, pin) {
  const staffPayload = await fetchStaffPayloadFromSupabase();
  if (!staffPayload || !Array.isArray(staffPayload.members)) return { ok: false, reason: "not-found" };
  const deletedIds = new Set(staffPayload.deletedStaffIds || []);
  const member = findStaffByLoginInList(
    staffPayload.members.filter(item => item?.active !== false && !deletedIds.has(item.id)),
    staffCode
  );
  if (!member || String(member.pin || "") !== pin) return { ok: false, reason: "invalid", member };
  applyStaffSyncPayload(staffPayload);
  normalizeStaffState();
  const localMember = findStaffByLogin(staffCode) || member;
  return { ok: true, member: localMember };
}

function withTimeout(promise, ms = 2500, fallback = false) {
  let timer = null;
  const timeout = new Promise(resolve => {
    timer = window.setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

function findStaffByLogin(staffCode) {
  const normalizeLoginKey = value => String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  return staffMembers().find(item => {
    const candidates = [item.username, item.id, item.name];
    return candidates.some(value => normalizeLoginKey(value) === staffCode);
  });
}

function normalizeStoreSettingsRow(row) {
  if (!row) return null;
  const selfOrderSettings = row.self_order_settings && typeof row.self_order_settings === "object"
    ? row.self_order_settings
    : {};
  return {
    receiptStoreName: row.receipt_store_name || row.store_name || "",
    receiptAddress: row.store_address || "",
    receiptPhone: row.store_phone || "",
    receiptFooter: row.receipt_footer || "",
    receiptWidth: row.receipt_width || state.settings.receiptWidth || "58mm",
    receiptShowTable: row.receipt_show_table !== false,
    receiptShowQr: row.receipt_show_qr === true,
    databaseMode: row.database_mode || state.settings.databaseMode,
    syncEndpoint: row.sync_endpoint || state.settings.syncEndpoint,
    autoBackup: row.auto_backup !== false,
    selfOrderAppName: selfOrderSettings.appName || "",
    selfOrderOutletName: selfOrderSettings.outletName || "",
    selfOrderProfileImageDataUrl: selfOrderSettings.profileImage || "",
    selfOrderPromoImageDataUrl: selfOrderSettings.promoImage || "",
    selfOrderPromoTargetProductId: selfOrderSettings.promoTargetProductId || "",
    selfOrderPromoButtonLabel: selfOrderSettings.promoButtonLabel || "Order Now",
    selfOrderPromoSlides: Array.isArray(selfOrderSettings.promoSlides) ? selfOrderSettings.promoSlides : [],
    staffSync: selfOrderSettings.staff || null,
    masterDeletedProducts: normalizeDeletedProductMarkers(selfOrderSettings.masterDeletedProducts || []),
    masterDeletedCategories: normalizeDeletedNameMarkers(selfOrderSettings.masterDeletedCategories || []),
    masterDeletedAddons: normalizeDeletedAddonMarkers(selfOrderSettings.masterDeletedAddons || [])
  };
}

function storeSettingsPayload() {
  const settings = state.settings || {};
  const selfOrderSlides = readSelfOrderPromoSlidesFromSettings();
  return {
    store_name: settings.receiptStoreName || settings.selfOrderAppName || state.outlet || "Kasirin!",
    store_address: settings.receiptAddress || null,
    store_phone: settings.receiptPhone || null,
    receipt_store_name: settings.receiptStoreName || null,
    receipt_footer: settings.receiptFooter || null,
    receipt_width: settings.receiptWidth || "58mm",
    receipt_show_table: settings.receiptShowTable !== false,
    receipt_show_qr: settings.receiptShowQr === true,
    database_mode: settings.databaseMode || "IndexedDB",
    sync_endpoint: settings.syncEndpoint || null,
    auto_backup: settings.autoBackup !== false,
    self_order_settings: {
      appName: settings.selfOrderAppName || "",
      outletName: settings.selfOrderOutletName || "",
      profileImage: settings.selfOrderProfileImageDataUrl || "",
      promoImage: settings.selfOrderPromoImageDataUrl || "",
      promoTargetProductId: settings.selfOrderPromoTargetProductId || "",
      promoButtonLabel: settings.selfOrderPromoButtonLabel || "Order Now",
      promoSlides: selfOrderSlides,
      staff: staffSyncPayload(),
      masterDeletedProducts: normalizeDeletedProductMarkers(state.deletedProducts || []),
      masterDeletedCategories: normalizeDeletedNameMarkers(state.deletedCategories || []),
      masterDeletedAddons: normalizeDeletedAddonMarkers(state.deletedAddons || [])
    }
  };
}

function isMissingStoreSettingsJsonError(error) {
  const text = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return error?.code === "42703" || text.includes("self_order_settings");
}

async function selectStoreSettingsRow() {
  const fullColumns = "id,store_name,store_address,store_phone,receipt_store_name,receipt_footer,receipt_width,receipt_show_table,receipt_show_qr,database_mode,sync_endpoint,auto_backup,self_order_settings,updated_at";
  let result = await supabaseClient.from("store_settings").select(fullColumns).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error && isMissingStoreSettingsJsonError(result.error)) {
    storeSettingsJsonUnavailable = true;
    result = await supabaseClient
      .from("store_settings")
      .select("id,store_name,store_address,store_phone,receipt_store_name,receipt_footer,receipt_width,receipt_show_table,receipt_show_qr,database_mode,sync_endpoint,auto_backup,updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
  }
  if (result.error) throw result.error;
  return result.data || null;
}

async function loadStoreSettingsFromSupabase(options = {}) {
  if (!supabaseReadable() || storeSettingsLoading || !localDbReady) return;
  const freshEnough = Date.now() - storeSettingsLoadedAt < 60000;
  if (!options.force && freshEnough) return;
  storeSettingsLoading = true;
  try {
    const row = await selectStoreSettingsRow();
    const settings = normalizeStoreSettingsRow(row);
    if (settings) {
      const { staffSync, masterDeletedProducts, masterDeletedCategories, masterDeletedAddons, ...storeSettings } = settings;
      state.settings = { ...state.settings, ...storeSettings };
      mergeDeletedProductMarkers(masterDeletedProducts);
      mergeDeletedCategoryMarkers(masterDeletedCategories);
      mergeDeletedAddonMarkers(masterDeletedAddons);
      applyStaffSyncPayload(staffSync);
      normalizeState();
      saveState();
    } else if (supabaseWritable()) {
      await syncStoreSettingsToSupabase({ silent: true });
    }
    storeSettingsLoadedAt = Date.now();
    if (shouldRenderAfterRealtimeLoad("settings")) render();
  } catch (error) {
    console.error("Supabase settings load failed", error);
    if (!options.silent && !["interval", "realtime"].includes(options.reason)) toast(`Gagal memuat settings Supabase: ${error.message}`);
  } finally {
    storeSettingsLoading = false;
  }
}

async function syncStoreSettingsToSupabase(options = {}) {
  if (!supabaseWritable()) return false;
  try {
    const existing = await selectStoreSettingsRow();
    const payload = storeSettingsPayload();
    if (storeSettingsJsonUnavailable && options.requireJson) {
      const message = "Kolom self_order_settings belum ada di Supabase. Jalankan docs/self_order_settings_sync.sql agar staff tersimpan online.";
      console.warn(message);
      if (!options.silent) toast(message);
      return false;
    }
    const writePayload = storeSettingsJsonUnavailable
      ? Object.fromEntries(Object.entries(payload).filter(([key]) => key !== "self_order_settings"))
      : payload;
    const { error } = existing?.id
      ? await supabaseClient.from("store_settings").update(writePayload).eq("id", existing.id)
      : await supabaseClient.from("store_settings").insert(writePayload);
    if (error) throw error;
    storeSettingsLoadedAt = Date.now();
    broadcastRealtimeEvent("settings");
    return true;
  } catch (error) {
    console.error("Supabase settings sync failed", error);
    if (!options.silent) toast(`Setting lokal tersimpan, sync Supabase gagal: ${error.message}`);
    return false;
  }
}

async function loadDeletedProductsLedgerFromSupabase() {
  if (!supabaseReadable() || storeSettingsJsonUnavailable) return false;
  try {
    const row = await selectStoreSettingsRow();
    const settings = normalizeStoreSettingsRow(row);
    mergeDeletedProductMarkers(settings?.masterDeletedProducts || []);
    mergeDeletedCategoryMarkers(settings?.masterDeletedCategories || []);
    mergeDeletedAddonMarkers(settings?.masterDeletedAddons || []);
    return true;
  } catch (error) {
    console.warn("Deleted product ledger load failed", error);
    return false;
  }
}

async function loadMasterDataFromSupabase(options = {}) {
  if (!supabaseReadable() || masterSyncLoading || !localDbReady) return;
  const freshEnough = Date.now() - masterSyncLoadedAt < 60000;
  if (!options.force && masterSyncLoaded && freshEnough) return;
  masterSyncLoading = true;
  try {
    await loadDeletedProductsLedgerFromSupabase();
    const addonColumns = supabaseAddonSoldOutColumnReady
      ? "id,local_id,name,price,cost,active,sold_out,sort_order"
      : "id,local_id,name,price,cost,active,sort_order";
    const [categoryResult, addonResult, productResult, productAddonResult] = await Promise.all([
      supabaseClient.from("categories").select("id,local_id,name,active,sort_order").order("name", { ascending: true }),
      supabaseClient.from("addons").select(addonColumns).order("name", { ascending: true }),
      supabaseClient.from("products").select("*, categories(id,name,local_id)").order("name", { ascending: true }),
      supabaseClient.from("product_addons").select("product_id,addon_id")
    ]);
    if (categoryResult.error) throw categoryResult.error;
    if (addonResult.error && isMissingAddonSoldOutColumnError(addonResult.error)) {
      supabaseAddonSoldOutColumnReady = false;
      const retry = await supabaseClient.from("addons").select("id,local_id,name,price,cost,active,sort_order").order("name", { ascending: true });
      addonResult.data = retry.data || [];
      addonResult.error = retry.error;
    }
    if (addonResult.error) throw addonResult.error;
    if (productResult.error) throw productResult.error;
    if (productAddonResult.error) throw productAddonResult.error;

    const serverCategories = (categoryResult.data || [])
      .map(row => ({ id: row.id, local_id: row.local_id, name: normalizeSupabaseCategory(row) }))
      .filter(category => category.name)
      .filter(category => !isDeletedCategoryName(category.name))
      .map(category => category.name);
    const serverAddons = (addonResult.data || [])
      .map(normalizeSupabaseAddon)
      .filter(addon => addon.name)
      .filter(addon => !isDeletedAddon(addon));
    const addonLocalBySupabaseId = new Map(serverAddons.map(addon => [addon.supabaseId, addon.id]));
    const productAddonMap = new Map();
    for (const row of productAddonResult.data || []) {
      const localAddonId = addonLocalBySupabaseId.get(row.addon_id);
      if (!localAddonId) continue;
      const list = productAddonMap.get(row.product_id) || [];
      list.push(localAddonId);
      productAddonMap.set(row.product_id, list);
    }
    const serverProducts = (productResult.data || [])
      .filter(row => row.active !== false)
      .map(row => {
        const product = normalizeSupabaseProduct(row, row.categories?.name || "");
        delete product.stockOpnameSchemaReady;
        const relationalAddons = productAddonMap.get(row.id);
        if (relationalAddons?.length) product.allowedAddonIds = relationalAddons;
        return product;
      })
      .filter(product => !isDeletedProduct(product))
      .filter(product => product.name);

    state.categories = [...new Set(serverCategories)];
    state.addons = uniqueAddons(serverAddons);
    state.products = serverProducts;
    normalizeState();
    saveState();

    masterSyncLoaded = true;
    masterSyncLoadedAt = Date.now();
    if (shouldRenderAfterRealtimeLoad("master")) render();
    return true;
  } catch (error) {
    console.error("Supabase master load failed", error);
    if (!options.silent && !["interval", "realtime"].includes(options.reason)) toast(`Gagal memuat master Supabase: ${error.message}`);
    return false;
  } finally {
    masterSyncLoading = false;
  }
}

async function loadRecentOrdersFromSupabase(options = {}) {
  if (!supabaseReadable() || realtimeOrdersLoading || !localDbReady) return;
  const freshEnough = Date.now() - realtimeOrdersLoadedAt < 15000;
  if (!options.force && freshEnough) return;
  realtimeOrdersLoading = true;
  try {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString();
    const { data: orderRows, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(300);
    if (orderError) throw orderError;
    const orderIds = (orderRows || []).map(order => order.id).filter(Boolean);
    let itemRows = [];
    let addonRows = [];
    let paymentRows = [];
    if (orderIds.length) {
      const [itemsResult, paymentsResult] = await Promise.all([
        supabaseClient.from("order_items").select("*").in("order_id", orderIds).order("id", { ascending: true }),
        supabaseClient.from("payments").select("*").in("order_id", orderIds).order("paid_at", { ascending: false })
      ]);
      if (itemsResult.error) throw itemsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      itemRows = itemsResult.data || [];
      paymentRows = paymentsResult.data || [];
      const itemIds = itemRows.map(item => item.id).filter(Boolean);
      if (itemIds.length) {
        const { data, error } = await supabaseClient.from("order_item_addons").select("*").in("order_item_id", itemIds);
        if (error) throw error;
        addonRows = data || [];
      }
    }

    const addonsByItemId = addonRows.reduce((map, addon) => {
      const list = map.get(addon.order_item_id) || [];
      list.push({
        id: addon.addon_id || addon.addon_name,
        name: addon.addon_name || "Tambahan",
        qty: Number(addon.qty || 1),
        price: Number(addon.price || 0),
        cost: Number(addon.cost || 0)
      });
      map.set(addon.order_item_id, list);
      return map;
    }, new Map());
    const itemsByOrderId = itemRows.reduce((map, item) => {
      const list = map.get(item.order_id) || [];
      list.push(item);
      map.set(item.order_id, list);
      return map;
    }, new Map());
    const paymentsByOrderId = paymentRows.reduce((map, payment) => {
      if (!map.has(payment.order_id)) map.set(payment.order_id, payment);
      return map;
    }, new Map());
    const serverOrders = (orderRows || []).map(row => normalizeSupabaseLiveOrder(
      row,
      itemsByOrderId.get(row.id) || [],
      addonsByItemId,
      paymentsByOrderId.get(row.id)
    ));
    mergeSupabaseLiveOrders(serverOrders);
    realtimeOrdersLoadedAt = Date.now();
    if (shouldRenderAfterRealtimeLoad("orders")) render();
  } catch (error) {
    console.error("Supabase live order load failed", error);
    if (!options.silent && options.reason !== "realtime") toast(`Gagal memuat order realtime: ${error.message}`);
  } finally {
    realtimeOrdersLoading = false;
  }
}

function mergePreparedItems(remotePrepared = {}, localPrepared = {}) {
  const merged = { ...(remotePrepared || {}) };
  Object.entries(localPrepared || {}).forEach(([key, value]) => {
    merged[key] = value;
  });
  return merged;
}

function normalizeSupabaseLiveOrder(orderRow, itemRows = [], addonsByItemId = new Map(), payment = null) {
  const existing = state.orders.find(order => order.number === orderRow.order_number);
  const sortedItemRows = [...itemRows].sort((a, b) => {
    const dataA = a.variant_data || {};
    const dataB = b.variant_data || {};
    const indexA = Number.isFinite(Number(dataA.clientOrderIndex)) ? Number(dataA.clientOrderIndex) : Number.MAX_SAFE_INTEGER;
    const indexB = Number.isFinite(Number(dataB.clientOrderIndex)) ? Number(dataB.clientOrderIndex) : Number.MAX_SAFE_INTEGER;
    if (indexA !== indexB) return indexA - indexB;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
  const items = sortedItemRows.map((item, index) => {
    const variantData = item.variant_data || {};
    const matchedProduct = state.products.find(product => {
      const sameSku = item.sku && product.sku === item.sku;
      const sameName = product.name === item.product_name;
      return sameSku || sameName;
    });
    return {
      lineId: variantData.clientLineId || `${orderRow.id}-${item.id || index}`,
      productId: matchedProduct?.id || item.sku || item.product_name || "",
      name: item.product_name || matchedProduct?.name || "Item",
      sku: item.sku || matchedProduct?.sku || "",
      qty: Number(item.qty || 1),
      price: Number(item.price || 0),
      cost: Number(item.cost || 0),
      discount: Number(item.discount || 0),
      discountType: "rp",
      variant: item.variant_label || "",
      variantLabel: item.variant_label || "",
      variantData,
      note: item.note || "",
      addons: addonsByItemId.get(item.id) || []
    };
  });
  return {
    ...(existing || {}),
    id: existing?.id || `remote_${orderRow.id}`,
    supabaseId: orderRow.id,
    number: orderRow.order_number,
    source: orderRow.source || "Kasirin!",
    type: orderRow.type || "Dine In",
    customer: orderRow.source === "Self Order" ? (orderRow.customer_name || "") : (orderRow.customer_name || "Walk-in"),
    serviceInfo: orderRow.service_info || "-",
    note: orderRow.note || "",
    status: orderRow.status || "Pesanan Baru",
    paymentStatus: orderRow.payment_status || "Belum dibayar",
    paymentMethod: payment?.method || existing?.paymentMethod || "Belum dipilih",
    receivedAmount: Number(payment?.received_amount || existing?.receivedAmount || 0),
    changeAmount: Number(payment?.change_amount || existing?.changeAmount || 0),
    printReceipt: Boolean(orderRow.print_receipt),
    items,
    preparedItems: mergePreparedItems(orderRow.prepared_items, existing?.preparedItems),
    subtotal: Number(orderRow.subtotal || 0),
    discount: Number(orderRow.discount || 0),
    tax: Number(orderRow.tax_amount || 0),
    serviceFee: Number(orderRow.service_fee || 0),
    deliveryFee: Number(orderRow.delivery_fee || 0),
    grandTotal: Number(orderRow.grand_total || 0),
    createdAt: orderRow.created_at || new Date().toISOString(),
    confirmedAt: orderRow.confirmed_at,
    preparedAt: orderRow.prepared_at,
    readyAt: orderRow.ready_at,
    completedAt: orderRow.completed_at,
    cancelledAt: orderRow.cancelled_at,
    cancelReason: orderRow.cancel_reason || existing?.cancelReason || "",
    syncStatus: "synced",
    syncError: ""
  };
}

function mergeSupabaseLiveOrders(serverOrders = []) {
  if (!serverOrders.length) return;
  const serverNumbers = new Set(serverOrders.map(order => order.number).filter(Boolean));
  const merged = [
    ...serverOrders,
    ...state.orders.filter(order => !serverNumbers.has(order.number))
  ];
  state.orders = merged
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 300);
  normalizeState();
  saveState();
}

function normalizeSupabaseReportRecord(row) {
  return {
    id: row.id,
    number: row.number || row.importKey || "-",
    createdAt: row.created_at,
    source: row.source || (row.imported ? "Import Kasir Lama" : "Kasirin!"),
    imported: Boolean(row.imported),
    type: row.order_type || "Import",
    customer: row.customer_name || "-",
    paymentMethod: row.payment_method || "Belum dipilih",
    paymentStatus: row.payment_status || "Lunas",
    status: row.order_status || row.status || "",
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    total: Number(row.total || 0),
    profit: Number(row.profit || 0),
    items: []
  };
}

function normalizeLegacySalesRow(row) {
  return {
    id: row.id,
    number: row.legacy_number || row.number || "-",
    createdAt: row.created_at,
    source: "Import Kasir Lama",
    imported: true,
    type: row.order_type || "Import",
    customer: row.customer_name || "-",
    paymentMethod: row.payment_method || "Cash dan Piutang",
    paymentStatus: row.payment_status || "Lunas",
    status: "Selesai",
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    total: Number(row.total || 0),
    profit: Number(row.profit || 0),
    items: []
  };
}

async function loadSupabaseOrderDetailForReport(record) {
  if (!record || record.imported || !supabaseReadable()) return record;
  const key = reportRecordKey(record);
  if (supabaseReportDetailCache.has(key)) return supabaseReportDetailCache.get(key);
  const number = String(record.number || "").trim();
  if (!number || number === "-") return record;

  try {
    const { data: orderRow, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("order_number", number)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!orderRow?.id) {
      supabaseReportDetailCache.set(key, record);
      return record;
    }

    const [{ data: itemRows, error: itemError }, { data: paymentRows, error: paymentError }] = await Promise.all([
      supabaseClient.from("order_items").select("*").eq("order_id", orderRow.id).order("id", { ascending: true }),
      supabaseClient.from("payments").select("*").eq("order_id", orderRow.id).order("paid_at", { ascending: false }).limit(1)
    ]);
    if (itemError) throw itemError;
    if (paymentError) throw paymentError;

    const itemIds = (itemRows || []).map(item => item.id).filter(Boolean);
    let addonRows = [];
    if (itemIds.length) {
      const { data, error } = await supabaseClient
        .from("order_item_addons")
        .select("*")
        .in("order_item_id", itemIds);
      if (error) throw error;
      addonRows = data || [];
    }

    const addonsByItemId = new Map();
    for (const addon of addonRows) {
      const list = addonsByItemId.get(addon.order_item_id) || [];
      list.push({
        name: addon.addon_name || addon.name || "Add-on",
        qty: Number(addon.qty || 1),
        price: Number(addon.price || 0),
        cost: Number(addon.cost || 0)
      });
      addonsByItemId.set(addon.order_item_id, list);
    }

    const items = (itemRows || []).map(item => ({
      id: item.id,
      productId: item.product_id || null,
      name: item.product_name || item.name || "Item",
      sku: item.sku || "",
      qty: Number(item.qty || 1),
      price: Number(item.price || 0),
      cost: Number(item.cost || 0),
      discount: Number(item.discount || 0),
      discountType: "rp",
      variant: item.variant_label || "",
      variantLabel: item.variant_label || "",
      variantData: item.variant_data || {},
      note: item.note || "",
      addons: addonsByItemId.get(item.id) || []
    }));

    const payment = (paymentRows || [])[0] || {};
    const detailedRecord = {
      ...record,
      id: orderRow.id || record.id,
      number: orderRow.order_number || record.number,
      createdAt: orderRow.created_at || record.createdAt,
      source: orderRow.source || record.source || "Kasirin!",
      imported: false,
      type: orderRow.type || record.type,
      customer: orderRow.customer_name || record.customer,
      serviceInfo: orderRow.service_info || record.serviceInfo,
      paymentMethod: payment.method || record.paymentMethod,
      paymentStatus: orderRow.payment_status || record.paymentStatus,
      subtotal: Number(orderRow.subtotal ?? record.subtotal ?? 0),
      discount: Number(orderRow.discount ?? record.discount ?? 0),
      total: Number(orderRow.grand_total ?? record.total ?? 0),
      profit: Number(orderRow.profit_total ?? record.profit ?? 0),
      receivedAmount: Number(payment.received_amount || 0),
      changeAmount: Number(payment.change_amount || 0),
      items
    };

    supabaseReportDetailCache.set(key, detailedRecord);
    supabaseReportRecords = supabaseReportRecords.map(item => reportRecordKey(item) === key ? detailedRecord : item);
    return detailedRecord;
  } catch (error) {
    console.error("Supabase order detail load failed", error);
    toast(`Gagal memuat rincian item: ${error.message}`);
    supabaseReportDetailCache.set(key, record);
    return record;
  }
}

function normalizeSupabaseLegacySale(row) {
  return {
    id: row.id,
    number: row.legacy_number || "-",
    createdAt: row.created_at,
    source: "Import Kasir Lama",
    type: row.order_type || "Import",
    customer: row.customer_name || "-",
    paymentMethod: row.payment_method || "Cash dan Piutang",
    paymentStatus: row.payment_status || "Lunas",
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    total: Number(row.total || 0),
    profit: Number(row.profit || 0),
    items: []
  };
}

function reportLoadKey(range) {
  return `${range.period}:${range.start.toISOString()}:${range.end.toISOString()}`;
}

function isSupabaseReportViewIssue(error, viewName) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  const status = Number(error?.status || 0);
  const view = String(viewName || "").toLowerCase();
  return error?.code === "PGRST205"
    || status === 400
    || status === 404
    || message.includes(view)
    || message.includes("schema cache")
    || message.includes("could not find");
}

async function loadSupabaseLegacyReportRecords(force = false, range = reportRange()) {
  if (!supabaseReadable() || supabaseLegacyReportsLoading) return;
  const loadKey = reportLoadKey(range);
  const freshEnough = Date.now() - supabaseLegacyReportsLoadedAt < 60000;
  if (!force && supabaseLegacyReportLoadKey === loadKey && freshEnough) return;
  supabaseLegacyReportsLoading = true;
  try {
    const allRows = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const to = from + pageSize - 1;
      const { data, error } = await supabaseClient
        .from("legacy_sales")
        .select("id,legacy_number,created_at,customer_name,order_type,payment_method,payment_status,subtotal,discount,total,profit")
        .gte("created_at", range.start.toISOString())
        .lte("created_at", range.end.toISOString())
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      allRows.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    const merged = new Map(supabaseReportRecords.map(record => [reportRecordKey(record), record]));
    for (const row of allRows.map(normalizeLegacySalesRow)) merged.set(reportRecordKey(row), row);
    supabaseReportRecords = [...merged.values()];
    supabaseLegacyReportsLoadedAt = Date.now();
    supabaseLegacyReportLoadKey = loadKey;
    if (view === "reports") render();
  } catch (error) {
    console.error("Supabase legacy report fallback failed", error);
    supabaseLegacyReportsLoadedAt = Date.now();
    supabaseLegacyReportLoadKey = loadKey;
  } finally {
    supabaseLegacyReportsLoading = false;
    if (view === "reports") render();
  }
}

async function loadSupabaseReportRecords(force = false, range = reportRange()) {
  if (!supabaseReadable() || supabaseReportsLoading) return;
  if (supabaseReportRecordsUnavailable) {
    await loadRecentOrdersFromSupabase({ force, silent: true, reason: "reports-fallback" });
    await loadSupabaseLegacyReportRecords(force, range);
    return;
  }
  const loadKey = reportLoadKey(range);
  const freshEnough = Date.now() - supabaseReportsLoadedAt < 60000;
  if (!force && supabaseReportLoadKey === loadKey && freshEnough) return;
  supabaseReportsLoading = true;
  try {
    const allRows = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const to = from + pageSize - 1;
      const { data, error } = await supabaseClient
        .from("report_sales_records")
        .select("*")
        .gte("created_at", range.start.toISOString())
        .lte("created_at", range.end.toISOString())
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      allRows.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    const merged = new Map();
    for (const row of allRows.map(normalizeSupabaseReportRecord)) merged.set(reportRecordKey(row), row);
    supabaseReportRecords = [...merged.values()];
    supabaseReportsLoadedAt = Date.now();
    supabaseReportLoadKey = loadKey;
    if (view === "reports") render();
  } catch (error) {
    const missingReportRecords = isSupabaseReportViewIssue(error, "report_sales_records");
    if (missingReportRecords) {
      supabaseReportRecordsUnavailable = true;
      supabaseReportsLoadedAt = Date.now();
      supabaseReportLoadKey = loadKey;
      console.warn("Supabase report records skipped: view report_sales_records belum tersedia.");
      await loadRecentOrdersFromSupabase({ force: true, silent: true, reason: "reports-fallback" });
      await loadSupabaseLegacyReportRecords(true, range);
    } else {
      console.error("Supabase report load failed", error);
      supabaseReportsLoadedAt = Date.now();
      supabaseReportLoadKey = loadKey;
    }
  } finally {
    supabaseReportsLoading = false;
    if (view === "reports") render();
  }
}

function normalizeProfitSummaryRow(row) {
  const total = row.total ?? row.revenue ?? 0;
  const salesDate = row.sales_date ?? row.date ?? "";
  return {
    year: Number(row.year || 0),
    month: row.month == null ? null : Number(row.month),
    day: row.day == null ? null : Number(row.day),
    salesDate,
    count: Number(row.transaction_count || 0),
    total: Number(total || 0),
    profit: Number(row.profit || 0),
    estimatedCost: Number(row.estimated_cost ?? Math.max(0, Number(total || 0) - Number(row.profit || 0)))
  };
}

function legacyProfitSummaryCacheKey(level, year = null, month = null) {
  return [level, year || "", month || ""].join(":");
}

function legacyProfitSummaryRange(level, year = null, month = null) {
  const now = new Date();
  const activeYear = Number(year || now.getFullYear());
  const activeMonth = Number(month || (now.getMonth() + 1));
  if (level === "months") {
    return { start: new Date(activeYear, 0, 1, 0, 0, 0, 0), end: new Date(activeYear, 11, 31, 23, 59, 59, 999) };
  }
  if (level === "days") {
    return { start: new Date(activeYear, activeMonth - 1, 1, 0, 0, 0, 0), end: new Date(activeYear, activeMonth, 0, 23, 59, 59, 999) };
  }
  return { start: new Date(2000, 0, 1, 0, 0, 0, 0), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) };
}

function applyLegacyProfitSummaryRows(level, year, month, rows) {
  const buckets = new Map();
  for (const row of rows || []) {
    const date = new Date(row.created_at);
    if (Number.isNaN(date.getTime())) continue;
    const rowYear = date.getFullYear();
    const rowMonth = date.getMonth() + 1;
    const key = level === "years"
      ? String(rowYear)
      : level === "months"
        ? String(rowMonth)
        : todayKey(date);
    const summary = buckets.get(key) || {
      year: rowYear,
      month: rowMonth,
      day: date.getDate(),
      salesDate: todayKey(date),
      count: 0,
      total: 0,
      profit: 0,
      estimatedCost: 0
    };
    const total = Number(row.total || 0);
    const profit = Number(row.profit || 0);
    summary.count += 1;
    summary.total += total;
    summary.profit += profit;
    summary.estimatedCost += Math.max(0, total - profit);
    buckets.set(key, summary);
  }
  const sorted = [...buckets.values()].sort((a, b) => {
    if (level === "years") return b.year - a.year;
    if (level === "months") return b.month - a.month;
    return b.day - a.day;
  });
  if (level === "months") profitSummaryCache.months[year] = sorted;
  else if (level === "days") profitSummaryCache.days[`${year}-${month}`] = sorted;
  else profitSummaryCache.years = sorted;
}

async function loadSupabaseLegacyProfitSummary(level = "years", year = null, month = null, force = false) {
  if (!supabaseReadable() || legacyProfitSummaryLoading) return;
  const cacheKey = legacyProfitSummaryCacheKey(level, year, month);
  const freshEnough = Date.now() - Number(legacyProfitSummaryLoadedAt.get(cacheKey) || 0) < 60000;
  if (!force && freshEnough) return;
  legacyProfitSummaryLoading = true;
  try {
    const range = legacyProfitSummaryRange(level, year, month);
    const allRows = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const to = from + pageSize - 1;
      const { data, error } = await supabaseClient
        .from("legacy_sales")
        .select("created_at,total,profit")
        .gte("created_at", range.start.toISOString())
        .lte("created_at", range.end.toISOString())
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      allRows.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    applyLegacyProfitSummaryRows(level, year, month, allRows);
    legacyProfitSummaryLoadedAt.set(cacheKey, Date.now());
    if (view === "reports" && (sessionStorage.getItem("report_section") || "profit") === "profit") render();
  } catch (error) {
    console.error("Legacy profit summary fallback failed", error);
    legacyProfitSummaryLoadedAt.set(cacheKey, Date.now());
  } finally {
    legacyProfitSummaryLoading = false;
    if (view === "reports" && (sessionStorage.getItem("report_section") || "profit") === "profit") render();
  }
}

async function loadProfitSummary(level = "years", year = null, month = null, force = false) {
  if (!supabaseReadable() || profitSummaryLoading) return;
  if (profitSummaryUnavailable) {
    await loadSupabaseLegacyProfitSummary(level, year, month, force);
    return;
  }
  const dayKey = `${year}-${month}`;
  const cacheKey = legacyProfitSummaryCacheKey(level, year, month);
  const freshEnough = Date.now() - Number(profitSummaryLoadedAt.get(cacheKey) || 0) < 60000;
  if (!force && freshEnough) return;
  profitSummaryLoading = true;
  try {
    let query;
    if (level === "months") {
      query = supabaseClient.from("report_profit_monthly").select("*").eq("year", year).order("month", { ascending: false });
    } else if (level === "days") {
      query = supabaseClient.from("report_profit_daily").select("*").eq("year", year).eq("month", month).order("day", { ascending: false });
    } else {
      query = supabaseClient.from("report_profit_yearly").select("*").order("year", { ascending: false });
    }
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []).map(normalizeProfitSummaryRow);
    if (level === "months") profitSummaryCache.months[year] = rows;
    else if (level === "days") profitSummaryCache.days[dayKey] = rows;
    else profitSummaryCache.years = rows;
    profitSummaryLoadedAt.set(cacheKey, Date.now());
    if (view === "reports" && (sessionStorage.getItem("report_section") || "profit") === "profit") render();
  } catch (error) {
    const missingReportView = isSupabaseReportViewIssue(error, "report_profit");
    if (missingReportView) {
      profitSummaryUnavailable = true;
      profitSummaryLoadedAt.set(cacheKey, Date.now());
      console.warn("Profit summary skipped: Supabase report_profit views belum tersedia.");
      await loadSupabaseLegacyProfitSummary(level, year, month, true);
    } else {
      console.error("Profit summary load failed", error);
      profitSummaryLoadedAt.set(cacheKey, Date.now());
    }
  } finally {
    profitSummaryLoading = false;
    if (view === "reports") render();
  }
}

function reportDataLoading() {
  const section = sessionStorage.getItem("report_section") || "profit";
  if (section === "profit") return Boolean(profitSummaryLoading || legacyProfitSummaryLoading);
  return Boolean(supabaseReportsLoading || supabaseLegacyReportsLoading);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => el.classList.remove("show"), 2400);
}

function audit(action, detail) {
  state.audit.unshift({ id: uid(), at: new Date().toISOString(), user: state.activeUser, action, detail });
  saveState();
}

function orderNumber() {
  const count = state.orders.filter(order => order.createdAt.slice(0, 10) === todayKey()).length + 1;
  const entropy = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `ORD-${todayKey().replaceAll("-", "")}-${String(count).padStart(3, "0")}${entropy}`;
}

function displayOrderNumber(number) {
  const text = String(number || "-").trim();
  if (!text || text === "-") return "-";
  if (text.startsWith("#")) return text;
  const orderMatch = text.match(/(?:ORD-)?\d{8}-([A-Z0-9]+)$/i);
  if (orderMatch) return `#${orderMatch[1]}`;
  const lastDash = text.split("-").filter(Boolean).at(-1);
  return lastDash && lastDash.length <= 6 ? `#${lastDash}` : text;
}

function statusPill(status) {
  const cls = status === "Pesanan Baru" ? "new" :
    status === "Dikonfirmasi" || status === "Sedang Disiapkan" ? "process" :
    status === "Siap Diambil" ? "ready" :
    status === "Selesai" ? "done" :
    status === "Dibatalkan" ? "cancel" : "";
  const label = status === "Sedang Disiapkan" ? "Diproses" : status;
  return `<span class="pill ${cls}">${escapeHtml(label)}</span>`;
}

function navIcon(id) {
  const paths = {
    dashboard: `<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect>`,
    pos: `<path d="M4 7h16"></path><path d="M7 3h10"></path><path d="M6 7l1.2 14h9.6L18 7"></path><path d="M9 11h6"></path><path d="M9 15h6"></path>`,
    kitchen: `<path d="M6 3v8"></path><path d="M10 3v8"></path><path d="M6 7h4"></path><path d="M8 11v10"></path><path d="M16 3v18"></path><path d="M14 3c4 2 4 7 0 9"></path>`,
    orders: `<path d="M7 4h10"></path><path d="M7 9h10"></path><path d="M7 14h7"></path><path d="M5 20h14a2 2 0 0 0 2-2V6"></path><path d="M3 6v12a2 2 0 0 0 2 2"></path>`,
    products: `<path d="M4 7l8-4 8 4-8 4-8-4z"></path><path d="M4 7v10l8 4 8-4V7"></path><path d="M12 11v10"></path>`,
    stock: `<path d="M4 5h16v14H4z"></path><path d="M4 10h16"></path><path d="M9 5v14"></path><path d="M15 5v14"></path>`,
    "stock-opname": `<path d="M5 5h14v14H5z"></path><path d="M9 9h6"></path><path d="M9 13h3"></path><path d="M15 13l1.5 1.5L20 11"></path>`,
    reports: `<path d="M4 19V5"></path><path d="M8 19v-7"></path><path d="M12 19V8"></path><path d="M16 19v-4"></path><path d="M20 19V3"></path>`,
    cash: `<rect x="3" y="6" width="18" height="12" rx="2"></rect><circle cx="12" cy="12" r="3"></circle><path d="M6 9h.01"></path><path d="M18 15h.01"></path>`,
    audit: `<path d="M9 11l2 2 4-5"></path><path d="M20 12a8 8 0 1 1-3-6.2"></path><path d="M20 4v6h-6"></path>`,
    menu: `<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>`,
    back: `<path d="M19 12H5"></path><path d="M12 5l-7 7 7 7"></path>`,
    cancel: `<path d="M6 6l12 12"></path><path d="M18 6L6 18"></path>`,
    save: `<path d="M5 5h12l2 2v12H5z"></path><path d="M8 5v6h8V5"></path><path d="M8 19v-5h8v5"></path>`,
    counter: `<circle cx="12" cy="12" r="8"></circle><path d="M12 8v8"></path><path d="M9 12h6"></path>`,
    search: `<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4.2-4.2"></path>`,
    settings: `<path d="M4 7h10"></path><path d="M18 7h2"></path><path d="M4 17h2"></path><path d="M10 17h10"></path><circle cx="16" cy="7" r="2"></circle><circle cx="8" cy="17" r="2"></circle>`,
    selforder: `<path d="M6 8h12"></path><path d="M8 8v10a4 4 0 0 0 8 0V8"></path><path d="M18 10h1a3 3 0 0 1 0 6h-1"></path><path d="M5 22h14"></path>`,
    cart: `<circle cx="9" cy="20" r="1.5"></circle><circle cx="17" cy="20" r="1.5"></circle><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H6"></path>`,
    payment: `<rect x="3" y="6" width="18" height="12" rx="2"></rect><path d="M3 10h18"></path><path d="M7 15h3"></path><path d="M15 15h2"></path>`,
    coffee: `<path d="M6 8h10v6a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V8z"></path><path d="M16 10h1a3 3 0 0 1 0 6h-1"></path><path d="M8 4c0 1 .8 1 .8 2"></path><path d="M12 4c0 1 .8 1 .8 2"></path><path d="M5 20h13"></path>`,
    food: `<path d="M4 12h16"></path><path d="M6 12a6 6 0 0 1 12 0"></path><path d="M7 8h10"></path><path d="M6 15h12l-1 4H7z"></path>`,
    drink: `<path d="M7 4h10l-1.2 16H8.2z"></path><path d="M9 8h6"></path><path d="M10 4l1-2h4"></path>`,
    rice: `<path d="M4 12h16"></path><path d="M6 12a6 6 0 0 0 12 0"></path><path d="M7 12c.5 5 9.5 5 10 0"></path><path d="M9 8l6-4"></path><path d="M11 9l6-4"></path>`,
    sync: `<path d="M20 6v5h-5"></path><path d="M4 18v-5h5"></path><path d="M19 11a7 7 0 0 0-12-4l-3 3"></path><path d="M5 13a7 7 0 0 0 12 4l3-3"></path>`
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[id] || paths.dashboard}</svg>`;
}

async function refreshProfitReportData() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDateKey = todayKey(now);
  const level = sessionStorage.getItem("profit_report_level") || "today";

  await loadProfitSummary("years", null, null, true);
  if (["currentYear", "months"].includes(level)) {
    const year = level === "months" ? Number(sessionStorage.getItem("profit_report_year") || currentYear) : currentYear;
    await loadProfitSummary("months", year, null, true);
  }
  if (["currentMonth", "days", "dateRecords", "today"].includes(level)) {
    const year = ["days", "dateRecords"].includes(level)
      ? Number(sessionStorage.getItem("profit_report_year") || currentYear)
      : currentYear;
    const month = ["days", "dateRecords"].includes(level)
      ? Number(sessionStorage.getItem("profit_report_month") || currentMonth)
      : currentMonth;
    await loadProfitSummary("days", year, month, true);
  }
  if (["today", "dateRecords"].includes(level)) {
    await loadSupabaseReportRecords(true, currentProfitDetailRange() || {
      period: "day",
      start: startOfLocalDay(currentDateKey),
      end: endOfLocalDay(currentDateKey),
      label: currentDateKey,
      group: "hour"
    });
  }
}

function currentProfitDetailRange() {
  const level = sessionStorage.getItem("profit_report_level") || "today";
  if (!["today", "dateRecords"].includes(level)) return null;
  const dateKey = level === "dateRecords"
    ? (sessionStorage.getItem("profit_report_date") || todayKey())
    : todayKey();
  return {
    period: "day",
    start: startOfLocalDay(dateKey),
    end: endOfLocalDay(dateKey),
    label: dateKey,
    group: "hour"
  };
}

function profitReportRecordRange(level = sessionStorage.getItem("profit_report_level") || "today") {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  if (level === "today") return currentProfitDetailRange();
  if (level === "dateRecords") return currentProfitDetailRange();
  if (level === "currentMonth") {
    const start = new Date(thisYear, thisMonth - 1, 1, 0, 0, 0, 0);
    const end = new Date(thisYear, thisMonth, 0, 23, 59, 59, 999);
    return { period: "profit-current-month", start, end, label: "Bulan ini", group: "day" };
  }
  if (level === "currentYear") {
    return {
      period: "profit-current-year",
      start: new Date(thisYear, 0, 1, 0, 0, 0, 0),
      end: new Date(thisYear, 11, 31, 23, 59, 59, 999),
      label: "Tahun ini",
      group: "month"
    };
  }
  if (level === "months") {
    const year = Number(sessionStorage.getItem("profit_report_year") || thisYear);
    return {
      period: `profit-year-${year}`,
      start: new Date(year, 0, 1, 0, 0, 0, 0),
      end: new Date(year, 11, 31, 23, 59, 59, 999),
      label: String(year),
      group: "month"
    };
  }
  if (level === "days") {
    const year = Number(sessionStorage.getItem("profit_report_year") || thisYear);
    const month = Number(sessionStorage.getItem("profit_report_month") || thisMonth);
    return {
      period: `profit-month-${year}-${month}`,
      start: new Date(year, month - 1, 1, 0, 0, 0, 0),
      end: new Date(year, month, 0, 23, 59, 59, 999),
      label: `${year}-${month}`,
      group: "day"
    };
  }
  return {
    period: "profit-all",
    start: new Date(2000, 0, 1, 0, 0, 0, 0),
    end: new Date(thisYear, 11, 31, 23, 59, 59, 999),
    label: "Selama ini",
    group: "year"
  };
}

function requestActiveReportData(force = false) {
  const section = sessionStorage.getItem("report_section") || "profit";
  if (section === "profit") {
    const level = sessionStorage.getItem("profit_report_level") || "today";
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    loadProfitSummary("years", null, null, force);
    if (level === "currentYear") loadProfitSummary("months", currentYear, null, force);
    if (level === "currentMonth") loadProfitSummary("days", currentYear, currentMonth, force);
    if (level === "months") loadProfitSummary("months", Number(sessionStorage.getItem("profit_report_year") || currentYear), null, force);
    if (["days", "dateRecords"].includes(level)) {
      loadProfitSummary(
        "days",
        Number(sessionStorage.getItem("profit_report_year") || currentYear),
        Number(sessionStorage.getItem("profit_report_month") || currentMonth),
        force
      );
    }
    const detailRange = currentProfitDetailRange();
    if (detailRange) loadSupabaseReportRecords(force, detailRange);
  } else if (section === "visitors") {
    loadSupabaseReportRecords(force);
  }
}

async function refreshVisibleData() {
  if (dataRefreshLoading) return;
  dataRefreshLoading = true;
  render();
  try {
    await processSyncQueue("manual-refresh");
    await loadMasterDataFromSupabase({ reason: "manual-refresh", force: true });
    if (view === "reports") {
      const activeSection = sessionStorage.getItem("report_section") || "profit";
      invalidateReportCaches();
      if (activeSection === "profit") await refreshProfitReportData();
      else if (activeSection === "visitors") await loadSupabaseReportRecords(true);
    }
    toast("Data diperbarui.");
  } catch (error) {
    console.error("Manual refresh failed", error);
    toast(`Gagal refresh data: ${error.message}`);
  } finally {
    dataRefreshLoading = false;
    render();
  }
}

function focusPosSearch() {
  const input = document.querySelector("[data-pos-search]");
  if (!input) return;
  input.focus();
  const end = input.value.length;
  input.setSelectionRange(end, end);
}

function updatePosSearch(input) {
  const value = input.value;
  const cursor = input.selectionStart ?? value.length;
  sessionStorage.setItem("pos_query", value);
  refreshPosFast({ productFilter: true, preserveScroll: true, focusSearch: true, cursor });
}

function normalizeFormAccessibility(root = document) {
  const scope = root?.querySelectorAll ? root : document;
  scope.querySelectorAll("input, select, textarea").forEach((field, index) => {
    if (field.type === "hidden") {
      if (!field.name && field.id) field.name = field.id;
      return;
    }
    const fieldLabel = field.closest("label");
    const container = field.closest(".field, .form-field, .payment-field, .orders-search, .cancel-reason-form, .addon-manager-form");
    const visibleLabel = container?.querySelector("label, span");
    const labelText = [
      fieldLabel?.innerText,
      visibleLabel?.innerText,
      field.getAttribute("aria-label"),
      field.getAttribute("placeholder"),
      field.name,
      field.id,
      "field"
    ].find(value => String(value || "").trim());
    const slug = String(labelText || "field")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 36) || "field";
    if (!field.id) {
      let candidate = `${slug}-${index + 1}`;
      let suffix = 1;
      while (document.getElementById(candidate)) {
        candidate = `${slug}-${index + 1}-${suffix++}`;
      }
      field.id = candidate;
    }
    if (!field.name) field.name = field.id;
    if (!field.getAttribute("aria-label")) field.setAttribute("aria-label", String(labelText || field.name).trim());
    if (fieldLabel && !fieldLabel.htmlFor) fieldLabel.htmlFor = field.id;
    if (visibleLabel?.tagName?.toLowerCase() === "label" && !visibleLabel.htmlFor) visibleLabel.htmlFor = field.id;
  });
}

function currentRenderedView() {
  const shell = document.querySelector(".app-shell");
  if (!shell?.classList) return null;
  const viewClass = Array.from(shell.classList)
    .filter(className => className.startsWith("view-"))
    .sort((a, b) => b.length - a.length)[0];
  return viewClass ? viewClass.replace(/^view-/, "") : null;
}

function captureViewScrollState(targetView) {
  const renderedView = currentRenderedView();
  if (renderedView && renderedView !== targetView) return null;
  const selectors = [".content", ".page"];
  if (targetView === "pos") {
    selectors.push(".pos-products-pane", ".pos-control-panel", ".product-list", ".cart-panel");
  }
  return {
    view: targetView,
    windowX: window.scrollX || 0,
    windowY: window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0,
    positions: selectors
      .map(selector => {
        const element = document.querySelector(selector);
        return element ? { selector, top: element.scrollTop, left: element.scrollLeft } : null;
      })
      .filter(Boolean)
  };
}

function restoreViewScrollState(snapshot) {
  if (!snapshot || snapshot.view !== view) return;
  requestAnimationFrame(() => {
    if (snapshot.view !== view) return;
    snapshot.positions.forEach(({ selector, top, left }) => {
      const element = document.querySelector(selector);
      if (!element) return;
      element.scrollTop = top;
      element.scrollLeft = left;
    });
    if (snapshot.windowX || snapshot.windowY) {
      window.scrollTo(snapshot.windowX, snapshot.windowY);
    }
  });
}

function capturePosPageScrollState() {
  return {
    windowX: window.scrollX || 0,
    windowY: window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0,
    positions: [".content", ".page", ".pos-products-pane", ".pos-control-panel", ".product-list", ".cart-panel", ".cart-lines"]
      .map(selector => {
        const element = document.querySelector(selector);
        return element ? { selector, top: element.scrollTop || 0, left: element.scrollLeft || 0 } : null;
      })
      .filter(Boolean)
  };
}

function restorePosPageScrollState(snapshot) {
  if (!snapshot) return;
  requestAnimationFrame(() => {
    (snapshot.positions || []).forEach(({ selector, top, left }) => {
      const element = document.querySelector(selector);
      if (!element) return;
      element.scrollTop = Number(top || 0);
      element.scrollLeft = Number(left || 0);
    });
    window.scrollTo(Number(snapshot.windowX || 0), Number(snapshot.windowY || 0));
  });
}

function refreshPosLayoutClass() {
  const layout = document.querySelector(".pos-layout");
  if (!layout) return null;
  const mobileView = sessionStorage.getItem("pos_mobile_view") || "items";
  layout.classList.toggle("cart-view", mobileView === "cart");
  layout.classList.toggle("items-view", mobileView !== "cart");
  ["list", "compact", "grid"].forEach(mode => layout.classList.toggle(`display-${mode}`, itemDisplay === mode));
  return layout;
}

function replacePosSection(selector, html) {
  const current = document.querySelector(selector);
  if (!current) return false;
  current.outerHTML = html;
  const next = document.querySelector(selector);
  if (next) normalizeFormAccessibility(next);
  return true;
}

function updatePosProductBadges() {
  document.querySelectorAll("[data-pos-product-card]").forEach(card => {
    const productId = card.getAttribute("data-product-id");
    const qty = cartProductQty(productId);
    const existing = card.querySelector(".product-action");
    if (qty > 0) {
      const html = `<div class="product-action"><span class="selected">${qty}</span></div>`;
      if (existing) existing.outerHTML = html;
      else card.insertAdjacentHTML("beforeend", html);
      return;
    }
    existing?.remove();
  });
}

function applyPosProductFilter() {
  const list = document.querySelector(".product-list");
  if (!list) return false;
  const selected = selectedPosCategory();
  const query = String(sessionStorage.getItem("pos_query") || "").toLowerCase();
  let visibleCount = 0;
  list.querySelectorAll("[data-pos-product-card]").forEach(card => {
    const category = card.getAttribute("data-product-category") || "";
    const search = card.getAttribute("data-product-search") || "";
    const visible = (selected === "Semua" || category === selected) && (!query || search.includes(query));
    card.classList.toggle("pos-filter-hidden", !visible);
    if (visible) visibleCount += 1;
  });
  const emptyState = list.querySelector("[data-pos-product-empty]");
  if (emptyState) emptyState.hidden = visibleCount > 0;
  hydratePosProductImages();
  return true;
}

function refreshPosMobileBar() {
  const layout = document.querySelector(".pos-layout");
  if (!layout) return false;
  const current = document.querySelector(".mobile-pos-bar");
  const html = renderPosMobileBar();
  if (!html) {
    current?.remove();
    return true;
  }
  if (current) current.outerHTML = html;
  else layout.insertAdjacentHTML("afterend", html);
  return true;
}

function refreshPosFast(options = {}) {
  if (view !== "pos" || currentRenderedView() !== "pos") {
    refreshPosOrRender(options);
    return false;
  }
  const layout = refreshPosLayoutClass();
  if (!layout) {
    refreshPosOrRender(options);
    return false;
  }
  const snapshot = options.preserveScroll === false ? null : capturePosPageScrollState();
  let changed = false;
  if (options.categories) changed = replacePosSection(".category-cards", renderPosCategoryCards()) || changed;
  if (options.products) changed = replacePosSection(".product-list", renderPosProductList()) || changed;
  if (options.productFilter) changed = applyPosProductFilter() || changed;
  if (options.cart) changed = replacePosSection(".cart-panel", renderPosCartPanel()) || changed;
  if (options.productBadges) {
    updatePosProductBadges();
    changed = true;
  }
  if (options.mobileBar) changed = refreshPosMobileBar() || changed;
  if (!changed && options.layout !== true) {
    refreshPosOrRender(options);
    return false;
  }
  restorePosPageScrollState(snapshot);
  if (options.focusSearch) {
    requestAnimationFrame(() => {
      const input = document.querySelector("[data-pos-search]");
      if (!input) return;
      const position = Math.min(Number(options.cursor ?? input.value.length), input.value.length);
      input.focus();
      input.setSelectionRange(position, position);
    });
  }
  if (options.products) hydratePosProductImages();
  return true;
}

function refreshPosPage(options = {}) {
  if (view !== "pos" || currentRenderedView() !== "pos") {
    render();
    return false;
  }
  const page = document.querySelector(".page");
  if (!page) {
    render();
    return false;
  }
  const snapshot = options.preserveScroll === false ? null : capturePosPageScrollState();
  page.innerHTML = renderPos();
  normalizeFormAccessibility(page);
  restorePosPageScrollState(snapshot);
  if (options.focusSearch) {
    requestAnimationFrame(() => {
      const input = document.querySelector("[data-pos-search]");
      if (!input) return;
      const position = Math.min(Number(options.cursor ?? input.value.length), input.value.length);
      input.focus();
      input.setSelectionRange(position, position);
    });
  }
  return true;
}

function refreshPosOrRender(options = {}) {
  if (!refreshPosPage(options)) render();
}

function render() {
  captureActiveModalDraft();
  if (IS_SELF_ORDER_APP) {
    renderSelfOrderStandalone();
    return;
  }
  normalizeStaffState();
  if (!activeStaff()) {
    app.innerHTML = renderStaffLoginScreen();
    return;
  }
  view = normalizeView(view);
  const scrollSnapshot = captureViewScrollState(view);
  if (view === "reports") {
    requestActiveReportData();
  }
  const nav = visibleNavItems();
  const shellClasses = [
    view === "pos" ? "pos-mode" : "",
    view === "stock-opname" ? "view-stock" : "",
    `view-${view}`,
    navOpen ? "nav-open" : "",
    navCollapsed ? "nav-collapsed" : ""
  ].filter(Boolean).join(" ");
  app.innerHTML = `
    <div class="app-shell ${shellClasses}">
      ${navOpen ? `<button class="nav-scrim" onclick="closeNav()" aria-label="Tutup menu"></button>` : ""}
      <aside class="sidebar">
        ${renderSidebarAccount()}
        <div class="brand">
          <button class="brand-menu" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
          <h1>Kasirin!</h1>
          <p>Aplikasi toko, dapur, kasir</p>
        </div>
        <nav class="nav">
          ${nav.map(([id, icon, label]) => `<button class="${view === id ? "active" : ""}" onclick="go('${id}')"><span class="nav-icon">${navIcon(id)}</span><span class="nav-label">${label}</span></button>`).join("")}
        </nav>
        <div class="sync-card">
          <strong>Mode lokal aktif</strong><br />
          Data operasional tersimpan di IndexedDB browser. Tetap bisa dipakai saat koneksi terganggu.
        </div>
      </aside>
      <main class="content">
        <header class="topbar">
          <div class="topbar-title">
            <button class="mobile-header-menu" onclick="toggleNav()" aria-label="Menu">${navIcon("menu")}</button>
            <h2>${pageTitle()}</h2>
            <p>${state.outlet} &middot; ${escapeHtml(activeStaff()?.name || state.activeUser)} &middot; ${roleLabel()} &middot; ${new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date())}</p>
          </div>
          <div class="toolbar">${topActions()}</div>
        </header>
        <section class="page">${route()}</section>
      </main>
    </div>
    <div class="drawer" id="drawer"></div>
    <div class="toast" id="toast"></div>
  `;
  restoreActiveModal();
  normalizeFormAccessibility(app);
  restoreSelfOrderCategoryScroll(false);
  restoreSelfOrderMenuScroll();
  restoreViewScrollState(scrollSnapshot);
  if (view === "pos") hydratePosProductImages();
}

function renderSelfOrderStandalone() {
  view = "selforder";
  syncSelfOrderTableFromUrl();
  app.innerHTML = `
    <div class="app-shell view-selforder self-order-standalone-shell">
      <main class="content self-order-standalone-content">
        <section class="page">${renderSelfOrder()}</section>
      </main>
    </div>
    <div class="drawer" id="drawer"></div>
    <div class="toast" id="toast"></div>
  `;
  restoreActiveModal();
  normalizeFormAccessibility(app);
  restoreSelfOrderCategoryScroll(false);
  restoreSelfOrderMenuScroll();
}

function go(id) {
  const requested = id;
  id = normalizeView(id);
  if (requested !== id && navItems.some(([navId]) => navId === requested)) {
    toast("Akses menu dibatasi untuk role ini.");
  }
  navOpen = false;
  staffMenuOpen = false;
  location.hash = id;
}

function openStockPage() {
  normalizeStaffState();
  const role = activeRole();
  if (role && state.staff.roleAccess?.[role] && !state.staff.roleAccess[role].includes("stock")) {
    state.staff.roleAccess[role] = [...state.staff.roleAccess[role], "stock"];
    saveState();
  }
  go("stock");
}

function normalizeView(id) {
  const available = appAvailableViews();
  const normalized = available.includes(id) ? id : defaultInitialView();
  if (IS_SELF_ORDER_APP) return "selforder";
  if (!activeStaff()) return normalized;
  return canAccessView(normalized) ? normalized : defaultViewForStaff();
}

function toggleNav() {
  if (window.matchMedia("(max-width: 1180px)").matches) {
    navOpen = !navOpen;
  } else {
    navOpen = false;
    navCollapsed = !navCollapsed;
    localStorage.setItem("omnipos_nav_collapsed", navCollapsed ? "1" : "0");
  }
  if (!applyNavDomState()) render();
}

function applyNavDomState() {
  const shell = document.querySelector(".app-shell");
  if (!shell) return false;
  shell.classList.toggle("nav-open", navOpen);
  shell.classList.toggle("nav-collapsed", navCollapsed);
  shell.querySelectorAll(".mobile-header-menu, .brand-menu").forEach(button => {
    button.setAttribute("aria-expanded", navOpen ? "true" : "false");
  });
  let scrim = shell.querySelector(".nav-scrim");
  if (navOpen && !scrim) {
    scrim = document.createElement("button");
    scrim.className = "nav-scrim";
    scrim.type = "button";
    scrim.setAttribute("aria-label", "Tutup menu");
    scrim.onclick = closeNav;
    shell.insertBefore(scrim, shell.firstChild);
  } else if (!navOpen && scrim) {
    scrim.remove();
  }
  return true;
}

function normalizeResponsiveNavState() {
  if (window.matchMedia("(min-width: 1181px)").matches && navOpen) {
    navOpen = false;
    return true;
  }
  return false;
}

function closeNav() {
  navOpen = false;
  staffMenuOpen = false;
  if (!applyNavDomState()) render();
}

function renderSidebarAccount() {
  const staff = activeStaff();
  if (!staff) return "";
  return `
    <div class="sidebar-account" data-staff-menu>
      <button class="sidebar-account-avatar" type="button" onclick="toggleStaffMenu(event)" aria-label="Akun ${escapeHtml(staff.name)}" aria-expanded="${staffMenuOpen ? "true" : "false"}">
        <span>${staffInitials(staff.name)}</span>
      </button>
      <button class="sidebar-account-identity" type="button" onclick="toggleStaffMenu(event)" aria-label="Akun ${escapeHtml(staff.name)}">
        <strong>${escapeHtml(staff.name)}</strong>
        <small>${escapeHtml(roleLabel(staff.role))}</small>
      </button>
      ${staffMenuOpen ? `
        <div class="sidebar-account-popover">
          <div class="sidebar-account-line">
            <span>${staffInitials(staff.name)}</span>
            <div>
              <strong>${escapeHtml(staff.name)}</strong>
              <small>${escapeHtml(roleLabel(staff.role))}</small>
            </div>
          </div>
          <button class="sidebar-account-logout" type="button" onclick="logoutStaff()">Logout</button>
        </div>
      ` : ""}
    </div>
  `;
}

function toggleStaffMenu(event) {
  event?.stopPropagation?.();
  staffMenuOpen = !staffMenuOpen;
  render();
}

function pageTitle() {
  return {
    dashboard: "Dashboard",
    pos: "Penjualan",
    kitchen: "Kitchen System",
    orders: "Pesanan",
    selforder: "Self Order",
    products: "Produk",
    stock: "Manajemen Stok",
    "stock-opname": "Stok Opname",
    reports: "Laporan",
    cash: "Buka dan Tutup Kas",
    audit: "Audit Log",
    settings: "Settings"
  }[view] || "Kasirin!";
}

function topActions() {
  if (view === "pos") return `
    <button class="pos-tool-btn danger" onclick="clearCart()" title="Batalkan pesanan">&times;</button>
    <button class="pos-tool-btn unpaid-count" onclick="openHeldOrders()" title="Pesanan belum bayar">${unpaidOrders().length}</button>
    <button class="pos-tool-btn settings" onclick="toggleItemDisplay()" title="Atur tampilan barang">&#9881;</button>
  `;
  if (view === "products") return "";
  if (view === "selforder") return "";
  if (view === "stock") return "";
  if (view === "stock-opname") return "";
  if (view === "cash") return `<button class="btn accent" onclick="toggleCashSession()">${state.cashSession.open ? "Tutup Kas" : "Buka Kas"}</button>`;
  if (view === "kitchen") return "";
  if (["dashboard", "reports"].includes(view)) {
    return `<button class="top-sync-btn ${dataRefreshLoading ? "loading" : ""}" onclick="refreshVisibleData()" title="Refresh data" aria-label="Refresh data">${navIcon("sync")}</button>`;
  }
  return ["dashboard", "orders", "settings"].includes(view) ? "" : `<button class="btn primary" onclick="go('pos')">Transaksi Baru</button>`;
}

function route() {
  if (!canAccessView(view)) {
    return renderAccessDenied();
  }
  return {
    dashboard: renderDashboard,
    pos: renderPos,
    kitchen: renderKitchen,
    orders: renderOrders,
    selforder: renderSelfOrder,
    products: renderProducts,
    stock: renderStockV2,
    "stock-opname": renderStockOpname,
    reports: renderReports,
    cash: renderCash,
    audit: renderAudit,
    settings: renderSettings
  }[view]?.() || renderDashboard();
}

function renderAccessDenied() {
  return `
    <section class="staff-empty-state">
      <h3>Akses dibatasi</h3>
      <p>Role ${escapeHtml(roleLabel())} tidak memiliki akses ke halaman ini.</p>
      <button class="btn accent" onclick="go('${defaultViewForStaff()}')">Ke halaman utama</button>
    </section>
  `;
}

function renderStaffLoginScreen() {
  const loginLogo = String(state.settings?.receiptLogoDataUrl || state.settings?.selfOrderProfileImageDataUrl || "").trim();
  const appName = String(state.settings?.receiptStoreName || state.settings?.selfOrderAppName || "Kasirin!").trim();
  const outletName = String(state.outlet || state.settings?.selfOrderOutletName || "Outlet Utama").trim();
  return `
    <main class="staff-lock-screen">
      <section class="staff-lock-card">
        <div class="staff-lock-brand">
          <span class="staff-lock-logo">${loginLogo ? mediaImageTag(loginLogo, "Logo usaha", "", 320) : staffInitials(appName)}</span>
          <div class="staff-lock-heading">
            <small>Kasirin POS</small>
            <h1>${escapeHtml(appName)}</h1>
            <p>${escapeHtml(outletName)} - masuk dengan username dan PIN staff.</p>
          </div>
        </div>
        <form class="staff-login-form" onsubmit="loginStaffFromForm(event)">
          <label class="field">
            <span>Username</span>
            <input class="input" name="staffCode" type="text" autocomplete="username" placeholder="Contoh: kasir" required />
          </label>
          <label class="field">
            <span>PIN</span>
            <input class="input" name="pin" type="password" inputmode="numeric" autocomplete="current-password" required />
          </label>
          <button class="btn accent" type="submit">Masuk</button>
        </form>
      </section>
    </main>
  `;
}

async function loginStaffFromForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton?.disabled) return;
  const normalizeLoginKey = value => String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  const formData = new FormData(form);
  const staffCode = normalizeLoginKey(formData.get("staffCode") || formData.get("staffId") || "");
  const pin = String(formData.get("pin") || "").trim();
  const originalLabel = submitButton?.innerHTML || "";
  let loginSucceeded = false;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML = "Memeriksa...";
  }
  try {
    let member = null;
    if (supabaseReadable()) {
      const result = await withTimeout(
        loginStaffFromSupabase(staffCode, pin),
        3000,
        { ok: false, reason: "timeout" }
      );
      if (result.ok) {
        member = result.member;
      } else if (result.reason !== "timeout") {
        console.warn("Staff Supabase login rejected", {
          reason: result.reason,
          enteredUser: staffCode,
          usernameMatched: Boolean(result.member)
        });
        toast("Username atau PIN belum sesuai.");
        return;
      }
    }
    if (!member) member = findStaffByLogin(staffCode);
    if (!member || String(member.pin || "") !== pin) {
      console.warn("Staff login rejected", {
        usernameMatched: Boolean(member),
        enteredUser: staffCode,
        availableStaff: staffMembers().map(item => ({
          id: item.id,
          username: item.username,
          pinLength: String(item.pin || "").length,
          active: item.active !== false
        }))
      });
      toast("Username atau PIN belum sesuai.");
      return;
    }
    state.staff.activeStaffId = member.id;
    sessionStorage.setItem(STAFF_SESSION_KEY, member.id);
    state.activeUser = member.username || member.name;
    staffMenuOpen = false;
    saveState();
    loginSucceeded = true;
    const nextView = defaultViewForStaff(member);
    view = nextView;
    location.hash = nextView;
    render();
  } finally {
    if (submitButton && !loginSucceeded) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalLabel;
    }
  }
}

function logoutStaff() {
  state.staff.activeStaffId = "";
  sessionStorage.removeItem(STAFF_SESSION_KEY);
  staffMenuOpen = false;
  saveState();
  navOpen = false;
  render();
}

function toggleStaffAccessChip(button) {
  const hiddenInput = button?.nextElementSibling;
  if (!hiddenInput || hiddenInput.name !== "staffAccess") return;
  const active = button.getAttribute("aria-pressed") !== "true";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.classList.toggle("active", active);
  hiddenInput.disabled = !active;
  saveStaffFormDraft(button.closest("form"));
}

function staffFormDraftKey(editId = "") {
  return `staff_form_draft_${editId || "new"}`;
}

function readStaffFormDraft(editId = "") {
  try {
    return JSON.parse(sessionStorage.getItem(staffFormDraftKey(editId)) || "{}");
  } catch (error) {
    return {};
  }
}

function saveStaffFormDraft(form) {
  if (!form) return;
  const formData = new FormData(form);
  const editId = String(formData.get("staffEditId") || "").trim();
  const draft = {
    username: String(formData.get("staffUsername") || ""),
    role: String(formData.get("staffRole") || ""),
    pin: String(formData.get("staffPin") || ""),
    menuAccess: filteredAccessViews(formData.getAll("staffAccess").map(value => String(value || "")))
  };
  sessionStorage.setItem(staffFormDraftKey(editId), JSON.stringify(draft));
}

function saveStaffMember(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const editId = String(formData.get("staffEditId") || "").trim();
  const username = String(formData.get("staffUsername") || "").trim();
  const role = String(formData.get("staffRole") || "");
  const pin = String(formData.get("staffPin") || "").trim();
  if (!username || !ROLE_DEFINITIONS[role] || pin.length < 4) {
    toast("Isi username, role, dan PIN minimal 4 digit.");
    return;
  }
  normalizeStaffState();
  const loginKey = value => String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  const usernameKey = loginKey(username);
  const usernameUsed = state.staff.members.some(member => member.id !== editId && loginKey(member.username || member.name || member.id) === usernameKey);
  if (usernameUsed) {
    toast("Username sudah dipakai staff lain.");
    return;
  }
  const selectedAccess = filteredAccessViews(formData.getAll("staffAccess").map(value => String(value || "")));
  const menuAccess = selectedAccess;
  if (!menuAccess.length) {
    toast("Pilih minimal satu akses menu untuk staff ini.");
    return;
  }
  const editingMember = editId ? state.staff.members.find(member => member.id === editId) : null;
  state.staff.remoteSynced = true;
  if (editingMember) {
    editingMember.name = username;
    editingMember.username = username;
    editingMember.role = role;
    editingMember.pin = pin;
    editingMember.menuAccess = menuAccess;
    if (state.staff.activeStaffId === editingMember.id) {
      state.activeUser = username;
      if (!canAccessView(view)) {
        const nextView = defaultViewForStaff(editingMember);
        view = nextView;
        location.hash = nextView;
      }
    }
    state.staff.editingStaffId = "";
    sessionStorage.removeItem(staffFormDraftKey(editId));
    toast("Staff diperbarui.");
  } else {
    state.staff.deletedStaffUsernames = (state.staff.deletedStaffUsernames || []).filter(value => value !== username.toLowerCase());
    state.staff.members.push({ id: uid(), username, name: username, role, pin, active: true, menuAccess });
    state.staff.addingStaff = false;
    sessionStorage.removeItem(staffFormDraftKey(""));
    toast("Staff ditambahkan.");
  }
  saveState();
  syncStoreSettingsToSupabase({ requireJson: true }).catch(error => console.error("Staff settings sync failed", error));
  render();
}

function openStaffAddForm() {
  normalizeStaffState();
  state.staff.editingStaffId = "";
  state.staff.addingStaff = true;
  render();
}

function editStaffMember(id) {
  const member = staffMembers().find(item => item.id === id);
  if (!member) return;
  sessionStorage.removeItem(staffFormDraftKey(""));
  state.staff.addingStaff = false;
  state.staff.editingStaffId = id;
  render();
}

function cancelStaffEdit() {
  const editId = state.staff?.editingStaffId || "";
  sessionStorage.removeItem(staffFormDraftKey(editId));
  sessionStorage.removeItem(staffFormDraftKey(""));
  if (state.staff) state.staff.editingStaffId = "";
  if (state.staff) state.staff.addingStaff = false;
  render();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

async function deleteStaffFromSupabase(member) {
  if (!member || !supabaseWritable()) return false;
  try {
    let result = null;
    if (isUuid(member.id)) {
      result = await supabaseClient.from("staff_profiles").delete().eq("id", member.id);
    } else {
      const username = String(member.username || member.name || "").trim();
      if (!username) return false;
      result = await supabaseClient
        .from("staff_profiles")
        .delete()
        .eq("full_name", username);
    }
    if (result?.error) throw result.error;
    return true;
  } catch (error) {
    console.error("Delete staff from Supabase failed", error);
    toast(`Staff dihapus lokal, tetapi hapus Supabase gagal: ${error.message}`);
    return false;
  }
}

function confirmRemoveStaffMember(id) {
  normalizeStaffState();
  const member = state.staff.members.find(item => item.id === id);
  if (!member || member.id === "owner") {
    toast("Owner utama tidak bisa dihapus.");
    return;
  }
  openConfirmDialog({
    title: "Hapus staff?",
    message: `Staff ${member.username || member.name} akan dihapus dari aplikasi.`,
    detail: "Jika Supabase aktif, data staff juga akan dihapus dari tabel staff_profiles. Staff yang sudah dihapus tidak akan dibuat ulang dari data lokal.",
    confirmLabel: "Hapus Staff",
    cancelLabel: "Batal",
    danger: true,
    onConfirm: () => removeStaffMember(id)
  });
}

async function removeStaffMember(id) {
  normalizeStaffState();
  state.staff.remoteSynced = true;
  const member = state.staff.members.find(item => item.id === id);
  if (!member || member.id === "owner") {
    toast("Owner utama tidak bisa dihapus.");
    return;
  }
  const deletedId = member.id;
  const deletedUsername = String(member.username || member.name || "").trim().toLowerCase();
  await deleteStaffFromSupabase(member);
  state.staff.deletedStaffIds ||= [];
  if (!state.staff.deletedStaffIds.includes(deletedId)) state.staff.deletedStaffIds.push(deletedId);
  state.staff.deletedStaffUsernames ||= [];
  if (deletedUsername && !state.staff.deletedStaffUsernames.includes(deletedUsername)) state.staff.deletedStaffUsernames.push(deletedUsername);
  state.staff.members = state.staff.members.filter(item => item.id !== deletedId);
  if (state.staff.editingStaffId === id) state.staff.editingStaffId = "";
  if (state.staff.activeStaffId === id) {
    state.staff.activeStaffId = "";
    sessionStorage.removeItem(STAFF_SESSION_KEY);
  }
  normalizeStaffState();
  saveState();
  syncStoreSettingsToSupabase({ requireJson: true }).catch(error => console.error("Staff delete settings sync failed", error));
  toast("Staff dihapus.");
  render();
}

function quickLoginStaff(id) {
  const member = staffMembers().find(item => item.id === id);
  if (!member) return;
  state.staff.activeStaffId = member.id;
  sessionStorage.setItem(STAFF_SESSION_KEY, member.id);
  state.activeUser = member.name;
  staffMenuOpen = false;
  saveState();
  go(defaultViewForStaff(member));
}

function metric(label, value, hint) {
  return `<div class="card metric"><span>${label}</span><strong class="num">${value}</strong><small>${hint}</small></div>`;
}

function cartItemTotal(item) {
  const addonsTotal = (item.addons || []).reduce((sum, addon) => sum + addon.price * addon.qty, 0);
  const baseTotal = item.price * item.qty + addonsTotal;
  return Math.max(0, baseTotal - itemDiscountAmount(item));
}

function itemBaseTotal(item) {
  const addonsTotal = (item.addons || []).reduce((sum, addon) => sum + Number(addon.price || 0) * Number(addon.qty || 0), 0);
  return Number(item.price || 0) * Number(item.qty || 0) + addonsTotal;
}

function itemDiscountAmount(item) {
  const baseTotal = itemBaseTotal(item);
  const value = Math.max(0, Number(item.discountValue ?? item.discount ?? 0) || 0);
  if ((item.discountType || "rp") === "percent") return Math.min(baseTotal, Math.round(baseTotal * Math.min(100, value) / 100));
  return Math.min(baseTotal, value);
}

function receiptDemoOrder() {
  return {
    id: "demo-receipt",
    number: "ORD-DEMO-001",
    type: "Dine In",
    customer: "Walk-in",
    serviceInfo: "A1",
    paymentMethod: "Tunai",
    receivedAmount: 50000,
    changeAmount: 8000,
    createdAt: new Date().toISOString(),
    items: [
      { name: "Es Kopi Susu", qty: 1, price: 18000, addons: [] },
      { name: "Butter Croissant", qty: 1, price: 24000, addons: [] }
    ],
    subtotal: 42000,
    discount: 0,
    grandTotal: 42000
  };
}

function receiptLineItem(item, index, settings) {
  const qtyText = settings.receiptShowUnitNextToQty ? `${Number(item.qty || 0)} pcs x` : `${Number(item.qty || 0)}x`;
  const prefix = settings.receiptShowOrderQueueNumber ? `${index + 1}. ` : "";
  const addons = (item.addons || []).map(addon => `+ ${addon.name} ${Number(addon.qty || 0)}x`).join(", ");
  return `
    <span><b>${escapeHtml(`${prefix}${qtyText} ${item.name}${addons ? ` ${addons}` : ""}`)}</b><b>${money(cartItemTotal(item)).replace("Rp", "").trim()}</b></span>
  `;
}

function renderReceiptPaper(order = null) {
  const settings = state.settings || {};
  const source = order || receiptDemoOrder();
  const items = source.items || source.cart || [];
  const createdAt = source.createdAt ? new Date(source.createdAt) : new Date();
  const dateText = `${String(createdAt.getDate()).padStart(2, "0")}-${String(createdAt.getMonth() + 1).padStart(2, "0")}-${String(createdAt.getFullYear()).slice(-2)} ${createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":")}`;
  const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const total = orderTotal(source) || items.reduce((sum, item) => sum + cartItemTotal(item), 0);
  const receiptCode = String(source.number || "").replaceAll("-", "");
  const tableText = source.serviceInfo && source.serviceInfo !== "-" ? source.serviceInfo : "";
  const customerText = source.customer && source.customer !== "-" ? source.customer : "";
  const headerNote = String(settings.receiptHeaderNote || "").trim();
  const footer = String(settings.receiptFooter || "").trim();
  const logoChars = Math.max(1, Math.min(32, Number(settings.receiptLogoLength || 12) || 12));
  const logoMarkup = settings.receiptLogoDataUrl
    ? `<em class="receipt-logo-image" style="--receipt-logo-chars:${logoChars}">${mediaImageTag(settings.receiptLogoDataUrl, "Logo usaha", "", 320)}</em>`
    : `<em style="--receipt-logo-chars:${logoChars}">${escapeHtml(settings.receiptLogoText || "Logo")}</em>`;
  return `
    <div class="receipt-paper ${settings.receiptShowLogo ? "" : "receipt-no-logo"} ${settings.receiptImageMode === "B" ? "receipt-image-b" : ""} ${settings.receiptWidth === "80mm" ? "receipt-80" : ""}">
      ${settings.receiptShowLogo ? logoMarkup : ""}
      <strong class="receipt-store-name">${escapeHtml(settings.receiptStoreName || state.outlet || "Kasirin!")}</strong>
      ${settings.receiptAddress ? `<small class="receipt-address">${escapeHtml(settings.receiptAddress)}</small>` : ""}
      ${settings.receiptPhone ? `<small>Telp: ${escapeHtml(settings.receiptPhone)}</small>` : ""}
      ${headerNote ? `<small class="receipt-note">${escapeHtml(headerNote)}</small>` : ""}
      <i></i>
      <span class="receipt-date-row"><b>${escapeHtml(dateText)}</b></span>
      ${settings.receiptShowCashierLabel ? `<span><b>Kasir</b><b>${escapeHtml(state.activeUser || "Admin")}</b></span>` : ""}
      ${settings.receiptShowReceiptNumber ? `<span><b>No. struk</b><b>${escapeHtml(displayOrderNumber(source.number))}</b></span>` : ""}
      ${customerText ? `<span><b>Pelanggan</b><b>${escapeHtml(customerText)}</b></span>` : ""}
      ${settings.receiptShowReceiptCode ? `<span><b>Kode struk</b><b>${escapeHtml(receiptCode)}</b></span>` : ""}
      ${settings.receiptShowTable && tableText ? `<span><b>Meja / ambil</b><b>${escapeHtml(tableText)}</b></span>` : ""}
      <i></i>
      ${items.map((item, index) => receiptLineItem(item, index, settings)).join("")}
      ${settings.receiptShowTotalQuantity ? `<span><b>Total qty</b><b>${totalQty}</b></span>` : ""}
      <i></i>
      <strong class="receipt-total"><b>Total</b><b>${money(total).replace("Rp", "").trim()}</b></strong>
      ${source.receivedAmount ? `<span><b>Bayar</b><b>${money(source.receivedAmount).replace("Rp", "").trim()}</b></span>` : ""}
      ${source.changeAmount ? `<span><b>Kembali</b><b>${money(source.changeAmount).replace("Rp", "").trim()}</b></span>` : ""}
      ${settings.receiptShowQr || footer ? `<span class="receipt-after-payment-gap" aria-hidden="true"></span>` : ""}
      ${settings.receiptShowQr ? `<em class="receipt-qr">QR Promo</em>` : ""}
      ${footer ? `<small class="receipt-note receipt-footer-note">${escapeHtml(footer)}</small>` : ""}
    </div>
  `;
}

function printableReceiptHtml(order) {
  return `
    <!doctype html>
    <html>
      <head>
        <title>Struk ${escapeHtml(displayOrderNumber(order?.number))}</title>
        <style>
          body { margin: 0; padding: 12px; background: white; }
          .receipt-paper { width: 270px; display: grid; gap: 5px; color: #111827; font: 11px/1.35 "Courier New", monospace; text-align: center; }
          .receipt-paper.receipt-80 { width: 360px; }
          .receipt-paper span, .receipt-total { display: flex; justify-content: space-between; gap: 8px; text-align: left; }
          .receipt-date-row { justify-content: center; text-align: center; }
          .receipt-paper small { display: block; }
          .receipt-paper b, .receipt-paper strong { font-weight: 600; }
          .receipt-store-name { font-size: 15px; font-weight: 700; }
          .receipt-address { font-size: 12px; font-weight: 600; }
          .receipt-note { font-size: 12px; font-weight: 500; }
          .receipt-footer-note { font-weight: 650; }
          .receipt-paper i { display: block; border-top: 1px dashed #111827; margin: 5px 0; }
          .receipt-after-payment-gap { display: block !important; height: 1em; }
          .receipt-paper em { width: calc(min(var(--receipt-logo-chars, 12), 32) * 7px); min-height: 34px; display: grid; place-items: center; justify-self: center; font-style: normal; }
          .receipt-paper em img { width: 100%; height: auto; max-height: none; object-fit: contain; display: block; }
          .receipt-paper.receipt-image-b em { border: 0; padding: 0; border-radius: 0; }
        </style>
      </head>
      <body>${renderReceiptPaper(order)}</body>
    </html>
  `;
}

function printReceiptOrder(order) {
  if (!order) return toast("Belum ada struk untuk dicetak.");
  const printWindow = window.open("", "_blank", "width=420,height=720");
  if (!printWindow) return toast("Popup print diblokir browser.");
  printWindow.document.write(printableReceiptHtml(order));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  toast(`Struk ${displayOrderNumber(order.number)} siap dicetak.`);
}

function orderDiscountAmount(subtotal) {
  const value = Math.max(0, Number(sessionStorage.getItem("pos_discount") || 0) || 0);
  if ((sessionStorage.getItem("pos_discount_type") || "rp") === "percent") return Math.min(subtotal, Math.round(subtotal * Math.min(100, value) / 100));
  return Math.min(subtotal, value);
}

function setOrderDiscountType(type) {
  sessionStorage.setItem("pos_discount_type", type);
  if (type === "percent") {
    const value = Math.min(100, Math.max(0, Number(sessionStorage.getItem("pos_discount") || 0) || 0));
    sessionStorage.setItem("pos_discount", value);
  }
  refreshPosFast({ cart: true, preserveScroll: true });
}

function cartItemKey(item) {
  return item.lineId || item.productId;
}

function productVariantGroups(product) {
  if (!product || product.variantMode === "off") return [];
  if (product.variantMode === "2") {
    return [{
      level: "final",
      name: `${product.variantGroup || "Varian"} / ${product.variantGroup2 || "Pilihan"}`,
      required: true,
      options: productFinalVariantOptions(product)
    }];
  }
  const groups = [];
  if (product.variantOptions?.length) {
    groups.push({
      level: "1",
      name: product.variantGroup || "Varian",
      required: !!product.variantRequired,
      options: product.variantOptions
    });
  }
  return groups;
}

function productFinalVariantOptions(product) {
  if (!product || product.variantMode !== "2") return product?.variantOptions || [];
  const parents = product.variantOptions || [];
  const legacyChildren = product.variantOptions2 || [];
  return parents.flatMap(parent => {
    const children = parent.children?.length ? parent.children : legacyChildren;
    return children.map(child => ({
      name: `${parent.name} ${child.name}`.trim(),
      price: Number(child.price || 0),
      cost: Number(child.cost || 0),
      parentName: parent.name,
      childName: child.name
    }));
  }).filter(option => option.name);
}

function productAvailabilityVariants(product) {
  return productAvailabilityVariantGroups(product).flatMap(group => group.variants);
}

function productAvailabilityVariantGroups(product) {
  if (!product || product.variantMode === "off") return [];
  if (product.variantMode === "2") {
    const parents = product.variantOptions || [];
    const legacyChildren = product.variantOptions2 || [];
    return parents.map(parent => {
      const children = parent.children?.length ? parent.children : legacyChildren;
      return {
        title: parent.name || "Varian",
        variants: children.map(child => ({
          key: `${parent.name || ""}|||${child.name || ""}`,
          label: child.name || "Pilihan",
          price: Number(child.price || 0),
          cost: Number(child.cost || 0)
        })).filter(option => option.key.replace("|||", "").trim())
      };
    }).filter(group => group.variants.length);
  }
  const variants = (product.variantOptions || []).map(option => ({
    key: option.name || "",
    label: option.name || "Varian",
    price: Number(option.price || 0),
    cost: Number(option.cost || 0)
  })).filter(option => option.key);
  return variants.length ? [{ title: "Varian", variants }] : [];
}

function isProductVariantSoldOut(product, variantKey) {
  return !!product?.soldOutVariants?.[variantKey];
}

function productAvailabilityFinalUnits(product) {
  const variants = productAvailabilityVariants(product);
  const total = variants.length || 1;
  const soldOut = product?.soldOut
    ? total
    : variants.length
      ? variants.filter(variant => isProductVariantSoldOut(product, variant.key)).length
      : 0;
  return {
    total,
    soldOut,
    available: Math.max(0, total - soldOut)
  };
}

function kitchenAvailabilitySummary(products = []) {
  return products.reduce((summary, product) => {
    const units = productAvailabilityFinalUnits(product);
    summary.total += units.total;
    summary.soldOut += units.soldOut;
    summary.available += units.available;
    return summary;
  }, { total: 0, available: 0, soldOut: 0 });
}

function variantFinalPrice(selections = [], fallback = 0) {
  const priced = [...selections].reverse().find(option => Number(option.price || 0) > 0);
  return Number(priced?.price ?? fallback ?? 0);
}

function variantFinalCost(selections = [], fallback = 0) {
  const costed = [...selections].reverse().find(option => Number(option.cost || 0) > 0);
  return Number(costed?.cost ?? fallback ?? 0);
}

function buildCartItem(product, variantSelections = []) {
  const basePrice = Number(product.price || 0);
  const baseCost = Number(product.cost || 0);
  const finalVariant = [...variantSelections].reverse().find(option => option.name);
  return {
    lineId: uid(),
    productId: product.id,
    name: finalVariant?.cartName || finalVariant?.childName || finalVariant?.name || product.name,
    price: variantFinalPrice(variantSelections, basePrice),
    basePrice,
    cost: variantFinalCost(variantSelections, baseCost),
    qty: 1,
    category: product.category,
    variantSelections
  };
}

function cartProductQty(productId, exceptKey = "") {
  return cart.reduce((sum, item) => {
    if (item.productId !== productId || cartItemKey(item) === exceptKey) return sum;
    return sum + Number(item.qty || 0);
  }, 0);
}

function orderItemModifiers(item) {
  const addons = (item.addons || []).map(addon => `${addon.name} ${addon.qty}x`);
  return addons;
}

function orderItemInlineLabel(item) {
  const base = `${Number(item.qty || 0)}x ${item.name}`;
  const addons = (item.addons || [])
    .map(addon => `${addon.name} ${Number(addon.qty || 0)}x`)
    .join(" + ");
  return addons ? `${base} + ${addons}` : base;
}

function orderBatchLabel(index) {
  const number = Math.max(1, Number(index || 1));
  return number === 1 ? "Pesanan pertama" : `Pesanan tambahan ${number - 1}`;
}

function orderItemBatch(item) {
  return Math.max(1, Number(item.orderBatch || item.variantData?.orderBatch || 1) || 1);
}

function normalizeOrderBatches(order) {
  if (!order?.items?.length) return order;
  order.items = order.items.map(item => {
    const batch = orderItemBatch(item);
    return {
      ...item,
      orderBatch: batch,
      orderBatchLabel: item.orderBatchLabel || item.variantData?.orderBatchLabel || orderBatchLabel(batch),
      variantData: {
        ...(item.variantData || {}),
        orderBatch: batch,
        orderBatchLabel: item.orderBatchLabel || item.variantData?.orderBatchLabel || orderBatchLabel(batch)
      }
    };
  });
  return order;
}

function groupedOrderItems(order) {
  const groups = new Map();
  (order?.items || []).forEach(item => {
    const batch = orderItemBatch(item);
    if (!groups.has(batch)) groups.set(batch, []);
    groups.get(batch).push(item);
  });
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([batch, items]) => ({ batch, label: orderBatchLabel(batch), items }));
}

function orderGroupNote(order, group) {
  const batchNote = (group?.items || [])
    .map(item => String(item.variantData?.orderBatchNote || "").trim())
    .find(Boolean);
  if (batchNote) return batchNote;
  return Number(group?.batch || 1) === 1 ? String(order?.note || "").trim() : "";
}

function selfOrderOpenTableOrder(table) {
  const normalizedTable = String(table || "").trim().toLowerCase();
  if (!normalizedTable) return null;
  return state.orders
    .filter(order => String(order.serviceInfo || "").trim().toLowerCase() === normalizedTable)
    .filter(order => order.paymentStatus !== "Lunas" && order.status !== "Dibatalkan")
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0] || null;
}

function tagOrderBatchItems(items, batch, batchNote = "") {
  return (items || []).map(item => {
    const label = orderBatchLabel(batch);
    const note = String(batchNote || "").trim();
    return {
      ...item,
      orderBatch: batch,
      orderBatchLabel: label,
      variantData: {
        ...(item.variantData || {}),
        orderBatch: batch,
        orderBatchLabel: label,
        orderBatchNote: note
      }
    };
  });
}

function productDisplayPrice(product) {
  const sourceOptions = product.variantMode === "2" ? productFinalVariantOptions(product) : productVariantGroups(product).flatMap(group => group.options);
  const variantPrices = sourceOptions
    .map(option => Number(option.price || 0))
    .filter(price => price > 0);
  if (!variantPrices.length) return money(product.price);
  const min = Math.min(...variantPrices);
  const max = Math.max(...variantPrices);
  return min === max ? money(min) : `${money(min)} - ${money(max)}`;
}

function cartSubtotal() {
  return cart.reduce((sum, item) => sum + cartItemTotal(item), 0);
}

function setReceivedAmount(value) {
  sessionStorage.setItem("pos_received_amount", value);
  sessionStorage.setItem("pos_payment_slide", "quick");
  refreshPosFast({ cart: true, preserveScroll: true });
}

function setPaymentSlide(slide) {
  sessionStorage.setItem("pos_payment_slide", slide);
  refreshPosFast({ cart: true, preserveScroll: true });
}

function pressPaymentKey(key) {
  let current = sessionStorage.getItem("pos_received_amount") || "";
  if (key === "OK") {
    sessionStorage.setItem("pos_payment_slide", "quick");
    return refreshPosFast({ cart: true, preserveScroll: true });
  }
  if (key === "C") current = "";
  else if (key === "DEL") current = current.slice(0, -1);
  else current = `${current}${key}`.replace(/^0+(?=\d)/, "");
  sessionStorage.setItem("pos_received_amount", current);
  refreshPosFast({ cart: true, preserveScroll: true });
}

function saveCurrentPaymentAmount() {
  const value = Number(sessionStorage.getItem("pos_received_amount") || 0);
  if (!value) return toast("Masukkan nominal dulu.");
  if (!savedPaymentAmounts.includes(value)) {
    savedPaymentAmounts = [...savedPaymentAmounts, value].sort((a, b) => a - b).slice(-8);
    localStorage.setItem("omnipos_saved_payment_amounts", JSON.stringify(savedPaymentAmounts));
  }
  toast("Nominal pembayaran disimpan.");
  refreshPosFast({ cart: true, preserveScroll: true });
}

function renderCartSuccess() {
  const raw = sessionStorage.getItem("pos_last_result");
  const result = raw ? JSON.parse(raw) : null;
  if (!result) {
    return `<div class="success-card"><strong>Belum ada hasil</strong><p>Proses atau simpan pesanan terlebih dahulu.</p><button class="btn green" onclick="setCartStep('items')">Kembali</button></div>`;
  }
  return `
    <div class="success-card">
      <div class="success-icon">&#10003;</div>
      <strong>${escapeHtml(result.title)}</strong>
      <p>${escapeHtml(result.message)}</p>
      <div class="success-meta">
        <span>No. Pesanan</span><b>${escapeHtml(displayOrderNumber(result.number))}</b>
        <span>Total</span><b>${money(result.total)}</b>
        ${result.paid ? `<span>Uang diterima</span><b>${money(result.receivedAmount || 0)}</b><span>Kembalian</span><b>${money(result.changeAmount || 0)}</b>` : `<span>Status bayar</span><b>Bayar nanti</b>`}
      </div>
      ${result.paid ? `<button class="btn receipt-success-btn" onclick="printLastReceipt()">Print struk</button>` : ""}
      <button class="btn green" onclick="startNewSale()">Transaksi Baru</button>
    </div>
  `;
}

function setLastResult(title, message, order) {
  sessionStorage.setItem("pos_last_result", JSON.stringify({
    orderId: order.id,
    title,
    message,
    number: order.number,
    total: orderTotal(order),
    paid: order.paymentStatus === "Lunas",
    receivedAmount: order.receivedAmount || 0,
    changeAmount: order.changeAmount || 0,
    printReceipt: !!order.printReceipt
  }));
  sessionStorage.setItem("pos_mobile_view", "cart");
  sessionStorage.setItem("pos_cart_step", "success");
}

function printLastReceipt() {
  const raw = sessionStorage.getItem("pos_last_result");
  const result = raw ? JSON.parse(raw) : null;
  if (!result) return toast("Belum ada struk untuk dicetak.");
  const order = state.orders.find(item => item.id === result.orderId || item.number === result.number);
  printReceiptOrder(order || {
    ...receiptDemoOrder(),
    number: result.number,
    subtotal: result.total,
    grandTotal: result.total,
    receivedAmount: result.receivedAmount,
    changeAmount: result.changeAmount,
    items: []
  });
}

function startNewSale() {
  cart = [];
  clearPosDraft();
  sessionStorage.setItem("pos_mobile_view", "items");
  sessionStorage.setItem("pos_cart_step", "items");
  sessionStorage.removeItem("pos_last_result");
  refreshPosFast({ layout: true, products: true, productBadges: true, cart: true, mobileBar: true, preserveScroll: true });
}

function setCartStep(step) {
  sessionStorage.setItem("pos_cart_step", step);
  refreshPosFast({ cart: true, mobileBar: true, preserveScroll: true });
}

function setPosMobileView(mode) {
  sessionStorage.setItem("pos_mobile_view", mode);
  if (mode === "cart") {
    sessionStorage.setItem("pos_cart_step", "items");
  }
  refreshPosFast({ layout: true, cart: true, mobileBar: true, preserveScroll: true });
}

function categoryCount(category) {
  return posProductSnapshot().counts.get(category) || 0;
}

function setCategory(category) {
  sessionStorage.setItem("pos_category", category);
  refreshPosFast({ categories: true, productFilter: true, preserveScroll: false });
}

function loadSelfOrderCart() {
  try {
    const items = JSON.parse(sessionStorage.getItem("omnipos_self_order_cart") || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function saveSelfOrderCart() {
  sessionStorage.setItem("omnipos_self_order_cart", JSON.stringify(selfOrderCart));
}

function selfOrderActiveCategory() {
  const categories = ["Semua", ...productCategories()];
  const selected = sessionStorage.getItem("self_order_category") || "Semua";
  return categories.includes(selected) ? selected : "Semua";
}

function selfOrderStep() {
  return sessionStorage.getItem("self_order_step") || "menu";
}

function pushSelfOrderHistory(step) {
  if (selfOrderHistoryNavigating) return;
  if (!IS_SELF_ORDER_APP && view !== "selforder") return;
  const current = history.state?.selfOrderStep || "menu";
  if (current === step) return;
  history.pushState({ selfOrderStep: step }, "", location.href);
}

function selfOrderItemsTotal() {
  return selfOrderCart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
}

function selfOrderSubtotal() {
  return selfOrderCart.reduce((sum, item) => sum + cartItemTotal(item), 0);
}

function selfOrderProduct(productId) {
  return state.products.find(product => product.id === productId && product.active);
}

function selfOrderCartProductQty(product) {
  const key = productUniqueKey(product);
  return selfOrderCart.reduce((sum, item) => {
    const itemProduct = state.products.find(candidate => candidate.id === item.productId);
    return itemProduct && productUniqueKey(itemProduct) === key ? sum + Number(item.qty || 0) : sum;
  }, 0);
}

function selfOrderSetCategory(category) {
  const currentCategories = document.querySelector(".self-order-categories");
  if (currentCategories) sessionStorage.setItem("self_order_category_scroll", String(currentCategories.scrollLeft || 0));
  sessionStorage.removeItem(SELF_ORDER_MENU_SCROLL_KEY);
  sessionStorage.setItem("self_order_category", category);
  sessionStorage.setItem("self_order_step", "menu");
  sessionStorage.removeItem("self_order_product_id");
  const catalog = document.querySelector("[data-self-order-catalog]");
  if (catalog) {
    catalog.innerHTML = renderSelfOrderCatalog();
    restoreSelfOrderCategoryScroll(true);
    return;
  }
  render();
}

function rememberSelfOrderCategoryScroll(element) {
  sessionStorage.setItem("self_order_category_scroll", String(element?.scrollLeft || 0));
}

function rememberSelfOrderMenuScroll(productId = "") {
  if (selfOrderStep() !== "menu") return;
  const selectors = [".self-order-standalone-content", ".content", ".page", ".self-order-main"];
  const anchor = productId ? document.querySelector(`[data-self-order-product-id="${cssEscape(productId)}"]`) : null;
  const positions = selectors
    .map(selector => {
      const element = document.querySelector(selector);
      return element ? { selector, top: element.scrollTop || 0, left: element.scrollLeft || 0 } : null;
    })
    .filter(Boolean);
  sessionStorage.setItem(SELF_ORDER_MENU_SCROLL_KEY, JSON.stringify({
    productId,
    anchorTop: anchor ? anchor.getBoundingClientRect().top : null,
    windowX: window.scrollX || 0,
    windowY: window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0,
    positions
  }));
}

function applySelfOrderMenuScrollSnapshot(snapshot) {
  if (!snapshot || selfOrderStep() !== "menu") return;
  (snapshot.positions || []).forEach(({ selector, top, left }) => {
    const element = document.querySelector(selector);
    if (!element) return;
    element.scrollTop = Number(top || 0);
    element.scrollLeft = Number(left || 0);
  });
  window.scrollTo(Number(snapshot.windowX || 0), Number(snapshot.windowY || 0));
  if (snapshot.productId && Number.isFinite(Number(snapshot.anchorTop))) {
    const anchor = document.querySelector(`[data-self-order-product-id="${cssEscape(snapshot.productId)}"]`);
    const scroller = document.querySelector(".self-order-standalone-content, .content, .page");
    if (!anchor) return;
    const delta = anchor.getBoundingClientRect().top - Number(snapshot.anchorTop || 0);
    if (Math.abs(delta) < 2) return;
    if (scroller && scroller.scrollHeight > scroller.clientHeight) scroller.scrollTop += delta;
    else window.scrollBy(0, delta);
  }
}

function restoreSelfOrderMenuScroll() {
  if (selfOrderStep() !== "menu") return;
  const raw = sessionStorage.getItem(SELF_ORDER_MENU_SCROLL_KEY);
  if (!raw) return;
  let snapshot = null;
  try {
    snapshot = JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(SELF_ORDER_MENU_SCROLL_KEY);
    return;
  }
  requestAnimationFrame(() => {
    applySelfOrderMenuScrollSnapshot(snapshot);
    setTimeout(() => applySelfOrderMenuScrollSnapshot(snapshot), 80);
    setTimeout(() => applySelfOrderMenuScrollSnapshot(snapshot), 220);
    setTimeout(() => applySelfOrderMenuScrollSnapshot(snapshot), 520);
    setTimeout(() => sessionStorage.removeItem(SELF_ORDER_MENU_SCROLL_KEY), 700);
  });
}

function restoreSelfOrderCategoryScroll(alignActive = false) {
  requestAnimationFrame(() => {
    const categories = document.querySelector(".self-order-categories");
    if (!categories) return;
    const saved = Number(sessionStorage.getItem("self_order_category_scroll") || 0);
    categories.scrollLeft = saved;
    if (alignActive) {
      categories.querySelector("button.active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
      rememberSelfOrderCategoryScroll(categories);
    }
  });
}

function selfOrderShowMenu() {
  sessionStorage.setItem("self_order_step", "menu");
  sessionStorage.removeItem("self_order_product_id");
  pushSelfOrderHistory("menu");
  render();
}

function selfOrderOpenProduct(productId) {
  if (!selfOrderProduct(productId)) return toast("Produk tidak tersedia.");
  rememberSelfOrderMenuScroll(productId);
  sessionStorage.setItem("self_order_product_id", productId);
  sessionStorage.setItem("self_order_step", "detail");
  sessionStorage.setItem("self_order_detail_qty", "1");
  pushSelfOrderHistory("detail");
  render();
}

function selfOrderShowCart() {
  sessionStorage.setItem("self_order_step", "cart");
  pushSelfOrderHistory("cart");
  render();
}

function selfOrderShowPayment() {
  if (!selfOrderCart.length) return toast("Keranjang masih kosong.");
  sessionStorage.setItem("self_order_step", "payment");
  pushSelfOrderHistory("payment");
  render();
}

function selfOrderAvailableAddons(product) {
  const allowedIds = Array.isArray(product?.allowedAddonIds) ? product.allowedAddonIds : [];
  if (!allowedIds.length) return [];
  return state.addons.filter(addon => addon.active !== false && !addon.soldOut && allowedIds.includes(addon.id));
}

function selfOrderVariantKey(product, option) {
  if (product?.variantMode === "2") return `${option.parentName || ""}|||${option.childName || option.name || ""}`;
  return option.name || "";
}

function readSelfOrderVariantSelections(product) {
  const groups = productVariantGroups(product);
  const selections = groups.map(group => {
    const input = document.querySelector(`input[name="self_variant_${group.level}"]:checked:not(:disabled)`);
    if (!input) return null;
    return {
      level: input.dataset.level,
      group: input.dataset.group,
      name: input.value,
      cartName: input.dataset.cartName || input.value,
      parentName: input.dataset.parentName || "",
      childName: input.dataset.childName || "",
      price: Number(input.dataset.price || 0),
      cost: Number(input.dataset.cost || 0)
    };
  }).filter(Boolean);
  const missingRequired = groups.some(group => group.required && !selections.some(selection => selection.level === String(group.level)));
  return { selections, missingRequired };
}

function selfOrderDetailQty() {
  return Math.max(1, Number(sessionStorage.getItem("self_order_detail_qty") || 1) || 1);
}

function selfOrderSetDetailQty(delta) {
  const nextQty = Math.max(1, selfOrderDetailQty() + delta);
  sessionStorage.setItem("self_order_detail_qty", String(nextQty));
  const qtyLabel = document.querySelector(".self-order-detail-qty strong");
  if (qtyLabel) qtyLabel.textContent = String(nextQty);
}

function selfOrderAddProduct(productId) {
  const product = selfOrderProduct(productId);
  if (!product || product.soldOut) return toast("Produk sedang tidak tersedia.");
  const { selections, missingRequired } = readSelfOrderVariantSelections(product);
  if (missingRequired) return toast("Pilih varian terlebih dahulu.");
  const selectedAddons = Array.from(document.querySelectorAll("[data-self-addon]:checked")).map(input => {
    const addon = selfOrderAvailableAddons(product).find(item => item.id === input.value);
    return addon ? { id: addon.id, name: addon.name, price: Number(addon.price || 0), cost: Number(addon.cost || 0), qty: 1 } : null;
  }).filter(Boolean);
  const cartItem = { ...buildCartItem(product, selections), addons: selectedAddons, note: "", qty: selfOrderDetailQty() };
  selfOrderCart = [...selfOrderCart, cartItem];
  saveSelfOrderCart();
  sessionStorage.setItem("self_order_step", "menu");
  sessionStorage.removeItem("self_order_product_id");
  sessionStorage.setItem("self_order_detail_qty", "1");
  toast(`${product.name} ditambahkan.`);
  render();
}

function selfOrderChangeQty(lineId, delta) {
  selfOrderCart = selfOrderCart
    .map(item => item.lineId === lineId ? { ...item, qty: Math.max(0, Number(item.qty || 0) + delta) } : item)
    .filter(item => Number(item.qty || 0) > 0);
  saveSelfOrderCart();
  render();
}

function selfOrderRemoveItem(lineId) {
  selfOrderCart = selfOrderCart.filter(item => item.lineId !== lineId);
  saveSelfOrderCart();
  render();
}

function selfOrderSelectPayment(method) {
  sessionStorage.setItem("self_order_payment", method);
  render();
}

async function selfOrderCreateOrder() {
  if (selfOrderSubmitting) return;
  if (!state.cashSession.open) return toast("Kas belum dibuka. Minta bantuan staff.");
  if (!selfOrderCart.length) return toast("Keranjang masih kosong.");
  let renderedCompletion = false;
  selfOrderSubmitting = true;
  selfOrderSubmitError = "";
  try {
  const paymentMethod = sessionStorage.getItem("self_order_payment") || "cash";
  syncSelfOrderTableFromUrl();
  const table = String(sessionStorage.getItem("self_order_table") || "A-1").trim();
  const customer = String(document.getElementById("selfOrderCustomer")?.value || sessionStorage.getItem("self_order_customer") || "").trim();
  const note = String(document.getElementById("selfOrderCheckoutNote")?.value || sessionStorage.getItem("self_order_checkout_note") || "").trim();
  sessionStorage.setItem("self_order_table", table || "A-1");
  render();
  await new Promise(resolve => window.setTimeout(resolve, 0));
  const subtotal = selfOrderSubtotal();
  if (supabaseReadable()) {
    await loadRecentOrdersFromSupabase({ force: true, silent: true });
  }
  const openOrder = selfOrderOpenTableOrder(table || "A-1");
  const orderBatch = openOrder
    ? Math.max(1, ...((openOrder.items || []).map(orderItemBatch))) + 1
    : 1;
  const orderItems = tagOrderBatchItems(selfOrderCart.map(item => ({ ...item })), orderBatch, note);
  const previousOpenOrder = openOrder ? JSON.parse(JSON.stringify(openOrder)) : null;
  const order = {
    id: openOrder?.id || uid(),
    number: openOrder?.number || orderNumber(),
    source: "Self Order",
    type: "Dine In",
    customer: openOrder?.customer || customer || "",
    serviceInfo: table || "A-1",
    note: openOrder ? (openOrder.note || "") : note,
    status: openOrder?.status === "Selesai" ? "Sedang Disiapkan" : (openOrder?.status || "Pesanan Baru"),
    paymentStatus: "Belum dibayar",
    paymentMethod: paymentMethod === "qris" ? "QRIS Self Order" : "Bayar di Kasir",
    receivedAmount: 0,
    changeAmount: 0,
    printReceipt: false,
    items: openOrder ? [...(normalizeOrderBatches(openOrder).items || []), ...orderItems] : orderItems,
    subtotal: Number(openOrder?.subtotal || 0) + subtotal,
    discount: Number(openOrder?.discount || 0),
    tax: Number(openOrder?.tax || 0),
    serviceFee: Number(openOrder?.serviceFee || 0),
    deliveryFee: Number(openOrder?.deliveryFee || 0),
    grandTotal: Number(openOrder?.grandTotal || openOrder?.subtotal || 0) + subtotal,
    createdAt: openOrder?.createdAt || new Date().toISOString(),
    confirmedAt: openOrder?.confirmedAt || null,
    preparedAt: openOrder?.preparedAt || null,
    readyAt: openOrder?.readyAt || null,
    completedAt: openOrder?.status === "Selesai" ? null : (openOrder?.completedAt || null),
    cancelledAt: null,
    preparedItems: openOrder?.preparedItems || {}
  };
  const touchedProductIds = [];
  const stockRollback = [];
  for (const item of orderItems) {
    const product = state.products.find(candidate => candidate.id === item.productId);
    if (product?.trackStock) {
      if (product.stock < item.qty) {
        selfOrderSubmitError = `Stok ${product.name} tidak cukup.`;
        return;
      }
      stockRollback.push({ product, stock: Number(product.stock || 0) });
      product.stock -= item.qty;
      touchedProductIds.push(product.id);
      state.stockMovements.unshift({ id: uid(), at: new Date().toISOString(), productId: product.id, productName: product.name, qty: -item.qty, reason: `Self order ${order.number}` });
    }
  }
  if (openOrder) {
    Object.assign(openOrder, order);
    state.orders = [openOrder, ...state.orders.filter(item => item.id !== openOrder.id)];
  } else {
    state.orders.unshift(order);
  }
  audit("Self order dibuat", `${order.number} ${order.serviceInfo} ${money(orderTotal(order))}`);
  saveState();
  const synced = await syncOrderToSupabase(order, { silent: true });
  if (!synced) {
    stockRollback.forEach(entry => {
      entry.product.stock = entry.stock;
    });
    state.stockMovements = state.stockMovements.filter(movement => movement.reason !== `Self order ${order.number}`);
    if (openOrder && previousOpenOrder) Object.assign(openOrder, previousOpenOrder);
    else state.orders = state.orders.filter(item => item.id !== order.id);
    state.syncQueue = (state.syncQueue || []).filter(item => item.orderId !== orderSyncQueueId(order));
    saveState();
    selfOrderSubmitError = "Gagal mengirim pesanan, cek koneksi anda lalu coba lagi";
    return;
  }
  selfOrderCart = [];
  saveSelfOrderCart();
  sessionStorage.removeItem("self_order_customer");
  sessionStorage.removeItem("self_order_checkout_note");
  sessionStorage.setItem("self_order_last_order", JSON.stringify({
    number: order.number,
    total: orderTotal(order),
    paymentMethod: order.paymentMethod,
    table: order.serviceInfo,
    customer: order.customer || "",
    appended: Boolean(openOrder),
    batch: orderBatch
  }));
  sessionStorage.setItem("self_order_step", "success");
  pushSelfOrderHistory("success");
  saveState();
  syncProductsByIds(touchedProductIds);
  broadcastRealtimeEvent("orders");
  broadcastRealtimeEvent("products");
  render();
  renderedCompletion = true;
  } catch (error) {
    console.error("Self order submit failed", error);
    selfOrderSubmitError = "Gagal mengirim pesanan, cek koneksi anda lalu coba lagi";
  } finally {
    selfOrderSubmitting = false;
    if (!renderedCompletion) render();
  }
}

function renderSelfOrder() {
  preloadSelfOrderPromoImages();
  const step = selfOrderStep();
  const content = step === "detail" ? renderSelfOrderDetail()
    : step === "cart" ? renderSelfOrderCart()
    : step === "payment" ? renderSelfOrderPayment()
    : step === "success" ? renderSelfOrderSuccess()
    : renderSelfOrderMenu();
  return `
    <section class="self-order-app">
      ${renderSelfOrderTopbar()}
      ${content}
      ${step === "menu" ? renderSelfOrderFloatingCart() : ""}
      ${renderSelfOrderBottomNav(step)}
    </section>
  `;
}

function renderSelfOrderTopbar() {
  syncSelfOrderTableFromUrl();
  const table = sessionStorage.getItem("self_order_table") || "A-1";
  const appName = state.settings.selfOrderAppName || state.settings.receiptStoreName || "Kasirin Cafe";
  const outletName = state.settings.selfOrderOutletName || state.outlet || "Outlet Utama";
  const profileImage = String(state.settings.selfOrderProfileImageDataUrl || state.settings.receiptLogoDataUrl || "").trim();
  return `
    <header class="self-order-topbar">
      <button type="button" class="self-order-icon-btn ${profileImage ? "has-photo" : ""}" onclick="selfOrderShowMenu()" aria-label="Menu">
        ${profileImage ? mediaImageTag(profileImage, "Foto profil self order", "", 240) : navIcon("selforder")}
      </button>
      <div>
        <strong>${escapeHtml(appName)}</strong>
        <span>${escapeHtml(outletName)}</span>
      </div>
      <label class="self-order-table">
        <span>Meja</span>
        <strong>${escapeHtml(table.replace(/^Meja\s*/i, ""))}</strong>
      </label>
    </header>
  `;
}

function renderSelfOrderMenu() {
  return `
    <main class="self-order-main">
      ${renderSelfOrderPromo()}
      <div data-self-order-catalog>
        ${renderSelfOrderCatalog()}
      </div>
    </main>
  `;
}

function renderSelfOrderCatalog() {
  const category = selfOrderActiveCategory();
  const activeProducts = stableProducts(state.products).filter(product => product.active && product.channelSelfOrder === true && !product.soldOut);
  const visibleCategories = productCategories().filter(item => activeProducts.some(product => product.category === item));
  const categories = ["Semua", ...visibleCategories];
  const safeCategory = category === "Semua" || visibleCategories.includes(category) ? category : "Semua";
  const categoryProducts = activeProducts.filter(product => safeCategory === "Semua" || product.category === safeCategory);
  return `
    <section class="self-order-categories" aria-label="Kategori produk" onscroll="rememberSelfOrderCategoryScroll(this)">
      ${categories.map(item => `
        <button class="${item === safeCategory ? "active" : ""}" type="button" onclick='selfOrderSetCategory(${JSON.stringify(item)})'>
          ${escapeHtml(item)}
        </button>
      `).join("")}
    </section>
    ${safeCategory === "Semua"
      ? (visibleCategories.map(item => renderSelfOrderCategorySection(item, activeProducts.filter(product => product.category === item).slice(0, 6), true)).join("") || empty("Belum ada produk aktif."))
      : renderSelfOrderCategorySection(safeCategory, categoryProducts, false)}
  `;
}

function renderSelfOrderCategorySection(category, products, showAllButton) {
  return `
    <section class="self-order-menu-section">
      <div class="self-order-menu-section-head">
        <h3>Pilihan ${escapeHtml(category)}</h3>
        ${showAllButton ? `<button type="button" onclick='selfOrderSetCategory(${JSON.stringify(category)})'>Lihat semua</button>` : ""}
      </div>
      <div class="self-order-grid">
        ${products.map(renderSelfOrderProductCard).join("") || empty("Belum ada produk aktif untuk kategori ini.")}
      </div>
    </section>
  `;
}

function renderSelfOrderProductCard(product) {
  const selectedQty = selfOrderCartProductQty(product);
  return `
    <article class="self-order-card" data-self-order-product-id="${escapeHtml(product.id)}">
      <button class="self-order-card-media" type="button" onclick="selfOrderOpenProduct('${product.id}')">
        ${productImageOrToken(product, "self-order-product-img", 420)}
        ${selectedQty ? `<span class="self-order-selected-chip">${selectedQty}</span>` : ""}
        ${product.trackStock && product.stock <= product.minStock ? `<span>Terbatas</span>` : ""}
      </button>
      <div class="self-order-card-body">
        <button type="button" onclick="selfOrderOpenProduct('${product.id}')">
          <strong>${escapeHtml(product.name)}</strong>
        </button>
        <div>
          <b>${productDisplayPrice(product)}</b>
        </div>
      </div>
    </article>
  `;
}

function renderSelfOrderPromo() {
  const slides = selfOrderPromoSlides();
  const activeIndex = Math.min(Number(sessionStorage.getItem("self_order_promo_slide") || 0) || 0, Math.max(0, slides.length - 1));
  const slide = slides[activeIndex] || { image: "", productId: "", label: "Order Now" };
  const label = String(slide.label || "Order Now").trim() || "Order Now";
  const hasImage = slides.some(item => String(item.image || "").trim());
  return `
    <section class="self-order-promo ${hasImage ? "has-image" : "is-empty"}" data-active-index="${activeIndex}" style="--promo-index:${activeIndex};--promo-offset:0%" ontouchstart="selfOrderPromoTouchStart(event)" ontouchmove="selfOrderPromoTouchMove(event)" ontouchend="selfOrderPromoTouchEnd(event)">
      <div class="self-order-promo-track">
        ${slides.map((item, index) => {
          const image = String(item.image || "").trim();
          return `
            <div class="self-order-promo-slide ${index === activeIndex ? "active" : ""}" data-promo-slide="${index}">
              ${image ? mediaImageTag(image, `Promo self order ${index + 1}`, "self-order-promo-img", 1200) : `<div class="self-order-promo-empty"></div>`}
            </div>
          `;
        }).join("")}
      </div>
      <button class="self-order-promo-cta" type="button" onclick="selfOrderOpenPromoTarget(${activeIndex})">${escapeHtml(label)}<i aria-hidden="true"></i></button>
      ${slides.length > 1 ? `
        <button class="self-order-promo-nav prev" type="button" onclick="selfOrderShiftPromoSlide(-1)" aria-label="Promo sebelumnya"></button>
        <button class="self-order-promo-nav next" type="button" onclick="selfOrderShiftPromoSlide(1)" aria-label="Promo berikutnya"></button>
      ` : ""}
      ${slides.length > 1 ? `<div class="self-order-promo-dots">${slides.map((_, index) => `<button class="${index === activeIndex ? "active" : ""}" type="button" onclick="selfOrderSetPromoSlide(${index})" aria-label="Promo ${index + 1}"></button>`).join("")}</div>` : ""}
    </section>
  `;
}

function selfOrderPromoSlides() {
  const settings = state.settings || {};
  const configuredSlides = Array.isArray(settings.selfOrderPromoSlides) ? settings.selfOrderPromoSlides : [];
  const slides = configuredSlides
    .map(slide => ({
      image: String(slide?.image || "").trim(),
      productId: String(slide?.productId || "").trim(),
      label: String(slide?.label || "Order Now").trim() || "Order Now"
    }))
    .filter(slide => slide.image || slide.productId || slide.label !== "Order Now");
  if (slides.length) return slides;
  return [{
    image: String(settings.selfOrderPromoImageDataUrl || "").trim(),
    productId: String(settings.selfOrderPromoTargetProductId || "").trim(),
    label: String(settings.selfOrderPromoButtonLabel || "Order Now").trim() || "Order Now"
  }];
}

function preloadSelfOrderPromoImages() {
  selfOrderPromoSlides()
    .map(slide => String(slide.image || "").trim())
    .filter(Boolean)
    .filter(url => !selfOrderPromoPreloadUrls.has(url))
    .forEach((url, index) => {
      selfOrderPromoPreloadUrls.add(url);
      window.setTimeout(() => {
        const image = new Image();
        image.decoding = "async";
        image.src = url;
      }, index * 220);
    });
}

function selfOrderSetPromoSlide(index) {
  const slides = selfOrderPromoSlides();
  const nextIndex = Math.min(Math.max(0, Number(index) || 0), Math.max(0, slides.length - 1));
  sessionStorage.setItem("self_order_promo_slide", String(nextIndex));
  const promo = document.querySelector(".self-order-promo");
  if (promo) {
    const slide = slides[nextIndex] || slides[0] || {};
    const label = String(slide.label || "Order Now").trim() || "Order Now";
    promo.dataset.activeIndex = String(nextIndex);
    promo.style.setProperty("--promo-index", String(nextIndex));
    promo.style.setProperty("--promo-offset", `${nextIndex * -100}%`);
    promo.querySelectorAll("[data-promo-slide]").forEach((element, itemIndex) => {
      element.classList.toggle("active", itemIndex === nextIndex);
    });
    promo.querySelectorAll(".self-order-promo-dots button").forEach((element, itemIndex) => {
      element.classList.toggle("active", itemIndex === nextIndex);
    });
    const cta = promo.querySelector(".self-order-promo-cta");
    if (cta) {
      cta.onclick = () => selfOrderOpenPromoTarget(nextIndex);
      cta.firstChild.nodeValue = label;
    }
    return;
  }
  render();
}

function selfOrderShiftPromoSlide(direction) {
  const slides = selfOrderPromoSlides();
  if (slides.length < 2) return;
  const currentIndex = Number(sessionStorage.getItem("self_order_promo_slide") || 0) || 0;
  selfOrderSetPromoSlide((currentIndex + direction + slides.length) % slides.length);
}

function selfOrderPromoTouchStart(event) {
  selfOrderPromoTouchStartX = Number(event.touches?.[0]?.clientX || 0);
  selfOrderPromoTouchCurrentX = selfOrderPromoTouchStartX;
}

function selfOrderPromoTouchMove(event) {
  selfOrderPromoTouchCurrentX = Number(event.touches?.[0]?.clientX || selfOrderPromoTouchCurrentX || 0);
}

function selfOrderPromoTouchEnd() {
  const delta = selfOrderPromoTouchCurrentX - selfOrderPromoTouchStartX;
  selfOrderPromoTouchStartX = 0;
  selfOrderPromoTouchCurrentX = 0;
  if (Math.abs(delta) < 42) return;
  selfOrderShiftPromoSlide(delta < 0 ? 1 : -1);
}

function autoAdvanceSelfOrderPromo() {
  if (!IS_SELF_ORDER_APP && view !== "selforder") return;
  if (selfOrderStep() !== "menu") return;
  if (isBlockingInteractionActive()) return;
  if (selfOrderPromoSlides().length < 2) return;
  selfOrderShiftPromoSlide(1);
}

function selfOrderCategoryIcon(category) {
  const normalized = String(category || "").toLowerCase();
  const icon = normalized === "semua" ? "dashboard"
    : normalized.includes("kopi") ? "coffee"
    : normalized.includes("makan") ? "food"
    : normalized.includes("minum") || normalized.includes("non") ? "drink"
    : normalized.includes("nasi") ? "rice"
    : "selforder";
  return navIcon(icon);
}

function selfOrderOpenPromoTarget(index = 0) {
  const slide = selfOrderPromoSlides()[index] || selfOrderPromoSlides()[0] || {};
  const targetId = slide.productId || state.settings?.selfOrderPromoTargetProductId || "";
  const savedTarget = selfOrderProduct(targetId);
  const target = savedTarget && !savedTarget.soldOut
    ? savedTarget
    : state.products.find(product => product.active && !product.soldOut);
  if (!target) return toast("Produk promo belum tersedia.");
  selfOrderOpenProduct(target.id);
}

function renderSelfOrderDetail() {
  const product = selfOrderProduct(sessionStorage.getItem("self_order_product_id"));
  if (!product) return renderSelfOrderMenu();
  const addons = selfOrderAvailableAddons(product);
  const variantGroups = productVariantGroups(product);
  return `
    <main class="self-order-main detail">
      <button class="self-order-back" type="button" onclick="selfOrderShowMenu()">${navIcon("back")} Kembali</button>
      <section class="self-order-detail">
        <div class="self-order-detail-media">${productImageOrToken(product, "self-order-detail-img", 420)}</div>
        <form class="self-order-detail-panel" onsubmit="event.preventDefault(); selfOrderAddProduct('${product.id}')">
          <h3>${escapeHtml(product.name)}</h3>
          <strong>${productDisplayPrice(product)}</strong>
          <p>Disiapkan sekitar ${Number(product.prepMinutes || 8)} menit setelah pesanan dikonfirmasi.</p>
          ${variantGroups.length ? renderSelfOrderVariantGroups(product, variantGroups) : ""}
          ${addons.length ? `
            <div class="self-order-option-group">
              <h4>Tambahan</h4>
              ${addons.map(addon => `
                <label class="self-order-addon">
                  <span><b>${escapeHtml(addon.name)}</b><small>+ ${money(addon.price)}</small></span>
                  <input type="checkbox" value="${escapeHtml(addon.id)}" data-self-addon />
                </label>
              `).join("")}
            </div>
          ` : ""}
          <div class="self-order-detail-actions">
            <div class="self-order-detail-qty" aria-label="Jumlah">
              <button type="button" onclick="selfOrderSetDetailQty(-1)">-</button>
              <strong>${selfOrderDetailQty()}</strong>
              <button type="button" onclick="selfOrderSetDetailQty(1)">+</button>
            </div>
            <button class="self-order-primary" type="submit">Tambah ke Keranjang</button>
          </div>
        </form>
      </section>
    </main>
  `;
}

function renderSelfOrderVariantGroups(product, groups) {
  return groups.map(group => {
    const availableOptions = group.options.filter(option => !isProductVariantSoldOut(product, selfOrderVariantKey(product, option)));
    const groupName = selfOrderLabelCase(group.name || "Varian");
    return `
      <div class="self-order-option-group self-order-variant-group">
        <h4>${escapeHtml(groupName)}${group.required ? " (Wajib)" : ""}</h4>
        <div class="self-order-variant-list">
          ${group.options.map((option, index) => {
            const soldOut = isProductVariantSoldOut(product, selfOrderVariantKey(product, option));
            const checked = group.required && !soldOut && availableOptions[0] === option;
            const label = option.cartName || option.childName || option.name || "Varian";
            return `
              <label class="self-order-variant ${soldOut ? "disabled" : ""}">
                <input
                  type="radio"
                  name="self_variant_${escapeHtml(group.level)}"
                  value="${escapeHtml(option.name || label)}"
                  data-level="${escapeHtml(group.level)}"
                  data-group="${escapeHtml(group.name || "Varian")}"
                  data-cart-name="${escapeHtml(label)}"
                  data-parent-name="${escapeHtml(option.parentName || "")}"
                  data-child-name="${escapeHtml(option.childName || "")}"
                  data-price="${Number(option.price || 0)}"
                  data-cost="${Number(option.cost || 0)}"
                  ${checked ? "checked" : ""}
                  ${group.required ? "required" : ""}
                  ${soldOut ? "disabled" : ""}
                />
                <span><b>${escapeHtml(label)}</b><small>${soldOut ? "Habis" : money(option.price || product.price)}</small></span>
              </label>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");
}

function selfOrderLabelCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function renderSelfOrderCart() {
  const subtotal = selfOrderSubtotal();
  return `
    <main class="self-order-main cart">
      <div class="self-order-section-head">
        <div><span>Keranjang</span><h3>${selfOrderItemsTotal()} item</h3></div>
      </div>
      <section class="self-order-cart-list">
        ${selfOrderCart.map(item => `
          <article class="self-order-cart-item">
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              ${(item.addons || []).length ? `<small>${item.addons.map(addon => `+ ${escapeHtml(addon.name)}`).join(" ")}</small>` : ""}
              ${item.note ? `<small>${escapeHtml(item.note)}</small>` : ""}
              <b>${money(cartItemTotal(item))}</b>
            </div>
            <div class="self-order-qty">
              <div class="self-order-qty-stepper">
                <button type="button" onclick="selfOrderChangeQty('${item.lineId}', -1)">-</button>
                <span>${Number(item.qty || 0)}</span>
                <button type="button" onclick="selfOrderChangeQty('${item.lineId}', 1)">+</button>
              </div>
              <button type="button" class="danger" onclick="selfOrderRemoveItem('${item.lineId}')" aria-label="Hapus">x</button>
            </div>
          </article>
        `).join("") || empty("Keranjang masih kosong.")}
      </section>
      <section class="self-order-summary">
        <div><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
        <div><span>Pajak</span><strong>${money(0)}</strong></div>
        <div class="total"><span>Total</span><strong>${money(subtotal)}</strong></div>
      </section>
      <button class="self-order-primary self-order-cart-pay" type="button" onclick="selfOrderShowPayment()" ${selfOrderCart.length ? "" : "disabled"}>Lanjut ke Pembayaran</button>
    </main>
  `;
}

function renderSelfOrderPayment() {
  const payment = sessionStorage.getItem("self_order_payment") || "cash";
  syncSelfOrderTableFromUrl();
  const table = String(sessionStorage.getItem("self_order_table") || "A-1").trim();
  const openOrder = selfOrderOpenTableOrder(table || "A-1");
  const isCustomerLocked = Boolean(openOrder);
  const lockedCustomer = isCustomerLocked ? String(openOrder?.customer || "").trim() : "";
  const customer = isCustomerLocked ? lockedCustomer : (sessionStorage.getItem("self_order_customer") || "");
  const note = sessionStorage.getItem("self_order_checkout_note") || "";
  const customerInputAttrs = isCustomerLocked
    ? `readonly aria-readonly="true" title="Nama mengikuti pesanan aktif meja ${escapeHtml(table || "A-1")}"`
    : `oninput="sessionStorage.setItem('self_order_customer', this.value)"`;
  const submitLabel = selfOrderSubmitting
    ? `<span class="self-order-btn-spinner" aria-hidden="true"></span><span>Mengirim pesanan</span>`
    : "Selesaikan Pesanan";
  return `
    <main class="self-order-main payment">
      <div class="self-order-section-head">
        <div><span>Pembayaran</span><h3>Total ${money(selfOrderSubtotal())}</h3></div>
      </div>
      <section class="self-order-payment-shell">
        <div class="self-order-checkout">
          <label><span>Nama</span><input id="selfOrderCustomer" value="${escapeHtml(customer)}" placeholder="Opsional" ${customerInputAttrs} /></label>
          <label class="wide"><span>Catatan</span><textarea id="selfOrderCheckoutNote" placeholder="Opsional" oninput="sessionStorage.setItem('self_order_checkout_note', this.value)">${escapeHtml(note)}</textarea></label>
        </div>
      </section>
      <section class="self-order-payment-methods">
        <button class="${payment === "cash" ? "active" : ""}" type="button" onclick="selfOrderSelectPayment('cash')">
          <b>Bayar di Kasir</b><span>Tunai, debit, atau kartu di counter.</span>
        </button>
        <button class="${payment === "qris" ? "active" : ""}" type="button" onclick="selfOrderSelectPayment('qris')">
          <b>QRIS</b><span>Verifikasi pembayaran oleh staff.</span>
        </button>
      </section>
      <button class="self-order-primary self-order-finish" type="button" onclick="selfOrderCreateOrder()" ${selfOrderSubmitting ? `disabled aria-busy="true"` : ""}>${submitLabel}</button>
      ${selfOrderSubmitError ? `<p class="self-order-submit-error" role="alert">${escapeHtml(selfOrderSubmitError)}</p>` : ""}
    </main>
  `;
}

function renderSelfOrderSuccess() {
  const raw = sessionStorage.getItem("self_order_last_order");
  const order = raw ? JSON.parse(raw) : null;
  const customer = String(order?.customer || "").trim();
  return `
    <main class="self-order-main success">
      <section class="self-order-success-card">
        <div class="self-order-success-mark" aria-hidden="true">✓</div>
        <h2>Pesanan diterima</h2>
        <div class="self-order-success-detail">
          <span><b>Nomor meja</b><strong>${escapeHtml(order?.table || "A-1")}</strong></span>
          <span><b>Nomor order</b><strong>${escapeHtml(displayOrderNumber(order?.number || "-"))}</strong></span>
          <span><b>Nominal</b><strong>${money(order?.total || 0)}</strong></span>
          <span><b>Status bayar</b><strong>${escapeHtml(order?.paymentMethod || "-")}</strong></span>
          <span><b>Nama pelanggan</b><strong>${customer ? escapeHtml(customer) : "-"}</strong></span>
        </div>
        <p>Pesanan anda telah kami terima dan akan segera di proses +-20 menit, Terimakasih.</p>
        <button class="self-order-primary" type="button" onclick="selfOrderShowMenu()">Pesan Lagi</button>
      </section>
    </main>
  `;
}

function renderSelfOrderFloatingCart() {
  if (!selfOrderCart.length) return "";
  return `
    <button class="self-order-floating-cart" type="button" onclick="selfOrderShowCart()">
      <span><b aria-hidden="true">${navIcon("pos")}</b>${selfOrderItemsTotal()} item</span>
      <strong>${money(selfOrderSubtotal())}<i aria-hidden="true">&rsaquo;</i></strong>
    </button>
  `;
}

function renderSelfOrderBottomNav(step) {
  const items = [
    ["menu", "Menu", "selfOrderShowMenu()"],
    ["cart", "Keranjang", "selfOrderShowCart()"],
    ["payment", "Bayar", "selfOrderShowPayment()"]
  ];
  return `
    <nav class="self-order-bottom-nav">
      ${items.map(([id, label, action]) => `
        <button class="${step === id ? "active" : ""}" type="button" onclick="${action}">
          ${selfOrderTabIcon(id)}
          <span>${escapeHtml(label)}</span>
        </button>
      `).join("")}
    </nav>
  `;
}

function selfOrderTabIcon(id) {
  const count = selfOrderItemsTotal();
  if (id === "cart") {
    return `
      <span class="self-order-nav-icon cart-icon" aria-hidden="true">
        <svg viewBox="0 0 48 48"><path d="M9 12h5l4 22h20l4-16H17"/><circle cx="20" cy="40" r="2"/><circle cx="36" cy="40" r="2"/></svg>
        ${count ? `<em>${count}</em>` : ""}
      </span>
    `;
  }
  if (id === "payment") {
    return `
      <span class="self-order-nav-icon payment-icon" aria-hidden="true">
        <svg viewBox="0 0 48 48"><path d="M11 17h28a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4V21a4 4 0 0 1 4-4Z"/><path d="M13 17l23-8 2 8"/><path d="M35 28h8"/><circle cx="35" cy="28" r="2"/></svg>
        <i></i>
      </span>
    `;
  }
  return `
    <span class="self-order-nav-icon menu-icon" aria-hidden="true">
      <svg viewBox="0 0 48 48"><path d="M15 16h18M15 24h18M15 32h18"/><circle cx="10" cy="16" r="2"/><circle cx="10" cy="24" r="2"/><circle cx="10" cy="32" r="2"/></svg>
    </span>
  `;
}

function posProductSearchText(product) {
  return [product?.name, product?.sku, product?.category].join(" ").toLowerCase();
}

function posProductSnapshotSignature() {
  const categories = (state.categories || []).map(item => String(item || "")).join("\u001f");
  const products = (state.products || []).map(product => [
    product?.id,
    product?.localId,
    product?.supabaseId,
    product?.name,
    product?.sku,
    product?.category,
    product?.active,
    product?.channelPOS,
    product?.soldOut,
    product?.trackStock,
    product?.stock,
    product?.price,
    product?.imageName,
    product?.variantMode,
    product?.variantGroup,
    product?.variantGroup2,
    JSON.stringify(product?.variantOptions || []),
    JSON.stringify(product?.variantOptions2 || [])
  ].join("\u001e")).join("\u001f");
  return `${categories}\u001d${products}`;
}

function posProductSnapshot() {
  const signature = posProductSnapshotSignature();
  if (posProductSnapshotCache.signature === signature && posProductSnapshotCache.snapshot) {
    return posProductSnapshotCache.snapshot;
  }
  const products = stableProducts(state.products).filter(product => product.active && product.channelPOS !== false);
  const categoryNames = [...new Set([...(state.categories || []), ...products.map(item => item.category).filter(Boolean)])]
    .sort((a, b) => String(a || "").localeCompare(String(b || ""), "id", { sensitivity: "base" }));
  const categories = ["Semua", ...categoryNames];
  const counts = new Map(categories.map(category => [category, 0]));
  counts.set("Semua", products.length);
  products.forEach(product => {
    if (!product.category) return;
    counts.set(product.category, (counts.get(product.category) || 0) + 1);
  });
  const snapshot = { products, categories, counts };
  posProductSnapshotCache = { signature, snapshot };
  return snapshot;
}

function posCategories() {
  return posProductSnapshot().categories;
}

function selectedPosCategory() {
  const snapshot = posProductSnapshot();
  const selected = sessionStorage.getItem("pos_category") || "Semua";
  return snapshot.categories.includes(selected) ? selected : "Semua";
}

function posProductMatchesFilter(product, selected = selectedPosCategory(), query = String(sessionStorage.getItem("pos_query") || "").toLowerCase()) {
  return (selected === "Semua" || product.category === selected) && (!query || posProductSearchText(product).includes(query));
}

function posProductImageTag(product) {
  const candidates = mediaImageCandidates(product?.imageName, 120);
  const initials = escapeHtml(String(product?.name || "PR").slice(0, 2).toUpperCase());
  if (!candidates.length) return initials;
  const alt = escapeHtml(`Foto ${product.name}`);
  return `
    <span class="media-fallback-token">${initials}</span>
    <img class="product-thumb" data-pos-lazy-image data-src="${escapeHtml(candidates[0])}" data-media-index="0" onload="if(this.previousElementSibling)this.previousElementSibling.hidden=true" onerror="${mediaImageFallbackScript(product.imageName, 120)}" alt="${alt}" loading="lazy" decoding="async" />
  `;
}

function hydratePosProductImages() {
  const runner = () => {
    document.querySelectorAll("[data-pos-product-card]:not(.pos-filter-hidden) img[data-pos-lazy-image]:not([src])").forEach(img => {
      const src = img.getAttribute("data-src");
      if (src) img.src = src;
    });
  };
  requestAnimationFrame(() => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(runner, { timeout: 500 });
    else window.setTimeout(runner, 80);
  });
}

function posVisibleProducts() {
  const snapshot = posProductSnapshot();
  const selected = selectedPosCategory();
  const query = String(sessionStorage.getItem("pos_query") || "").toLowerCase();
  return snapshot.products.filter(product => posProductMatchesFilter(product, selected, query));
}

function renderPosCategoryCards() {
  const snapshot = posProductSnapshot();
  const selected = selectedPosCategory();
  return `
    <div class="category-cards">
      ${snapshot.categories.map(cat => `<button class="category-card ${cat === selected ? "active" : ""}" type="button" onclick="setCategory(${JSON.stringify(cat).replaceAll('"', "&quot;")})"><strong>${escapeHtml(cat)}</strong><span>${snapshot.counts.get(cat) || 0} item</span></button>`).join("")}
    </div>
  `;
}

function renderPosProductList() {
  const saleLocked = !!sessionStorage.getItem("pos_last_result");
  const snapshot = posProductSnapshot();
  const visibleProducts = posVisibleProducts();
  return `
    <div class="product-list">
      ${saleLocked ? `<div class="sale-lock-card"><strong>Transaksi terakhir selesai</strong><span>Klik Transaksi Baru sebelum memilih barang lagi.</span><button class="btn green" onclick="startNewSale()">Transaksi Baru</button></div>` : ""}
      ${snapshot.products.map(product => productCard(product)).join("")}
      <div data-pos-product-empty ${visibleProducts.length ? "hidden" : ""}>${empty("Produk tidak ditemukan.")}</div>
    </div>
  `;
}

function renderPosCartPanel() {
  const cartStep = sessionStorage.getItem("pos_cart_step") || "items";
  const orderType = sessionStorage.getItem("pos_order_type") || "Dine In";
  const customerName = sessionStorage.getItem("pos_customer_name") || "";
  const serviceInfo = sessionStorage.getItem("pos_service_info") || "";
  const orderNote = sessionStorage.getItem("pos_order_note") || "";
  const paymentMethod = sessionStorage.getItem("pos_payment_method") || "Tunai";
  const paymentSlide = sessionStorage.getItem("pos_payment_slide") || "quick";
  const receivedAmount = Number(sessionStorage.getItem("pos_received_amount") || 0);
  const payingUnpaidId = sessionStorage.getItem("pos_pay_unpaid_id");
  const addonProducts = state.addons.filter(addon => addon.active);
  const subtotal = cartSubtotal();
  const discount = Number(sessionStorage.getItem("pos_discount") || 0);
  const discountType = sessionStorage.getItem("pos_discount_type") || "rp";
  const discountAmount = orderDiscountAmount(subtotal);
  const grand = Math.max(0, subtotal - discountAmount);
  return `
    <div class="card cart-panel">
      <button class="cart-back" onclick="setPosMobileView('items')">&lsaquo; Kembali pilih barang</button>
      ${cartStep !== "success" ? `<div class="cart-header-line">
        <div class="cart-title-mini"><strong>${money(cartStep === "items" ? subtotal : grand)}</strong></div>
        <div class="cart-step-tabs">
          <button class="${cartStep === "items" ? "active" : ""}" onclick="setCartStep('items')">Item</button>
          <button class="${cartStep === "payment" ? "active" : ""}" onclick="setCartStep('payment')">Bayar</button>
        </div>
      </div>` : ""}
      ${cartStep === "items" ? `<div class="order-type-cards">${ORDER_TYPES.map(type => `<button class="order-type-card ${type.id === orderType ? "active" : ""}" onclick="setOrderType('${type.id}')"><span>${type.icon}</span><strong>${type.title}</strong><small>${type.hint}</small></button>`).join("")}</div>` : ""}
      ${cartStep === "items" ? `
        <div class="cart-items-page">
          <div class="cart-lines">
            ${cart.map((item, index) => cartItem(item, addonProducts, index)).join("") || empty("Pilih produk untuk mulai transaksi.")}
          </div>
          <button class="btn pos-next-button" onclick="setCartStep('payment')" ${cart.length ? "" : "disabled"}>Lanjut ke pembayaran</button>
        </div>
      ` : cartStep === "payment" ? `
        <div class="cart-payment-page">
          <div class="payment-detail-shell">
            <input id="orderType" type="hidden" value="${escapeHtml(orderType)}" />
            <div class="payment-detail-fields">
              <div class="field" data-mobile-label="Nama"><label>Nama pelanggan</label><input id="customerName" class="input" value="${escapeHtml(customerName)}" oninput="sessionStorage.setItem('pos_customer_name', this.value)" /></div>
              <div class="field" data-mobile-label="${orderType === "Delivery" ? "Alamat" : orderType === "Take Away" ? "No ambil" : "No meja"}"><label>${orderType === "Dine In" ? "Nomor meja" : orderType === "Delivery" ? "Driver / alamat" : "Nomor ambil"}</label><input id="serviceInfo" class="input" value="${escapeHtml(serviceInfo)}" oninput="sessionStorage.setItem('pos_service_info', this.value)" /></div>
              <div class="field" data-mobile-label="Bayar"><label>Pembayaran</label><select id="paymentMethod" onchange="sessionStorage.setItem('pos_payment_method', this.value); refreshPosFast({ cart: true, preserveScroll: true })">${["Tunai", "QRIS", "Transfer", "Kartu Debit", "E-wallet", "Pembayaran Delivery"].map(method => `<option ${method === paymentMethod ? "selected" : ""}>${method}</option>`).join("")}</select></div>
              <div class="field" data-mobile-label="Catatan"><label>Catatan</label><input id="orderNote" class="input" value="${escapeHtml(orderNote)}" oninput="sessionStorage.setItem('pos_order_note', this.value)" /></div>
              <div class="field discount-field" data-mobile-label="Diskon"><label>Diskon</label><div class="discount-inline"><input id="pos_discount" class="input" type="number" min="0" max="${discountType === "percent" ? "100" : ""}" value="${discount}" oninput="sessionStorage.setItem('pos_discount', this.value)" onchange="refreshPosFast({ cart: true, preserveScroll: true })" /><div class="discount-type-tabs" role="group" aria-label="Jenis diskon transaksi"><button type="button" class="${discountType === "rp" ? "active" : ""}" onclick="setOrderDiscountType('rp')">Rp</button><button type="button" class="${discountType === "percent" ? "active" : ""}" onclick="setOrderDiscountType('percent')">%</button></div></div></div>
            </div>
          </div>
          <div class="payment-panel">
            <input id="receivedAmount" type="hidden" value="${receivedAmount || ""}" />
            <div class="payment-panel-head">
              <div class="payment-display">
                <span>Uang diterima</span>
                <strong>${receivedAmount ? money(receivedAmount) : ""}</strong>
              </div>
              <div class="payment-slide-tabs">
                <button class="${paymentSlide === "quick" ? "active" : ""}" onclick="setPaymentSlide('quick')">Nominal</button>
                <button class="${paymentSlide === "keypad" ? "active" : ""}" onclick="setPaymentSlide('keypad')">Keypad</button>
              </div>
            </div>
            ${paymentSlide === "keypad" ? `
              <div class="payment-keypad">
                ${["7","8","9","C","4","5","6","DEL","1","2","3","000","0","00","0000","OK"].map(key => `<button class="${key === "OK" ? "key-ok" : key === "C" ? "key-clear" : ""}" onclick="pressPaymentKey('${key}')">${key}</button>`).join("")}
              </div>
            ` : `
              <div class="quick-pay-strip">
                ${quickPaymentOptions(grand).map(option => `<button class="quick-pay" onclick="setReceivedAmount(${option.value})">${option.label}</button>`).join("")}
                <button class="quick-pay manual" onclick="setPaymentSlide('keypad')">Ketik manual</button>
              </div>
              <button class="save-amount-btn" onclick="saveCurrentPaymentAmount()" ${receivedAmount ? "" : "disabled"}>Simpan nominal ini</button>
            `}
          </div>
          <div class="final-action-grid">
            <button class="btn pos-pay-button" onclick="submitOrder()" ${cart.length ? "" : "disabled"}>Bayar</button>
            <button class="btn pay-later-button" onclick="saveOrderPayLater()" ${cart.length && !payingUnpaidId ? "" : "disabled"}>BAYAR NANTI</button>
          </div>
        </div>
      ` : `
        <div class="cart-success-page">
          ${renderCartSuccess()}
        </div>
      `}
    </div>
  `;
}

function renderPosMobileBar() {
  const cartStep = sessionStorage.getItem("pos_cart_step") || "items";
  if (cartStep === "success") return "";
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  return `
    <div class="mobile-pos-bar">
      <button class="mobile-pos-main" onclick="setPosMobileView('cart')">
        <strong>${totalQty}</strong>
        <span>Barang</span>
        <b>LANJUT</b>
      </button>
    </div>
  `;
}

function setOrderType(type) {
  sessionStorage.setItem("pos_order_type", type);
  refreshPosFast({ cart: true, preserveScroll: true });
}

function productCard(product) {
  const saleLocked = !!sessionStorage.getItem("pos_last_result");
  const disabled = saleLocked || product.soldOut || (product.trackStock && product.stock <= 0);
  const selectedQty = cartProductQty(product.id);
  const photo = posProductImageTag(product);
  const hiddenClass = posProductMatchesFilter(product) ? "" : " pos-filter-hidden";
  return `
    <button class="product-card${hiddenClass}" data-pos-product-card data-product-id="${escapeHtml(product.id)}" data-product-category="${escapeHtml(product.category || "")}" data-product-search="${escapeHtml(posProductSearchText(product))}" onclick="addToCart('${product.id}')" ${disabled ? "disabled" : ""}>
      <div class="product-token ${product.imageName ? "has-photo" : ""}">${photo}</div>
      <div class="product-info">
        <h4>${escapeHtml(product.name)}</h4>
        <p><strong class="product-price">${productDisplayPrice(product)}</strong></p>
      </div>
      ${selectedQty ? `<div class="product-action"><span class="selected">${selectedQty}</span></div>` : ""}
    </button>
  `;
}

function addToCart(id) {
  if (sessionStorage.getItem("pos_last_result")) return toast("Klik Transaksi Baru untuk mulai pesanan berikutnya.");
  const product = state.products.find(item => item.id === id);
  if (!product || !product.active) return;
  if (product.soldOut) return toast("Produk sedang ditandai habis.");
  if (product.trackStock && product.stock <= 0) return toast("Stok produk habis.");
  const hasVariants = productVariantGroups(product).length > 0;
  if (hasVariants) return openVariantPicker(id);
  const existing = cart.find(item => item.productId === id);
  const qty = existing && !hasVariants ? existing.qty + 1 : 1;
  if (product.trackStock && cartProductQty(id) + 1 > product.stock) return toast("Jumlah melebihi stok tersedia.");
  if (existing && !hasVariants) existing.qty = qty;
  else {
    const item = buildCartItem(product);
    cart.push(item);
  }
  refreshPosFast({ productBadges: true, cart: true, mobileBar: true, preserveScroll: true });
}

function openVariantPicker(id) {
  const product = state.products.find(item => item.id === id);
  const groups = productVariantGroups(product);
  if (!product || !groups.length) return;
  const pickerBody = product.variantMode === "2" ? renderTwoLevelVariantPicker(product) : renderSingleLevelVariantPicker(product, groups);
  openModal(`
    <div class="section-title variant-picker-title">
      <div><h3>${escapeHtml(product.name)}</h3><p>Pilih varian terlebih dahulu sebelum item masuk ke keranjang.</p></div>
      <div class="toolbar"><button class="btn" onclick="closeModal()">Tutup</button></div>
    </div>
    <form class="variant-picker-form" onsubmit="addVariantToCart(event, '${product.id}')">
      ${pickerBody}
      <button class="btn accent variant-picker-submit" type="submit">Masukkan ke Keranjang</button>
    </form>
  `);
}

function renderSingleLevelVariantPicker(product, groups) {
  return groups.map(group => `
    <section class="variant-picker-group">
      <div class="line"><strong>${escapeHtml(group.name)}</strong>${group.required ? `<span class="pill ready">Wajib</span>` : ""}</div>
      <div class="variant-picker-grid">
        ${group.options.map((option, index) => {
          const soldOut = isProductVariantSoldOut(product, option.name || "");
          const checked = group.required && !soldOut && !group.options.slice(0, index).some(entry => !isProductVariantSoldOut(product, entry.name || ""));
          return `
            <label class="variant-choice-card ${soldOut ? "disabled" : ""}">
              <input type="radio" name="variant_${group.level}" value="${escapeHtml(option.name)}" data-group="${escapeHtml(group.name)}" data-level="${group.level}" data-price="${Number(option.price || 0)}" data-cost="${Number(option.cost || 0)}" ${checked ? "checked" : ""} ${group.required ? "required" : ""} ${soldOut ? "disabled" : ""} />
              <span><strong>${escapeHtml(option.name)}</strong><small>${soldOut ? "Habis" : money(option.price)}</small></span>
            </label>
          `;
        }).join("")}
      </div>
    </section>
  `).join("");
}

function renderTwoLevelVariantPicker(product) {
  const parents = product.variantOptions || [];
  const parentGroup = product.variantGroup || "Jenis";
  const childGroup = product.variantGroup2 || "Pilihan";
  return `
    <section class="variant-picker-group">
      <div class="line"><strong>${escapeHtml(parentGroup)}</strong><span class="pill ready">Wajib</span></div>
      <div class="variant-picker-grid variant-parent-picker">
        ${parents.map((parent, index) => `
          <label class="variant-choice-card">
            <input type="radio" name="variant_parent" value="${escapeHtml(parent.name)}" data-parent-index="${index}" onchange="selectVariantParent(${index})" ${index === 0 ? "checked" : ""} required />
            <span><strong>${escapeHtml(parent.name)}</strong></span>
          </label>
        `).join("")}
      </div>
    </section>
    <section class="variant-picker-group">
      <div class="line"><strong>${escapeHtml(childGroup)}</strong><span class="pill ready">Wajib</span></div>
      ${parents.map((parent, parentIndex) => `
        <div class="variant-picker-grid variant-child-picker ${parentIndex === 0 ? "" : "hidden"}" data-parent-index="${parentIndex}">
          ${(parent.children || []).map((child, childIndex) => {
            const key = `${parent.name || ""}|||${child.name || ""}`;
            const soldOut = isProductVariantSoldOut(product, key);
            const checked = parentIndex === 0 && !soldOut && !(parent.children || []).slice(0, childIndex).some(entry => !isProductVariantSoldOut(product, `${parent.name || ""}|||${entry.name || ""}`));
            return `
              <label class="variant-choice-card ${soldOut ? "disabled" : ""}">
                <input type="radio" name="variant_child" value="${escapeHtml(child.name)}" data-parent-name="${escapeHtml(parent.name)}" data-group="${escapeHtml(childGroup)}" data-level="2" data-cart-name="${escapeHtml(child.name)}" data-price="${Number(child.price || 0)}" data-cost="${Number(child.cost || 0)}" data-variant-sold-out="${soldOut ? "1" : "0"}" ${checked ? "checked" : ""} ${soldOut ? "disabled" : ""} required />
                <span><strong>${escapeHtml(child.name)}</strong><small>${soldOut ? "Habis" : money(child.price)}</small></span>
              </label>
            `;
          }).join("") || `<span class="muted">Belum ada pilihan ${escapeHtml(childGroup)}.</span>`}
        </div>
      `).join("")}
    </section>
  `;
}

function selectVariantParent(index) {
  document.querySelectorAll(".variant-child-picker").forEach(group => {
    const active = group.dataset.parentIndex === String(index);
    group.classList.toggle("hidden", !active);
    let checked = false;
    group.querySelectorAll("input[type='radio']").forEach((input, inputIndex) => {
      input.disabled = !active;
      if (active && input.dataset.variantSoldOut === "1") input.disabled = true;
      input.checked = false;
      if (active && !checked && !input.disabled) {
        input.checked = true;
        checked = true;
      }
    });
  });
}

function addVariantToCart(event, id) {
  event.preventDefault();
  const product = state.products.find(item => item.id === id);
  if (!product) return;
  if (product.trackStock && cartProductQty(id) + 1 > product.stock) return toast("Jumlah melebihi stok tersedia.");
  let selected;
  if (product.variantMode === "2") {
    const child = event.target.querySelector("input[name='variant_child']:checked:not(:disabled)");
    if (!child) return toast("Pilih varian tingkat 2 terlebih dahulu.");
    selected = [{
      level: "2",
      group: child.dataset.group,
      parentName: child.dataset.parentName,
      name: child.value,
      cartName: child.dataset.cartName || child.value,
      price: Number(child.dataset.price || 0),
      cost: Number(child.dataset.cost || 0)
    }];
  } else {
    selected = [...event.target.querySelectorAll("input[type='radio']:checked")].map(input => ({
      level: input.dataset.level,
      group: input.dataset.group,
      name: input.value,
      price: Number(input.dataset.price || 0),
      cost: Number(input.dataset.cost || 0)
    }));
    const requiredGroups = productVariantGroups(product).filter(group => group.required);
    if (selected.length < requiredGroups.length) return toast("Pilih varian wajib terlebih dahulu.");
  }
  const item = buildCartItem(product, selected);
  cart.push(item);
  closeModal();
  sessionStorage.setItem(`pos_item_panel_${cartItemKey(item)}`, "addons");
  refreshPosFast({ productBadges: true, cart: true, mobileBar: true, preserveScroll: true });
}

function cartItem(item, addonProducts = [], index = 0) {
  const addons = item.addons || [];
  const key = cartItemKey(item);
  const expanded = sessionStorage.getItem("pos_expanded_item") === key;
  const linePrice = cartItemTotal(item);
  const discount = itemDiscountAmount(item);
  return `
    <div class="cart-item ${expanded ? "expanded" : ""}">
      <div class="cart-row" onclick="toggleCartItemOptions('${key}')">
        <span class="cart-row-no">${index + 1}</span>
        <div class="cart-row-name">
          <strong>${escapeHtml(item.name)}</strong>
          ${addons.length ? `<div class="cart-addon-line">${addons.map(addon => `
            <span class="cart-addon-chip">
              <b>+ ${escapeHtml(addon.name)} ${money(addon.price)} x ${addon.qty}</b>
              <button class="cart-addon-remove" type="button" aria-label="Hapus ${escapeHtml(addon.name)}" onclick="event.stopPropagation(); removeAddonFromCartItem('${key}', '${addon.id}')">x</button>
            </span>
          `).join("")}</div>` : ""}
          ${item.note ? `<small>Catatan: ${escapeHtml(item.note)}</small>` : ""}
          ${discount ? `<small>Diskon item: ${money(discount)}</small>` : ""}
        </div>
        <strong class="cart-row-price">${money(linePrice)}</strong>
        <div class="cart-qty-control" onclick="event.stopPropagation()">
          <button onclick="setCartQty('${key}', ${item.qty - 1})">-</button>
          <span>${item.qty}</span>
          <button onclick="setCartQty('${key}', ${item.qty + 1})">+</button>
        </div>
      </div>
      ${expanded ? cartItemOptions(item, addonProducts) : ""}
    </div>
  `;
}

function cartItemOptions(item, addonProducts = []) {
  const key = cartItemKey(item);
  const storedPanel = sessionStorage.getItem(`pos_item_panel_${key}`);
  const activePanel = storedPanel === "variants" ? "addons" : (storedPanel || "addons");
  const product = state.products.find(entry => entry.id === item.productId);
  const discountType = item.discountType || "rp";
  const discountValue = Number(item.discountValue ?? item.discount ?? 0) || 0;
  const allowedAddonIds = product?.allowedAddonIds || [];
  const availableAddons = addonProducts.filter(addon => allowedAddonIds.includes(addon.id) && addon.active !== false && !addon.soldOut);
  return `
    <div class="cart-item-options">
      <div class="item-option-tabs">
        <button class="${activePanel === "price" ? "active" : ""}" onclick="setItemOptionPanel('${key}', 'price')">Ubah harga</button>
        <button class="${activePanel === "discount" ? "active" : ""}" onclick="setItemOptionPanel('${key}', 'discount')">Diskon</button>
        <button class="${activePanel === "note" ? "active" : ""}" onclick="setItemOptionPanel('${key}', 'note')">Catatan</button>
        <button class="${activePanel === "addons" ? "active" : ""}" onclick="setItemOptionPanel('${key}', 'addons')">Add-on</button>
      </div>
      ${activePanel === "price" ? `<div class="field"><label>Ubah harga</label><input class="input" type="number" min="0" value="${item.price}" onchange="updateCartItemField('${key}', 'price', this.value)" /></div>` : ""}
      ${activePanel === "discount" ? `
        <div class="discount-control">
          <div class="field"><label>Diskon item</label><input class="input" type="number" min="0" max="${discountType === "percent" ? "100" : ""}" value="${discountValue}" onchange="updateCartItemField('${key}', 'discountValue', this.value)" /></div>
          <div class="discount-type-tabs" role="group" aria-label="Jenis diskon item">
            <button type="button" class="${discountType === "rp" ? "active" : ""}" onclick="setCartItemDiscountType('${key}', 'rp')">Rp</button>
            <button type="button" class="${discountType === "percent" ? "active" : ""}" onclick="setCartItemDiscountType('${key}', 'percent')">%</button>
          </div>
        </div>
      ` : ""}
      ${activePanel === "note" ? `<div class="field"><label>Catatan item</label><input class="input" value="${escapeHtml(item.note || "")}" onchange="updateCartItemField('${key}', 'note', this.value)" placeholder="Contoh: tanpa es, pedas, dipisah" /></div>` : ""}
      ${activePanel === "addons" ? `<div class="addon-actions">${availableAddons.map(addon => `<button onclick="addAddonToCartItem('${key}', '${addon.id}')">+ ${escapeHtml(addon.name)} ${money(addon.price)}</button>`).join("") || `<span class="muted">Belum ada add-on untuk produk ini.</span>`}</div>` : ""}
    </div>
  `;
}

function setItemOptionPanel(itemKey, panel) {
  sessionStorage.setItem(`pos_item_panel_${itemKey}`, panel);
  refreshPosFast({ cart: true, preserveScroll: true });
}

function toggleCartItemOptions(itemKey) {
  const current = sessionStorage.getItem("pos_expanded_item");
  if (current === itemKey) sessionStorage.removeItem("pos_expanded_item");
  else sessionStorage.setItem("pos_expanded_item", itemKey);
  refreshPosFast({ cart: true, preserveScroll: true });
}

function updateCartItemField(itemKey, field, value) {
  cart = cart.map(item => {
    if (cartItemKey(item) !== itemKey) return item;
    if (field === "price" || field === "discount" || field === "discountValue") {
      const next = { ...item, [field]: Math.max(0, Number(value) || 0) };
      if (field === "discountValue") next.discount = itemDiscountAmount(next);
      return next;
    }
    return { ...item, [field]: value };
  });
  refreshPosFast({ cart: true, productBadges: true, mobileBar: true, preserveScroll: true });
}

function setCartItemDiscountType(itemKey, type) {
  cart = cart.map(item => {
    if (cartItemKey(item) !== itemKey) return item;
    const value = Number(item.discountValue ?? item.discount ?? 0) || 0;
    const next = { ...item, discountType: type, discountValue: type === "percent" ? Math.min(100, Math.max(0, value)) : Math.max(0, value) };
    next.discount = itemDiscountAmount(next);
    return next;
  });
  refreshPosFast({ cart: true, productBadges: true, mobileBar: true, preserveScroll: true });
}

function addAddonToCartItem(itemKey, addonId) {
  const cartLine = cart.find(item => cartItemKey(item) === itemKey);
  const product = state.products.find(item => item.id === cartLine?.productId);
  if (product?.allowedAddonIds?.length && !product.allowedAddonIds.includes(addonId)) return toast("Add-on tidak tersedia untuk produk ini.");
  const addonProduct = state.addons.find(addon => addon.id === addonId && addon.active !== false && !addon.soldOut);
  if (!addonProduct) return;
  cart = cart.map(item => {
    if (cartItemKey(item) !== itemKey) return item;
    const addons = item.addons ? item.addons.map(addon => ({ ...addon })) : [];
    const existing = addons.find(addon => addon.id === addonId);
    if (existing) existing.qty += 1;
    else addons.push({ id: addonProduct.id, name: addonProduct.name, price: Number(addonProduct.price || 0), cost: Number(addonProduct.cost || 0), qty: 1 });
    const next = { ...item, addons };
    next.discount = itemDiscountAmount(next);
    return next;
  });
  refreshPosFast({ cart: true, productBadges: true, mobileBar: true, preserveScroll: true });
}

function removeAddonFromCartItem(itemKey, addonId) {
  cart = cart.map(item => {
    if (cartItemKey(item) !== itemKey) return item;
    const addons = (item.addons || []).map(addon => ({ ...addon }));
    const existing = addons.find(addon => addon.id === addonId);
    if (!existing) return item;
    existing.qty -= 1;
    const next = { ...item, addons: addons.filter(addon => addon.qty > 0) };
    next.discount = itemDiscountAmount(next);
    return next;
  });
  refreshPosFast({ cart: true, productBadges: true, mobileBar: true, preserveScroll: true });
}

function setCartQty(id, qty) {
  if (qty <= 0) cart = cart.filter(item => cartItemKey(item) !== id);
  else {
    const cartLine = cart.find(item => cartItemKey(item) === id);
    const product = state.products.find(item => item.id === cartLine?.productId);
    if (product?.trackStock && cartProductQty(product.id, id) + qty > product.stock) return toast("Jumlah melebihi stok tersedia.");
    cart = cart.map(item => {
      if (cartItemKey(item) !== id) return item;
      const next = { ...item, qty };
      next.discount = itemDiscountAmount(next);
      return next;
    });
  }
  refreshPosFast({ cart: true, productBadges: true, mobileBar: true, preserveScroll: true });
}

function clearCart() {
  cart = [];
  clearPosDraft();
  sessionStorage.setItem("pos_mobile_view", "items");
  sessionStorage.setItem("pos_cart_step", "items");
  sessionStorage.removeItem("pos_last_result");
  refreshPosFast({ layout: true, productBadges: true, cart: true, mobileBar: true, preserveScroll: true });
}

function holdOrder() {
  if (!cart.length) return toast("Keranjang masih kosong.");
  const customer = sessionStorage.getItem("pos_customer_name") || "Walk-in";
  const held = {
    id: uid(),
    name: customer,
    at: new Date().toISOString(),
    cart: cart.map(item => ({ ...item })),
    draft: readPosDraft()
  };
  state.heldOrders.unshift(held);
  cart = [];
  clearPosDraft();
  sessionStorage.setItem("pos_mobile_view", "items");
  sessionStorage.setItem("pos_cart_step", "items");
  audit("Pesanan disimpan", `${customer} (${held.cart.length} item)`);
  saveState();
  render();
  toast("Pesanan disimpan belum bayar.");
}

function readPosDraft() {
  const keys = ["pos_discount", "pos_order_type", "pos_customer_name", "pos_service_info", "pos_order_note", "pos_payment_method", "pos_received_amount", "pos_print_receipt"];
  return Object.fromEntries(keys.map(key => [key, sessionStorage.getItem(key)]));
}

function unpaidOrders() {
  return state.orders.filter(order => order.paymentStatus === "Belum dibayar" && order.status !== "Dibatalkan");
}

function selectedUnpaidFilter() {
  return sessionStorage.getItem("pos_unpaid_filter") || "Semua";
}

function restoreDraft(draft = {}) {
  clearPosDraft();
  Object.entries(draft).forEach(([key, value]) => {
    if (value !== null && value !== undefined) sessionStorage.setItem(key, value);
  });
}

function openHeldOrders() {
  const filter = selectedUnpaidFilter();
  const orders = unpaidOrders().filter(order => filter === "Semua" || order.type === filter);
  const unpaidRows = orders.map(order => orderCenterCard(order, { returnToUnpaid: true, compactUnpaid: true })).join("");
  openModal(`
    <div class="section-title unpaid-title"><div><h3>Pesanan Belum Bayar</h3><p>Tagihan aktif yang sudah masuk dapur dan belum dilunasi.</p></div><button class="modal-close-x" onclick="closeModal()" aria-label="Tutup">&times;</button></div>
    <div class="unpaid-filters">
      ${["Semua", "Dine In", "Take Away", "Delivery"].map(type => `<button class="${filter === type ? "active" : ""}" onclick="setUnpaidFilter('${type}')">${type}</button>`).join("")}
    </div>
    <div class="unpaid-section orders-list-grid">${unpaidRows || empty("Belum ada pesanan belum bayar untuk filter ini.")}</div>
  `);
}

function setUnpaidFilter(type) {
  sessionStorage.setItem("pos_unpaid_filter", type);
  state.orders.forEach(order => sessionStorage.setItem(`orders_expanded_${order.id}`, "0"));
  openHeldOrders();
}

function payUnpaidOrder(id) {
  const order = state.orders.find(item => item.id === id);
  if (!order) return;
  cart = order.items.map(item => ({ ...item }));
  clearPosDraft();
  sessionStorage.setItem("pos_pay_unpaid_id", id);
  sessionStorage.setItem("pos_order_type", order.type);
  sessionStorage.setItem("pos_customer_name", order.customer || "");
  sessionStorage.setItem("pos_service_info", order.serviceInfo || "");
  sessionStorage.setItem("pos_order_note", order.note || "");
  sessionStorage.setItem("pos_discount", order.discount || 0);
  sessionStorage.setItem("pos_discount_type", "rp");
  sessionStorage.setItem("pos_payment_method", "Tunai");
  sessionStorage.setItem("pos_cart_step", "payment");
  sessionStorage.setItem("pos_mobile_view", "cart");
  sessionStorage.removeItem("pos_last_result");
  closeModal();
  view = "pos";
  location.hash = "pos";
  render();
}

function printUnpaidOrder(id) {
  const order = state.orders.find(item => item.id === id);
  if (!order) return;
  printReceiptOrder(order);
}

function cancelUnpaidOrder(id) {
  const order = state.orders.find(item => item.id === id);
  if (!order) return;
  openCancelOrderDialog(id, true);
}

function resumeHeldOrder(id) {
  const order = state.heldOrders.find(item => item.id === id);
  if (!order) return;
  cart = order.cart.map(item => ({ ...item }));
  restoreDraft(order.draft);
  state.heldOrders = state.heldOrders.filter(item => item.id !== id);
  saveState();
  closeModal();
  setPosMobileView("cart");
}

function deleteHeldOrder(id) {
  state.heldOrders = state.heldOrders.filter(item => item.id !== id);
  audit("Pesanan tersimpan dihapus", id);
  saveState();
  openHeldOrders();
}

function toggleItemDisplay() {
  itemDisplay = itemDisplay === "list" ? "compact" : itemDisplay === "compact" ? "grid" : "list";
  localStorage.setItem("omnipos_item_display", itemDisplay);
  refreshPosFast({ layout: true, preserveScroll: true });
  toast(`Tampilan barang: ${itemDisplay}`);
}

function clearPosDraft() {
  ["pos_discount", "pos_discount_type", "pos_order_type", "pos_customer_name", "pos_service_info", "pos_order_note", "pos_payment_method", "pos_received_amount", "pos_print_receipt", "pos_pay_unpaid_id"].forEach(key => sessionStorage.removeItem(key));
}

function submitOrder() {
  if (!state.cashSession.open) return toast("Buka kas terlebih dahulu.");
  if (!cart.length) return toast("Keranjang masih kosong.");
  const payingUnpaidId = sessionStorage.getItem("pos_pay_unpaid_id");
  const existingOrder = payingUnpaidId ? state.orders.find(item => item.id === payingUnpaidId) : null;
  const subtotal = cartSubtotal();
  const discount = orderDiscountAmount(subtotal);
  const tax = 0;
  const grandTotal = Math.max(0, subtotal - discount);
  const paymentMethod = document.getElementById("paymentMethod")?.value || "Tunai";
  const receivedAmount = Number(sessionStorage.getItem("pos_received_amount") || document.getElementById("receivedAmount")?.value || 0);
  const printReceipt = sessionStorage.getItem("pos_print_receipt") !== "0";
  if (paymentMethod === "Tunai" && receivedAmount < grandTotal) return toast("Nominal uang diterima kurang.");
  if (existingOrder) {
    existingOrder.customer = document.getElementById("customerName")?.value || existingOrder.customer || "Walk-in";
    existingOrder.serviceInfo = document.getElementById("serviceInfo")?.value || existingOrder.serviceInfo || "-";
    existingOrder.note = document.getElementById("orderNote")?.value || existingOrder.note || "";
    existingOrder.paymentStatus = "Lunas";
    existingOrder.paymentMethod = paymentMethod;
    existingOrder.receivedAmount = receivedAmount;
    existingOrder.changeAmount = Math.max(0, receivedAmount - grandTotal);
    existingOrder.printReceipt = printReceipt;
    existingOrder.subtotal = subtotal;
    existingOrder.discount = discount;
    existingOrder.tax = tax;
    existingOrder.grandTotal = grandTotal;
    existingOrder.paidAt = new Date().toISOString();
    cart = [];
    clearPosDraft();
    sessionStorage.setItem("pos_mobile_view", "items");
    setLastResult("Pembayaran berhasil", "Pesanan belum bayar sudah dilunasi. Struk kasir siap dicetak.", existingOrder);
    audit("Pesanan belum bayar dilunasi", `${existingOrder.number} ${money(orderTotal(existingOrder))}`);
    saveState();
    syncOrderToSupabase(existingOrder);
    broadcastRealtimeEvent("orders");
    toast(printReceipt ? `Struk dicetak. Kembalian ${money(existingOrder.changeAmount)}.` : `Pembayaran berhasil. Kembalian ${money(existingOrder.changeAmount)}.`);
    render();
    return;
  }
  const order = {
    id: uid(),
    number: orderNumber(),
    source: "Kasir",
    type: document.getElementById("orderType")?.value || "Dine In",
    customer: document.getElementById("customerName")?.value || "Walk-in",
    serviceInfo: document.getElementById("serviceInfo")?.value || "-",
    note: document.getElementById("orderNote")?.value || "",
    status: "Pesanan Baru",
    paymentStatus: "Lunas",
    paymentMethod,
    receivedAmount,
    changeAmount: Math.max(0, receivedAmount - grandTotal),
    printReceipt,
    items: cart.map(item => ({ ...item })),
    subtotal,
    discount,
    tax,
    serviceFee: 0,
    deliveryFee: 0,
    grandTotal,
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    preparedAt: null,
    readyAt: null,
    completedAt: null,
    cancelledAt: null
  };
  const touchedProductIds = [];
  for (const item of order.items) {
    const product = state.products.find(product => product.id === item.productId);
    if (product?.trackStock) {
      if (product.stock < item.qty) return toast(`Stok ${product.name} tidak cukup.`);
      product.stock -= item.qty;
      touchedProductIds.push(product.id);
      state.stockMovements.unshift({ id: uid(), at: new Date().toISOString(), productId: product.id, productName: product.name, qty: -item.qty, reason: `Penjualan ${order.number}` });
    }
    for (const addon of item.addons || []) {
      const addonProduct = state.products.find(product => product.id === addon.id);
      if (addonProduct?.trackStock) {
        addonProduct.stock = Math.max(0, addonProduct.stock - addon.qty);
        touchedProductIds.push(addonProduct.id);
        state.stockMovements.unshift({ id: uid(), at: new Date().toISOString(), productId: addonProduct.id, productName: addonProduct.name, qty: -addon.qty, reason: `Add-on ${order.number}` });
      }
    }
  }
  state.orders.unshift(order);
  cart = [];
  clearPosDraft();
  sessionStorage.setItem("pos_mobile_view", "items");
  setLastResult("Pesanan dikirim ke dapur", "Pembayaran lunas. Struk kasir siap dicetak dari halaman ini.", order);
  audit("Transaksi dibuat", `${order.number} ${order.type} ${money(orderTotal(order))}`);
  saveState();
  syncProductsByIds(touchedProductIds);
  syncOrderToSupabase(order);
  broadcastRealtimeEvent("products");
  broadcastRealtimeEvent("orders");
  toast(printReceipt ? `Struk dicetak. Kembalian ${money(order.changeAmount)}.` : `Pembayaran berhasil. Kembalian ${money(order.changeAmount)}.`);
  render();
}

function saveOrderPayLater() {
  if (!state.cashSession.open) return toast("Buka kas terlebih dahulu.");
  if (!cart.length) return toast("Keranjang masih kosong.");
  const subtotal = cartSubtotal();
  const discount = orderDiscountAmount(subtotal);
  const tax = 0;
  const grandTotal = Math.max(0, subtotal - discount);
  const order = {
    id: uid(),
    number: orderNumber(),
    source: "Kasir",
    type: document.getElementById("orderType")?.value || "Dine In",
    customer: document.getElementById("customerName")?.value || "Walk-in",
    serviceInfo: document.getElementById("serviceInfo")?.value || "-",
    note: document.getElementById("orderNote")?.value || "",
    status: "Pesanan Baru",
    paymentStatus: "Belum dibayar",
    paymentMethod: "Bayar nanti",
    receivedAmount: 0,
    changeAmount: 0,
    printReceipt: false,
    items: cart.map(item => ({ ...item })),
    subtotal,
    discount,
    tax,
    serviceFee: 0,
    deliveryFee: 0,
    grandTotal,
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    preparedAt: null,
    readyAt: null,
    completedAt: null,
    cancelledAt: null
  };
  const touchedProductIds = [];
  for (const item of order.items) {
    const product = state.products.find(product => product.id === item.productId);
    if (product?.trackStock) {
      if (product.stock < item.qty) return toast(`Stok ${product.name} tidak cukup.`);
      product.stock -= item.qty;
      touchedProductIds.push(product.id);
      state.stockMovements.unshift({ id: uid(), at: new Date().toISOString(), productId: product.id, productName: product.name, qty: -item.qty, reason: `Pesanan bayar nanti ${order.number}` });
    }
    for (const addon of item.addons || []) {
      const addonProduct = state.products.find(product => product.id === addon.id);
      if (addonProduct?.trackStock) {
        addonProduct.stock = Math.max(0, addonProduct.stock - addon.qty);
        touchedProductIds.push(addonProduct.id);
        state.stockMovements.unshift({ id: uid(), at: new Date().toISOString(), productId: addonProduct.id, productName: addonProduct.name, qty: -addon.qty, reason: `Add-on bayar nanti ${order.number}` });
      }
    }
  }
  state.orders.unshift(order);
  cart = [];
  clearPosDraft();
  sessionStorage.setItem("pos_mobile_view", "items");
  setLastResult("Pesanan disimpan", "Pesanan masuk dapur dan pembayaran dicatat untuk nanti.", order);
  audit("Pesanan bayar nanti dibuat", `${order.number} ${order.type} ${money(orderTotal(order))}`);
  saveState();
  syncProductsByIds(touchedProductIds);
  syncOrderToSupabase(order);
  broadcastRealtimeEvent("products");
  broadcastRealtimeEvent("orders");
  toast("Pesanan disimpan dan dikirim ke dapur.");
  render();
}

function openKitchenAvailability() {
  const availabilitySummary = kitchenAvailabilitySummary(state.products);
  const categories = ["Semua", ...productCategories()];
  if (!categories.includes(kitchenAvailabilityCategory)) kitchenAvailabilityCategory = "Semua";
  const products = kitchenAvailabilityCategory === "Semua"
    ? state.products
    : state.products.filter(product => product.category === kitchenAvailabilityCategory);
  openModal(`
    <div class="section-title kitchen-availability-title">
      <div><h3>Ketersediaan Barang</h3><p>Ketuk barang untuk menandai habis atau tersedia. Klik barang untuk mengatur varian tertentu.</p></div>
      <div class="toolbar"><button class="btn" type="button" data-product-form-close onclick="closeModal()">Tutup</button></div>
    </div>
    <div class="kitchen-availability-summary">
      <div><span>Total</span><strong>${availabilitySummary.total}</strong></div>
      <div><span>Tersedia</span><strong>${availabilitySummary.available}</strong></div>
      <div><span>Habis</span><strong>${availabilitySummary.soldOut}</strong></div>
    </div>
    <div class="kitchen-category-filter">
      ${categories.map(category => `
        <button type="button" class="${category === kitchenAvailabilityCategory ? "active" : ""}" onclick='setKitchenAvailabilityCategory(${JSON.stringify(category)})'>${escapeHtml(category)}</button>
      `).join("")}
    </div>
    <div class="kitchen-menu-list">
      ${products.map(product => kitchenAvailabilityItemHtml(product)).join("") || empty("Tidak ada barang pada kategori ini.")}
    </div>
  `);
}

function kitchenAvailabilityItemHtml(product) {
  const variantGroups = productAvailabilityVariantGroups(product);
  const variants = variantGroups.flatMap(group => group.variants);
  const expanded = kitchenAvailabilityExpandedProductId === product.id;
  const units = productAvailabilityFinalUnits(product);
  const stateText = units.soldOut === units.total ? "Habis" : units.soldOut ? `${units.soldOut} varian habis` : "Tersedia";
  return `
    <div class="kitchen-menu-item ${product.soldOut ? "soldout" : ""} ${expanded ? "expanded" : ""}">
      <button type="button" class="kitchen-menu-main" onclick="toggleKitchenAvailabilityVariantPanel('${product.id}')">
        <span class="kitchen-menu-token">${escapeHtml(product.name.slice(0, 2).toUpperCase())}</span>
        <span class="kitchen-menu-info">
          <strong>${escapeHtml(product.name)}</strong>
          <small>${escapeHtml(product.category)} · ${product.trackStock ? `Stok ${product.stock}` : "Tanpa stok"}${variants.length ? ` · ${variants.length} varian` : ""}</small>
        </span>
        <span class="kitchen-menu-state">${escapeHtml(stateText)}</span>
      </button>
      <span class="kitchen-menu-actions">
        <button type="button" class="${product.soldOut ? "" : "active"}" onclick="toggleKitchenProductAvailability('${product.id}', false)">Tersedia</button>
        <button type="button" class="${product.soldOut ? "danger active" : "danger"}" onclick="toggleKitchenProductAvailability('${product.id}', true)">Habis</button>
      </span>
      ${expanded && variants.length ? `
        <div class="kitchen-variant-panel">
          ${variantGroups.map(group => `
            <div class="kitchen-variant-group">
              <div class="kitchen-variant-group-title">${escapeHtml(group.title)}</div>
              <div class="kitchen-variant-group-list">
                ${group.variants.map(variant => kitchenVariantAvailabilityRowHtml(product, variant)).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      ` : expanded ? `<div class="kitchen-variant-empty">Barang ini belum punya varian.</div>` : ""}
    </div>
  `;
}

function kitchenVariantAvailabilityRowHtml(product, variant) {
  const soldOut = isProductVariantSoldOut(product, variant.key);
  return `
    <div class="kitchen-variant-row">
      <span>${escapeHtml(variant.label)}</span>
      <span class="kitchen-variant-actions">
        <button type="button" class="${soldOut ? "" : "active"}" onclick='toggleKitchenVariantAvailability(${JSON.stringify(product.id)}, ${JSON.stringify(variant.key)}, false)'>Tersedia</button>
        <button type="button" class="${soldOut ? "danger active" : "danger"}" onclick='toggleKitchenVariantAvailability(${JSON.stringify(product.id)}, ${JSON.stringify(variant.key)}, true)'>Habis</button>
      </span>
    </div>
  `;
}

function toggleKitchenAvailabilityVariantPanel(productId) {
  kitchenAvailabilityExpandedProductId = kitchenAvailabilityExpandedProductId === productId ? "" : productId;
  openKitchenAvailability();
}

function toggleKitchenVariantAvailability(productId, variantKey, soldOut) {
  const product = state.products.find(item => item.id === productId);
  if (!product) return;
  product.soldOutVariants ||= {};
  if (soldOut) product.soldOutVariants[variantKey] = true;
  else delete product.soldOutVariants[variantKey];
  saveState();
  syncMasterEntity("product", product, "upsert", { userInitiated: true });
  broadcastRealtimeEvent("products");
  openKitchenAvailability();
}

function canCancelOrder(order) {
  return order?.status === "Pesanan Baru";
}

function kitchenOrderItemLegacyKey(item, index) {
  return [
    item.sku || item.productId || item.name || "item",
    item.variantLabel || item.variant || "",
    item.orderBatch || item.variantData?.orderBatch || "",
    index
  ].join("|");
}

function kitchenOrderItemSignature(item) {
  const addons = (item.addons || [])
    .map(addon => `${addon.id || addon.name || ""}:${addon.name || ""}:${Number(addon.qty || 1)}:${Number(addon.price || 0)}`)
    .sort()
    .join(",");
  return [
    orderItemBatch(item),
    item.productId || "",
    item.sku || "",
    item.name || "item",
    item.variantLabel || item.variant || "",
    addons
  ].map(value => String(value).trim().toLowerCase()).join("|");
}

function kitchenOrderItemKey(item, index) {
  const lineId = item.lineId || item.variantData?.clientLineId;
  if (lineId) return `line:${lineId}`;
  if (Number.isFinite(Number(item.variantData?.clientOrderIndex))) return `order-index:${item.variantData.clientOrderIndex}`;
  return `item:${kitchenOrderItemSignature(item)}:${index}`;
}

function kitchenOrderItemKeyCandidates(item, index) {
  const lineId = item.lineId || item.variantData?.clientLineId;
  return [
    kitchenOrderItemKey(item, index),
    lineId || "",
    item.lineId || "",
    item.variantData?.clientLineId || "",
    kitchenOrderItemLegacyKey(item, index)
  ].filter(Boolean);
}

function isKitchenItemPrepared(order, item, index) {
  if (order.status === "Selesai") return true;
  return kitchenOrderItemKeyCandidates(item, index).some(key => !!order.preparedItems?.[key]);
}

function areAllKitchenItemsPrepared(order) {
  const items = order.items || [];
  return items.length > 0 && items.every((item, index) => isKitchenItemPrepared(order, item, index));
}

async function toggleKitchenItemPrepared(orderId, itemKey, itemIndex = -1) {
  const order = state.orders.find(item => item.id === orderId);
  if (!order || order.status !== "Sedang Disiapkan") return;
  const item = (order.items || [])[itemIndex];
  const keyCandidates = item ? kitchenOrderItemKeyCandidates(item, itemIndex) : [itemKey];
  const canonicalKey = item ? kitchenOrderItemKey(item, itemIndex) : itemKey;
  const currentlyPrepared = keyCandidates.some(key => !!order.preparedItems?.[key]);
  order.preparedItems ||= {};
  keyCandidates.forEach(key => {
    delete order.preparedItems[key];
  });
  order.preparedItems[canonicalKey] = !currentlyPrepared;
  const prepared = Boolean(order.preparedItems[canonicalKey]);
  const button = Array.from(document.querySelectorAll("[data-kitchen-item-key]"))
    .find(element => element.dataset.kitchenItemKey === canonicalKey);
  const row = button?.closest(".kitchen-prep-item");
  if (button) button.textContent = prepared ? "✓" : "";
  if (row) row.classList.toggle("is-ready", prepared);
  saveState();
  const synced = await syncOrderToSupabase(order, { silent: true });
  if (synced) broadcastRealtimeEvent("orders");
  if (view === "kitchen") render();
}

function kitchenCard(order) {
  normalizeOrderBatches(order);
  const next = nextKitchenAction(order.status);
  const canFinish = order.status !== "Sedang Disiapkan" || areAllKitchenItemsPrepared(order);
  const customerName = order.customer || "Walk-in";
  const orderTitle = `${displayOrderNumber(order.number)} - ${customerName}`;
  const groups = groupedOrderItems(order);
  const itemsReadyText = order.status === "Sedang Disiapkan"
    ? `${(order.items || []).filter((item, itemIndex) => isKitchenItemPrepared(order, item, itemIndex)).length}/${(order.items || []).length} item siap`
    : "";
  return `
    <div class="card kitchen-order-card">
      <div class="kitchen-order-head">
        <div class="kitchen-order-titleline">
          <div>
            <strong>${escapeHtml(orderTitle)}</strong>
            <span>${dateTime(order.createdAt)}</span>
          </div>
        </div>
        ${statusPill(order.status)}
      </div>
      <div class="kitchen-order-meta">
        <span class="pill">${escapeHtml(order.type)}</span>
        <span class="pill">${escapeHtml(order.serviceInfo)}</span>
      </div>
      <div class="kitchen-order-items">
        ${groups.map(group => {
          const groupNote = orderGroupNote(order, group);
          return `
          <div class="kitchen-item-group">
            ${groups.length > 1 ? `<small>${escapeHtml(group.label)}</small>` : ""}
            ${groupNote ? `<p class="kitchen-item-group-note">${escapeHtml(groupNote)}</p>` : ""}
            ${group.items.map((item) => {
              const sourceIndex = (order.items || []).indexOf(item);
              const itemIndex = sourceIndex >= 0 ? sourceIndex : 0;
              const itemKey = kitchenOrderItemKey(item, itemIndex);
              const prepared = isKitchenItemPrepared(order, item, itemIndex);
              return `
                <div class="order-item kitchen-prep-item ${prepared ? "is-ready" : ""}">
                  ${order.status === "Sedang Disiapkan" || order.status === "Selesai" ? `
                    <button class="kitchen-prep-check" type="button" data-kitchen-item-key="${escapeHtml(itemKey)}" onclick='toggleKitchenItemPrepared(${JSON.stringify(order.id)}, ${JSON.stringify(itemKey)}, ${itemIndex})' ${order.status === "Selesai" ? "disabled" : ""} aria-label="Tandai item siap">
                      ${prepared ? "✓" : ""}
                    </button>
                  ` : ""}
                  <div class="kitchen-prep-detail">
                    <span>${escapeHtml(orderItemInlineLabel(item))}</span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `;
        }).join("")}
      </div>
      ${itemsReadyText ? `<p class="kitchen-ready-progress">${itemsReadyText}</p>` : ""}
      <div class="toolbar kitchen-order-actions">
        ${next ? `<button class="btn green" onclick="advanceOrder('${order.id}')" ${canFinish ? "" : "disabled"}>${next}</button>` : ""}
        ${order.status === "Selesai" ? `<button class="btn" onclick="printOrderLabel('${order.id}')">Print label</button>` : ""}
        ${canCancelOrder(order) ? `<button class="btn red" onclick="openCancelOrderDialog('${order.id}')">Batalkan</button>` : ""}
      </div>
    </div>
  `;
}

function printOrderLabel(id) {
  const order = state.orders.find(item => item.id === id);
  if (!order) return;
  toast(`Print label ${displayOrderNumber(order.number)} disiapkan.`);
}

function nextKitchenAction(status) {
  return {
    "Pesanan Baru": "Terima Pesanan",
    "Sedang Disiapkan": "Selesai"
  }[status];
}

function advanceOrder(id) {
  const order = state.orders.find(item => item.id === id);
  if (!order) return;
  if (order.status === "Sedang Disiapkan" && !areAllKitchenItemsPrepared(order)) {
    return toast("Centang semua item yang sudah siap terlebih dahulu.");
  }
  const next = {
    "Pesanan Baru": ["Sedang Disiapkan", "preparedAt"],
    "Sedang Disiapkan": ["Selesai", "completedAt"]
  }[order.status];
  if (!next) return;
  order.status = next[0];
  order[next[1]] = new Date().toISOString();
  if (order.status === "Sedang Disiapkan") order.preparedItems ||= {};
  audit("Status pesanan diubah", `${order.number} menjadi ${order.status}`);
  saveState();
  syncOrderToSupabase(order);
  broadcastRealtimeEvent("orders");
  render();
}

function openCancelOrderDialog(id, returnToUnpaid = false) {
  const order = state.orders.find(item => item.id === id);
  if (!order || !canCancelOrder(order)) return;
  appCancelContext = { orderId: id, returnToUnpaid };
  activeModalState = { type: "cancel-order", orderId: id, returnToUnpaid, reason: "" };
  openModal(cancelOrderDialogHtml(order, returnToUnpaid));
  requestAnimationFrame(() => document.getElementById("cancelReasonInput")?.focus({ preventScroll: true }));
}

function cancelOrderDialogHtml(order, returnToUnpaid = false, reason = "") {
  return `
    <form class="cancel-reason-form" onsubmit="submitCancelOrder(event)">
      <div class="modal-form-head">
        <div>
          <h3>Batalkan pesanan</h3>
          <p>${escapeHtml(displayOrderNumber(order.number))} akan ditandai batal dan stok item dikembalikan.</p>
        </div>
        <button class="modal-close-x" type="button" onclick="${returnToUnpaid ? "closeModal(); openHeldOrders()" : "closeModal()"}" aria-label="Tutup">&times;</button>
      </div>
      <label class="form-field">
        <span>Alasan pembatalan</span>
        <textarea id="cancelReasonInput" rows="4" placeholder="Contoh: pelanggan membatalkan pesanan">${escapeHtml(reason)}</textarea>
      </label>
      <div class="cancel-reason-actions">
        <button class="btn" type="button" onclick="${returnToUnpaid ? "closeModal(); openHeldOrders()" : "closeModal()"}">Batal</button>
        <button class="btn red" type="submit" data-cancel-submit>Simpan batal</button>
      </div>
    </form>
  `;
}

function captureActiveModalDraft() {
  if (activeModalState?.type === "cancel-order") {
    activeModalState.reason = document.getElementById("cancelReasonInput")?.value ?? activeModalState.reason ?? "";
  }
}

function restoreActiveModal() {
  if (activeModalState?.type === "report-receipt") {
    if (view !== "reports" || !activeModalState.recordKey || typeof openReportVisitorReceipt !== "function") return;
    window.setTimeout(() => {
      if (activeModalState?.type === "report-receipt") {
        openReportVisitorReceipt(null, activeModalState.recordKey);
      }
    }, 0);
    return;
  }
  if (activeModalState?.type !== "cancel-order") return;
  const order = state.orders.find(item => item.id === activeModalState.orderId);
  if (!order || !canCancelOrder(order)) {
    activeModalState = null;
    appCancelContext = { orderId: null, returnToUnpaid: false };
    return;
  }
  appCancelContext = { orderId: order.id, returnToUnpaid: Boolean(activeModalState.returnToUnpaid) };
  openModal(cancelOrderDialogHtml(order, appCancelContext.returnToUnpaid, activeModalState.reason || ""));
}

function submitCancelOrder(event) {
  event.preventDefault();
  const submitButton = event.target?.querySelector?.("[data-cancel-submit]");
  if (submitButton?.disabled) return;
  const reason = document.getElementById("cancelReasonInput")?.value.trim() || "";
  if (!reason) return toast("Alasan pembatalan wajib diisi.");
  const { orderId, returnToUnpaid } = appCancelContext;
  if (submitButton) submitButton.disabled = true;
  const cancelled = cancelOrder(orderId, reason);
  closeModal();
  appCancelContext = { orderId: null, returnToUnpaid: false };
  if (returnToUnpaid) openHeldOrders();
  if (cancelled) toast("Pesanan ditandai batal.");
}

function cancelOrder(id, reason = "") {
  const order = state.orders.find(item => item.id === id);
  if (!order || order.status === "Dibatalkan") return false;
  if (cancelOrderProcessingIds.has(id)) return false;
  if (!reason.trim()) {
    openCancelOrderDialog(id);
    return false;
  }
  cancelOrderProcessingIds.add(id);
  order.status = "Dibatalkan";
  order.cancelledAt = new Date().toISOString();
  order.cancelReason = reason.trim();
  const touchedProductIds = [];
  for (const item of order.items) {
    const product = state.products.find(product => product.id === item.productId);
    if (product?.trackStock) {
      product.stock += item.qty;
      touchedProductIds.push(product.id);
      state.stockMovements.unshift({ id: uid(), at: new Date().toISOString(), productId: product.id, productName: product.name, qty: item.qty, reason: `Pembatalan ${order.number}` });
    }
    for (const addon of item.addons || []) {
      const addonProduct = state.products.find(product => product.id === addon.id);
      if (addonProduct?.trackStock) {
        addonProduct.stock += addon.qty;
        touchedProductIds.push(addonProduct.id);
        state.stockMovements.unshift({ id: uid(), at: new Date().toISOString(), productId: addonProduct.id, productName: addonProduct.name, qty: addon.qty, reason: `Pembatalan add-on ${order.number}` });
      }
    }
  }
  audit("Pesanan dibatalkan", `${order.number}; ${order.cancelReason}; stok dikembalikan`);
  saveState();
  Promise.resolve(syncProductsByIds(touchedProductIds))
    .catch(error => console.error("Cancel product sync failed", error));
  Promise.resolve(syncOrderToSupabase(order))
    .catch(error => console.error("Cancel order sync failed", error))
    .finally(() => cancelOrderProcessingIds.delete(id));
  broadcastRealtimeEvent("products");
  broadcastRealtimeEvent("orders");
  render();
  return true;
}

function ordersDateRange() {
  const period = sessionStorage.getItem("orders_period") || "today";
  const today = todayKey();
  if (period === "yesterday") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const key = todayKey(yesterday);
    return { period, start: startOfLocalDay(key), end: endOfLocalDay(key) };
  }
  if (period === "custom") {
    const fromValue = sessionStorage.getItem("orders_from") || today;
    const toValue = sessionStorage.getItem("orders_to") || fromValue;
    const from = fromValue <= toValue ? fromValue : toValue;
    const to = fromValue <= toValue ? toValue : fromValue;
    return { period, start: startOfLocalDay(from), end: endOfLocalDay(to) };
  }
  return { period: "today", start: startOfLocalDay(today), end: endOfLocalDay(today) };
}

function formatOrdersDateRange(range) {
  const start = todayKey(range.start);
  const end = todayKey(range.end);
  const formatter = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  const startLabel = formatter.format(range.start);
  const endLabel = formatter.format(range.end);
  return start === end ? startLabel : `${startLabel} - ${endLabel}`;
}

function ordersCalendarMonthStart() {
  const value = sessionStorage.getItem("orders_calendar_month") || (sessionStorage.getItem("orders_from") || todayKey()).slice(0, 7);
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function openOrdersRangeCalendar() {
  sessionStorage.setItem("orders_period", "custom");
  const monthStart = ordersCalendarMonthStart();
  const from = sessionStorage.getItem("orders_from") || todayKey();
  const to = sessionStorage.getItem("orders_to") || from;
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const monthTitle = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(monthStart);
  const firstDay = new Date(monthStart);
  const offset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() - offset);
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = todayKey(date);
    const inMonth = date.getMonth() === monthStart.getMonth();
    const selected = key === start || key === end;
    const inRange = key > start && key < end;
    return `
      <button class="${inMonth ? "" : "muted"} ${selected ? "selected" : ""} ${inRange ? "in-range" : ""}" onclick="chooseOrdersCalendarDate('${key}')">
        ${date.getDate()}
      </button>
    `;
  }).join("");
  openModal(`
    <div class="range-calendar-modal">
      <div class="section-title">
        <div>
          <h3>Pilih Rentang Tanggal</h3>
          <p>${escapeHtml(formatOrdersDateRange(ordersDateRange()))}</p>
        </div>
        <button class="btn" onclick="closeModal()">Tutup</button>
      </div>
      <div class="range-calendar-nav">
        <button onclick="shiftOrdersCalendarMonth(-1)">&#8249;</button>
        <strong>${escapeHtml(monthTitle)}</strong>
        <button onclick="shiftOrdersCalendarMonth(1)">&#8250;</button>
      </div>
      <div class="range-calendar-weekdays">${["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(day => `<span>${day}</span>`).join("")}</div>
      <div class="range-calendar-grid">${days}</div>
      <div class="range-calendar-actions">
        <button class="btn" onclick="setOrdersPeriod('today'); closeModal()">Hari ini</button>
        <button class="btn primary" onclick="closeModal(); render()">Terapkan</button>
      </div>
    </div>
  `);
}

function shiftOrdersCalendarMonth(direction) {
  const monthStart = ordersCalendarMonthStart();
  monthStart.setMonth(monthStart.getMonth() + Number(direction || 0));
  sessionStorage.setItem("orders_calendar_month", monthKey(monthStart));
  openOrdersRangeCalendar();
}

function chooseOrdersCalendarDate(key) {
  const from = sessionStorage.getItem("orders_from");
  const to = sessionStorage.getItem("orders_to");
  if (!from || (from && to)) {
    sessionStorage.setItem("orders_from", key);
    sessionStorage.removeItem("orders_to");
    openOrdersRangeCalendar();
    return;
  }
  const start = from <= key ? from : key;
  const end = from <= key ? key : from;
  sessionStorage.setItem("orders_from", start);
  sessionStorage.setItem("orders_to", end);
  closeModal();
  render();
}

function renderOrders() {
  const dateRange = ordersDateRange();
  const quickFilter = sessionStorage.getItem("orders_quick_filter") || "Semua";
  const query = (sessionStorage.getItem("orders_query") || "").toLowerCase();
  const quickFilters = [
    ["Semua", "Semua"],
    ["Dine In", "Dine In"],
    ["Take Away", "Take Away"],
    ["Delivery", "Delivery"],
    ["Batal", "Dibatalkan"]
  ];
  const periodOrders = state.orders.filter(order => rawRecordInRange(order, dateRange));
  const newOrders = periodOrders.filter(order => order.status === "Pesanan Baru");
  const processOrders = periodOrders.filter(order => order.status === "Sedang Disiapkan");
  const doneOrders = periodOrders.filter(order => order.status === "Selesai");
  const unpaid = periodOrders.filter(order => order.paymentStatus !== "Lunas" && order.status !== "Dibatalkan");
  const filtered = periodOrders.filter(order => {
    const text = [
      order.number,
      displayOrderNumber(order.number),
      order.type,
      order.customer,
      order.serviceInfo,
      order.status,
      order.paymentStatus,
      ...(order.items || []).map(item => item.name)
    ].join(" ").toLowerCase();
    const filterMatched = quickFilter === "Semua"
      || order.status === quickFilter
      || order.type === quickFilter
      || (quickFilter === "Belum Lunas" && order.paymentStatus !== "Lunas" && order.status !== "Dibatalkan");
    return filterMatched && (!query || text.includes(query));
  });
  const statCards = [
    ["Baru", newOrders.length, "Pesanan", "Pesanan Baru", "new"],
    ["Diproses", processOrders.length, "Pesanan", "Sedang Disiapkan", "process"],
    ["Belum Lunas", unpaid.length, "Pesanan", "Belum Lunas", "unpaid"],
    ["Selesai", doneOrders.length, "Pesanan", "Selesai", "done"]
  ];
  return `
    <section class="orders-page">
      <div class="orders-summary">
        ${statCards.map(([label, value, hint, filter, tone]) => `
          <button class="orders-summary-card tone-${tone} ${quickFilter === filter ? "primary" : ""}" type="button" onclick="setOrdersQuickFilter('${filter}')">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(String(value))}</strong>
            <small>${escapeHtml(String(hint))}</small>
          </button>
        `).join("")}
      </div>
      <div class="orders-control-card">
        <div class="orders-date-filter">
          <div class="orders-date-tabs">
            ${[["today", "Hari ini"], ["yesterday", "Kemarin"], ["custom", "Custom"]].map(([value, label]) => `
              <button type="button" class="${dateRange.period === value ? "active" : ""}" onclick="setOrdersPeriod('${value}')">${escapeHtml(label)}</button>
            `).join("")}
          </div>
          <button class="orders-date-range" type="button" onclick="openOrdersRangeCalendar()">${escapeHtml(formatOrdersDateRange(dateRange))}</button>
        </div>
        <div class="orders-search">
          ${navIcon("search")}
          <label class="sr-only" for="ordersSearchInput">Cari pesanan</label>
          <input id="ordersSearchInput" name="ordersSearch" value="${escapeHtml(sessionStorage.getItem("orders_query") || "")}" placeholder="Cari nomor, pelanggan, atau item" oninput="setOrdersQuery(this.value)" />
        </div>
      <div class="orders-filter-row compact">
          ${quickFilters.map(([label, value]) => `<button type="button" class="${value === quickFilter ? "active" : ""}" onclick="setOrdersQuickFilter('${value}')">${escapeHtml(label)}</button>`).join("")}
        </div>
      </div>
      <div class="orders-list-grid">
        ${filtered.map(order => orderCenterCard(order)).join("") || empty("Belum ada pesanan pada filter ini.")}
      </div>
    </section>
  `;
}

function setOrdersPeriod(period) {
  const normalized = ["today", "yesterday", "custom"].includes(period) ? period : "today";
  sessionStorage.setItem("orders_period", normalized);
  if (normalized === "custom") {
    sessionStorage.setItem("orders_from", sessionStorage.getItem("orders_from") || todayKey());
    sessionStorage.setItem("orders_to", sessionStorage.getItem("orders_to") || sessionStorage.getItem("orders_from") || todayKey());
    render();
    openOrdersRangeCalendar();
    return;
  }
  render();
}

function setOrdersCustomDate(type, value) {
  const key = type === "to" ? "orders_to" : "orders_from";
  sessionStorage.setItem(key, value || todayKey());
  sessionStorage.setItem("orders_period", "custom");
  render();
}

function setOrdersQuickFilter(filter) {
  sessionStorage.setItem("orders_quick_filter", filter);
  render();
}

function setOrdersQuery(value) {
  sessionStorage.setItem("orders_query", value);
  render();
  requestAnimationFrame(() => {
    const input = document.querySelector(".orders-search input");
    if (input) {
      input.focus();
      input.selectionStart = input.selectionEnd = input.value.length;
    }
  });
}

function setSettingsTab(tab) {
  settingsTab = tab || "data";
  localStorage.setItem("omnipos_settings_tab", settingsTab);
  render();
}

function orderCenterCard(order, options = {}) {
  const qty = (order.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const expanded = sessionStorage.getItem(`orders_expanded_${order.id}`) === "1";
  const compactStatus = compactOrderStatus(order.status);
  if (options.compactUnpaid && !expanded) {
    return `
      <article class="orders-card unpaid-compact-card ${orderStatusClass(order.status)}" onclick="toggleOrderItems('${order.id}', true)">
        <div class="unpaid-compact-head">
          <strong>${escapeHtml(displayOrderNumber(order.number))}</strong>
          <b>${money(orderTotal(order))}</b>
        </div>
        <div class="unpaid-compact-meta">
          <span>${escapeHtml(order.customer || "Walk-in")}</span>
          <span>${escapeHtml(order.serviceInfo || "-")}</span>
          <span>${escapeHtml(order.type || "-")}</span>
        </div>
      </article>
    `;
  }
  normalizeOrderBatches(order);
  const groups = groupedOrderItems(order);
  const itemPreview = groups.map(group => `
    <div class="orders-item-group">
      ${groups.length > 1 ? `<small>${escapeHtml(group.label)}</small>` : ""}
      ${group.items.map(item => `
        <div class="orders-item-line">
          <span>${escapeHtml(orderItemInlineLabel(item))}</span>
          <strong>${money(cartItemTotal(item))}</strong>
        </div>
      `).join("")}
    </div>
  `).join("");
  const actions = [
    order.paymentStatus !== "Lunas" && order.status !== "Dibatalkan" ? `<button class="btn green" type="button" onclick="event.preventDefault(); event.stopPropagation(); payUnpaidOrder('${order.id}')">Bayar</button>` : "",
    canCancelOrder(order) ? `<button class="btn red" type="button" onclick="event.preventDefault(); event.stopPropagation(); openCancelOrderDialog('${order.id}', ${options.returnToUnpaid ? "true" : "false"})">Batalkan</button>` : ""
  ].filter(Boolean).join("");
  const cancelReason = order.status === "Dibatalkan"
    ? `<div class="orders-cancel-reason">
        <strong>Dibatalkan</strong>
        <span>${escapeHtml(order.cancelReason || "Tidak ada keterangan pembatalan.")}</span>
        ${order.cancelledAt ? `<small>${dateTime(order.cancelledAt)}</small>` : ""}
      </div>`
    : "";
  return `
    <article class="orders-card ${options.compactUnpaid ? "unpaid-detail-card" : ""} ${orderStatusClass(order.status)} ${expanded ? "is-expanded" : ""}" ${options.returnToUnpaid ? `onclick="toggleOrderItems('${order.id}', true)"` : ""}>
      <div class="orders-card-head">
        <div>
          <strong>${escapeHtml(displayOrderNumber(order.number))}</strong>
          <span>${dateTime(order.createdAt)}</span>
        </div>
        <span class="orders-status-pill ${compactStatus.className}">${escapeHtml(compactStatus.label)}</span>
      </div>
      <div class="orders-card-meta">
        <span>${escapeHtml(order.type || "-")}</span>
        <span>${escapeHtml(order.serviceInfo || "-")}</span>
        <span>${escapeHtml(order.customer || "Walk-in")}</span>
        <span>${escapeHtml(order.paymentStatus || "-")}</span>
      </div>
      <div class="orders-card-items">
        ${itemPreview || `<span class="muted">Belum ada rincian item.</span>`}
      </div>
      <div class="orders-card-total">
        <span>${qty} barang</span>
        <strong>${money(orderTotal(order))}</strong>
      </div>
      ${cancelReason}
      ${actions ? `<div class="orders-card-actions">${actions}</div>` : ""}
    </article>
  `;
}

function toggleOrderItems(id, returnToUnpaid = false) {
  const key = `orders_expanded_${id}`;
  const willExpand = sessionStorage.getItem(key) !== "1";
  state.orders.forEach(order => sessionStorage.setItem(`orders_expanded_${order.id}`, "0"));
  if (willExpand) sessionStorage.setItem(key, "1");
  if (returnToUnpaid) {
    openHeldOrders();
    return;
  }
  render();
}

function compactOrderStatus(status) {
  if (status === "Pesanan Baru") return { label: "Baru", className: "new" };
  if (status === "Sedang Disiapkan") return { label: "Diproses", className: "process" };
  if (status === "Selesai") return { label: "Selesai", className: "done" };
  if (status === "Dibatalkan") return { label: "Batal", className: "cancel" };
  return { label: status || "-", className: "ready" };
}

function orderStatusClass(status) {
  return status === "Pesanan Baru" ? "is-new" :
    status === "Sedang Disiapkan" ? "is-process" :
    status === "Selesai" ? "is-done" :
    status === "Dibatalkan" ? "is-cancelled" : "";
}

function productCategories() {
  return [...new Set([...(state.categories || []), ...stableProducts(state.products).map(item => item.category).filter(Boolean)])]
    .sort((a, b) => String(a || "").localeCompare(String(b || ""), "id", { sensitivity: "base" }));
}

function toggleProductSoldOut(id) {
  if (productActionLocks.has(id)) return;
  const product = state.products.find(item => item.id === id);
  if (!product) return;
  productActionLocks.add(id);
  product.soldOut = !product.soldOut;
  audit(product.soldOut ? "Produk ditandai habis" : "Produk tersedia kembali", product.name);
  saveState();
  syncMasterEntity("product", product, "upsert", { userInitiated: true }).finally(() => productActionLocks.delete(id));
  render();
}

function deleteProduct(id) {
  const product = state.products.find(item => item.id === id);
  if (!product) return;
  openConfirmDialog({
    title: "Hapus barang",
    message: `Hapus barang "${product.name}"?`,
    detail: "Riwayat transaksi lama tetap tersimpan.",
    confirmLabel: "Hapus",
    danger: true,
    onConfirm: async () => {
      const marker = rememberDeletedProduct(product);
      const synced = await syncMasterEntity("product", {
        ...product,
        local_id: marker.localId
      }, "delete");
      if (!synced) {
        forgetDeletedProduct(product);
        saveState();
        syncStoreSettingsToSupabase({ silent: true, requireJson: true });
        toast("Gagal menghapus barang dari Supabase. Barang belum dihapus.");
        await loadMasterDataFromSupabase({ force: true, silent: true });
        render();
        return;
      }
      const deletedIds = new Set([product.id, marker.localId].filter(Boolean));
      state.products = state.products.filter(item => !deletedIds.has(item.id) && !isDeletedProduct(item));
      cart = cart.filter(item => !deletedIds.has(item.productId));
      state.heldOrders = (state.heldOrders || []).map(order => ({
        ...order,
        cart: (order.cart || []).filter(item => !deletedIds.has(item.productId))
      })).filter(order => (order.cart || []).length);
      audit("Produk dihapus", product.name);
      saveState();
      await syncStoreSettingsToSupabase({ silent: true, requireJson: true });
      await loadMasterDataFromSupabase({ force: true, silent: true });
      broadcastRealtimeEvent("products");
      render();
    }
  });
}

function toggleKitchenProductAvailability(id, shouldBeSoldOut) {
  if (productActionLocks.has(id)) return;
  const product = state.products.find(item => item.id === id);
  if (!product) return;
  productActionLocks.add(id);
  product.soldOut = shouldBeSoldOut;
  audit(product.soldOut ? "Produk ditandai habis oleh dapur" : "Produk tersedia kembali dari dapur", product.name);
  saveState();
  syncMasterEntity("product", product, "upsert", { userInitiated: true }).finally(() => productActionLocks.delete(id));
  broadcastRealtimeEvent("products");
  render();
  openKitchenAvailability();
}

function setKitchenAvailabilityCategory(category) {
  kitchenAvailabilityCategory = category;
  kitchenAvailabilityExpandedProductId = "";
  openKitchenAvailability();
}

function openCategoryManager() {
  const categories = productCategories();
  openModal(`
    <div class="section-title category-manager-title">
      <div><h3>Kelola Kategori</h3><p>Edit kategori barang. Kategori kosong bisa dihapus dari Supabase.</p></div>
      <div class="toolbar"><button class="btn" onclick="closeModal()">Tutup</button></div>
    </div>
    <form class="addon-manager-form category-manager-form" onsubmit="renameCategory(event)">
      <input name="oldName" type="hidden" />
      <input name="name" class="input" required placeholder="Nama kategori" />
      <button class="btn accent" type="submit">+ Kategori</button>
    </form>
    <div class="addon-manager-list category-manager-list">
      ${categories.map(category => {
        const used = state.products.filter(product => product.category === category).length;
        return `
          <div class="addon-manager-row category-manager-row">
            <div class="category-manager-meta"><strong>${escapeHtml(category)}</strong><span>${used} barang</span></div>
            <div class="row-actions category-manager-actions">
              <button class="btn" onclick='fillCategoryForm(${JSON.stringify(category)})'>Edit</button>
              <button class="btn red" onclick='deleteCategory(${JSON.stringify(category)})'>Hapus</button>
            </div>
          </div>
        `;
      }).join("") || empty("Belum ada kategori.")}
    </div>
  `);
}

function fillCategoryForm(category) {
  const form = document.querySelector(".addon-manager-form");
  if (!form) return;
  form.elements.oldName.value = category;
  form.elements.name.value = category;
  form.scrollIntoView({ block: "start", behavior: "smooth" });
  form.elements.name.focus();
}

async function renameCategory(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const oldName = String(form.get("oldName") || "").trim();
  const name = String(form.get("name") || "").trim();
  if (!name) return toast("Nama kategori belum diisi.");
  try {
    forgetDeletedCategory(name);
    if (oldName) {
      const affectedProducts = state.products
        .filter(product => product.category === oldName)
        .map(product => ({ ...product, category: name }));
      const categorySynced = await syncMasterEntity("category", categoryPayload(name), "upsert", { userInitiated: true });
      if (!categorySynced) throw new Error("Kategori baru belum tersimpan.");
      for (const product of affectedProducts) {
        const productSynced = await syncMasterEntity("product", product, "upsert", { userInitiated: true });
        if (!productSynced) throw new Error(`Barang ${product.name} belum tersimpan.`);
      }
      await syncMasterEntity("category", categoryPayload(oldName), "delete");
      audit("Kategori diperbarui", `${oldName} menjadi ${name}`);
    } else {
      const categorySynced = await syncMasterEntity("category", categoryPayload(name), "upsert", { userInitiated: true });
      if (!categorySynced) throw new Error("Kategori belum tersimpan.");
      audit("Kategori disiapkan", name);
    }
    await loadMasterDataFromSupabase({ force: true, silent: true });
    openCategoryManager();
  } catch (error) {
    console.error("Save category failed", error);
    toast("Gagal menyimpan kategori ke Supabase.");
  }
}

function deleteCategory(category) {
  const affectedCount = state.products.filter(product => product.category === category).length;
  if (affectedCount) return toast(`Kategori masih dipakai ${affectedCount} barang. Pindahkan barang dulu sebelum hapus kategori.`);
  openConfirmDialog({
    title: "Hapus kategori",
    message: `Hapus kategori "${category}"?`,
    detail: "Kategori kosong akan dihapus langsung dari Supabase.",
    confirmLabel: "Hapus",
    danger: true,
    onConfirm: async () => {
      rememberDeletedCategory(category);
      state.categories = (state.categories || []).filter(item => item !== category);
      saveState();
      await syncStoreSettingsToSupabase({ silent: true, requireJson: true });
      const synced = await syncMasterEntity("category", categoryPayload(category), "delete");
      if (!synced) {
        toast("Kategori disembunyikan. Hard delete Supabase belum berhasil.");
        await loadMasterDataFromSupabase({ force: true, silent: true });
        openCategoryManager();
        return;
      }
      state.products = (state.products || []).map(product => product.category === category ? { ...product, category: "" } : product);
      audit("Kategori dihapus", category);
      saveState();
      await loadMasterDataFromSupabase({ force: true, silent: true });
      openCategoryManager();
    }
  });
}

function openAddonManager() {
  openModal(`
    <div class="section-title addon-manager-title">
      <div><h3>Daftar Add-on</h3><p>Buat topping atau tambahan yang nanti bisa dipilih per produk.</p></div>
      <div class="toolbar"><button class="btn" onclick="closeModal()">Tutup</button></div>
    </div>
    <form class="addon-manager-form addon-manager-compact-form" onsubmit="saveAddon(event)">
      <input name="id" type="hidden" />
      <div class="field"><label>Nama add-on</label><input name="name" class="input" required placeholder="Contoh: Extra Shot" /></div>
      <div class="field"><label>Harga jual</label><input name="price" class="input" type="number" min="0" required placeholder="6000" /></div>
      <div class="field"><label>Harga modal</label><input name="cost" class="input" type="number" min="0" placeholder="2500" /></div>
      <button class="btn accent" type="submit">Simpan</button>
    </form>
    <div class="addon-manager-list addon-manager-compact-list">
      ${state.addons.map(addon => `
        <div class="addon-manager-row addon-manager-compact-row">
          <div><strong>${escapeHtml(addon.name)}</strong><span>Modal: ${money(addon.cost)} · Jual: ${money(addon.price)}</span></div>
          <div class="row-actions addon-manager-compact-actions">
            <button class="btn" type="button" onclick="fillAddonForm('${addon.id}')">Edit</button>
            <button class="btn danger" type="button" onclick="deleteAddon('${addon.id}')">Hapus</button>
          </div>
        </div>
      `).join("") || empty("Belum ada add-on.")}
    </div>
  `);
}

function fillAddonForm(id) {
  const addon = state.addons.find(item => item.id === id);
  const form = document.querySelector(".addon-manager-form");
  if (!addon || !form) return;
  form.elements.id.value = addon.id;
  form.elements.name.value = addon.name;
  form.elements.price.value = addon.price;
  form.elements.cost.value = addon.cost || 0;
  form.elements.name.focus();
}

async function saveAddon(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const name = String(form.get("name") || "").trim();
  if (!name) return toast("Nama add-on belum diisi.");
  const saved = await saveAddonPayload({
    id: form.get("id") || "",
    name,
    price: Number(form.get("price") || 0),
    cost: Number(form.get("cost") || 0)
  });
  if (saved) openAddonManager();
}

async function saveAddonPayload(input) {
  const name = String(input.name || "").trim();
  if (!name) return null;
  const existingByName = state.addons.find(addon => addon.name.trim().toLowerCase() === name.toLowerCase());
  const id = input.id || existingByName?.id || uid();
  const current = state.addons.find(addon => addon.id === id);
  const payload = { id, name, price: Number(input.price || 0), cost: Number(input.cost || 0), active: current ? current.active : true };
  forgetDeletedAddon(payload);
  const synced = await syncMasterEntity("addon", payload, "upsert", { userInitiated: true });
  if (!synced) {
    toast("Gagal menyimpan add-on ke Supabase.");
    await loadMasterDataFromSupabase({ force: true, silent: true });
    return null;
  }
  audit(input.id || existingByName ? "Add-on diperbarui" : "Add-on ditambahkan", payload.name);
  await loadMasterDataFromSupabase({ force: true, silent: true });
  return state.addons.find(addon => addon.id === id) || payload;
}

function toggleAddon(id) {
  const addon = state.addons.find(item => item.id === id);
  if (!addon) return;
  addon.active = !addon.active;
  audit(addon.active ? "Add-on diaktifkan" : "Add-on dinonaktifkan", addon.name);
  saveState();
  syncMasterEntity("addon", addon, "upsert", { userInitiated: true });
  openAddonManager();
}

function deleteAddon(id, options = {}) {
  const addon = state.addons.find(item => item.id === id);
  if (!addon) return;
  const affectedCount = state.products.filter(product => Array.isArray(product.allowedAddonIds) && product.allowedAddonIds.includes(id)).length;
  openConfirmDialog({
    title: "Hapus add-on",
    message: `Hapus add-on "${addon.name}"?`,
    detail: affectedCount
      ? `Add-on ini akan dilepas dari ${affectedCount} produk dan dihapus dari Supabase.`
      : "Add-on akan dihapus dari lokal dan Supabase.",
    confirmLabel: "Hapus",
    danger: true,
    onConfirm: async () => {
      rememberDeletedAddon(addon);
      state.addons = state.addons.filter(item => item.id !== id);
      state.products = (state.products || []).map(product => ({
        ...product,
        allowedAddonIds: Array.isArray(product.allowedAddonIds)
          ? product.allowedAddonIds.filter(addonId => addonId !== id)
          : []
      }));
      saveState();
      await syncStoreSettingsToSupabase({ silent: true, requireJson: true });
      const synced = await syncMasterEntity("addon", addon, "delete");
      if (!synced) {
        toast("Add-on disembunyikan. Hard delete Supabase belum berhasil.");
        await loadMasterDataFromSupabase({ force: true, silent: true });
        if (typeof options.afterDelete === "function") options.afterDelete();
        else openAddonManager();
        return;
      }
      audit("Add-on dihapus", addon.name);
      saveState();
      await loadMasterDataFromSupabase({ force: true, silent: true });
      if (typeof options.afterDelete === "function") options.afterDelete();
      else openAddonManager();
    }
  });
}

function productAddonPickerHtml(selectedIds = []) {
  return state.addons.map(addon => `
    <label class="addon-picker-card">
      <input name="allowedAddonIds" type="checkbox" value="${addon.id}" ${selectedIds.includes(addon.id) ? "checked" : ""} />
      <span><strong>${escapeHtml(addon.name)}</strong><small>${money(addon.price)}${addon.active ? "" : " - Nonaktif"}</small></span>
    </label>
  `).join("") || `<span class="muted">Belum ada add-on. Klik Kelola Add-on untuk membuat daftar.</span>`;
}

function productInlineAddonListHtml() {
  return state.addons.map(addon => `
    <div class="product-inline-addon-row">
      <div><strong>${escapeHtml(addon.name)}</strong><span>Modal: ${money(addon.cost)} · Jual: ${money(addon.price)}${addon.active ? "" : " · Nonaktif"}</span></div>
      <div class="product-inline-addon-actions">
        <button class="btn" type="button" onclick='fillInlineAddonForm(this, ${JSON.stringify(addon.id)})'>Edit</button>
        <button class="btn ${addon.active ? "" : "accent"}" type="button" onclick='toggleInlineAddon(this, ${JSON.stringify(addon.id)})'>${addon.active ? "Nonaktif" : "Aktif"}</button>
        <button class="btn danger" type="button" onclick='deleteInlineAddon(this, ${JSON.stringify(addon.id)})'>Hapus</button>
      </div>
    </div>
  `).join("") || `<span class="muted">Belum ada add-on.</span>`;
}

function toggleInlineAddonManager(button) {
  const panel = button.closest(".product-option-panel")?.querySelector("[data-product-addon-manager]");
  if (!panel) return;
  panel.classList.toggle("hidden");
  if (!panel.classList.contains("hidden")) panel.querySelector("input[name='inlineAddonName']")?.focus();
}

function refreshProductInlineAddon(panel) {
  if (!panel) return;
  const picker = panel.closest(".product-option-panel")?.querySelector(".addon-picker-grid");
  const selected = picker ? [...picker.querySelectorAll("input[name='allowedAddonIds']:checked")].map(input => input.value) : [];
  const list = panel.querySelector(".product-inline-addon-list");
  if (list) list.innerHTML = productInlineAddonListHtml();
  if (picker) picker.innerHTML = productAddonPickerHtml(selected);
  resetInlineAddonForm(panel.querySelector("[data-inline-addon-form]"));
}

function fillInlineAddonForm(button, id) {
  const addon = state.addons.find(item => item.id === id);
  const form = button.closest("[data-product-addon-manager]")?.querySelector("[data-inline-addon-form]");
  if (!addon || !form) return;
  form.querySelector("input[name='inlineAddonId']").value = addon.id;
  form.querySelector("input[name='inlineAddonName']").value = addon.name;
  form.querySelector("input[name='inlineAddonPrice']").value = addon.price;
  form.querySelector("input[name='inlineAddonCost']").value = addon.cost || 0;
  form.querySelector("input[name='inlineAddonName']")?.focus();
}

async function saveInlineAddon(event) {
  event.preventDefault();
  await saveInlineAddonFromElement(event.target);
}

async function saveInlineAddonFromButton(button) {
  await saveInlineAddonFromElement(button.closest("[data-inline-addon-form]"));
}

async function saveInlineAddonFromElement(formElement) {
  if (!formElement) return;
  const idInput = formElement.querySelector("input[name='inlineAddonId']");
  const nameInput = formElement.querySelector("input[name='inlineAddonName']");
  const priceInput = formElement.querySelector("input[name='inlineAddonPrice']");
  const costInput = formElement.querySelector("input[name='inlineAddonCost']");
  const existingId = idInput?.value || "";
  const name = String(nameInput?.value || "").trim();
  if (!name) return toast("Nama add-on belum diisi.");
  const saved = await saveAddonPayload({
    id: existingId,
    name,
    price: Number(priceInput?.value || 0),
    cost: Number(costInput?.value || 0)
  });
  if (saved) refreshProductInlineAddon(formElement.closest("[data-product-addon-manager]"));
}

function resetInlineAddonForm(formElement) {
  if (!formElement) return;
  formElement.querySelectorAll("input").forEach(input => {
    input.value = "";
  });
}

function toggleInlineAddon(button, id) {
  const addon = state.addons.find(item => item.id === id);
  if (!addon) return;
  addon.active = !addon.active;
  audit(addon.active ? "Add-on diaktifkan" : "Add-on dinonaktifkan", addon.name);
  saveState();
  syncMasterEntity("addon", addon, "upsert", { userInitiated: true });
  refreshProductInlineAddon(button.closest("[data-product-addon-manager]"));
}

function deleteInlineAddon(button, id) {
  const panel = button.closest("[data-product-addon-manager]");
  deleteAddon(id, {
    afterDelete: () => refreshProductInlineAddon(panel)
  });
}

function variantRowHtml(option = {}, mode = "full") {
  const parentOnly = mode === "parent";
  const priceValue = Number(option.price || 0) ? Number(option.price) : "";
  const costValue = Number(option.cost || 0) ? Number(option.cost) : "";
  return `
    <div class="variant-row variant-row-card ${parentOnly ? "variant-parent-name-row" : ""}">
      <label class="field variant-name-field"><span class="variant-input-label">${parentOnly ? "Nama varian tingkat 1" : "Nama varian"}</span><input name="${parentOnly ? "variantParentName" : "variantName"}" class="input" placeholder="${parentOnly ? "Contoh: Nasi Goreng Kampung" : "Contoh: Regular"}" value="${escapeHtml(option.name || "")}" /></label>
      ${parentOnly ? "" : `
        <div class="variant-money-grid">
          <label class="field"><span class="variant-input-label">Harga modal</span><input name="variantCost" class="input" type="number" min="0" placeholder="" value="${costValue}" /></label>
          <label class="field"><span class="variant-input-label">Harga jual</span><input name="variantPrice" class="input" type="number" min="0" placeholder="" value="${priceValue}" /></label>
        </div>
      `}
    </div>
  `;
}

function variantChildRowHtml(option = {}) {
  const priceValue = Number(option.price || 0) ? Number(option.price) : "";
  const costValue = Number(option.cost || 0) ? Number(option.cost) : "";
  return `
    <div class="variant-row variant-row-card variant-child-row">
      <label class="field variant-name-field"><span class="variant-input-label">Nama varian tingkat 2</span><input name="variantChildName" class="input" placeholder="Contoh: Telur Dadar" value="${escapeHtml(option.name || "")}" /></label>
      <div class="variant-money-grid">
        <label class="field"><span class="variant-input-label">Harga modal</span><input name="variantChildCost" class="input" type="number" min="0" placeholder="" value="${costValue}" /></label>
        <label class="field"><span class="variant-input-label">Harga jual</span><input name="variantChildPrice" class="input" type="number" min="0" placeholder="" value="${priceValue}" /></label>
      </div>
    </div>
  `;
}

function variantParentBlockHtml(parent = {}, index = 0, fallbackChildren = []) {
  const children = parent.children?.length ? parent.children : fallbackChildren;
  return `
    <div class="variant-parent-block" data-variant-parent>
      <div class="variant-parent-title"><strong>Tingkat 1 #${index + 1}</strong><span>Isi nama grup utama, lalu tambah pilihan tingkat 2.</span></div>
      ${variantRowHtml(parent, "parent")}
      <div class="variant-child-title">Pilihan tingkat 2</div>
      <div class="variant-child-list">
        ${(children.length ? children : [{}]).map(child => variantChildRowHtml(child)).join("")}
      </div>
      <button class="btn variant-add-btn" type="button" onclick="addVariantChild(this)">+ Varian Tingkat 2</button>
    </div>
  `;
}

function addVariantRow(button) {
  button.closest(".variant-panel")?.querySelector(".variant-row-list")?.insertAdjacentHTML("beforeend", variantRowHtml());
}

function addVariantParent(button) {
  const list = button.closest(".variant-panel")?.querySelector(".variant-parent-list");
  if (!list) return;
  list.insertAdjacentHTML("beforeend", variantParentBlockHtml({}, list.querySelectorAll("[data-variant-parent]").length));
}

function addVariantChild(button) {
  button.closest("[data-variant-parent]")?.querySelector(".variant-child-list")?.insertAdjacentHTML("beforeend", variantChildRowHtml());
}

function readVariantRows(form) {
  return [...form.querySelectorAll(".variant-level-1 .variant-row-list .variant-row")]
    .map(row => ({
      name: row.querySelector("[name='variantName']")?.value.trim() || "",
      price: Number(row.querySelector("[name='variantPrice']")?.value || 0),
      cost: Number(row.querySelector("[name='variantCost']")?.value || 0)
    }))
    .filter(option => option.name);
}

function readVariantParents(form) {
  return [...form.querySelectorAll("[data-variant-parent]")]
    .map(block => ({
      name: block.querySelector("[name='variantParentName']")?.value.trim() || "",
      price: 0,
      cost: 0,
      children: [...block.querySelectorAll(".variant-child-row")]
        .map(row => ({
          name: row.querySelector("[name='variantChildName']")?.value.trim() || "",
          price: Number(row.querySelector("[name='variantChildPrice']")?.value || 0),
          cost: Number(row.querySelector("[name='variantChildCost']")?.value || 0)
        }))
        .filter(option => option.name)
    }))
    .filter(parent => parent.name);
}

function openProductForm(id) {
  const product = state.products.find(item => item.id === id) || {
    name: "", sku: "", imageName: "", category: "", description: "", price: "", cost: "", stock: "", minStock: "",
    active: true, soldOut: false, trackStock: true, prepMinutes: "", unit: "item", station: "Dapur",
    channelPOS: true, channelSelfOrder: false, channelDelivery: true,
    kitchenNote: "", variantMode: "off", variantGroup: "", variantRequired: false, variantOptions: [],
    variantGroup2: "", variantRequired2: false, variantOptions2: [], allowedAddonIds: [], stockOpname: false,
    stockOpnameCheckedAt: "", stockOpnameCheckedBy: ""
  };
  const variantOptions = product.variantOptions?.length ? product.variantOptions : [{}];
  const legacyChildren = product.variantOptions2 || [];
  const allowedAddonIds = product.allowedAddonIds || [];
  const hasVariant = product.variantMode !== "off";
  const categories = productCategories();
  const categoryOptions = [...new Set([product.category, ...categories].filter(Boolean))];
  const numericInputValue = value => value === "" || value === null || value === undefined ? "" : Number(value || 0);
  openModal(`
    <div class="section-title product-form-title">
      <div><h3>${id ? "Edit Barang" : "Tambah Barang Baru"}</h3><p>Konfigurasi detail menu, stok, varian, add-on, dan ketersediaan outlet.</p></div>
      <div class="toolbar"><button class="btn" onclick="closeModal()">Tutup</button></div>
    </div>
    <form id="productForm" onsubmit="saveProduct(event, '${id || ""}')" class="product-form">
      <div class="product-form-body">
        <section class="product-tab active" id="product-tab-basic">
          <div class="product-section-heading"><strong>Informasi Dasar</strong><span>Data utama yang tampil di daftar barang dan kasir.</span></div>
          <div class="product-basic-grid">
            <label class="product-photo-field ${product.imageName ? "has-image" : ""}">
              <input name="imageName" type="hidden" value="${escapeHtml(product.imageName || "")}" />
              <input type="file" accept="image/*" onchange="uploadProductPhoto(this)" hidden />
              ${product.imageName ? mediaImageTag(product.imageName, "Foto produk", "", 220) : `<span class="photo-icon">+</span>`}
              <strong>Foto Produk</strong>
              <small>${product.imageName ? "Klik untuk ganti foto produk." : "Klik untuk upload foto. Min. 600x600px."}</small>
            </label>
            <div class="grid">
              <div class="grid grid-2 product-price-grid">
                <div class="field wide"><label>Nama Produk</label><input name="name" class="input" required placeholder="Contoh: Es Kopi Susu" value="${escapeHtml(product.name)}" /></div>
                <div class="field"><label>Kode / SKU</label><input name="sku" class="input" required placeholder="KOP-001" value="${escapeHtml(product.sku)}" /></div>
                <div class="field wide product-category-field"><label>Kategori</label>
                  <div class="product-category-combobox">
                    <input id="productCategoryInput" name="category" class="input" required placeholder="Ketik atau pilih kategori" value="${escapeHtml(product.category || "")}" onfocus="syncProductCategoryMenu(this, true)" oninput="syncProductCategoryMenu(this, true)" onblur="scheduleProductCategoryClose(this)" />
                    <button type="button" aria-label="Tampilkan kategori" onclick="toggleProductCategoryMenu(this)">v</button>
                  </div>
                  <div class="product-category-menu">
                    <button type="button" class="product-category-new" data-category-new onmousedown="event.preventDefault()" onclick="pickTypedProductCategory(this)" hidden></button>
                    ${categoryOptions.map(category => `<button type="button" data-category-option="${escapeHtml(category)}" onmousedown="event.preventDefault()" onclick='pickProductCategory(${JSON.stringify(category)})'>${escapeHtml(category)}</button>`).join("")}
                  </div>
                </div>
                <div class="field default-price-field ${hasVariant ? "muted-field" : ""}"><label>Harga Jual Tanpa Varian</label><input name="price" class="input price-input" type="number" min="0" required value="${hasVariant ? "" : numericInputValue(product.price)}" ${hasVariant ? "readonly" : ""} /><small>${hasVariant ? "Produk memakai harga varian. Harga ini tidak dipakai." : "Dipakai hanya jika mode varian dimatikan."}</small></div>
                <div class="field default-cost-field ${hasVariant ? "muted-field" : ""}"><label>Harga Modal</label><input name="cost" class="input price-input" type="number" min="0" value="${hasVariant ? "" : numericInputValue(product.cost)}" ${hasVariant ? "readonly" : ""} /><small>${hasVariant ? "Produk memakai modal varian. Modal ini tidak dipakai." : "Dipakai hanya jika mode varian dimatikan."}</small></div>
              </div>
            </div>
          </div>
        </section>
        <section class="product-tab active" id="product-tab-inventory">
          <div class="product-option-panel horizontal">
            <div><strong>Gunakan Stok Produk</strong><span>Matikan untuk menu jasa/tambahan yang tidak mengurangi stok.</span></div>
            <label class="switch"><input name="trackStock" type="checkbox" ${product.trackStock ? "checked" : ""} onchange="syncStockFields(this.checked)" /><span></span></label>
          </div>
          <div class="grid grid-2 product-stock-grid">
            <div class="field stock-dependent-field ${product.trackStock ? "" : "muted-field"}"><label>Stok Saat Ini</label><input name="stock" class="input" type="number" min="0" required value="${numericInputValue(product.stock)}" ${product.trackStock ? "" : "disabled"} /></div>
            <div class="field stock-dependent-field ${product.trackStock ? "" : "muted-field"}"><label>Batas Minimum Stok</label><input name="minStock" class="input" type="number" min="0" required value="${numericInputValue(product.minStock)}" ${product.trackStock ? "" : "disabled"} /></div>
          </div>
        </section>
        <section class="product-tab active" id="product-tab-variants">
          <div class="product-option-panel">
            <div class="line"><strong>Mode Varian</strong><select name="variantMode" onchange="syncVariantPanels(this.value); syncDefaultPriceField(this.value)"><option value="off" ${product.variantMode === "off" ? "selected" : ""}>Tanpa varian</option><option value="1" ${product.variantMode === "1" ? "selected" : ""}>1 tingkat</option><option value="2" ${product.variantMode === "2" ? "selected" : ""}>2 tingkat</option></select></div>
          </div>
          <div class="product-option-panel variant-panel variant-level-1 ${product.variantMode === "off" || product.variantMode === "2" ? "hidden" : ""}">
            <div class="line"><strong>Grup Varian Tingkat 1</strong></div>
            <div class="field"><label>Nama Grup</label><input name="variantGroup" class="input" placeholder="Contoh: Tingkat gula, ukuran cup" value="${escapeHtml(product.variantGroup || "")}" /></div>
            <div class="variant-row variant-row-head"><span>Nama Varian</span><span>Harga Modal</span><span>Harga Jual</span></div>
            <div class="variant-row-list">${variantOptions.map(option => variantRowHtml(option)).join("")}</div>
            <button class="btn variant-add-btn" type="button" onclick="addVariantRow(this)">+ Varian Tingkat 1</button>
          </div>
          <div class="product-option-panel variant-panel variant-level-2 ${product.variantMode === "2" ? "" : "hidden"}">
            <div class="line"><strong>Grup Varian Tingkat 2</strong></div>
            <div class="grid grid-2">
              <div class="field"><label>Nama Grup Tingkat 1</label><input name="variantGroupParent" class="input" placeholder="Contoh: Jenis nasi goreng" value="${escapeHtml(product.variantGroup || "")}" /></div>
              <div class="field"><label>Nama Grup Tingkat 2</label><input name="variantGroup2" class="input" placeholder="Contoh: Lauk" value="${escapeHtml(product.variantGroup2 || "")}" /></div>
            </div>
            <div class="variant-parent-list">${variantOptions.map((parent, index) => variantParentBlockHtml(parent, index, legacyChildren)).join("")}</div>
            <button class="btn variant-add-btn" type="button" onclick="addVariantParent(this)">+ Varian Tingkat 1</button>
          </div>
          <div class="product-option-panel">
            <div class="line product-addon-line"><strong>Add-on yang boleh dipilih</strong><button class="btn product-addon-manage-btn" type="button" onclick="toggleInlineAddonManager(this)">Kelola Add-on</button></div>
            <div class="addon-picker-grid">
              ${productAddonPickerHtml(allowedAddonIds)}
            </div>
            <div class="product-inline-addon-panel hidden" data-product-addon-manager>
              <div class="product-inline-addon-form" data-inline-addon-form>
                <input name="inlineAddonId" type="hidden" />
                <input name="inlineAddonName" class="input" placeholder="Nama add-on" />
                <input name="inlineAddonPrice" class="input" type="number" min="0" placeholder="Jual" />
                <input name="inlineAddonCost" class="input" type="number" min="0" placeholder="Modal" />
                <button class="btn accent" type="button" onclick="saveInlineAddonFromButton(this)">Simpan</button>
              </div>
              <div class="product-inline-addon-list">${productInlineAddonListHtml()}</div>
            </div>
          </div>
        </section>
        <section class="product-tab active" id="product-tab-availability">
          <div class="product-section-heading"><strong>Ketersediaan</strong><span>Atur channel penjualan dan status barang.</span></div>
          <div class="channel-grid">
            ${[
              ["channelPOS", "Kasir POS", "Dapat dipesan langsung dari outlet."],
              ["channelSelfOrder", "Self-Order", "Pelanggan memesan via QR atau kiosk."],
              ["channelDelivery", "Delivery", "Tersedia untuk pesanan antar."]
            ].map(([name, title, hint]) => `<label class="channel-card"><strong>${title}</strong><span>${hint}</span><input name="${name}" type="checkbox" ${product[name] ? "checked" : ""} /></label>`).join("")}
          </div>
          <div class="product-option-panel horizontal stock-opname-option">
            <div><strong>Stok Opname</strong><span>Masukkan barang ini ke halaman khusus pengecekan stok berkala.</span></div>
            <label class="switch"><input name="stockOpname" type="checkbox" ${product.stockOpname ? "checked" : ""} /><span></span></label>
          </div>
          <div class="product-form-footer">
            <button class="btn accent product-save-btn" type="submit"><span>Simpan Barang</span></button>
          </div>
        </section>
      </div>
    </form>
  `);
}

function switchProductFormTab(tab) {
  document.querySelectorAll("[data-product-tab]").forEach(button => button.classList.toggle("active", button.dataset.productTab === tab));
  document.querySelectorAll(".product-tab").forEach(panel => panel.classList.toggle("active", panel.id === `product-tab-${tab}`));
}

function syncProductCategoryMenu(input, forceOpen = false) {
  const field = input.closest(".product-category-field");
  const menu = field?.querySelector(".product-category-menu");
  if (!field || !menu) return;
  const value = input.value.trim();
  const normalized = value.toLowerCase();
  let hasExact = false;
  let visibleCount = 0;
  menu.querySelectorAll("[data-category-option]").forEach(button => {
    const category = button.dataset.categoryOption || "";
    const matches = !normalized || category.toLowerCase().includes(normalized);
    if (category.toLowerCase() === normalized) hasExact = true;
    button.hidden = !matches;
    if (matches) visibleCount += 1;
  });
  const newButton = menu.querySelector("[data-category-new]");
  if (newButton) {
    newButton.hidden = !value || hasExact;
    newButton.textContent = `+ Kategori baru: ${value}`;
  }
  field.classList.toggle("open", forceOpen || Boolean(value) || visibleCount > 0);
}

function scheduleProductCategoryClose(input) {
  const field = input.closest(".product-category-field");
  window.setTimeout(() => {
    if (!field?.matches(":focus-within")) field?.classList.remove("open");
  }, 220);
}

function toggleProductCategoryMenu(button) {
  const input = button.closest(".product-category-field")?.querySelector("input[name='category']");
  if (!input) return;
  input.focus();
  syncProductCategoryMenu(input, true);
}

function pickProductCategory(category) {
  const input = document.querySelector("#productCategoryInput");
  if (!input) return;
  input.value = category;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.closest(".product-category-field")?.classList.remove("open");
  input.focus();
}

function pickTypedProductCategory(button) {
  const input = button.closest(".product-category-field")?.querySelector("input[name='category']");
  if (!input) return;
  input.value = input.value.trim();
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.closest(".product-category-field")?.classList.remove("open");
  input.focus();
}

async function uploadProductPhoto(input) {
  const file = input?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return toast("Pilih file gambar untuk foto produk.");
  const form = input.closest("form");
  const field = input.closest(".product-photo-field");
  const hidden = field?.querySelector("input[name='imageName']");
  const productName = form?.querySelector("input[name='name']")?.value?.trim();
  const productSku = form?.querySelector("input[name='sku']")?.value?.trim();
  let previewUrl = "";
  try {
    field?.classList.add("uploading");
    previewUrl = URL.createObjectURL(file);
    if (field) {
      field.classList.add("has-image");
      const image = field.querySelector("img") || document.createElement("img");
      image.src = previewUrl;
      image.alt = "Foto produk";
      image.classList.add("upload-preview");
      field.querySelector(".photo-icon")?.remove();
      field.insertBefore(image, field.querySelector("strong"));
      const hint = field.querySelector("small");
      if (hint) hint.textContent = "Mengupload foto...";
    }
    const uploaded = await uploadMediaFileToGas(file, {
      type: "product",
      ownerId: productSku || productName || `product-${Date.now()}`
    });
    if (hidden) hidden.value = uploaded.url;
    if (field) {
      field.classList.add("has-image");
      const image = field.querySelector("img") || document.createElement("img");
      image.src = mediaImageSrc(uploaded.url, 220);
      image.dataset.mediaIndex = "0";
      image.onerror = function() {
        const candidates = mediaImageCandidates(uploaded.url, 220);
        this.dataset.mediaIndex = String(Number(this.dataset.mediaIndex || 0) + 1);
        if (candidates[this.dataset.mediaIndex]) this.src = candidates[this.dataset.mediaIndex];
        else {
          this.onerror = null;
          this.hidden = true;
        }
      };
      image.alt = "Foto produk";
      image.classList.remove("upload-preview");
      field.querySelector(".photo-icon")?.remove();
      field.insertBefore(image, field.querySelector("strong"));
      const hint = field.querySelector("small");
      if (hint) hint.textContent = uploaded.local ? "Foto tersimpan lokal. Isi URL GAS untuk simpan ke Drive." : "Foto tersimpan di Google Drive.";
    }
    toast(uploaded.local ? "Foto produk tersimpan lokal." : "Foto produk tersimpan di Google Drive.");
  } catch (error) {
    console.error(error);
    toast(`Upload foto produk gagal. ${error.message || "Periksa URL GAS atau izin Web App."}`);
  } finally {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    field?.querySelector("img.upload-preview")?.classList.remove("upload-preview");
    field?.classList.remove("uploading");
    input.value = "";
  }
}

function syncVariantPanels(mode) {
  document.querySelectorAll(".variant-level-1").forEach(panel => panel.classList.toggle("hidden", mode === "off" || mode === "2"));
  document.querySelectorAll(".variant-level-2").forEach(panel => panel.classList.toggle("hidden", mode !== "2"));
}

function syncDefaultPriceField(mode) {
  const hasVariant = mode !== "off";
  [
    [".default-price-field", "price", "Produk memakai harga varian. Harga ini tidak dipakai.", "Dipakai hanya jika mode varian dimatikan."],
    [".default-cost-field", "cost", "Produk memakai modal varian. Modal ini tidak dipakai.", "Dipakai hanya jika mode varian dimatikan."]
  ].forEach(([selector, name, variantHint, defaultHint]) => {
    const field = document.querySelector(selector);
    const input = field?.querySelector(`input[name='${name}']`);
    const hint = field?.querySelector("small");
    if (!field || !input || !hint) return;
    field.classList.toggle("muted-field", hasVariant);
    input.readOnly = hasVariant;
    if (hasVariant) input.value = "";
    hint.textContent = hasVariant ? variantHint : defaultHint;
  });
}

function syncStockFields(enabled) {
  document.querySelectorAll(".stock-dependent-field").forEach(field => {
    field.classList.toggle("muted-field", !enabled);
    const input = field.querySelector("input");
    if (input) input.disabled = !enabled;
  });
}

function resetProductSaveButton(submitButton) {
  if (!submitButton) return;
  submitButton.disabled = false;
  submitButton.classList.remove("saving");
  submitButton.innerHTML = `<span>Simpan Barang</span>`;
}

function setProductFormSaving(form, saving) {
  const submitButton = form?.querySelector?.(".product-save-btn");
  if (submitButton) {
    submitButton.disabled = saving;
    submitButton.classList.toggle("saving", saving);
    submitButton.innerHTML = saving
      ? `<span class="btn-spinner" aria-hidden="true"></span><span>Menyimpan...</span>`
      : `<span>Simpan Barang</span>`;
  }
  document.querySelectorAll("[data-product-form-close]").forEach(button => {
    button.disabled = saving;
    button.classList.toggle("disabled", saving);
  });
  form?.classList?.toggle("saving", saving);
}

async function saveProduct(event, id) {
  event.preventDefault();
  const target = event.target;
  const submitButton = target?.querySelector?.(".product-save-btn");
  if (submitButton?.disabled) return;
  const existingProduct = state.products.find(item => item.id === id) || {};
  setProductFormSaving(target, true);
  const form = new FormData(target);
  const trackStock = form.get("trackStock") === "on";
  const wantsStockOpname = form.get("stockOpname") === "on";
  if (wantsStockOpname && !supabaseStockOpnameColumnsReady) {
    toast("Kolom stok opname belum ada di Supabase. Jalankan docs/stock_inventory_foundation.sql dulu.");
    setProductFormSaving(target, false);
    return;
  }
  const variantMode = form.get("variantMode") || "off";
  const variantOptions = variantMode === "2" ? readVariantParents(target) : readVariantRows(target);
  const finalOptions = variantMode === "2" ? variantOptions.flatMap(parent => parent.children || []) : variantOptions;
  const variantPriceFallback = finalOptions.find(option => Number(option.price || 0) > 0)?.price || 0;
  const variantCostFallback = finalOptions.find(option => Number(option.cost || 0) > 0)?.cost || 0;
  const category = String(form.get("category") || "").trim();
  const payload = {
    id: id || uid(),
    name: form.get("name"),
    sku: form.get("sku"),
    imageName: String(form.get("imageName") || "").trim(),
    category,
    description: "",
    price: variantMode === "off" ? Number(form.get("price")) : Number(variantPriceFallback),
    cost: variantMode === "off" ? Number(form.get("cost")) : Number(variantCostFallback),
    stock: trackStock ? Number(form.get("stock") || 0) : 0,
    minStock: trackStock ? Number(form.get("minStock") || 0) : 0,
    prepMinutes: Number(form.get("prepMinutes") || 5),
    unit: "item",
    station: "Dapur",
    kitchenNote: "",
    channelPOS: form.get("channelPOS") === "on",
    channelSelfOrder: form.get("channelSelfOrder") === "on",
    channelDelivery: form.get("channelDelivery") === "on",
    variantMode,
    variantGroup: variantMode === "off" ? "" : (variantMode === "2" ? form.get("variantGroupParent") : form.get("variantGroup")) || "",
    variantRequired: variantMode !== "off" && form.get("variantRequired") === "on",
    variantOptions: variantMode === "off" ? [] : variantOptions,
    variantGroup2: variantMode === "2" ? form.get("variantGroup2") || "" : "",
    variantRequired2: variantMode === "2" && form.get("variantRequired2") === "on",
    variantOptions2: [],
    allowedAddonIds: form.getAll("allowedAddonIds"),
    addonConfigured: true,
    active: true,
    soldOut: Boolean(existingProduct.soldOut),
    trackStock,
    stockOpname: wantsStockOpname,
    stockOpnameCheckedAt: wantsStockOpname ? existingProduct.stockOpnameCheckedAt || "" : "",
    stockOpnameCheckedBy: wantsStockOpname ? existingProduct.stockOpnameCheckedBy || "" : ""
  };
  const deletedProductSnapshot = structuredClone(state.deletedProducts || []);
  const revivesDeletedProduct = isDeletedProduct(payload);
  try {
    const synced = await syncMasterEntity("product", payload, "upsert", { userInitiated: true, allowDeletedProductUpsert: true });
    if (!synced) throw lastMasterSyncError || new Error("Produk belum tersimpan ke Supabase.");
    if (revivesDeletedProduct) {
      forgetDeletedProduct(payload);
      const ledgerSynced = await syncStoreSettingsToSupabase({ silent: true });
      if (!ledgerSynced) throw new Error("Produk terkirim, tetapi daftar produk terhapus belum berhasil diperbarui.");
    }
    audit(id ? "Produk diperbarui" : "Produk ditambahkan", payload.name);
    const reloaded = await reloadMasterDataForProductSave();
    if (!reloaded) throw new Error("Produk terkirim, tetapi daftar produk belum berhasil dimuat ulang dari Supabase.");
    const confirmed = state.products.some(product => savedProductMatchesPayload(product, payload, synced === true ? "" : synced));
    if (!confirmed) throw new Error("Produk belum muncul kembali dari Supabase.");
    closeModal();
    render();
  } catch (error) {
    state.deletedProducts = normalizeDeletedProductMarkers(deletedProductSnapshot);
    console.error("Save product failed", error);
    toast(`Gagal menyimpan barang: ${error.message || "Coba lagi."}`);
    setProductFormSaving(target, false);
  }
}

function renderStock() {
  const products = [...state.products].sort((a, b) => a.stock - b.stock);
  return `
    <div class="grid grid-2">
      <div class="card">
        <div class="section-title"><div><h3>Status Stok</h3><p>Produk habis dan menipis diprioritaskan.</p></div></div>
        ${products.map(product => {
          const stateText = !product.trackStock ? "Tidak dilacak" : product.stock <= 0 ? "Habis" : product.stock <= product.minStock ? "Menipis" : "Aman";
          return `<div class="list-row"><div class="line"><strong>${escapeHtml(product.name)}</strong><span class="pill ${stateText === "Habis" ? "cancel" : stateText === "Menipis" ? "process" : "ready"}">${stateText}</span></div><div class="line muted"><span>Stok ${product.stock} &middot; Minimum ${product.minStock}</span><button class="btn" onclick="openStockForm('${product.id}')">Atur</button></div></div>`;
        }).join("")}
      </div>
      <div class="card">
        <div class="section-title"><div><h3>Riwayat Stok</h3><p>Pergerakan otomatis dari transaksi dan pembatalan.</p></div></div>
        ${state.stockMovements.slice(0, 20).map(move => `<div class="list-row"><div class="line"><strong>${escapeHtml(move.productName)}</strong><span class="${move.qty < 0 ? "danger-text" : "success-text"}">${move.qty > 0 ? "+" : ""}${move.qty}</span></div><p class="muted" style="margin:0">${escapeHtml(move.reason)} &middot; ${dateTime(move.at)}</p></div>`).join("") || empty("Belum ada pergerakan stok.")}
      </div>
    </div>
  `;
}

function openStockForm(productId = "") {
  const options = state.products.map(product => `<option value="${product.id}" ${product.id === productId ? "selected" : ""}>${escapeHtml(product.name)} (${product.stock})</option>`).join("");
  openModal(`
    <div class="section-title"><div><h3>Penyesuaian Stok</h3><p>Catat stok masuk, keluar, atau koreksi manual.</p></div><button class="btn" onclick="closeModal()">Tutup</button></div>
    <form onsubmit="saveStock(event)" class="grid">
      <div class="field"><label>Produk</label><select name="productId">${options}</select></div>
      <div class="grid grid-2">
        <div class="field"><label>Jumlah perubahan</label><input class="input" name="qty" type="number" required placeholder="Contoh: 10 atau -3" /></div>
        <div class="field"><label>Alasan</label><input class="input" name="reason" required placeholder="Stok masuk supplier" /></div>
      </div>
      <button class="btn accent" type="submit">Simpan Penyesuaian</button>
    </form>
  `);
}

function saveStock(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const product = state.products.find(item => item.id === form.get("productId"));
  const qty = Number(form.get("qty"));
  if (!product || !qty) return toast("Data stok belum lengkap.");
  if (!product.trackStock) return toast("Produk ini menggunakan mode tanpa stok.");
  product.stock = Math.max(0, product.stock + qty);
  const reason = form.get("reason");
  state.stockMovements.unshift({ id: uid(), at: new Date().toISOString(), productId: product.id, productName: product.name, qty, reason });
  audit("Stok disesuaikan", `${product.name}: ${qty > 0 ? "+" : ""}${qty} (${reason})`);
  saveState();
  syncMasterEntity("product", product, "upsert", { userInitiated: true });
  closeModal();
  render();
}

function stockStatus(product) {
  if (product.soldOut) return { label: "Habis", className: "cancel", rank: 0 };
  if (product.trackStock && product.stock <= 0) return { label: "Habis", className: "cancel", rank: 0 };
  if (product.trackStock && product.stock <= product.minStock) return { label: "Menipis", className: "process", rank: 1 };
  return { label: "Aman", className: "ready", rank: 2 };
}

function stockStats(products) {
  return products.reduce((summary, product) => {
    const units = productAvailabilityFinalUnits(product);
    if (units.total > 1) {
      summary.total += units.total;
      summary.soldOut += units.soldOut;
      summary.safe += units.available;
      return summary;
    }
    const status = stockStatus(product);
    summary.total += 1;
    if (status.label === "Habis") summary.soldOut += 1;
    if (status.label === "Menipis") summary.low += 1;
    if (status.label !== "Habis") summary.safe += 1;
    return summary;
  }, { total: 0, soldOut: 0, low: 0, safe: 0, untracked: 0 });
}

function addonStockEntries() {
  return uniqueAddons(state.addons || [])
    .filter(addon => addon.active !== false)
    .map(addon => ({
      ...addon,
      type: "addon",
      category: "Add-on",
      trackStock: false
    }));
}

function addonStockStatus(addon) {
  return addon?.soldOut ? { label: "Habis", className: "cancel", rank: 0 } : { label: "Aman", className: "ready", rank: 2 };
}

function stockStatsWithAddons(products = stableProducts(state.products).filter(product => !product.stockOpname), addons = addonStockEntries()) {
  const summary = stockStats(products);
  for (const addon of addons) {
    summary.total += 1;
    if (addon.soldOut) summary.soldOut += 1;
    else summary.safe += 1;
  }
  return summary;
}

function stockSoldOutCount() {
  return stockStatsWithAddons().soldOut;
}

function setStockFilter(key, value) {
  sessionStorage.setItem(key, value);
  render();
}

function filterStockList(query = "") {
  sessionStorage.setItem("stock_query", query);
  const normalized = query.trim().toLowerCase();
  document.querySelectorAll("[data-stock-row]").forEach(row => {
    row.hidden = normalized && !row.dataset.stockSearch.includes(normalized);
  });
}

function stockSummaryCard(label, value, hint, tone = "", onclick = "", active = false) {
  const actionAttrs = onclick ? ` role="button" tabindex="0" onclick="${onclick}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();${onclick}}"` : "";
  return `
    <article class="stock-summary-card ${tone} ${onclick ? "clickable" : ""} ${active ? "active" : ""}"${actionAttrs}>
      <span>${label}</span>
      <strong>${value}</strong>
      ${hint ? `<small>${hint}</small>` : ""}
    </article>
  `;
}

function stockProductCardHtml() {
  return "";
}

function stockVariantDetailsHtml(product, variantGroups) {
  const openIds = JSON.parse(sessionStorage.getItem("stock_variant_open") || "[]");
  const isOpen = openIds.includes(product.id);
  const variantCount = variantGroups.flatMap(group => group.variants).length;
  return `
    <details class="stock-variant-details" ${isOpen ? "open" : ""} ontoggle='syncStockVariantOpen(this, ${JSON.stringify(product.id)})'>
      <summary><span></span><b>Varian</b><small>${variantCount} opsi</small><i aria-hidden="true"></i><span></span></summary>
      <div class="stock-variant-panel">
        ${variantGroups.map(group => `
          <section class="stock-variant-group">
            <h4>${escapeHtml(group.title)}</h4>
            <div class="stock-variant-list">
              ${group.variants.map(variant => stockVariantRowHtml(product, variant)).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    </details>
  `;
}

function syncStockVariantOpen(details, productId) {
  const openIds = new Set(JSON.parse(sessionStorage.getItem("stock_variant_open") || "[]"));
  if (details.open) openIds.add(productId);
  else openIds.delete(productId);
  sessionStorage.setItem("stock_variant_open", JSON.stringify([...openIds]));
}

function stockVariantRowHtml(product, variant) {
  const soldOut = isProductVariantSoldOut(product, variant.key);
  return `
    <div class="stock-variant-row">
      <span>${escapeHtml(variant.label)}</span>
      <span class="stock-variant-actions">
        <button type="button" class="${soldOut ? "" : "active"}" onclick='toggleStockVariantAvailability(${JSON.stringify(product.id)}, ${JSON.stringify(variant.key)}, false)'>Tersedia</button>
        <button type="button" class="${soldOut ? "danger active" : "danger"}" onclick='toggleStockVariantAvailability(${JSON.stringify(product.id)}, ${JSON.stringify(variant.key)}, true)'>Habis</button>
      </span>
    </div>
  `;
}

function toggleStockVariantAvailability(productId, variantKey, soldOut) {
  const product = state.products.find(item => item.id === productId);
  if (!product) return;
  const openIds = new Set(JSON.parse(sessionStorage.getItem("stock_variant_open") || "[]"));
  openIds.add(productId);
  sessionStorage.setItem("stock_variant_open", JSON.stringify([...openIds]));
  product.soldOutVariants ||= {};
  if (soldOut) product.soldOutVariants[variantKey] = true;
  else delete product.soldOutVariants[variantKey];
  saveState();
  syncMasterEntity("product", product, "upsert", { userInitiated: true });
  broadcastRealtimeEvent("products");
  render();
}

function renderStockV2() {
  return `<section class="stock-page"><div class="stock-list-card">${empty("Memuat halaman stok...")}</div></section>`;
}

function renderStockOpname() {
  return `<section class="stock-page stock-opname-page"><div class="stock-list-card">${empty("Memuat halaman stok opname...")}</div></section>`;
}

function setStockOpnameTab(tab) {
  sessionStorage.setItem("stock_opname_tab", tab);
}

function stockOpnameProducts() {
  return stableProducts(state.products).filter(product => product.stockOpname);
}

function renderStockInventoryPanel() {
  return "";
}

function renderStockAuditPanel() {
  return "";
}

function renderStockHistoryPanel() {
  return "";
}

function stockOpnameToolbar() {
  return "";
}

function filterStockOpnameProducts(products = []) {
  return products;
}

function stockInventoryCardHtml() {
  return "";
}

function stockOpnameCardHtml() {
  return "";
}

function toggleStockOpnameChecked() {}

function submitStockAudit() {}

function setStockOpnameFilter(value) {
  sessionStorage.setItem("stock_opname_check", value);
}

function setStockInventoryStatus(value) {
  sessionStorage.setItem("stock_opname_inventory_status", value);
}

function filterStockOpnameList(query = "") {
  sessionStorage.setItem("stock_opname_query", query);
}
function openStockFormV2(productId = "") {
  const stockProducts = state.products.filter(product => product.trackStock);
  if (!stockProducts.length) return toast("Belum ada produk yang menggunakan stok.");
  const options = stockProducts.map(product => `<option value="${product.id}" ${product.id === productId ? "selected" : ""}>${escapeHtml(product.name)} (${product.stock})</option>`).join("");
  openModal(`
    <div class="section-title"><div><h3>Penyesuaian Stok</h3><p>Catat stok masuk, keluar, atau koreksi manual.</p></div><button class="btn" onclick="closeModal()">Tutup</button></div>
    <form onsubmit="saveStock(event)" class="grid">
      <div class="field"><label>Produk</label><select name="productId">${options}</select></div>
      <div class="grid grid-2">
        <div class="field"><label>Jumlah perubahan</label><input class="input" name="qty" type="number" required placeholder="Contoh: 10 atau -3" /></div>
        <div class="field"><label>Alasan</label><input class="input" name="reason" required placeholder="Stok masuk supplier" /></div>
      </div>
      <button class="btn accent" type="submit">Simpan Penyesuaian</button>
    </form>
  `);
}

function orderReportRecord(order) {
  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount || 0);
  const total = Math.max(0, subtotal - discount);
  const profit = (order.items || order.cart || []).reduce((sum, item) => {
    const addonsProfit = (item.addons || []).reduce((acc, addon) => acc + addonProfit(addon), 0);
    return sum + Math.max(0, (Number(item.price || 0) - Number(item.cost || 0)) * Number(item.qty || 0) + addonsProfit - itemDiscountAmount(item));
  }, 0);
  return {
    id: order.id,
    number: order.number,
    createdAt: order.createdAt,
    source: "Kasirin!",
    imported: false,
    type: order.type || "Dine In",
    customer: order.customer || "Walk-in",
    paymentMethod: order.paymentMethod || "Belum dipilih",
    paymentStatus: order.paymentStatus || "Belum lunas",
    status: order.status || "",
    subtotal,
    discount,
    total,
    profit,
    items: order.items || order.cart || []
  };
}

function importedReportRecord(row) {
  return {
    id: row.id || uid(),
    number: row.number || "-",
    createdAt: row.createdAt,
    source: row.source || "Import Kasir Lama",
    imported: true,
    type: row.type || "Import",
    customer: row.customer || "-",
    paymentMethod: row.paymentMethod || "Cash dan Piutang",
    paymentStatus: row.paymentStatus || "Lunas",
    subtotal: Number(row.subtotal ?? row.total ?? 0),
    discount: Number(row.discount || 0),
    total: Number(row.total ?? row.subtotal ?? 0),
    profit: Number(row.profit || 0),
    items: row.items || []
  };
}

function reportRecordKey(record) {
  return [
    record.number || record.id || "-",
    record.createdAt ? new Date(record.createdAt).toISOString() : "",
    Number(record.total || 0)
  ].join("|");
}

function recordInRange(record, range) {
  if (!range) return true;
  const date = new Date(record.createdAt);
  return date >= range.start && date <= range.end;
}

function rawRecordInRange(record, range) {
  if (!range) return true;
  if (!record?.createdAt) return false;
  const date = new Date(record.createdAt);
  return date >= range.start && date <= range.end;
}

function reportSourceRecords(range = null) {
  const deletedKeys = new Set(state.deletedReportKeys || []);
  const localRecords = [
    ...state.orders.filter(order => isReportableOrder(order) && rawRecordInRange(order, range)).map(orderReportRecord),
    ...(state.importedSales || []).filter(row => rawRecordInRange(row, range)).map(importedReportRecord)
  ].filter(record => {
    const key = reportRecordKey(record);
    return isReportableRecord(record) && recordInRange(record, range) && !deletedKeys.has(key);
  });
  const merged = new Map();
  for (const record of localRecords) merged.set(reportRecordKey(record), record);
  for (const record of supabaseReportRecords.filter(record => isReportableRecord(record) && recordInRange(record, range))) {
    const key = reportRecordKey(record);
    if (deletedKeys.has(key)) continue;
    const existing = merged.get(key);
    const existingHasItems = Boolean((existing?.items || []).length);
    const incomingHasItems = Boolean((record.items || []).length);
    if (!existing || (!existingHasItems && incomingHasItems)) merged.set(key, record);
  }
  return [...merged.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function deleteReportTransaction(recordKey) {
  const record = reportSourceRecords().find(item => reportRecordKey(item) === recordKey)
    || supabaseReportRecords.find(item => reportRecordKey(item) === recordKey);
  if (!record) return toast("Transaksi tidak ditemukan.");
  openConfirmDialog({
    title: "Hapus Transaksi",
    message: `Hapus transaksi ${shortOrderNumber(record.number)} dari laporan?`,
    detail: "Data akan dihapus dari laporan lokal dan Supabase jika tersedia.",
    confirmLabel: "Hapus",
    cancelLabel: "Batal",
    danger: true,
    onConfirm: async () => {
      const key = reportRecordKey(record);
      state.deletedReportKeys ||= [];
      if (!state.deletedReportKeys.includes(key)) state.deletedReportKeys.push(key);
      state.deletedReportKeys = state.deletedReportKeys.slice(-500);
      const matchingOrder = state.orders.find(order => reportRecordKey(orderReportRecord(order)) === key);
      const matchingLegacy = (state.importedSales || []).find(row => reportRecordKey(importedReportRecord(row)) === key);
      if (matchingOrder) {
        state.orders = state.orders.filter(order => order.id !== matchingOrder.id);
        state.syncQueue = (state.syncQueue || []).filter(item => item.orderId !== orderSyncQueueId(matchingOrder));
      }
      if (matchingLegacy) {
        state.importedSales = (state.importedSales || []).filter(row => reportRecordKey(importedReportRecord(row)) !== key);
      }
      supabaseReportRecords = supabaseReportRecords.filter(item => reportRecordKey(item) !== key);
      invalidateReportCaches();
      saveState();
      await deleteReportTransactionFromSupabase(record);
      audit("Transaksi laporan dihapus", record.number || record.id || "-");
      closeModal();
      if (view === "reports") {
        requestActiveReportData(true);
        render();
      }
      toast("Transaksi dihapus dari laporan.");
    }
  });
}

async function deleteReportTransactionFromSupabase(record) {
  if (!supabaseWritable()) return false;
  const number = String(record?.number || "").trim();
  if (!number || number === "-") return false;
  try {
    const imported = record.imported || String(record.source || "").toLowerCase().includes("import");
    const table = imported ? "legacy_sales" : "orders";
    const column = imported ? "legacy_number" : "order_number";
    const { error } = await supabaseClient.from(table).delete().eq(column, number);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Delete report transaction failed", error);
    toast(`Data lokal terhapus, Supabase belum terhapus: ${error.message}`);
    return false;
  }
}

function reportRange() {
  const period = sessionStorage.getItem("report_period") || "month";
  if (period === "day") {
    const today = todayKey();
    const start = startOfLocalDay(today);
    return { period, start, end: endOfLocalDay(today), label: `Hari ini - ${new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(start)}`, group: "hour" };
  }
  if (period === "yesterday") {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const yesterday = todayKey(date);
    const start = startOfLocalDay(yesterday);
    return { period, start, end: endOfLocalDay(yesterday), label: `Kemarin - ${new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(start)}`, group: "hour" };
  }
  if (period === "custom") {
    const customFrom = sessionStorage.getItem("report_from") || todayKey();
    const customTo = sessionStorage.getItem("report_to") || customFrom;
    const from = customFrom <= customTo ? customFrom : customTo;
    const to = customFrom <= customTo ? customTo : customFrom;
    return { period, start: startOfLocalDay(from), end: endOfLocalDay(to), label: `${from} s/d ${to}`, group: "day" };
  }
  if (period === "week") {
    const today = new Date();
    const offset = (today.getDay() + 6) % 7;
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset, 0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { period, start, end, label: `Minggu ini - ${new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(start)} s/d ${new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(end)}`, group: "day" };
  }
  const [year, monthNumber] = monthKey().split("-").map(Number);
  const start = new Date(year, monthNumber - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, monthNumber, 0, 23, 59, 59, 999);
  return { period, start, end, label: `Bulan ini - ${new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(start)}`, group: "day" };
}

function reportRecords() {
  const range = reportRange();
  return reportSourceRecords(range);
}

function reportTrend(records, range) {
  const buckets = [];
  if (range.group === "hour") {
    for (let hour = 0; hour <= 23; hour += 3) buckets.push({ key: String(hour), label: `${hour}:00`, count: 0, total: 0 });
    records.forEach(record => {
      const bucket = buckets[Math.min(buckets.length - 1, Math.floor(new Date(record.createdAt).getHours() / 3))];
      bucket.count += 1;
      bucket.total += record.total;
    });
    return buckets;
  }
  const cursor = new Date(range.start);
  while (cursor <= range.end) {
    buckets.push({ key: todayKey(cursor), label: String(cursor.getDate()), count: 0, total: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  records.forEach(record => {
    const bucket = buckets.find(item => item.key === todayKey(new Date(record.createdAt)));
    if (!bucket) return;
    bucket.count += 1;
    bucket.total += record.total;
  });
  return buckets;
}

function csvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (cell || row.length) rows.push([...row, cell.trim()]);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell || row.length) rows.push([...row, cell.trim()]);
  return rows.filter(item => item.length && item.some(Boolean));
}

function importLegacyRows(rows, fileName = "file") {
  const headerRow = rows.shift() || [];
  const header = headerRow.map(item => String(item || "").toLowerCase());
  const find = names => names.map(name => header.findIndex(item => item.includes(name))).find(index => index >= 0);
  const dateIndex = find(["tanggal", "date", "waktu"]);
  const numberIndex = find(["kode transaksi", "no", "invoice", "transaksi"]);
  const totalIndex = find(["total pendapatan", "pendapatan", "total", "omzet"]);
  const profitIndex = find(["keuntungan", "profit", "laba"]);
  const customerIndex = find(["nama pelanggan", "pelanggan", "customer"]);
  const paymentIndex = find(["metode pembayaran", "payment", "bayar", "cash"]);
  const payTypeIndex = find(["tipe pembayaran"]);
  const cashierIndex = find(["kasir"]);
  const existingKeys = new Set((state.importedSales || []).map(row => row.importKey || legacySaleKey(row)));
  const seenKeys = new Set(existingKeys);
  const parsed = rows
    .filter(row => String(row[numberIndex] || "").trim().toLowerCase() !== "total semua")
    .filter(row => String(row[dateIndex] || "").trim())
    .map(row => {
      const rawData = {};
      headerRow.forEach((key, index) => {
        if (key) rawData[String(key)] = row[index] ?? "";
      });
      return {
        id: uid(),
        number: row[numberIndex] || `IMPORT-${uid()}`,
        createdAt: parseReportDate(row[dateIndex]).toISOString(),
        customer: row[customerIndex] || "-",
        paymentMethod: row[paymentIndex] || row[payTypeIndex] || "Cash dan Piutang",
        paymentStatus: "Lunas",
        cashier: row[cashierIndex] || "",
        subtotal: parseMoney(row[totalIndex]),
        total: parseMoney(row[totalIndex]),
        profit: parseMoney(row[profitIndex]),
        source: "Import Kasir Lama",
        rawData
      };
    })
    .filter(row => row.total || row.profit)
    .map(row => ({ ...row, importKey: legacySaleKey(row) }));
  const imported = [];
  let duplicateCount = 0;
  for (const row of parsed) {
    const key = row.importKey || legacySaleKey(row);
    if (seenKeys.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seenKeys.add(key);
    imported.push(row);
  }
  if (imported.length) {
    state.importedSales = [...(state.importedSales || []), ...imported.map(compactLegacySale)];
    audit("Import database laporan lama", `${imported.length} transaksi baru dari ${fileName}`);
    saveState();
    render();
  }
  return { imported, duplicateCount, parsedCount: parsed.length, fileName };
}

function readLegacyFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Gagal membaca ${file.name}`));
    reader.onload = () => {
      try {
        if (/\.xlsx?$/i.test(file.name)) {
          if (!window.XLSX) return reject(new Error("Pembaca Excel belum termuat. Pastikan internet aktif lalu refresh halaman."));
          const workbook = XLSX.read(reader.result, { type: "array", cellDates: true });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          resolve(importLegacyRows(rows, file.name));
        } else {
          resolve(importLegacyRows(csvRows(String(reader.result || "")), file.name));
        }
      } catch (error) {
        reject(error);
      }
    };
    if (/\.xlsx?$/i.test(file.name)) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  });
}

async function importLegacySales(event) {
  const files = [...(event.target.files || [])];
  if (!files.length) return;
  try {
    const results = [];
    for (const file of files) {
      if (!window.XLSX) {
        event.target.value = "";
        return toast("Pembaca Excel belum termuat. Pastikan internet aktif lalu refresh halaman.");
      }
      results.push(await readLegacyFile(file));
    }
    const imported = results.flatMap(result => result.imported);
    const duplicateCount = results.reduce((sum, result) => sum + result.duplicateCount, 0);
    const fileNames = results.map(result => result.fileName).join(", ");
    if (supabaseWritable() && imported.length) {
      toast(`${imported.length} transaksi baru dari ${files.length} file. Mengirim ke Supabase...`);
      const synced = await syncLegacySalesToSupabase(imported, fileNames);
      if (synced) {
        if (view === "reports") requestActiveReportData(true);
        toast(`${imported.length} transaksi tersimpan. ${duplicateCount} duplikat dilewati.`);
      }
    } else if (imported.length) {
      toast(`${imported.length} transaksi ditambahkan lokal. ${duplicateCount} duplikat dilewati. Supabase belum siap.`);
    } else {
      toast(`Tidak ada transaksi baru. ${duplicateCount} duplikat dilewati.`);
    }
  } catch (error) {
    toast(error.message || "Import file gagal.");
  } finally {
    event.target.value = "";
  }
}

function productSalesPeriodFromFileName(fileName = "") {
  const matches = [...String(fileName).matchAll(/(\d{2})-(\d{2})-(\d{4})/g)];
  const toDate = match => match ? `${match[3]}-${match[2]}-${match[1]}` : todayKey();
  const start = toDate(matches[0]);
  const end = toDate(matches[1] || matches[0]);
  return { start, end };
}

function importLegacyProductSalesRows(rows, fileName = "file") {
  const headerRow = rows.shift() || [];
  const header = headerRow.map(item => String(item || "").toLowerCase());
  const find = names => names.map(name => header.findIndex(item => item.includes(name))).find(index => index >= 0);
  const codeIndex = find(["kode", "sku", "barcode"]);
  const nameIndex = find(["nama", "barang", "produk"]);
  const trxIndex = find(["jumlah transaksi", "transaksi"]);
  const profitIndex = find(["keuntungan", "profit", "laba"]);
  const revenueIndex = find(["pendapatan", "omzet", "total"]);
  const qtyIndex = find(["jumlah barang", "qty", "terjual"]);
  const period = productSalesPeriodFromFileName(fileName);
  const existingKeys = new Set((state.importedProductSales || []).map(row => row.importKey || legacyProductSaleKey(row)));
  const seenKeys = new Set(existingKeys);
  const parsed = rows
    .filter(row => String(row[nameIndex] || "").trim())
    .filter(row => String(row[nameIndex] || "").trim().toLowerCase() !== "total semua")
    .map(row => ({
      id: uid(),
      code: row[codeIndex] || "",
      name: row[nameIndex] || "-",
      transactionCount: parseMoney(row[trxIndex]),
      profit: parseMoney(row[profitIndex]),
      revenue: parseMoney(row[revenueIndex]),
      qty: parseMoney(row[qtyIndex]),
      periodStart: period.start,
      periodEnd: period.end,
      source: "Import Penjualan Barang Lama",
      fileName
    }))
    .filter(row => row.qty || row.revenue || row.profit || row.transactionCount)
    .map(row => ({ ...row, importKey: legacyProductSaleKey(row) }));
  const imported = [];
  let duplicateCount = 0;
  for (const row of parsed) {
    const key = row.importKey || legacyProductSaleKey(row);
    if (seenKeys.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seenKeys.add(key);
    imported.push(row);
  }
  if (imported.length) {
    state.importedProductSales = [...(state.importedProductSales || []), ...imported.map(compactLegacyProductSale)];
    audit("Import laporan penjualan barang lama", `${imported.length} barang dari ${fileName}`);
    saveState();
    render();
  }
  return { imported, duplicateCount, parsedCount: parsed.length, fileName };
}

function readLegacyProductSalesFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Gagal membaca ${file.name}`));
    reader.onload = () => {
      try {
        if (/\.xlsx?$/i.test(file.name)) {
          if (!window.XLSX) return reject(new Error("Pembaca Excel belum termuat. Pastikan internet aktif lalu refresh halaman."));
          const workbook = XLSX.read(reader.result, { type: "array", cellDates: true });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          resolve(importLegacyProductSalesRows(rows, file.name));
        } else {
          resolve(importLegacyProductSalesRows(csvRows(String(reader.result || "")), file.name));
        }
      } catch (error) {
        reject(error);
      }
    };
    if (/\.xlsx?$/i.test(file.name)) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  });
}

async function importLegacyProductSales(event) {
  const files = [...(event.target.files || [])];
  if (!files.length) return;
  try {
    const results = [];
    for (const file of files) {
      if (!window.XLSX) {
        event.target.value = "";
        return toast("Pembaca Excel belum termuat. Pastikan internet aktif lalu refresh halaman.");
      }
      results.push(await readLegacyProductSalesFile(file));
    }
    const imported = results.flatMap(result => result.imported);
    const duplicateCount = results.reduce((sum, result) => sum + result.duplicateCount, 0);
    if (imported.length) {
      toast(`${imported.length} baris penjualan barang ditambahkan. ${duplicateCount} duplikat dilewati.`);
    } else {
      toast(`Tidak ada penjualan barang baru. ${duplicateCount} duplikat dilewati.`);
    }
  } catch (error) {
    toast(error.message || "Import laporan penjualan barang gagal.");
  } finally {
    event.target.value = "";
  }
}

function renderCash() {
  const cashOrders = state.orders.filter(order => order.paymentMethod === "Tunai" && order.status !== "Dibatalkan");
  const cashSales = cashOrders.reduce((sum, order) => sum + orderTotal(order), 0);
  const nonCashSales = state.orders.filter(order => order.paymentMethod !== "Tunai" && order.status !== "Dibatalkan").reduce((sum, order) => sum + orderTotal(order), 0);
  return `
    <div class="grid grid-3">
      ${metric("Status Kas", state.cashSession.open ? "Buka" : "Tutup", state.cashSession.open ? dateTime(state.cashSession.openedAt) : "Sesi belum aktif")}
      ${metric("Penjualan Tunai", money(cashSales), `${cashOrders.length} transaksi tunai`)}
      ${metric("Penjualan Non Tunai", money(nonCashSales), "QRIS, transfer, kartu, e-wallet")}
    </div>
    <div class="card" style="margin-top:16px">
      <div class="section-title"><div><h3>Informasi Sesi</h3><p>Untuk MVP, pencatatan kas dibuat sederhana.</p></div></div>
      <div class="grid grid-2">
        <div class="field"><label>Saldo awal</label><input class="input" value="${money(state.cashSession.openingBalance || 0)}" disabled /></div>
        <div class="field"><label>Kasir</label><input class="input" value="${escapeHtml(state.cashSession.cashier || "-")}" disabled /></div>
      </div>
      <p class="muted">${escapeHtml(state.cashSession.note || "")}</p>
    </div>
  `;
}

function toggleCashSession() {
  if (state.cashSession.open) {
    state.cashSession.open = false;
    state.cashSession.closedAt = new Date().toISOString();
    audit("Kas ditutup", "Sesi kas ditutup");
    saveState();
    render();
  } else {
    openModal(`
      <div class="section-title"><div><h3>Buka Kas</h3><p>Masukkan saldo awal shift.</p></div><button class="btn" onclick="closeModal()">Tutup</button></div>
      <form class="grid" onsubmit="openCash(event)">
        <div class="grid grid-2">
          <div class="field"><label>Kasir</label><input class="input" name="cashier" required value="Kasir 01" /></div>
          <div class="field"><label>Saldo awal</label><input class="input" name="openingBalance" type="number" min="0" required value="500000" /></div>
        </div>
        <div class="field"><label>Catatan</label><textarea name="note">Shift baru</textarea></div>
        <button class="btn accent" type="submit">Buka Kas</button>
      </form>
    `);
  }
}

function openCash(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  state.cashSession = {
    open: true,
    openedAt: new Date().toISOString(),
    openingBalance: Number(form.get("openingBalance")),
    cashier: form.get("cashier"),
    note: form.get("note")
  };
  audit("Kas dibuka", `${state.cashSession.cashier} membuka kas ${money(state.cashSession.openingBalance)}`);
  saveState();
  closeModal();
  render();
}

function renderAudit() {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Waktu</th><th>Pengguna</th><th>Aktivitas</th><th>Detail</th></tr></thead>
        <tbody>${state.audit.map(item => `<tr><td>${dateTime(item.at)}</td><td>${escapeHtml(item.user)}</td><td><strong>${escapeHtml(item.action)}</strong></td><td>${escapeHtml(item.detail)}</td></tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function saveDatabaseSettings(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  state.settings.databaseMode = form.get("databaseMode");
  state.settings.syncEndpoint = String(form.get("syncEndpoint") || "").trim();
  state.settings.autoBackup = form.get("autoBackup") === "on";
  audit("Pengaturan database disimpan", state.settings.databaseMode);
  saveState();
  toast("Pengaturan database disimpan.");
  render();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Gagal membaca file."));
    reader.readAsDataURL(file);
  });
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(.*?);base64,(.*)$/);
  return {
    mimeType: match?.[1] || "application/octet-stream",
    dataBase64: match?.[2] || ""
  };
}

async function uploadMediaFileToGas(file, meta = {}) {
  const dataUrl = await readFileAsDataUrl(file);
  const endpoint = String(KASIRIN_MEDIA_GAS_URL || "").trim();
  if (!endpoint) return { url: dataUrl, local: true };
  const parsed = parseDataUrl(dataUrl);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "upload",
      type: meta.type || "product",
      ownerId: meta.ownerId || "",
      fileName: file.name,
      mimeType: file.type || parsed.mimeType,
      dataBase64: parsed.dataBase64
    })
  });
  const responseText = await response.text();
  let result;
  try {
    result = JSON.parse(responseText);
  } catch (error) {
    const plainText = responseText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    throw new Error(`GAS tidak mengembalikan JSON (${response.status}). ${plainText.slice(0, 140) || "Periksa deployment Web App."}`);
  }
  if (!response.ok || !result?.ok) throw new Error(result?.error || `Upload media gagal (${response.status}).`);
  const uploadedUrl = result.media?.thumbnailUrl || result.media?.directUrl || result.media?.viewUrl || result.url || dataUrl;
  return {
    url: uploadedUrl,
    media: result.media
  };
}

function applyReceiptSettingsFromForm(target) {
  const formElement = target instanceof HTMLFormElement ? target : target?.closest?.("form");
  const form = new FormData(formElement || target);
  state.settings.receiptStoreName = String(form.get("receiptStoreName") || "").trim();
  state.settings.receiptAddress = String(form.get("receiptAddress") || "").trim();
  state.settings.receiptPhone = String(form.get("receiptPhone") || "").trim();
  state.settings.receiptWidth = form.get("receiptWidth");
  state.settings.receiptFooter = String(form.get("receiptFooter") || "").trim();
  state.settings.receiptShowLogo = form.get("receiptShowLogo") === "on";
  state.settings.receiptImageMode = String(form.get("receiptImageMode") || "A");
  state.settings.receiptLogoLength = Number(form.get("receiptLogoLength") || 12);
  state.settings.receiptShowReceiptCode = form.get("receiptShowReceiptCode") === "on";
  state.settings.receiptShowOrderQueueNumber = form.get("receiptShowOrderQueueNumber") === "on";
  state.settings.receiptShowUnitNextToQty = form.get("receiptShowUnitNextToQty") === "on";
  state.settings.receiptShowReceiptNumber = form.get("receiptShowReceiptNumber") === "on";
  state.settings.receiptShowTotalQuantity = form.get("receiptShowTotalQuantity") === "on";
  state.settings.receiptShowCashierLabel = form.get("receiptShowCashierLabel") === "on";
  state.settings.receiptHeaderNote = String(form.get("receiptHeaderNote") || "").trim();
  state.settings.receiptShowTable = form.get("receiptShowTable") === "on";
  state.settings.receiptShowQr = form.get("receiptShowQr") === "on";
}

async function uploadReceiptLogo(input) {
  const file = input?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return toast("Pilih file gambar untuk logo usaha.");
  const uploadLabel = input.closest(".receipt-logo-upload");
  const previewBox = input.closest("form")?.querySelector(".receipt-preview-box");
  const localPreview = URL.createObjectURL(file);
  const previousLogo = state.settings.receiptLogoDataUrl || "";
  const previousShowLogo = state.settings.receiptShowLogo;
  try {
    receiptLogoUploading = true;
    uploadLabel?.classList.add("uploading");
    previewBox?.classList.add("receipt-uploading");
    state.settings.receiptLogoDataUrl = localPreview;
    state.settings.receiptShowLogo = true;
    previewReceiptSettings(input.form);
    const uploaded = await uploadMediaFileToGas(file, {
      type: "store_logo",
      ownerId: "receipt-logo"
    });
    state.settings.receiptLogoDataUrl = uploaded.url;
    state.settings.receiptShowLogo = true;
    previewReceiptSettings(input.form);
    saveState();
    toast(uploaded.local ? "Icon usaha tersimpan lokal." : "Icon usaha tersimpan di Google Drive.");
  } catch (error) {
    console.error(error);
    state.settings.receiptLogoDataUrl = previousLogo;
    state.settings.receiptShowLogo = previousShowLogo;
    render();
    toast(`Upload icon usaha gagal. ${error.message || "Periksa URL GAS atau izin Web App."}`);
  } finally {
    receiptLogoUploading = false;
    URL.revokeObjectURL(localPreview);
    uploadLabel?.classList.remove("uploading");
    previewBox?.classList.remove("receipt-uploading");
    input.value = "";
    render();
  }
}

function previewReceiptSettings(target) {
  applyReceiptSettingsFromForm(target);
  render();
}

function saveReceiptSettings(event) {
  event.preventDefault();
  applyReceiptSettingsFromForm(event.target);
  audit("Pengaturan struk disimpan", state.settings.receiptStoreName);
  saveState();
  syncStoreSettingsToSupabase({ silent: true }).then(synced => {
    toast(synced ? "Setting struk tersimpan." : "Setting struk tersimpan lokal.");
  });
  render();
}

function readSelfOrderPromoSlidesFromSettings() {
  const settings = state.settings || {};
  const legacySlide = {
    image: settings.selfOrderPromoImageDataUrl || "",
    productId: settings.selfOrderPromoTargetProductId || "",
    label: settings.selfOrderPromoButtonLabel || "Order Now"
  };
  const source = Array.isArray(settings.selfOrderPromoSlides) && settings.selfOrderPromoSlides.length
    ? settings.selfOrderPromoSlides
    : (legacySlide.image || legacySlide.productId || legacySlide.label !== "Order Now" ? [legacySlide] : []);
  return source.slice(0, 4)
    .map(slide => ({
      image: String(slide?.image || "").trim(),
      productId: String(slide?.productId || "").trim(),
      label: String(slide?.label || "Order Now").trim() || "Order Now",
      draft: !!slide?.draft
    }))
    .filter(slide => slide.draft || slide.image || slide.productId || slide.label !== "Order Now");
}

function addSelfOrderPromoSlide() {
  const slides = readSelfOrderPromoSlidesFromSettings();
  if (slides.length >= 4) return toast("Maksimal 4 badge promosi.");
  state.settings.selfOrderPromoSlides = [...slides, { image: "", productId: "", label: "Order Now", draft: true }];
  render();
}

async function uploadSelfOrderPromoImage(input, index = 0) {
  const file = input?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return toast("Pilih file gambar untuk promo self order.");
  const localPreview = URL.createObjectURL(file);
  const previousSlides = readSelfOrderPromoSlidesFromSettings();
  try {
    const previewSlides = previousSlides.map(slide => ({ ...slide }));
    while (previewSlides.length <= index && previewSlides.length < 4) {
      previewSlides.push({ image: "", productId: "", label: "Order Now", draft: true });
    }
    previewSlides[index] = { ...previewSlides[index], image: localPreview };
    state.settings.selfOrderPromoSlides = previewSlides;
    state.settings.selfOrderPromoImageDataUrl = previewSlides[0]?.image || "";
    render();
    const uploaded = await uploadMediaFileToGas(file, {
      type: "self_order_promo",
      ownerId: `self-order-promo-${Number(index) + 1}`
    });
    const slides = readSelfOrderPromoSlidesFromSettings();
    while (slides.length <= index && slides.length < 4) {
      slides.push({ image: "", productId: "", label: "Order Now", draft: true });
    }
    slides[index] = { ...slides[index], image: uploaded.url };
    state.settings.selfOrderPromoSlides = slides;
    state.settings.selfOrderPromoImageDataUrl = slides[0]?.image || "";
    state.settings.selfOrderPromoTargetProductId = slides[0]?.productId || "";
    state.settings.selfOrderPromoButtonLabel = slides[0]?.label || "Order Now";
    audit("Foto promo self order diupload", `Slide ${Number(index) + 1}: ${file.name}`);
    saveState();
    toast(uploaded.local ? "Foto promo tersimpan lokal." : "Foto promo tersimpan di Google Drive.");
    render();
  } catch (error) {
    console.error(error);
    state.settings.selfOrderPromoSlides = previousSlides;
    state.settings.selfOrderPromoImageDataUrl = previousSlides[0]?.image || "";
    render();
    toast(`Upload foto promo gagal. ${error.message || "Periksa URL GAS atau izin Web App."}`);
  } finally {
    URL.revokeObjectURL(localPreview);
    if (input) input.value = "";
  }
}

async function uploadSelfOrderProfileImage(input) {
  const file = input?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return toast("Pilih file gambar untuk foto profil self order.");
  const localPreview = URL.createObjectURL(file);
  const previousImage = state.settings.selfOrderProfileImageDataUrl || "";
  try {
    state.settings.selfOrderProfileImageDataUrl = localPreview;
    render();
    const uploaded = await uploadMediaFileToGas(file, {
      type: "self_order_profile",
      ownerId: "self-order-profile"
    });
    state.settings.selfOrderProfileImageDataUrl = uploaded.url;
    audit("Foto profil self order diupload", file.name);
    saveState();
    toast(uploaded.local ? "Foto profil tersimpan lokal." : "Foto profil tersimpan di Google Drive.");
    render();
  } catch (error) {
    console.error(error);
    state.settings.selfOrderProfileImageDataUrl = previousImage;
    render();
    toast(`Upload foto profil gagal. ${error.message || "Periksa URL GAS atau izin Web App."}`);
  } finally {
    URL.revokeObjectURL(localPreview);
    if (input) input.value = "";
  }
}

function clearSelfOrderPromoImage(index = 0) {
  const slides = readSelfOrderPromoSlidesFromSettings();
  slides.splice(index, 1);
  state.settings.selfOrderPromoSlides = slides;
  state.settings.selfOrderPromoImageDataUrl = slides[0]?.image || "";
  audit("Foto promo self order dikosongkan", `Slide ${Number(index) + 1}`);
  saveState();
  render();
}

function saveSelfOrderSettings(event) {
  event.preventDefault();
  if (selfOrderSettingsSaving) return;
  selfOrderSettingsSaving = true;
  const form = new FormData(event.target);
  const slideCount = Math.max(0, Math.min(4, Number(form.get("selfOrderPromoSlideCount") || 0) || 0));
  const slides = Array.from({ length: slideCount }, (_, index) => ({
    image: String(form.get(`selfOrderPromoImage_${index}`) || "").trim(),
    productId: String(form.get(`selfOrderPromoTargetProductId_${index}`) || "").trim(),
    label: String(form.get(`selfOrderPromoButtonLabel_${index}`) || "Order Now").trim() || "Order Now"
  })).filter(slide => slide.image || slide.productId || slide.label !== "Order Now");
  state.settings.selfOrderAppName = String(form.get("selfOrderAppName") || "").trim();
  state.settings.selfOrderOutletName = String(form.get("selfOrderOutletName") || "").trim();
  state.settings.selfOrderProfileImageDataUrl = String(form.get("selfOrderProfileImageDataUrl") || state.settings.selfOrderProfileImageDataUrl || "").trim();
  state.settings.selfOrderPromoSlides = slides;
  state.settings.selfOrderPromoImageDataUrl = slides[0]?.image || "";
  state.settings.selfOrderPromoTargetProductId = slides[0]?.productId || "";
  state.settings.selfOrderPromoButtonLabel = slides[0]?.label || "Order Now";
  audit("Pengaturan self order disimpan", state.settings.selfOrderPromoButtonLabel);
  saveState();
  render();
  syncStoreSettingsToSupabase({ silent: true })
    .then(synced => {
      toast(synced ? "Setting self order tersimpan." : "Setting self order tersimpan lokal.");
    })
    .finally(() => {
      selfOrderSettingsSaving = false;
      render();
    });
}

async function scanPrinters() {
  if (!navigator.bluetooth?.requestDevice) {
    toast("Browser belum mendukung pemindaian Bluetooth. Sambungkan printer dari pengaturan perangkat.");
    return;
  }
  try {
    const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
    state.settings.printerConnection = "Bluetooth";
    state.settings.printerDevice = device.name || "Printer Bluetooth";
    state.settings.printerDeviceId = device.id || "";
    audit("Printer Bluetooth dipilih", state.settings.printerDevice);
    saveState();
    toast("Printer Bluetooth dipilih.");
    render();
  } catch (error) {
    if (error?.name !== "NotFoundError") toast("Pemindaian printer dibatalkan atau gagal.");
  }
}

function savePrinterSettings(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  state.settings.printerConnection = String(form.get("printerConnection") || "Bluetooth");
  state.settings.printerDevice = String(form.get("printerDevice") || state.settings.printerDevice || "").trim();
  audit("Pengaturan printer disimpan", state.settings.printerDevice || state.settings.printerConnection);
  saveState();
  toast(state.settings.printerDevice ? "Printer disimpan." : "Koneksi printer disimpan. Pindai perangkat untuk memilih printer.");
  render();
}

function exportDatabase() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `omnipos-backup-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast("Backup database dibuat.");
}

function importDatabase() {
  const value = document.getElementById("databaseImport")?.value.trim();
  if (!value) return toast("Tempel JSON backup terlebih dahulu.");
  try {
    state = { ...structuredClone(initialState), ...JSON.parse(value) };
    normalizeState();
    saveState();
    audit("Database direstore", "Data lokal diganti dari JSON backup");
    toast("Database berhasil direstore.");
    render();
  } catch {
    toast("Format JSON backup tidak valid.");
  }
}

function orderSummary(order) {
  return `
    <div class="list-row">
      <div class="line"><strong>${escapeHtml(displayOrderNumber(order.number))}</strong>${statusPill(order.status)}</div>
      <div class="line muted"><span>${escapeHtml(order.type)} - ${escapeHtml(order.customer)}</span><strong>${money(orderTotal(order))}</strong></div>
    </div>
  `;
}

function empty(text) {
  return `<div class="empty">${text}</div>`;
}

function openModal(html) {
  const drawer = document.getElementById("drawer");
  if (!drawer) return;
  drawer.onclick = closeModal;
  drawer.innerHTML = `<div class="modal"><div class="modal-card" onclick="event.stopPropagation()">${html}</div></div>`;
  drawer.classList.add("open");
  document.body.classList.add("modal-open");
  normalizeFormAccessibility(drawer);
}

function openConfirmDialog({ title = "Konfirmasi", message, detail = "", confirmLabel = "Lanjutkan", cancelLabel = "Batal", danger = false, onConfirm, onCancel }) {
  appConfirmHandlers = {
    confirm: typeof onConfirm === "function" ? onConfirm : null,
    cancel: typeof onCancel === "function" ? onCancel : null
  };
  openModal(`
    <div class="app-confirm" role="alertdialog" aria-modal="true">
      <div class="app-confirm-mark ${danger ? "danger" : ""}">${danger ? "!" : "&#10003;"}</div>
      <div class="app-confirm-copy">
        <span>${escapeHtml(title)}</span>
        <h3>${escapeHtml(message || title)}</h3>
        ${detail ? `<p>${escapeHtml(detail)}</p>` : ""}
      </div>
      <div class="app-confirm-actions">
        <button class="btn app-confirm-cancel" type="button" onclick="resolveConfirmDialog(false)">${escapeHtml(cancelLabel)}</button>
        <button class="btn ${danger ? "red" : "accent"} app-confirm-primary" type="button" onclick="resolveConfirmDialog(true)">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>
  `);
}

function resolveConfirmDialog(confirmed) {
  const handler = confirmed ? appConfirmHandlers.confirm : appConfirmHandlers.cancel;
  appConfirmHandlers = { confirm: null, cancel: null };
  closeModal();
  if (handler) handler();
}

function closeModal() {
  const drawer = document.getElementById("drawer");
  appConfirmHandlers = { confirm: null, cancel: null };
  appCancelContext = { orderId: null, returnToUnpaid: false };
  activeModalState = null;
  if (!drawer) return;
  drawer.classList.remove("open");
  drawer.innerHTML = "";
  drawer.onclick = null;
  document.body.classList.remove("modal-open");
  if (deferredRealtimeRender) {
    window.setTimeout(() => {
      if (isBlockingInteractionActive()) return;
      deferredRealtimeRender = false;
      render();
    }, 80);
  }
}

function resetDemo() {
  openConfirmDialog({
    title: "Reset data demo",
    message: "Reset semua data lokal dan kembali ke seed awal?",
    detail: "Backup JSON terlebih dahulu jika data masih diperlukan.",
    confirmLabel: "Reset",
    danger: true,
    onConfirm: () => {
      state = structuredClone(initialState);
      cart = [];
      saveState();
      render();
    }
  });
}

initializePersistentState();
render();



// Stock opname page module. Loaded after app.js so this file owns the page renderer.

let stockAuditSubmitting = false;

function renderStockOpname() {
  const tab = sessionStorage.getItem("stock_opname_tab") || "inventory";
  return `
    <section class="stock-page stock-opname-page">
      <div class="stock-module-tabs">
        ${["inventory", "audit", "riwayat"].map(item => `
          <button type="button" class="${tab === item ? "active" : ""}" onclick="setStockOpnameTab('${item}')">
            ${item === "inventory" ? "Inventory" : item === "audit" ? "Audit" : "Riwayat"}
          </button>
        `).join("")}
      </div>
      ${stockOpnameMasterPending() ? renderStockOpnameLoadingPanel() : tab === "inventory" ? renderStockInventoryPanel() : tab === "riwayat" ? renderStockHistoryPanel() : renderStockAuditPanel()}
    </section>
  `;
}

function setStockOpnameTab(tab) {
  sessionStorage.setItem("stock_opname_tab", tab);
  render();
}

function stockOpnameProducts() {
  return stableProducts(state.products).filter(product => product.stockOpname);
}

function stockOpnameMasterPending() {
  if (!localDbReady) return true;
  if (!supabaseReadable()) return false;
  return !masterSyncLoaded && !state.products.length;
}

function renderStockOpnameLoadingPanel() {
  return `
    <div class="stock-list-card">
      ${empty("Memuat data stok opname...")}
    </div>
  `;
}

function stockAuditCheckedIds() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem("stock_audit_checked_ids") || "[]"));
  } catch {
    return new Set();
  }
}

function saveStockAuditCheckedIds(ids) {
  sessionStorage.setItem("stock_audit_checked_ids", JSON.stringify([...ids]));
}

function renderStockInventoryPanel() {
  const query = sessionStorage.getItem("stock_opname_query") || "";
  const statusFilter = sessionStorage.getItem("stock_opname_inventory_status") || "Semua";
  const products = stockOpnameProducts();
  const summary = stockStats(products);
  const filtered = filterStockOpnameProducts(products, query, "Semua", statusFilter);
  return `
    <div class="stock-summary-grid stock-inventory-filter-grid">
      ${stockSummaryCard("Habis", summary.soldOut, "", "danger", "setStockInventoryStatus('Habis')", statusFilter === "Habis")}
      ${stockSummaryCard("Menipis", summary.low, "", "warning", "setStockInventoryStatus('Menipis')", statusFilter === "Menipis")}
      ${stockSummaryCard("Aman", summary.safe, "", "primary", "setStockInventoryStatus('Aman')", statusFilter === "Aman")}
      ${stockSummaryCard("Total barang", summary.total, "", "", "setStockInventoryStatus('Semua')", statusFilter === "Semua")}
    </div>
    ${stockOpnameToolbar(query, null)}
    <div class="stock-list-card">
      <div class="stock-section-head">
        <div>
          <h3>Inventory Bahan</h3>
          <p><span data-stock-visible-count>${filtered.length}</span> dari ${products.length} barang ditampilkan</p>
        </div>
      </div>
      <div class="stock-product-list">
        ${filtered.map(product => stockInventoryCardHtml(product)).join("") || empty("Belum ada barang inventory. Centang Stok Opname dari form produk.")}
      </div>
    </div>
  `;
}

function renderStockAuditPanel() {
  const query = sessionStorage.getItem("stock_opname_query") || "";
  const checkFilter = sessionStorage.getItem("stock_opname_check") || "Semua";
  const products = stockOpnameProducts();
  const filtered = filterStockOpnameProducts(products, query, checkFilter);
  return `
    ${stockOpnameToolbar(query, checkFilter)}
    <div class="stock-list-card">
      <div class="stock-section-head">
        <div>
          <h3>Audit Stok</h3>
          <p>Isi stok saat ini. Centang hanya sebagai penanda barang sudah dicek.</p>
        </div>
      </div>
      <div class="stock-opname-list">
        ${filtered.map(stockOpnameCardHtml).join("") || empty("Belum ada produk yang cocok. Centang Stok Opname dari form produk.")}
      </div>
      ${filtered.length ? `<button class="btn accent stock-audit-submit ${stockAuditSubmitting ? "is-loading" : ""}" type="button" onclick="submitStockAudit()" ${stockAuditSubmitting ? `disabled aria-busy="true"` : ""}>${stockAuditSubmitting ? `<span class="button-spinner" aria-hidden="true"></span><span>Menyimpan audit...</span>` : "Submit Audit"}</button>` : ""}
    </div>
  `;
}

function renderStockHistoryPanel() {
  const watchedIds = new Set(stockOpnameProducts().map(product => product.id));
  const rows = (state.stockMovements || []).filter(move => watchedIds.has(move.productId)).slice(0, 80);
  return `
    <div class="stock-list-card">
      <div class="stock-section-head">
        <div>
          <h3>Riwayat Audit Stok</h3>
          <p>Log pengecekan stok bahan yang dipantau.</p>
        </div>
      </div>
      <div class="stock-history-list">
        ${rows.map(move => `
          <div class="stock-history-row">
            <div>
              <strong>${escapeHtml(move.productName)}</strong>
              <small>dicek oleh ${escapeHtml(stockMovementCheckedBy(move))} - ${dateTime(move.at)}</small>
            </div>
            <span class="${Number(move.qty) < 0 ? "danger-text" : "success-text"}">${Number(move.qty) > 0 ? "+" : ""}${Number(move.qty || 0)}</span>
          </div>
        `).join("") || empty("Belum ada riwayat keluar masuk barang.")}
      </div>
    </div>
  `;
}

function stockMovementCheckedBy(move) {
  const direct = move?.checkedBy || move?.user || move?.by;
  if (direct) return direct;
  const reason = String(move?.reason || "");
  const match = reason.match(/oleh\s+(.+)$/i);
  return match?.[1]?.trim() || "-";
}

function stockOpnameToolbar(query, checkFilter) {
  const checkOptions = ["Semua", "Belum dicek", "Sudah dicek"];
  return `
    <div class="stock-toolbar-card">
      <label class="stock-search-field">
        ${navIcon("search")}
        <input class="stock-search-input" value="${escapeHtml(query)}" oninput="filterStockOpnameList(this.value)" onkeyup="filterStockOpnameList(this.value)" onchange="filterStockOpnameList(this.value)" placeholder="Cari SKU atau raw material" autocomplete="off" spellcheck="false" />
      </label>
      ${checkFilter ? `
        <div class="stock-filter-chips">
          ${checkOptions.map(option => `<button type="button" class="${option === checkFilter ? "active" : ""}" onclick="setStockOpnameFilter('${option}')">${escapeHtml(option)}</button>`).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function filterStockOpnameProducts(products, query, checkFilter, statusFilter = "Semua") {
  const normalized = String(query || "").toLowerCase();
  return products
    .filter(product => {
      const checkedIds = stockAuditCheckedIds();
      if (checkFilter === "Sudah dicek") return checkedIds.has(product.id);
      if (checkFilter === "Belum dicek") return !checkedIds.has(product.id);
      return true;
    })
    .filter(product => statusFilter === "Semua" || stockStatus(product).label === statusFilter)
    .filter(product => stockOpnameSearchText(product).includes(normalized))
    .sort((a, b) => stockStatus(a).rank - stockStatus(b).rank || String(a.name || "").localeCompare(String(b.name || ""), "id", { sensitivity: "base" }));
}

function stockOpnameSearchText(product) {
  return [
    product.name,
    product.category,
    product.sku,
    stockStatus(product).label,
    ...productAvailabilityVariants(product).map(variant => variant.label)
  ].join(" ").toLowerCase();
}

function stockAuditInputValue(product) {
  const value = Number(product?.stock || 0);
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : String(value);
}

function stockInventoryCardHtml(product) {
  const status = stockStatus(product);
  const photo = mediaImageTag(product.imageName, `Foto ${product.name}`, "stock-product-photo", 120);
  return `
    <article class="stock-product-card ${product.soldOut ? "soldout" : ""}" data-stock-row data-stock-search="${escapeHtml(stockOpnameSearchText(product))}">
      <div class="stock-product-main">
        <div class="stock-product-token ${photo ? "has-photo" : ""}">${photo || escapeHtml((product.name || "PR").slice(0, 2).toUpperCase())}</div>
        <div class="stock-product-info">
          <div class="stock-product-title">
            <strong>${escapeHtml(product.name)}</strong>
            <span class="pill ${status.className}">${status.label}</span>
          </div>
          <div class="stock-product-meta">
            <span>Stok <b>${Number(product.stock || 0)}</b></span>
            <span>Minimum <b>${Number(product.minStock || 0)}</b></span>
          </div>
        </div>
      </div>
    </article>
  `;
}

function stockOpnameCardHtml(product) {
  const status = stockStatus(product);
  const photo = mediaImageTag(product.imageName, `Foto ${product.name}`, "stock-product-photo", 120);
  const variantGroups = productAvailabilityVariantGroups(product);
  const variants = variantGroups.flatMap(group => group.variants);
  const checked = stockAuditCheckedIds().has(product.id);
  const lastChecked = product.stockOpnameCheckedAt ? dateTime(product.stockOpnameCheckedAt) : "Belum pernah dicek";
  const search = [
    product.name,
    product.category,
    product.sku,
    status.label,
    checked ? "sudah dicek" : "belum dicek",
    ...variants.map(variant => variant.label)
  ].join(" ").toLowerCase();
  return `
    <article class="stock-opname-item ${checked ? "checked" : ""}" data-stock-row data-stock-search="${escapeHtml(search)}">
      <label class="stock-opname-check">
        <input type="checkbox" ${checked ? "checked" : ""} onchange="toggleStockOpnameChecked('${product.id}', this.checked)" />
        <span></span>
      </label>
      <div class="stock-product-token ${photo ? "has-photo" : ""}">${photo || escapeHtml((product.name || "PR").slice(0, 2).toUpperCase())}</div>
      <div class="stock-opname-info">
        <div class="stock-product-title">
          <strong>${escapeHtml(product.name)}</strong>
          <span class="pill ${status.className}">${status.label}</span>
        </div>
        <small class="stock-audit-last">Dicek sebelumnya: ${escapeHtml(lastChecked)}</small>
        <div class="stock-audit-entry" data-audit-product-id="${escapeHtml(product.id)}">
          <label class="stock-previous-display"><span>Stok sebelumnya</span><b>${Number(product.stock || 0)} ${escapeHtml(product.unit || "item")}</b></label>
          <label><span>Stok saat ini</span><input inputmode="decimal" type="number" min="0" step="1" value="${escapeHtml(stockAuditInputValue(product))}" data-dirty="0" oninput="this.dataset.dirty='1'" aria-label="Stok saat ini ${escapeHtml(product.name)}" /></label>
        </div>
      </div>
    </article>
  `;
}

function toggleStockOpnameChecked(productId, checked) {
  const ids = stockAuditCheckedIds();
  if (checked) ids.add(productId);
  else ids.delete(productId);
  saveStockAuditCheckedIds(ids);
  const row = [...document.querySelectorAll("[data-audit-product-id]")]
    .find(node => node.dataset.auditProductId === productId)
    ?.closest("[data-stock-row]");
  if (row) row.classList.toggle("checked", checked);
}

async function submitStockAudit() {
  if (stockAuditSubmitting) return;
  const rows = [...document.querySelectorAll("[data-audit-product-id]")];
  if (!rows.length) return toast("Belum ada barang untuk diaudit.");
  const button = document.querySelector(".stock-audit-submit");
  const stopLoading = beginButtonLoading(button, "Menyimpan audit...");
  stockAuditSubmitting = true;
  const checkedBy = activeStaff()?.name || state.activeUser || "Staff";
  const at = new Date().toISOString();
  const checkedIds = stockAuditCheckedIds();
  const changedProductIds = [];
  let checkedCount = 0;
  let adjustedCount = 0;
  rows.forEach(row => {
    const product = state.products.find(item => item.id === row.dataset.auditProductId);
    const input = row.querySelector("input[type='number']");
    if (!product || !input) return;
    const isMarkedChecked = checkedIds.has(product.id);
    const isDirty = input.dataset.dirty === "1";
    if (!isMarkedChecked && !isDirty) return;
    const before = Number(product.stock || 0);
    const actual = isDirty ? Number(input.value) : before;
    if (!Number.isFinite(actual) || actual < 0) return;
    const diff = actual - before;
    product.stock = actual;
    if (product.soldOut && actual > 0) product.soldOut = false;
    product.stockOpnameCheckedAt = at;
    product.stockOpnameCheckedBy = checkedBy;
    checkedCount += 1;
    changedProductIds.push(product.id);
    if (diff) adjustedCount += 1;
    state.stockMovements.unshift({
      id: uid(),
      at,
      productId: product.id,
      productName: product.name,
      qty: diff,
      reason: `Audit stok opname oleh ${checkedBy}`,
      checkedBy
    });
  });
  if (!checkedCount) {
    stockAuditSubmitting = false;
    if (stopLoading) stopLoading();
    return toast("Isi stok nyata minimal satu barang.");
  }
  try {
    audit("Audit stok opname", `${checkedCount} barang dicek, ${adjustedCount} disesuaikan`);
    saveState();
    const syncResults = await Promise.all(changedProductIds.map(productId => {
      const product = state.products.find(item => item.id === productId);
      return product ? syncMasterEntity("product", product, "upsert", { userInitiated: true }) : Promise.resolve(false);
    }));
    saveStockAuditCheckedIds([]);
    toast(syncResults.every(Boolean) ? "Audit stok tersimpan." : "Audit stok tersimpan lokal dan masuk antrean sync.");
  } finally {
    stockAuditSubmitting = false;
    if (stopLoading) stopLoading();
    render();
  }
}

function setStockOpnameFilter(value) {
  sessionStorage.setItem("stock_opname_check", value);
  render();
}

function setStockInventoryStatus(value) {
  sessionStorage.setItem("stock_opname_inventory_status", value);
  render();
}

function filterStockOpnameList(query = "") {
  sessionStorage.setItem("stock_opname_query", query);
  const normalized = String(query || "").trim().toLowerCase();
  let visibleCount = 0;
  document.querySelectorAll("[data-stock-row]").forEach(row => {
    const searchText = String(row.dataset.stockSearch || "").toLowerCase();
    const isVisible = !normalized || searchText.includes(normalized);
    row.hidden = !isVisible;
    row.style.display = isVisible ? "" : "none";
    if (isVisible) visibleCount += 1;
  });
  document.querySelectorAll("[data-stock-visible-count]").forEach(node => {
    node.textContent = String(visibleCount);
  });
}

if (location.hash.includes("stock-opname")) {
  setTimeout(() => {
    if (!stockOpnameMasterPending()) render();
  }, 0);
}

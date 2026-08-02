function renderStockV2() {
  const query = sessionStorage.getItem("stock_query") || "";
  const rawStatusFilter = sessionStorage.getItem("stock_status") || "Semua";
  const statusFilter = ["Semua", "Habis", "Aman"].includes(rawStatusFilter) ? rawStatusFilter : "Semua";
  const categoryFilter = sessionStorage.getItem("stock_category") || "Semua";
  const categories = ["Semua", ...productCategories(), "Add-on"].filter((value, index, list) => list.indexOf(value) === index);
  const products = stockMonitorProducts();
  const addons = stockMonitorAddons();
  const entries = stockMonitorEntries(products, addons);
  const summary = typeof stockStatsWithAddons === "function" ? stockStatsWithAddons(products, addons) : stockStats(products);
  const filtered = filterStockProducts(entries, query, statusFilter, categoryFilter);

  return `
    <section class="stock-page stock-monitor-page">
      <div class="stock-summary-grid stock-monitor-summary">
        ${stockSummaryCard("Total", summary.total, "", "", "setStockFilter('stock_status', 'Semua')", statusFilter === "Semua")}
        ${stockSummaryCard("Habis", summary.soldOut, "", "danger", "setStockFilter('stock_status', 'Habis')", statusFilter === "Habis")}
        ${stockSummaryCard("Aman", summary.safe, "", "primary", "setStockFilter('stock_status', 'Aman')", statusFilter === "Aman")}
      </div>

      <div class="stock-toolbar-card stock-monitor-toolbar">
        <label class="stock-search-field">
          ${navIcon("search")}
          <input
            class="stock-search-input"
            value="${escapeHtml(query)}"
            oninput="filterStockList(this.value)"
            onkeyup="filterStockList(this.value)"
            onchange="filterStockList(this.value)"
            placeholder="Cari produk, SKU, kategori, atau status"
            autocomplete="off"
            spellcheck="false"
          />
        </label>
        <label class="stock-category-field">
          <select onchange="setStockFilter('stock_category', this.value)">
            ${categories.map(category => `<option value="${escapeHtml(category)}" ${category === categoryFilter ? "selected" : ""}>${escapeHtml(category === "Semua" ? "Semua kategori" : category)}</option>`).join("")}
          </select>
        </label>
      </div>

      <div class="stock-list-card stock-monitor-list-card">
        <div class="stock-section-head">
          <div>
            <h3>Status Stok</h3>
            <p><span data-stock-visible-count>${filtered.length}</span> dari ${entries.length} item ditampilkan</p>
          </div>
        </div>
        <div class="stock-product-list">
          ${filtered.map(stockProductCardHtml).join("") || empty("Produk tidak ditemukan.")}
        </div>
      </div>
    </section>
  `;
}

function filterStockProducts(products, query, statusFilter, categoryFilter) {
  const normalized = String(query || "").trim().toLowerCase();
  return products
    .filter(product => categoryFilter === "Semua" || product.category === categoryFilter)
    .filter(product => statusFilter === "Semua" || stockProductStatusLabel(product) === statusFilter)
    .filter(product => !normalized || stockSearchText(product).includes(normalized));
}

function stockMonitorProducts() {
  return stableProducts(state.products).filter(product => !product.stockOpname);
}

function stockMonitorAddons() {
  return typeof addonStockEntries === "function" ? addonStockEntries() : [];
}

function stockMonitorEntries(products = stockMonitorProducts(), addons = stockMonitorAddons()) {
  return [
    ...products.map(product => ({ ...product, type: "product" })),
    ...addons
  ];
}

function stockMonitorSummary() {
  const products = stockMonitorProducts();
  const addons = stockMonitorAddons();
  return typeof stockStatsWithAddons === "function" ? stockStatsWithAddons(products, addons) : stockStats(products);
}

function stockProductStatusLabel(product) {
  return stockEntryStatus(product).label === "Habis" ? "Habis" : "Aman";
}

function stockEntryStatus(entry) {
  if (entry?.type === "addon" && typeof addonStockStatus === "function") return addonStockStatus(entry);
  return stockStatus(entry);
}

function stockSearchText(product) {
  return [
    product.name,
    product.category,
    product.sku,
    stockProductStatusLabel(product),
    ...(product.type === "addon" ? ["addon", "add-on"] : productAvailabilityVariants(product).map(variant => variant.label))
  ].join(" ").toLowerCase();
}

function stockProductCardHtml(product) {
  if (product.type === "addon") return stockAddonCardHtml(product);
  const displayStatus = stockProductStatusLabel(product);
  const displayClass = displayStatus === "Habis" ? "cancel" : "ready";
  const photo = mediaImageTag(product.imageName, `Foto ${product.name}`, "stock-product-photo", 120);
  const variantGroups = productAvailabilityVariantGroups(product);
  const variants = variantGroups.flatMap(group => group.variants);

  return `
    <article class="stock-product-card ${product.soldOut ? "soldout" : ""}" data-stock-row data-stock-type="product" data-stock-id="${escapeHtml(product.id)}" data-stock-search="${escapeHtml(stockSearchText(product))}">
      <div class="stock-product-main">
        <div class="stock-product-token ${photo ? "has-photo" : ""}">${photo || escapeHtml((product.name || "PR").slice(0, 2).toUpperCase())}</div>
        <div class="stock-product-info">
          <div class="stock-product-title">
            <strong>${escapeHtml(product.name)}</strong>
            <span class="pill ${displayClass}">${displayStatus}</span>
          </div>
          <div class="stock-product-meta">
            ${product.trackStock
              ? `<span>Stok <b>${Number(product.stock || 0)}</b></span><span>Minimum <b>${Number(product.minStock || 0)}</b></span>`
              : ""}
          </div>
        </div>
      </div>
      <div class="stock-product-actions">
        <button class="btn stock-status-btn available ${!product.soldOut ? "active" : ""}" onclick="setStockProductSoldOut('${product.id}', false)">Tersedia</button>
        <button class="btn stock-status-btn soldout ${product.soldOut ? "active" : ""}" onclick="setStockProductSoldOut('${product.id}', true)">Habis</button>
      </div>
      ${variants.length ? stockVariantDetailsHtml(product, variantGroups) : ""}
    </article>
  `;
}

function stockAddonCardHtml(addon) {
  const displayStatus = stockProductStatusLabel(addon);
  const displayClass = displayStatus === "Habis" ? "cancel" : "ready";
  return `
    <article class="stock-product-card ${addon.soldOut ? "soldout" : ""}" data-stock-row data-stock-type="addon" data-stock-id="${escapeHtml(addon.id)}" data-stock-search="${escapeHtml(stockSearchText(addon))}">
      <div class="stock-product-main">
        <div class="stock-product-token">${escapeHtml((addon.name || "AD").slice(0, 2).toUpperCase())}</div>
        <div class="stock-product-info">
          <div class="stock-product-title">
            <strong>${escapeHtml(addon.name)}</strong>
            <span class="pill ${displayClass}">${displayStatus}</span>
          </div>
          <div class="stock-product-meta">
            <span>Add-on</span><span>Jual <b>${money(addon.price)}</b></span>
          </div>
        </div>
      </div>
      <div class="stock-product-actions">
        <button class="btn stock-status-btn available ${!addon.soldOut ? "active" : ""}" onclick="setStockAddonSoldOut('${addon.id}', false)">Tersedia</button>
        <button class="btn stock-status-btn soldout ${addon.soldOut ? "active" : ""}" onclick="setStockAddonSoldOut('${addon.id}', true)">Habis</button>
      </div>
    </article>
  `;
}

function stockVariantDetailsHtml(product, variantGroups) {
  const openIds = JSON.parse(sessionStorage.getItem("stock_variant_open") || "[]");
  const isOpen = openIds.includes(product.id);
  const variants = variantGroups.flatMap(group => group.variants);
  return `
    <details class="stock-variant-details" ${isOpen ? "open" : ""} ontoggle='syncStockVariantOpen(this, ${JSON.stringify(product.id)})'>
      <summary><b>Tampilkan Varian</b>${stockVariantSoldOutSummaryHtml(product, variants)}</summary>
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

function stockVariantSoldOutSummaryHtml(product, variants) {
  const soldOutCount = variants.filter(variant => isProductVariantSoldOut(product, variant.key)).length;
  if (!soldOutCount) return "";
  return `<small class="stock-variant-soldout-note">${soldOutCount} dari ${variants.length} varian habis</small>`;
}

function stockVariantRowHtml(product, variant) {
  const soldOut = isProductVariantSoldOut(product, variant.key);
  return `
    <div class="stock-variant-row">
      <span>${escapeHtml(variant.label)}</span>
      <span class="stock-variant-actions">
        <button type="button" class="${soldOut ? "" : "active"}" onclick='toggleStockVariantAvailability(${JSON.stringify(product.id)}, ${JSON.stringify(variant.key)}, false)'>Tersedia</button>
        <button type="button" class="${soldOut ? "danger active is-solid-danger" : "danger"}" onclick='toggleStockVariantAvailability(${JSON.stringify(product.id)}, ${JSON.stringify(variant.key)}, true)'>Habis</button>
      </span>
    </div>
  `;
}

function filterStockList(query = "") {
  sessionStorage.setItem("stock_query", query);
  const normalized = String(query || "").trim().toLowerCase();
  let visible = 0;
  document.querySelectorAll("[data-stock-row]").forEach(row => {
    const searchText = String(row.dataset.stockSearch || "").toLowerCase();
    const isVisible = !normalized || searchText.includes(normalized);
    row.hidden = !isVisible;
    row.classList.toggle("is-hidden", !isVisible);
    if (isVisible) visible += 1;
  });
  document.querySelectorAll("[data-stock-visible-count]").forEach(node => {
    node.textContent = String(visible);
  });
}

function updateStockMonitorSummaryDom() {
  const summary = stockMonitorSummary();
  const values = [summary.total, summary.soldOut, summary.safe];
  document.querySelectorAll(".stock-monitor-summary .stock-summary-card strong").forEach((node, index) => {
    node.textContent = String(values[index] ?? node.textContent);
  });
  const visible = [...document.querySelectorAll("[data-stock-row]")].filter(row => !row.hidden && !row.classList.contains("is-hidden")).length;
  document.querySelectorAll("[data-stock-visible-count]").forEach(node => {
    node.textContent = String(visible);
  });
}

function updateStockUpdateButtonState() {
  const button = document.querySelector(".stock-update-btn");
  if (!button || typeof queuedMasterSyncCount !== "function") return;
  const count = queuedMasterSyncCount();
  button.classList.toggle("has-queue", count > 0);
  button.title = count ? `${count} update stok dalam antrean` : "Update stok ke Supabase";
  let badge = button.querySelector(".stock-sync-queue-badge");
  if (count) {
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "stock-sync-queue-badge";
      button.prepend(badge);
    }
    badge.textContent = String(count);
  } else {
    badge?.remove();
  }
}

function stockRowForEntry(entry) {
  const type = entry?.type === "addon" ? "addon" : "product";
  const id = String(entry?.id || "");
  return [...document.querySelectorAll("[data-stock-row]")].find(row => row.dataset.stockType === type && row.dataset.stockId === id);
}

function updateStockRowUiFirst(entry) {
  const row = stockRowForEntry(entry);
  if (row) {
    const html = entry.type === "addon" ? stockAddonCardHtml(entry) : stockProductCardHtml(entry);
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    const next = template.content.firstElementChild;
    if (next) row.replaceWith(next);
  }
  filterStockList(sessionStorage.getItem("stock_query") || "");
  updateStockMonitorSummaryDom();
  updateStockUpdateButtonState();
}

function setStockProductSoldOut(productId, soldOut) {
  const product = state.products.find(item => item.id === productId);
  if (!product || Boolean(product.soldOut) === Boolean(soldOut)) return;
  product.soldOut = Boolean(soldOut);
  audit(product.soldOut ? "Produk ditandai habis" : "Produk tersedia kembali", product.name);
  markMasterSyncPending?.("product", product, "upsert", { userInitiated: true }, new Error("Menunggu update stok."));
  saveState();
  updateStockRowUiFirst(product);
  syncMasterEntity("product", product, "upsert", { userInitiated: true }).finally(updateStockUpdateButtonState);
  broadcastRealtimeEvent("products");
}

function setStockAddonSoldOut(addonId, soldOut) {
  const addon = state.addons.find(item => item.id === addonId);
  if (!addon || Boolean(addon.soldOut) === Boolean(soldOut)) return;
  addon.soldOut = Boolean(soldOut);
  audit(addon.soldOut ? "Add-on ditandai habis" : "Add-on tersedia kembali", addon.name);
  markMasterSyncPending?.("addon", addon, "upsert", { userInitiated: true }, new Error("Menunggu update stok."));
  saveState();
  updateStockRowUiFirst(addon);
  syncMasterEntity("addon", addon, "upsert", { userInitiated: true }).finally(updateStockUpdateButtonState);
  broadcastRealtimeEvent("products");
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
  markMasterSyncPending?.("product", product, "upsert", { userInitiated: true }, new Error("Menunggu update stok."));
  saveState();
  updateStockRowUiFirst(product);
  syncMasterEntity("product", product, "upsert", { userInitiated: true }).finally(updateStockUpdateButtonState);
  broadcastRealtimeEvent("products");
}

if (location.hash.replace("#", "") === "stock") {
  setTimeout(() => render(), 0);
}

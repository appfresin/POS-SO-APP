function renderStockV2() {
  const query = sessionStorage.getItem("stock_query") || "";
  const rawStatusFilter = sessionStorage.getItem("stock_status") || "Semua";
  const statusFilter = ["Semua", "Habis", "Aman"].includes(rawStatusFilter) ? rawStatusFilter : "Semua";
  const categoryFilter = sessionStorage.getItem("stock_category") || "Semua";
  const categories = ["Semua", ...productCategories(), "Add-on"].filter((value, index, list) => list.indexOf(value) === index);
  const products = stableProducts(state.products).filter(product => !product.stockOpname);
  const addons = typeof addonStockEntries === "function" ? addonStockEntries() : [];
  const entries = [
    ...products.map(product => ({ ...product, type: "product" })),
    ...addons
  ];
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
    .filter(product => !normalized || stockSearchText(product).includes(normalized))
    .sort((a, b) => stockEntryStatus(a).rank - stockEntryStatus(b).rank || String(a.name || "").localeCompare(String(b.name || ""), "id", { sensitivity: "base" }));
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
  const variantSoldOutCount = variants.filter(variant => isProductVariantSoldOut(product, variant.key)).length;
  const busy = productActionLocks.has(product.id);

  return `
    <article class="stock-product-card ${product.soldOut ? "soldout" : ""}" data-stock-row data-stock-search="${escapeHtml(stockSearchText(product))}">
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
        <button class="btn stock-status-btn available ${!product.soldOut ? "active" : ""}" onclick="setStockProductSoldOut('${product.id}', false)" ${busy ? "disabled" : ""}>Tersedia</button>
        <button class="btn stock-status-btn soldout ${product.soldOut ? "active" : ""}" onclick="setStockProductSoldOut('${product.id}', true)" ${busy ? "disabled" : ""}>Habis</button>
      </div>
      ${variants.length ? stockVariantDetailsHtml(product, variantGroups) : ""}
    </article>
  `;
}

function stockAddonCardHtml(addon) {
  const displayStatus = stockProductStatusLabel(addon);
  const displayClass = displayStatus === "Habis" ? "cancel" : "ready";
  const busy = productActionLocks.has(`addon-${addon.id}`);
  return `
    <article class="stock-product-card ${addon.soldOut ? "soldout" : ""}" data-stock-row data-stock-search="${escapeHtml(stockSearchText(addon))}">
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
        <button class="btn stock-status-btn available ${!addon.soldOut ? "active" : ""}" onclick="setStockAddonSoldOut('${addon.id}', false)" ${busy ? "disabled" : ""}>Tersedia</button>
        <button class="btn stock-status-btn soldout ${addon.soldOut ? "active" : ""}" onclick="setStockAddonSoldOut('${addon.id}', true)" ${busy ? "disabled" : ""}>Habis</button>
      </div>
    </article>
  `;
}

function stockVariantDetailsHtml(product, variantGroups) {
  const openIds = JSON.parse(sessionStorage.getItem("stock_variant_open") || "[]");
  const isOpen = openIds.includes(product.id);
  return `
    <details class="stock-variant-details" ${isOpen ? "open" : ""} ontoggle='syncStockVariantOpen(this, ${JSON.stringify(product.id)})'>
      <summary><b>Tampilkan Varian</b></summary>
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

function setStockProductSoldOut(productId, soldOut) {
  const product = state.products.find(item => item.id === productId);
  if (!product || Boolean(product.soldOut) === Boolean(soldOut)) return;
  product.soldOut = Boolean(soldOut);
  saveState();
  audit(product.soldOut ? "Produk ditandai habis" : "Produk tersedia kembali", product.name);
  syncMasterEntity("product", product);
  render();
}

function setStockAddonSoldOut(addonId, soldOut) {
  const addon = state.addons.find(item => item.id === addonId);
  if (!addon || Boolean(addon.soldOut) === Boolean(soldOut)) return;
  addon.soldOut = Boolean(soldOut);
  saveState();
  audit(addon.soldOut ? "Add-on ditandai habis" : "Add-on tersedia kembali", addon.name);
  syncMasterEntity("addon", addon);
  render();
}

if (location.hash.replace("#", "") === "stock") {
  setTimeout(() => render(), 0);
}

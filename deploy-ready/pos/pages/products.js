// Page renderer extracted from app.js. Depends on shared helpers/globals in app.js.

function renderProducts() {
  const categories = productCategories();
  const query = sessionStorage.getItem("product_query") || "";
  const categoryFilter = sessionStorage.getItem("product_category") || "Semua";
  const products = stableProducts(state.products);
  const filtered = products
    .filter(product => [product.name, product.category, product.sku].join(" ").toLowerCase().includes(query.toLowerCase()))
    .filter(product => categoryFilter === "Semua" || product.category === categoryFilter)
    .sort((a, b) => a.name.localeCompare(b.name));

  return `
    <section class="products-page products-page-compact">
      <div class="products-admin-actions">
        <div>
          <button class="products-tool-btn" onclick="openCategoryManager()">Kelola Kategori</button>
          <button class="products-tool-btn" onclick="openAddonManager()">Kelola Add-on</button>
          <button class="products-tool-btn" data-action="open-kitchen-availability">Kelola Stok</button>
        </div>
      </div>
      <div class="products-control-bar">
        <label class="products-search">
          ${navIcon("search")}
          <input value="${escapeHtml(query)}" oninput="sessionStorage.setItem('product_query', this.value); render()" placeholder="Cari produk" />
        </label>
        ${productSelect("product_category", ["Semua", ...categories], categoryFilter)}
      </div>
      <div class="products-list-toolbar">
        <div class="products-result-count">${filtered.length} dari ${products.length} barang</div>
        <button class="products-add-inline-btn" type="button" onclick="openProductForm()">+ Barang</button>
      </div>
      <div class="products-list">
        ${filtered.map(productMasterCard).join("") || empty("Barang tidak ditemukan.")}
      </div>
    </section>
  `;
}

function productStatCard(label, value, hint, primary = false) {
  return `
    <article class="products-stat ${primary ? "primary" : ""}">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${hint}</small>
    </article>
  `;
}

function productSelect(storageKey, options, selected) {
  return `
    <label class="products-select-field">
      <select onchange="sessionStorage.setItem('${storageKey}', this.value); render()">
        ${options.map(item => `<option value="${escapeHtml(item)}" ${item === selected ? "selected" : ""}>${escapeHtml(item === "Semua" ? "Kategori" : item)}</option>`).join("")}
      </select>
    </label>
  `;
}

function productMasterCard(product) {
  const photo = mediaImageTag(product.imageName, `Foto ${product.name}`, "product-master-thumb", 120);
  return `
    <article class="product-master-row ${product.active ? "" : "inactive"} ${product.soldOut ? "soldout" : ""}">
      <div class="product-master-main">
        <div class="product-master-token ${photo ? "has-photo" : ""}">${photo || escapeHtml((product.name || "PR").slice(0, 2).toUpperCase())}</div>
        <div class="product-master-title">
          <h3>${escapeHtml(product.name)}</h3>
        </div>
      </div>
      <div class="product-master-card-actions">
        <button class="btn" onclick="openProductForm('${product.id}')">Edit</button>
        <button class="btn red" onclick="deleteProduct('${product.id}')">Hapus</button>
      </div>
    </article>
  `;
}

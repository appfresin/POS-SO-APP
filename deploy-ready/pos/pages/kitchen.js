// Page renderer extracted from app.js. Depends on shared helpers/globals in app.js.

function renderKitchen() {
  const filters = ["Semua", "Pesanan Baru", "Sedang Disiapkan", "Selesai"];
  const filterLabels = {
    "Semua": "Semua",
    "Pesanan Baru": "Baru",
    "Sedang Disiapkan": "Diproses",
    "Selesai": "Selesai"
  };
  if (!filters.includes(kitchenFilter)) kitchenFilter = "Semua";
  const soldOutCount = state.products.filter(product => product.soldOut).length;
  const kitchenStatuses = ["Pesanan Baru", "Sedang Disiapkan", "Selesai"];
  const orders = state.orders.filter(order => kitchenFilter === "Semua" ? kitchenStatuses.includes(order.status) : order.status === kitchenFilter);
  return `
    <div class="kitchen-toolbar">
      <button type="button" class="kitchen-availability-button" data-action="open-kitchen-availability">
        <span class="availability-button-icon">${navIcon("products")}</span>
        <span><strong>Ketersediaan Barang</strong><small>${soldOutCount ? `${soldOutCount} item habis` : "Semua barang tersedia"}</small></span>
      </button>
      <div class="tabs kitchen-status-tabs">${filters.map(filter => `<button class="${filter === kitchenFilter ? "active" : ""}" onclick="kitchenFilter='${filter}'; render()">${filterLabels[filter]}</button>`).join("")}</div>
    </div>
    <div class="grid grid-3">
      ${orders.map(order => kitchenCard(order)).join("") || empty("Tidak ada pesanan pada filter ini.")}
    </div>
  `;
}

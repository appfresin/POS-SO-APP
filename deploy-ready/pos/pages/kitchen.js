// Page renderer extracted from app.js. Depends on shared helpers/globals in app.js.

function kitchenOrderStableSort(a, b) {
  const bTime = new Date(b.createdAt || 0).getTime();
  const aTime = new Date(a.createdAt || 0).getTime();
  if (bTime !== aTime) return bTime - aTime;
  return String(b.number || b.id || "").localeCompare(String(a.number || a.id || ""), "id", { sensitivity: "base" });
}

function renderKitchen() {
  const today = todayKey();
  const filters = ["Semua", "Pesanan Baru", "Sedang Disiapkan", "Selesai"];
  const filterLabels = {
    "Semua": "Semua",
    "Pesanan Baru": "Baru",
    "Sedang Disiapkan": "Diproses",
    "Selesai": "Selesai"
  };
  if (!filters.includes(kitchenFilter)) kitchenFilter = "Semua";
  const soldOutCount = typeof stockSoldOutCount === "function"
    ? stockSoldOutCount()
    : state.products.filter(product => product.soldOut).length;
  const kitchenStatuses = ["Pesanan Baru", "Sedang Disiapkan", "Selesai"];
  const orders = state.orders
    .filter(order => {
      const isToday = todayKey(new Date(order.createdAt || Date.now())) === today;
      if (!isToday) return false;
      return kitchenFilter === "Semua" ? kitchenStatuses.includes(order.status) : order.status === kitchenFilter;
    })
    .sort(kitchenOrderStableSort);
  return `
    <div class="kitchen-toolbar">
      <button type="button" class="kitchen-availability-button" onclick="openStockPage()">
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

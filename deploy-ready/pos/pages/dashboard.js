// Page renderer extracted from app.js. Depends on shared helpers/globals in app.js.

function renderDashboard() {
  const period = dashboardPeriod();
  const range = dashboardPeriodRange(period);
  const periodOrders = state.orders.filter(order => isDashboardOrderInRange(order, range));
  const completed = periodOrders.filter(order => order.status === "Selesai" || order.paymentStatus === "Lunas");
  const active = periodOrders.filter(order => !["Selesai", "Dibatalkan"].includes(order.status));
  const preparing = active.filter(order => order.status === "Sedang Disiapkan");
  const newOrders = active.filter(order => order.status === "Pesanan Baru");
  const cancelled = periodOrders.filter(order => order.status === "Dibatalkan");
  const unpaid = periodOrders.filter(order => order.paymentStatus !== "Lunas" && order.status !== "Dibatalkan");
  const unpaidValue = unpaid.reduce((sum, order) => sum + orderTotal(order), 0);
  const low = state.products.filter(product => product.trackStock && product.stock > 0 && product.stock <= product.minStock);
  const out = state.products.filter(product => product.trackStock && product.stock <= 0);
  const soldOut = state.products.filter(product => product.soldOut);
  const sales = completed.reduce((sum, order) => sum + orderTotal(order), 0);
  const profit = completed.reduce((sum, order) => sum + Number(order.profit ?? orderProfit(order) ?? 0), 0);
  const avgOrder = completed.length ? Math.round(sales / completed.length) : 0;
  const availableProducts = state.products.filter(product => product.active && !product.soldOut).length;
  const categories = productCategories();
  const latest = [...periodOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
  const cancelledLatest = [...cancelled].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  const topItems = completed
    .flatMap(order => order.items || order.cart || [])
    .reduce((list, item) => {
      const name = item.name || "Produk";
      const found = list.find(row => row.name === name);
      if (found) {
        found.qty += Number(item.qty || 0);
        found.total += cartItemTotal(item);
      } else {
        list.push({ name, qty: Number(item.qty || 0), total: cartItemTotal(item) });
      }
      return list;
    }, [])
    .sort((a, b) => b.qty - a.qty || b.total - a.total)
    .slice(0, 3);
  const quickStats = [
    ["Omzet", money(sales)],
    ["Laba Bersih", money(profit)],
    ["Rata-rata", money(avgOrder)]
  ];
  const orderTypeStats = ORDER_TYPES.map(type => {
    const byType = periodOrders.filter(order => order.type === type.id);
    return {
      id: type.id,
      title: type.title,
      total: byType.length,
      newCount: byType.filter(order => order.status === "Pesanan Baru").length,
      preparingCount: byType.filter(order => order.status === "Sedang Disiapkan").length,
      doneCount: byType.filter(order => order.status === "Selesai" || order.paymentStatus === "Lunas").length
    };
  });
  const stockRows = [...out, ...low].slice(0, 4);
  return `
    ${dashboardPeriodFilter(period)}
    <section class="dashboard-hero">
      <div class="dashboard-quick-stats">
        ${quickStats.map(([label, value]) => `<span><small>${label}</small><strong>${value}</strong></span>`).join("")}
      </div>
    </section>
    <section class="dashboard-metrics">
      ${orderTypeStats.map(row => `
        <div class="dashboard-mini-card order-channel">
          <span><i class="dashboard-channel-icon ${dashboardChannelIconClass(row.id)}"></i>${escapeHtml(row.title)}</span>
          <div class="dashboard-channel-breakdown">
            <em><b>${row.newCount}</b><small>Baru</small></em>
            <em><b>${row.preparingCount}</b><small>Proses</small></em>
            <em><b>${row.doneCount}</b><small>Selesai</small></em>
          </div>
        </div>
      `).join("")}
    </section>
    <div class="dashboard-main-grid">
      <div class="card dashboard-list-card">
        <div class="section-title">
          <div><h3>Pesanan Terbaru</h3><p>Transaksi terbaru dan progres dapur.</p></div>
          <button class="btn ghost" onclick="go('orders')">Lihat Semua</button>
        </div>
        <div class="dashboard-order-list">
          ${latest.map(dashboardOrderItem).join("") || empty("Belum ada pesanan. Buat transaksi dari menu Kasir.")}
        </div>
      </div>
      <div class="dashboard-side-stack">
        <div class="card dashboard-status-card">
          <div class="section-title">
            <div><h3>Operasional</h3><p>Kondisi toko yang perlu dipantau.</p></div>
          </div>
          <div class="dashboard-op-grid">
            <span><small>Tagihan belum lunas</small><b>${unpaid.length ? money(unpaidValue) : "Bersih"}</b><em>${unpaid.length} pesanan perlu ditagih</em></span>
          </div>
          <div class="dashboard-status-list">
            <div class="status-row danger"><i>${navIcon("products")}</i><span>Ketersediaan</span><strong>${out.length || soldOut.length ? `${out.length + soldOut.length} habis` : "Aman"}</strong></div>
            <div class="status-row info"><i>${navIcon("kitchen")}</i><span>Antrian dapur</span><strong>${active.length ? `${active.length} pesanan` : "Kosong"}</strong></div>
            <div class="status-row success"><i>${navIcon("products")}</i><span>Produk aktif</span><strong>${availableProducts} produk</strong></div>
            <div class="status-row warn"><i>${navIcon("dashboard")}</i><span>Kategori</span><strong>${categories.length} tersedia</strong></div>
          </div>
        </div>
        <div class="card dashboard-trend-card">
          <div class="section-title">
            <div><h3>Produk Terlaris</h3><p>Diambil dari transaksi selesai pada periode ini.</p></div>
            <button class="btn ghost" onclick="openTodayProductSalesReport()">Lihat Semua</button>
          </div>
          <div class="dashboard-top-products">
            ${topItems.map(item => `
              <div class="dashboard-top-product-row">
                <strong>${escapeHtml(item.name)}</strong>
                <span>${Number(item.qty || 0).toLocaleString("id-ID")}</span>
              </div>
            `).join("") || `<div class="dashboard-empty-state"><span></span><p>Belum ada produk terjual pada periode ini.</p></div>`}
          </div>
        </div>
        <div class="card dashboard-cancel-list-card">
          <div class="section-title">
            <div>
              <h3>Pesanan Dibatalkan</h3>
              <p>${cancelled.length ? `${cancelled.length} pesanan pada periode ini` : "Tidak ada pembatalan"}</p>
            </div>
            <button class="btn ghost" onclick="openCancelledOrdersReport()">Lihat Semua</button>
          </div>
          <div class="dashboard-order-list dashboard-cancel-order-list">
            ${cancelledLatest.map(dashboardOrderItem).join("") || empty("Tidak ada pesanan dibatalkan pada periode ini.")}
          </div>
        </div>
        <div class="card dashboard-alert-card">
          <div class="section-title">
            <div><h3>Alert Stok</h3><p>Prioritas produk yang perlu ditindaklanjuti.</p></div>
          </div>
          <div class="dashboard-alert-list">
            ${stockRows.map(product => `
              <div class="dashboard-stock-item">
                <i>${navIcon("products")}</i>
                <strong>${escapeHtml(product.name)}</strong>
                <span class="${product.stock <= 0 ? "danger" : "warning"}">${product.stock <= 0 ? "Habis" : `Sisa ${product.stock}`}</span>
              </div>
            `).join("") || empty("Stok aman untuk saat ini.")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function openTodayProductSalesReport() {
  sessionStorage.setItem("report_section", "productSales");
  sessionStorage.setItem("report_period", "day");
  sessionStorage.removeItem("product_report_query");
  go("reports");
}

function openCancelledOrdersReport() {
  sessionStorage.setItem("orders_quick_filter", "Dibatalkan");
  sessionStorage.removeItem("orders_query");
  go("orders");
}

function dashboardPeriodFilter(activePeriod) {
  const items = [
    ["today", "Hari ini"],
    ["yesterday", "Kemarin"],
    ["week", "Minggu ini"],
    ["month", "Bulan ini"]
  ];
  return `
    <div class="dashboard-period-filter transaction-period-menu" role="tablist" aria-label="Filter periode dashboard">
      ${items.map(([key, label]) => `
        <button type="button" role="tab" aria-selected="${key === activePeriod}" class="${key === activePeriod ? "active" : ""}" onclick="setDashboardPeriod('${key}')">
          ${label}
        </button>
      `).join("")}
    </div>
  `;
}

function dashboardChannelIconClass(type) {
  if (type === "Take Away") return "takeaway";
  if (type === "Delivery") return "delivery";
  return "dinein";
}

function dashboardPeriod() {
  const period = sessionStorage.getItem("dashboard_period") || "today";
  return ["today", "yesterday", "week", "month"].includes(period) ? period : "today";
}

function setDashboardPeriod(period) {
  sessionStorage.setItem("dashboard_period", period);
  render();
}

function dashboardPeriodLabel(period) {
  return {
    today: "Hari ini",
    yesterday: "Kemarin",
    week: "Minggu ini",
    month: "Bulan ini"
  }[period] || "Hari ini";
}

function dashboardPeriodRange(period) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);

  if (period === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate());
    return { start, end };
  }

  if (period === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  if (period === "month") {
    start.setDate(1);
    end.setFullYear(start.getFullYear(), start.getMonth() + 1, 1);
    return { start, end };
  }

  end.setDate(end.getDate() + 1);
  return { start, end };
}

function isDashboardOrderInRange(order, range) {
  const value = order?.createdAt ? new Date(order.createdAt) : null;
  if (!value || Number.isNaN(value.getTime())) return false;
  return value >= range.start && value < range.end;
}

function dashboardOrderItem(order) {
  const shortNumber = displayOrderNumber(order.number);
  const label = dashboardStatusLabel(order.status);
  const className = dashboardStatusClass(order.status);
  const cancelInfo = order.status === "Dibatalkan"
    ? `<small class="dashboard-order-cancel-note">${escapeHtml(order.cancelReason || "Tidak ada keterangan pembatalan.")}</small>`
    : "";
  return `
    <div class="dashboard-order-item ${order.status === "Dibatalkan" ? "is-cancelled" : ""}">
      <span class="dashboard-order-token">${escapeHtml(shortNumber)}</span>
      <div class="dashboard-order-main">
        <div class="dashboard-order-line">
          <strong>${escapeHtml(order.type)} - ${escapeHtml(order.customer || "Walk-in")}</strong>
          <small>${money(orderTotal(order))}</small>
        </div>
        ${cancelInfo}
      </div>
      <span class="dashboard-order-badge ${className}">${label}</span>
    </div>
  `;
}

function dashboardStatusLabel(status) {
  if (status === "Pesanan Baru") return "Baru";
  if (status === "Sedang Disiapkan") return "Diproses";
  return status;
}

function dashboardStatusClass(status) {
  if (status === "Pesanan Baru") return "new";
  if (status === "Sedang Disiapkan") return "process";
  if (status === "Selesai") return "done";
  if (status === "Dibatalkan") return "cancel";
  return "ready";
}

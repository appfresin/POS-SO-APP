// Page renderer extracted from app.js. Depends on shared helpers/globals in app.js.

document.addEventListener("input", event => {
  const input = event.target;
  if (!input || !input.matches?.(".product-sales-search input")) return;
  const cursorPosition = input.selectionStart ?? input.value.length;
  requestAnimationFrame(() => {
    const activeSearch = document.querySelector(".product-sales-search input");
    if (!activeSearch) return;
    activeSearch.focus({ preventScroll: true });
    const safePosition = Math.min(cursorPosition, activeSearch.value.length);
    activeSearch.setSelectionRange(safePosition, safePosition);
  });
}, true);

function renderReports() {
  const range = reportRange();
  const rawSection = sessionStorage.getItem("report_section") || "profit";
  const activeSection = ["profit", "visitors", "productSales"].includes(rawSection) ? rawSection : "profit";
  if (activeSection !== rawSection) sessionStorage.setItem("report_section", activeSection);
  const sectionMenu = `
    <div class="report-section-menu">
      ${[
        ["profit", "Transaksi", "Ikhtisar pendapatan, biaya modal, dan laba."],
        ["visitors", "Pengunjung", "Pantau dine in, take away, dan delivery."],
        ["productSales", "Barang", "Ranking barang, qty, pendapatan, dan keuntungan."]
      ].map(([id, title, hint]) => `
        <button class="${activeSection === id ? "active" : ""}" onclick="sessionStorage.setItem('report_section', '${id}'); render()">
          <span>${title}</span>
          <small>${hint}</small>
        </button>
      `).join("")}
    </div>
  `;
  if (activeSection === "profit") {
    return `
      ${sectionMenu}
      <div>${renderProfitLossDrill()}</div>
    `;
  }
  const completed = reportRecords();
  const gross = completed.reduce((sum, order) => sum + order.subtotal, 0);
  const discount = completed.reduce((sum, order) => sum + order.discount, 0);
  const net = completed.reduce((sum, order) => sum + order.total, 0);
  const profit = completed.reduce((sum, order) => sum + order.profit, 0);
  const paid = completed.filter(order => order.paymentStatus === "Lunas");
  const unpaid = completed.filter(order => order.paymentStatus !== "Lunas");
  const paidValue = paid.reduce((sum, order) => sum + order.total, 0);
  const unpaidValue = unpaid.reduce((sum, order) => sum + order.total, 0);
  const avgOrder = completed.length ? Math.round(net / completed.length) : 0;
  const periodControls = `
    <div class="report-filter-panel report-filter-inline">
      <div class="report-period-tabs">
        ${[["day", "Hari ini"], ["yesterday", "Kemarin"], ["week", "Minggu ini"], ["month", "Bulan ini"]].map(([value, label]) => `<button class="${range.period === value ? "active" : ""}" onclick="sessionStorage.setItem('report_period', '${value}'); render()">${label}</button>`).join("")}
      </div>
      <button class="report-range-picker" onclick="${range.period === "custom" ? "openReportRangeCalendar()" : "sessionStorage.setItem('report_period', 'custom'); openReportRangeCalendar()"}">
        <strong>${escapeHtml(formatReportRangeLabel(range))}</strong>
      </button>
    </div>
  `;
  const estimatedCost = Math.max(0, net - profit);
  const profitMargin = net ? Math.round((profit / net) * 100) : 0;
  const uniqueCustomers = new Set(completed.map(order => order.customer).filter(customer => customer && customer !== "-")).size;
  const activeChartTab = sessionStorage.getItem("report_chart_tab") || "count";
  const trend = reportTrend(completed, range);
  const maxTrendCount = Math.max(1, ...trend.map(item => item.count));
  const maxTrendTotal = Math.max(1, ...trend.map(item => item.total));
  const maxTrendProfit = Math.max(1, ...trend.map(item => {
    const dayRecords = completed.filter(r => todayKey(new Date(r.createdAt)) === item.key);
    return dayRecords.reduce((sum, r) => sum + r.profit, 0);
  }));
  const trendData = {
    count: { max: maxTrendCount, data: trend.map(item => ({ ...item, value: item.count })) },
    total: { max: maxTrendTotal, data: trend.map(item => ({ ...item, value: item.total })) },
    profit: { max: maxTrendProfit, data: trend.map(item => {
      const dayRecords = completed.filter(r => todayKey(new Date(r.createdAt)) === item.key);
      return { ...item, value: dayRecords.reduce((sum, r) => sum + r.profit, 0) };
    }) }
  };
  const maxTrend = Math.max(1, ...trend.map(item => item.count));
  const byProduct = {};
  for (const order of completed) {
    for (const item of order.items || []) {
      byProduct[item.name] ??= { code: "", qty: 0, value: 0, profit: 0, transactionCount: 0, source: "Kasirin!", periods: new Set() };
      byProduct[item.name].qty += item.qty;
      byProduct[item.name].value += cartItemTotal(item);
      byProduct[item.name].profit += (Number(item.price || 0) - Number(item.cost || 0)) * Number(item.qty || 1);
      byProduct[item.name].transactionCount += 1;
      byProduct[item.name].periods.add("Transaksi aplikasi");
      for (const addon of item.addons || []) {
        const addonName = addon.name || "Add-on";
        byProduct[addonName] ??= { code: "", qty: 0, value: 0, profit: 0, transactionCount: 0, source: "Kasirin! Add-on", periods: new Set() };
        const addonQty = Number(addon.qty || 1);
        byProduct[addonName].qty += addonQty;
        byProduct[addonName].value += Number(addon.price || 0) * addonQty;
        byProduct[addonName].profit += addonProfit(addon);
        byProduct[addonName].transactionCount += 1;
        byProduct[addonName].periods.add("Transaksi aplikasi");
      }
    }
  }
  const legacyProductRows = productSalesRecordsInRange(range);
  for (const row of legacyProductRows) {
    const key = row.code ? `${row.code} - ${row.name}` : row.name;
    byProduct[key] ??= { code: row.code || "", displayName: row.name || key, qty: 0, value: 0, profit: 0, transactionCount: 0, source: "Import Penjualan Barang Lama", periods: new Set() };
    byProduct[key].qty += Number(row.qty || 0);
    byProduct[key].value += Number(row.revenue || 0);
    byProduct[key].profit += Number(row.profit || 0);
    byProduct[key].transactionCount += Number(row.transactionCount || 0);
    if (row.source) byProduct[key].source = row.source;
    byProduct[key].periods.add(productSalesPeriodLabel(row));
  }
  const productSearch = (sessionStorage.getItem("product_report_query") || "").trim().toLowerCase();
  const productReportRows = Object.entries(byProduct)
    .map(([name, data]) => ({ name, ...data, periodLabel: [...(data.periods || [])].join(", ") }))
    .filter(row => {
      if (!productSearch) return true;
      return [row.name, row.code, row.source, row.periodLabel].some(value => String(value || "").toLowerCase().includes(productSearch));
    })
    .sort((a, b) => b.qty - a.qty || b.value - a.value);
  const productQty = productReportRows.reduce((sum, row) => sum + row.qty, 0);
  const productRevenue = productReportRows.reduce((sum, row) => sum + row.value, 0);
  const productProfit = productReportRows.reduce((sum, row) => sum + row.profit, 0);
  const productReportList = productReportRows.map(row => {
    const title = row.displayName || row.name;
    const initials = title.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "PR";
    return `
      <div class="product-sales-row">
        <span class="product-sales-avatar">${escapeHtml(initials)}</span>
        <div class="product-sales-main">
          <strong>${escapeHtml(title)}</strong>
          <span><small>Keuntungan</small><b>${money(row.profit)}</b></span>
          <span><small>Pendapatan</small><b>${money(row.value)}</b></span>
        </div>
        <em>${Number(row.qty || 0).toLocaleString("id-ID")}</em>
      </div>
    `;
  }).join("");
  const productRows = Object.entries(byProduct).sort((a, b) => b[1].value - a[1].value).slice(0, 10).map(([name, data]) => `<tr><td>${escapeHtml(name)}</td><td>${data.qty}</td><td>${money(data.value)}</td></tr>`).join("");
  const topProductCards = Object.entries(byProduct)
    .sort((a, b) => b[1].qty - a[1].qty || b[1].value - a[1].value)
    .slice(0, 5)
    .map(([name, data], index) => `
      <div class="report-rank-row">
        <b>${index + 1}</b>
        <span><strong>${escapeHtml(name)}</strong><small>${data.qty} terjual</small></span>
        <em>${money(data.value)}</em>
      </div>
    `).join("");
  const typeRows = ORDER_TYPES.map(type => {
    const orders = completed.filter(order => order.type === type.id);
    const count = orders.length;
    const value = orders.reduce((sum, order) => sum + order.total, 0);
    return {
      id: type.id,
      label: type.title,
      count,
      value,
      avg: count ? Math.round(value / count) : 0,
      share: completed.length ? Math.round((count / completed.length) * 100) : 0,
      peakHour: visitorPeakHour(orders)
    };
  });
  const visitorRows = completed;
  const visitorTypeId = sessionStorage.getItem("visitor_report_type") || "";
  const visitorType = ORDER_TYPES.find(type => type.id === visitorTypeId);
  const visitorDetailRows = visitorType ? completed.filter(order => order.type === visitorType.id) : completed;
  const visitorValue = visitorRows.reduce((sum, order) => sum + order.total, 0);
  const visitorAvg = visitorRows.length ? Math.round(visitorValue / visitorRows.length) : 0;
  const visitorPeak = visitorPeakHour(visitorRows);
  const dominantType = typeRows.slice().sort((a, b) => b.count - a.count)[0];
  const visitorList = visitorDetailRows.slice(0, 24).map(order => `
    <button class="visitor-detail-row" onclick='openReportVisitorReceipt(${JSON.stringify(reportRecordKey(order))})'>
      <div><strong>${escapeHtml(shortOrderNumber(order.number))}</strong><span>${dateTime(order.createdAt)} - ${escapeHtml(order.customer || "Walk-in")}</span></div>
      <b>${money(order.total)}</b>
      <em>&rarr;</em>
    </button>
  `).join("");
  const paymentRows = [...new Set(completed.map(order => order.paymentMethod || "Belum dipilih"))].map(method => {
    const orders = completed.filter(order => (order.paymentMethod || "Belum dipilih") === method);
    return {
      label: method,
      count: orders.length,
      value: orders.reduce((sum, order) => sum + order.total, 0)
    };
  }).sort((a, b) => b.value - a.value);
  const recentRows = completed.slice(0, 10).map(order => `
    <div class="report-activity-row">
      <div><strong>${escapeHtml(order.number)}</strong><span>${dateTime(order.createdAt)} - ${escapeHtml(order.customer)}</span></div>
      <b>${money(order.total)}</b>
    </div>
  `).join("");
  const historyRows = trend.filter(item => item.count || range.period === "month").slice().reverse().map(item => `
    <div class="report-day-row">
      <div><strong>${range.group === "hour" ? item.label : item.key.slice(-2)}</strong><span>${range.group === "hour" ? range.label : range.label}</span></div>
      <span>${item.count} transaksi</span>
      <b>${money(item.total)}</b>
    </div>
  `).join("");
  return `
    ${sectionMenu}
    <div class="${activeSection === "visitors" ? "" : "hidden"}">
      <section class="report-section-panel visitor-report-panel">
        ${periodControls}
        <div class="visitor-overview-card">
          <div class="visitor-overview-stats">
            <div><span>Jumlah Pesanan</span><strong>${visitorRows.length.toLocaleString("id-ID")}</strong></div>
            <div><span>Omzet</span><strong>${money(visitorValue)}</strong></div>
            <div><span>Rata-rata Transaksi</span><strong>${money(visitorAvg)}</strong></div>
            <div><span>Jam ramai</span><strong>${visitorPeak.label}</strong></div>
          </div>
        </div>
        <div class="card report-card report-section-card">
          <div class="section-title"><div><h3>Jenis Pesanan</h3><p>Pilih tipe pesanan untuk melihat rincian transaksi.</p></div></div>
          <div class="report-breakdown visitor-breakdown">${typeRows.map(row => `<button class="${visitorTypeId === row.id ? "active" : ""}" onclick="sessionStorage.setItem('visitor_report_type', '${row.id}'); render()"><span><strong>${row.label}</strong><small>${row.count} pesanan - ${row.share}% kontribusi</small></span><b>${money(row.value)}</b></button>`).join("")}</div>
        </div>
        <div class="card report-card report-section-card"><div class="section-title"><div><h3>Rincian Transaksi</h3><p>${visitorType ? visitorType.title : "Semua transaksi"} pada periode ini.</p></div>${visitorType ? `<button class="btn visitor-clear-filter" onclick="sessionStorage.removeItem('visitor_report_type'); render()">Semua</button>` : ""}</div><div class="visitor-detail-list">${visitorList || empty("Belum ada transaksi pada periode ini.")}</div></div>
      </section>
    </div>
    <div class="${activeSection === "productSales" ? "" : "hidden"}">
      <section class="report-section-panel product-sales-panel">
        ${periodControls}
        <div class="product-sales-tools">
          <label class="product-sales-search"><span>⌕</span><input value="${escapeHtml(sessionStorage.getItem("product_report_query") || "")}" placeholder="Cari nama atau kode barang" oninput="sessionStorage.setItem('product_report_query', this.value); render()" /></label>
        </div>
        <section class="product-sales-summary">
          <span>Qty Terjual</span>
          <strong>${productQty.toLocaleString("id-ID")}</strong>
          <div><small>Pendapatan</small><b>${money(productRevenue)}</b></div>
          <div><small>Keuntungan</small><b>${money(productProfit)}</b></div>
        </section>
        <div class="product-sales-notice">${productSalesFilterNote(range, legacyProductRows.length)}</div>
        <div class="product-sales-list">${productReportList || empty("Belum ada rincian barang pada periode ini.")}</div>
      </section>
    </div>
  `;
}

function visitorPeakHour(records) {
  if (!records.length) return { label: "-", count: 0 };
  const buckets = new Map();
  for (const record of records) {
    const hour = new Date(record.createdAt).getHours();
    const label = `${String(hour).padStart(2, "0")}:00`;
    buckets.set(label, (buckets.get(label) || 0) + 1);
  }
  const [label, count] = [...buckets.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] || ["-", 0];
  return { label, count };
}

function shortOrderNumber(number) {
  const text = String(number || "-");
  const orderMatch = text.match(/(?:ORD-)?\d{8}-(\d+)$/i);
  if (orderMatch) return `#${orderMatch[1]}`;
  const lastDash = text.split("-").filter(Boolean).at(-1);
  return lastDash && lastDash.length <= 6 ? `#${lastDash}` : text;
}

function localDateFromKey(key) {
  const [year, month, day] = String(key || todayKey()).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatDateKey(key) {
  const formatter = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  return formatter.format(localDateFromKey(key));
}

function formatReportRangeLabel(range = null) {
  const from = range ? todayKey(range.start) : (sessionStorage.getItem("report_from") || todayKey());
  const to = range ? todayKey(range.end) : (sessionStorage.getItem("report_to") || from);
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const startLabel = formatDateKey(start);
  const endLabel = formatDateKey(end);
  return start === end ? startLabel : `${startLabel} - ${endLabel}`;
}

function reportCalendarMonthStart() {
  const value = sessionStorage.getItem("report_calendar_month") || (sessionStorage.getItem("report_from") || todayKey()).slice(0, 7);
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function openReportRangeCalendar() {
  const monthStart = reportCalendarMonthStart();
  const from = sessionStorage.getItem("report_from") || todayKey();
  const to = sessionStorage.getItem("report_to") || from;
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
      <button class="${inMonth ? "" : "muted"} ${selected ? "selected" : ""} ${inRange ? "in-range" : ""}" onclick="chooseReportCalendarDate('${key}')">
        ${date.getDate()}
      </button>
    `;
  }).join("");
  openModal(`
    <div class="range-calendar-modal">
      <div class="section-title">
        <div>
          <h3>Pilih Rentang Tanggal</h3>
          <p>${escapeHtml(formatReportRangeLabel())}</p>
        </div>
        <button class="btn" onclick="closeModal()">Tutup</button>
      </div>
      <div class="range-calendar-nav">
        <button onclick="shiftReportCalendarMonth(-1)">&#8249;</button>
        <strong>${escapeHtml(monthTitle)}</strong>
        <button onclick="shiftReportCalendarMonth(1)">&#8250;</button>
      </div>
      <div class="range-calendar-weekdays">${["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(day => `<span>${day}</span>`).join("")}</div>
      <div class="range-calendar-grid">${days}</div>
      <div class="range-calendar-actions">
        <button class="btn" onclick="sessionStorage.setItem('report_from', '${todayKey()}'); sessionStorage.setItem('report_to', '${todayKey()}'); closeModal(); render()">Hari ini</button>
        <button class="btn primary" onclick="closeModal(); render()">Terapkan</button>
      </div>
    </div>
  `);
}

function shiftReportCalendarMonth(direction) {
  const monthStart = reportCalendarMonthStart();
  monthStart.setMonth(monthStart.getMonth() + Number(direction || 0));
  sessionStorage.setItem("report_calendar_month", monthKey(monthStart));
  openReportRangeCalendar();
}

function chooseReportCalendarDate(key) {
  const from = sessionStorage.getItem("report_from");
  const to = sessionStorage.getItem("report_to");
  if (!from || (from && to)) {
    sessionStorage.setItem("report_from", key);
    sessionStorage.removeItem("report_to");
    openReportRangeCalendar();
    return;
  }
  const start = from <= key ? from : key;
  const end = from <= key ? key : from;
  sessionStorage.setItem("report_from", start);
  sessionStorage.setItem("report_to", end);
  closeModal();
  render();
}

function productSalesRecordsInRange(range) {
  return (state.importedProductSales || []).filter(row => {
    const start = row.periodStart ? startOfLocalDay(row.periodStart) : null;
    const end = row.periodEnd ? endOfLocalDay(row.periodEnd) : start;
    if (!start || !end) return true;
    return start >= range.start && end <= range.end;
  });
}

function productSalesPeriodLabel(row) {
  const start = row.periodStart ? startOfLocalDay(row.periodStart) : null;
  const end = row.periodEnd ? endOfLocalDay(row.periodEnd) : start;
  if (!start || !end) return "Periode lama";
  const formatter = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  if (todayKey(start) === todayKey(end)) return formatter.format(start);
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function productSalesFilterNote(range, legacyCount) {
  if (legacyCount) {
    return `${legacyCount.toLocaleString("id-ID")} baris data barang historis masuk filter ${range.label}. Data lama berbentuk agregat file, jadi hanya ditampilkan jika periode file tercakup penuh oleh filter.`;
  }
  if ((state.importedProductSales || []).length) {
    return "Belum ada data barang historis yang cocok. Untuk data lama berbentuk agregat file, pilih rentang yang mencakup penuh periode file, misalnya 01/05/2026 sampai 31/05/2026.";
  }
  return "Jika data laporan tidak lengkap, lakukan sinkronisasi atau impor data barang yang memiliki rincian item.";
}

async function openReportVisitorReceipt(recordKey) {
  const candidates = [
    ...reportRecords(),
    ...reportAllRecords(),
    ...(state.orders || []).map(orderReportRecord),
    ...(state.importedSales || []).map(importedReportRecord),
    ...(typeof supabaseReportRecords !== "undefined" && Array.isArray(supabaseReportRecords) ? supabaseReportRecords : [])
  ].filter(record => reportRecordKey(record) === recordKey);
  let order = candidates.find(record => (record.items || []).length) || candidates[0];
  if (!order) return toast("Transaksi tidak ditemukan.");

  if (!(order.items || []).length && !order.imported && typeof loadSupabaseOrderDetailForReport === "function") {
    openModal(`
      <div class="visitor-receipt-modal visitor-receipt-loading">
        <div class="receipt-loading-spinner" role="status" aria-label="Memuat rincian item"></div>
      </div>
    `);
    order = await loadSupabaseOrderDetailForReport(order);
  }

  const items = order.items || [];
  const itemRows = items.map(item => {
    const modifiers = typeof orderItemModifiers === "function" ? orderItemModifiers(item) : [];
    return `
      <div class="visitor-receipt-item">
        <span><strong>${Number(item.qty || 1)}x ${escapeHtml(item.name || "Item")}</strong>${modifiers.length ? `<small>${modifiers.map(modifier => escapeHtml(modifier)).join(", ")}</small>` : ""}</span>
        <b>${money(cartItemTotal(item))}</b>
      </div>
    `;
  }).join("");
  openModal(`
    <div class="visitor-receipt-modal">
      <div class="section-title visitor-receipt-toolbar">
        <div class="visitor-receipt-actions">
          <button class="btn subtle-danger" onclick='deleteReportTransaction(${JSON.stringify(reportRecordKey(order))})'>Hapus</button>
          <button class="btn" onclick="closeModal()">Tutup</button>
        </div>
      </div>
      <div class="visitor-receipt-paper">
        <div class="visitor-receipt-head">
          <strong>${escapeHtml(state.settings.receiptStoreName || "Kasirin!")}</strong>
          <span>${escapeHtml(state.settings.receiptAddress || state.outlet)}</span>
          <small>${escapeHtml(order.source || "Kasirin!")}</small>
        </div>
        <div class="visitor-receipt-meta">
          <span>No</span><b>${escapeHtml(shortOrderNumber(order.number))}</b>
          <span>Waktu</span><b>${dateTime(order.createdAt)}</b>
        </div>
        <div class="visitor-receipt-chips">
          <span>${escapeHtml(order.type || "-")}</span>
          <span>${escapeHtml(order.customer || "Walk-in")}</span>
          <span>${escapeHtml(order.paymentMethod || "-")}</span>
        </div>
        <div class="visitor-receipt-items">
          ${itemRows || `<div class="visitor-receipt-empty">Data lama ini belum memiliki rincian item. Ringkasan transaksi tetap tersimpan di laporan.</div>`}
        </div>
        <div class="visitor-receipt-total">
          <span>Subtotal</span><b>${money(order.subtotal)}</b>
          <span>Diskon</span><b>${money(order.discount)}</b>
          <span>Total</span><b>${money(order.total)}</b>
          <span>Keuntungan</span><b>${money(order.profit)}</b>
        </div>
      </div>
    </div>
  `);
}

function searchReportReceipt(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const query = String(new FormData(form).get("receiptCode") || "").trim().toLowerCase();
  sessionStorage.setItem("report_receipt_query", query);
  if (!query) return toast("Masukkan kode struk terlebih dahulu.");
  const records = reportAllRecords();
  const found = records.find(record => String(record.number || "").trim().toLowerCase() === query)
    || records.find(record => String(record.number || "").toLowerCase().includes(query));
  if (!found) return toast("Kode struk tidak ditemukan.");
  openReportVisitorReceipt(reportRecordKey(found));
}

function reportAllRecords() {
  return reportSourceRecords();
}

function profitSummary(records) {
  const total = records.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const profit = records.reduce((sum, row) => sum + Number(row.profit || 0), 0);
  return { count: records.length, total, profit };
}

function setProfitReportLevel(level, year = "", month = "", parentLevel = "") {
  sessionStorage.setItem("profit_report_level", level);
  if (year) sessionStorage.setItem("profit_report_year", year);
  if (month) sessionStorage.setItem("profit_report_month", month);
  if (parentLevel) {
    sessionStorage.setItem("profit_report_parent", parentLevel);
  } else if (["today", "currentMonth", "currentYear", "years"].includes(level)) {
    sessionStorage.removeItem("profit_report_parent");
  } else if (level === "months") {
    sessionStorage.setItem("profit_report_parent", "years");
  } else if (level === "days" && !sessionStorage.getItem("profit_report_parent")) {
    sessionStorage.setItem("profit_report_parent", "months");
  }
  if (level === "years") loadProfitSummary("years");
  if (level === "months") loadProfitSummary("months", Number(year));
  if (level === "days") loadProfitSummary("days", Number(year), Number(month));
  render();
}

function setProfitReportDate(dateKey, parentLevel = "days") {
  sessionStorage.setItem("profit_report_level", "dateRecords");
  sessionStorage.setItem("profit_report_date", dateKey);
  sessionStorage.setItem("profit_report_parent", parentLevel);
  const date = new Date(`${dateKey}T00:00:00`);
  if (!Number.isNaN(date.getTime())) {
    sessionStorage.setItem("profit_report_year", String(date.getFullYear()));
    sessionStorage.setItem("profit_report_month", String(date.getMonth() + 1));
  }
  render();
}

function setProfitChartMetric(metricName) {
  sessionStorage.setItem("profit_chart_metric", metricName);
  render();
}

function compactMoney(value) {
  const number = Number(value) || 0;
  if (number >= 1000000000) return `Rp ${(number / 1000000000).toFixed(1).replace(".", ",")}M`;
  if (number >= 1000000) return `Rp ${(number / 1000000).toFixed(1).replace(".", ",")}jt`;
  if (number >= 1000) return `Rp ${(number / 1000).toFixed(0)}rb`;
  return money(number);
}

function renderProfitAreaChart(rows, title) {
  if (!rows.length) return "";
  const metricName = sessionStorage.getItem("profit_chart_metric") || "count";
  const metricConfig = {
    count: { label: "Transaksi", value: row => Number(row.count || 0), format: value => Number(value || 0).toLocaleString("id-ID") },
    total: { label: "Pendapatan", value: row => Number(row.total || 0), format: compactMoney },
    profit: { label: "Keuntungan", value: row => Number(row.profit || 0), format: compactMoney }
  };
  const renderSvg = (metricId, compact = false) => {
    const gradientId = `profitAreaFill${metricId}${compact ? "Mini" : "Full"}`;
    const config = metricConfig[metricId] || metricConfig.count;
    const data = rows.map(row => ({ ...row, value: config.value(row) }));
    const maxValue = Math.max(1, ...data.map(row => row.value));
    const chartLeft = 8;
    const chartRight = 92;
    const chartTop = compact ? 15 : 12;
    const chartBottom = 60;
    const points = data.map((row, index) => {
      const x = data.length === 1 ? 50 : chartLeft + ((index / (data.length - 1)) * (chartRight - chartLeft));
      const y = chartBottom - ((row.value / maxValue) * (chartBottom - chartTop));
      return { ...row, x, y };
    });
    const linePath = points.map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
    const areaPath = `${linePath} L ${points.at(-1).x.toFixed(2)} ${chartBottom} L ${points[0].x.toFixed(2)} ${chartBottom} Z`;
    return `
      <div class="profit-area-chart ${compact ? "mini" : ""}">
        <svg viewBox="0 0 100 72" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="${gradientId}" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#0f9b75" stop-opacity=".58"></stop>
              <stop offset="78%" stop-color="#0f9b75" stop-opacity=".08"></stop>
              <stop offset="100%" stop-color="#0f9b75" stop-opacity="0"></stop>
            </linearGradient>
          </defs>
          <path d="${areaPath}" fill="url(#${gradientId})"></path>
          <path d="${linePath}" fill="none" stroke="#0f7a5c" stroke-width="${compact ? "1.05" : "1.28"}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>
          <line x1="${chartLeft}" y1="${chartBottom}" x2="${chartRight}" y2="${chartBottom}" stroke="#d8e3df" stroke-width=".6" vector-effect="non-scaling-stroke"></line>
        </svg>
        <div class="profit-point-dots">
          ${points.map(point => `<span style="left:${point.x.toFixed(2)}%; top:${((point.y / 72) * 100).toFixed(2)}%"></span>`).join("")}
        </div>
        <div class="profit-point-labels">
          ${points.map(point => `<span style="left:${point.x.toFixed(2)}%; top:${Math.max(8, (point.y / 72) * 100 - 8).toFixed(2)}%">${escapeHtml(config.format(point.value))}</span>`).join("")}
        </div>
        <div class="profit-chart-axis">
          ${points.map(point => `<span>${escapeHtml(point.label)}</span>`).join("")}
        </div>
      </div>
    `;
  };
  const config = metricConfig[metricName] || metricConfig.count;
  const tabs = Object.entries(metricConfig).map(([id, item]) => `
    <button class="${metricName === id ? "active" : ""}" onclick="setProfitChartMetric('${id}')">${item.label}</button>
  `).join("");
  return `
    <div class="card profit-area-chart-card">
      <div class="profit-chart-head profit-chart-single-head">
        <div>
          <span>Grafik ${escapeHtml(config.label)}</span>
          <h3>${escapeHtml(title)}</h3>
        </div>
        <div class="profit-chart-tabs">${tabs}</div>
      </div>
      <div class="profit-chart-single">
        ${renderSvg(metricName)}
      </div>
      <div class="profit-chart-triple">
        ${Object.entries(metricConfig).map(([id, item]) => `
          <div class="profit-mini-chart">
            <span>${escapeHtml(item.label)}</span>
            ${renderSvg(id, true)}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function fallbackProfitSummaryRows(level, year = null, month = null) {
  const buckets = new Map();
  for (const record of reportSourceRecords()) {
    const date = new Date(record.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const recordYear = date.getFullYear();
    const recordMonth = date.getMonth() + 1;
    if (level === "months" && Number(year) !== recordYear) continue;
    if (level === "days" && (Number(year) !== recordYear || Number(month) !== recordMonth)) continue;
    const key = level === "years"
      ? String(recordYear)
      : level === "months"
        ? String(recordMonth)
        : todayKey(date);
    const row = buckets.get(key) || {
      year: recordYear,
      month: recordMonth,
      day: date.getDate(),
      salesDate: todayKey(date),
      count: 0,
      total: 0,
      profit: 0,
      estimatedCost: 0
    };
    row.count += 1;
    row.total += Number(record.total || 0);
    row.profit += Number(record.profit || 0);
    row.estimatedCost += Math.max(0, Number(record.total || 0) - Number(record.profit || 0));
    buckets.set(key, row);
  }
  return [...buckets.values()].sort((a, b) => {
    if (level === "years") return b.year - a.year;
    if (level === "months") return b.month - a.month;
    return b.day - a.day;
  });
}

function renderProfitLossDrill() {
  loadProfitSummary("years");
  let yearRows = profitSummaryCache.years;
  if (!yearRows.length) yearRows = fallbackProfitSummaryRows("years");
  const years = yearRows.map(row => row.year).filter(Boolean);
  let level = sessionStorage.getItem("profit_report_level") || "today";
  if (level === "overview") {
    level = "today";
    sessionStorage.setItem("profit_report_level", "today");
  }
  const selectedYear = Number(sessionStorage.getItem("profit_report_year") || years[0] || new Date().getFullYear());
  const selectedMonth = Number(sessionStorage.getItem("profit_report_month") || (new Date().getMonth() + 1));
  const selectedDateKey = sessionStorage.getItem("profit_report_date") || todayKey();
  const parentLevel = sessionStorage.getItem("profit_report_parent") || "";
  const monthFormatter = new Intl.DateTimeFormat("id-ID", { month: "short" });
  const fullMonthFormatter = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();
  const thisDay = now.getDate();
  const recordsForRange = (start, end) => reportSourceRecords({ start, end });
  let title = "Penjualan Selama Ini";
  let backButton = "";
  let buckets = [];

  if (level === "today") {
    loadProfitSummary("days", thisYear, thisMonth + 1);
    title = "Laporan Laba Rugi Harian";
    backButton = "";
    const todayDateKey = todayKey();
    buckets = recordsForRange(startOfLocalDay(todayDateKey), endOfLocalDay(todayDateKey)).map(record => ({
      id: reportRecordKey(record),
      label: shortOrderNumber(record.number),
      count: 1,
      total: record.total,
      profit: record.profit,
      estimatedCost: Math.max(0, Number(record.total || 0) - Number(record.profit || 0)),
      hint: dateTime(record.createdAt),
      action: `openReportVisitorReceipt(${JSON.stringify(reportRecordKey(record))})`
    }));
  } else if (level === "currentMonth") {
    loadProfitSummary("days", thisYear, thisMonth + 1);
    title = `Laporan Bulan Ini`;
    backButton = "";
    const rows = (profitSummaryCache.days[`${thisYear}-${thisMonth + 1}`] || []);
    const sourceRows = rows.length ? rows : fallbackProfitSummaryRows("days", thisYear, thisMonth + 1);
    buckets = sourceRows.map(row => ({
      id: row.salesDate || todayKey(new Date(thisYear, thisMonth, row.day)),
      label: String(row.day).padStart(2, "0"),
      count: row.count,
      total: row.total,
      profit: row.profit,
      estimatedCost: row.estimatedCost,
      action: `setProfitReportDate('${row.salesDate || todayKey(new Date(thisYear, thisMonth, row.day))}', 'currentMonth')`
    }));
  } else if (level === "currentYear") {
    loadProfitSummary("months", thisYear);
    title = `Laporan Tahun Ini`;
    backButton = "";
    const rows = (profitSummaryCache.months[thisYear] || []);
    const sourceRows = rows.length ? rows : fallbackProfitSummaryRows("months", thisYear);
    buckets = sourceRows.map(row => ({
      id: String(row.month),
      label: monthFormatter.format(new Date(thisYear, row.month - 1, 1)).toUpperCase(),
      count: row.count,
      total: row.total,
      profit: row.profit,
      estimatedCost: row.estimatedCost,
      action: `setProfitReportLevel('days', '${thisYear}', '${row.month}', 'currentYear')`
    }));
  } else if (level === "months") {
    loadProfitSummary("months", selectedYear);
    title = `Penjualan Tahun ${selectedYear}`;
    backButton = `<button class="btn profit-back-btn" onclick="setProfitReportLevel('years')">Kembali</button>`;
    const rows = (profitSummaryCache.months[selectedYear] || []);
    const sourceRows = rows.length ? rows : fallbackProfitSummaryRows("months", selectedYear);
    buckets = sourceRows.map(row => ({
      id: String(row.month),
      label: monthFormatter.format(new Date(selectedYear, row.month - 1, 1)).toUpperCase(),
      count: row.count,
      total: row.total,
      profit: row.profit,
      estimatedCost: row.estimatedCost,
      action: `setProfitReportLevel('days', '${selectedYear}', '${row.month}', 'months')`
    }));
  } else if (level === "days") {
    loadProfitSummary("days", selectedYear, selectedMonth);
    const monthDate = new Date(selectedYear, selectedMonth - 1, 1);
    title = `Penjualan ${fullMonthFormatter.format(monthDate)}`;
    const dayBackAction = parentLevel === "currentYear"
      ? "setProfitReportLevel('currentYear')"
      : `setProfitReportLevel('months', '${selectedYear}')`;
    backButton = `<button class="btn profit-back-btn" onclick="${dayBackAction}">Kembali</button>`;
    const rows = (profitSummaryCache.days[`${selectedYear}-${selectedMonth}`] || []);
    const sourceRows = rows.length ? rows : fallbackProfitSummaryRows("days", selectedYear, selectedMonth);
    buckets = sourceRows.map(row => ({
      id: row.salesDate || String(row.day),
      label: String(row.day).padStart(2, "0"),
      count: row.count,
      total: row.total,
      profit: row.profit,
      estimatedCost: row.estimatedCost,
      action: row.salesDate ? `setProfitReportDate('${row.salesDate}', 'days')` : ""
    }));
  } else if (level === "dateRecords") {
    const selectedDate = startOfLocalDay(selectedDateKey);
    title = `Transaksi ${new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(selectedDate)}`;
    const dateBackAction = parentLevel === "currentMonth"
      ? "setProfitReportLevel('currentMonth')"
      : parentLevel === "today"
        ? "setProfitReportLevel('today')"
        : `setProfitReportLevel('days', '${selectedYear}', '${selectedMonth}', '${parentLevel || "days"}')`;
    backButton = `<button class="btn profit-back-btn" onclick="${dateBackAction}">Kembali</button>`;
    buckets = recordsForRange(startOfLocalDay(selectedDateKey), endOfLocalDay(selectedDateKey)).map(record => ({
      id: reportRecordKey(record),
      label: shortOrderNumber(record.number),
      count: 1,
      total: record.total,
      profit: record.profit,
      estimatedCost: Math.max(0, Number(record.total || 0) - Number(record.profit || 0)),
      hint: dateTime(record.createdAt),
      action: `openReportVisitorReceipt(${JSON.stringify(reportRecordKey(record))})`
    }));
  } else if (level === "years") {
    title = "Laporan Selama Ini";
    backButton = "";
    buckets = yearRows.map(row => ({
      id: String(row.year),
      label: String(row.year),
      count: row.count,
      total: row.total,
      profit: row.profit,
      estimatedCost: row.estimatedCost,
      action: `setProfitReportLevel('months', '${row.year}')`
    }));
  }

  const summary = {
    count: buckets.reduce((sum, row) => sum + row.count, 0),
    total: buckets.reduce((sum, row) => sum + row.total, 0),
    profit: buckets.reduce((sum, row) => sum + row.profit, 0)
  };
  const displayRows = level === "years" || level === "currentYear" ? buckets : buckets.slice().reverse();
  const isTransactionList = level === "today" || level === "dateRecords";
  const listRows = displayRows.map(bucket => {
    const clickable = Boolean(bucket.action);
    return `
      <button type="button" class="profit-drill-row ${isTransactionList ? "is-transaction" : ""} ${clickable ? "clickable" : ""}" ${clickable ? `onclick="${escapeHtml(bucket.action)}"` : ""}>
        <span class="profit-drill-label"><strong>${escapeHtml(bucket.label)}</strong><small>${escapeHtml(bucket.hint || `${bucket.count.toLocaleString("id-ID")} transaksi`)}</small></span>
        <span class="profit-drill-values">
          <span class="profit-drill-value-labels"><small>Pendapatan</small><small>Keuntungan</small></span>
          <span class="profit-drill-value-amounts"><b>${money(bucket.total)}</b><b>${money(bucket.profit)}</b></span>
        </span>
        ${clickable ? `<em>&rarr;</em>` : `<em></em>`}
      </button>
    `;
  }).join("");
  const currentYearRow = yearRows.find(row => row.year === thisYear) || { count: 0, total: 0, profit: 0, estimatedCost: 0 };
  const currentYearSummary = { count: currentYearRow.count, total: currentYearRow.total, profit: currentYearRow.profit };
  let monthRowsForCurrentYear = profitSummaryCache.months[thisYear] || [];
  if (!monthRowsForCurrentYear.length) loadProfitSummary("months", thisYear);
  monthRowsForCurrentYear = profitSummaryCache.months[thisYear] || [];
  if (!monthRowsForCurrentYear.length) monthRowsForCurrentYear = fallbackProfitSummaryRows("months", thisYear);
  const currentMonthRow = monthRowsForCurrentYear.find(row => row.month === thisMonth + 1) || { count: 0, total: 0, profit: 0, estimatedCost: 0 };
  const currentMonthSummary = { count: currentMonthRow.count, total: currentMonthRow.total, profit: currentMonthRow.profit };
  const dayKey = `${thisYear}-${thisMonth + 1}`;
  let dayRowsForCurrentMonth = profitSummaryCache.days[dayKey] || [];
  if (!dayRowsForCurrentMonth.length) loadProfitSummary("days", thisYear, thisMonth + 1);
  dayRowsForCurrentMonth = profitSummaryCache.days[dayKey] || [];
  if (!dayRowsForCurrentMonth.length) dayRowsForCurrentMonth = fallbackProfitSummaryRows("days", thisYear, thisMonth + 1);
  const currentDayRow = dayRowsForCurrentMonth.find(row => row.day === thisDay) || { count: 0, total: 0, profit: 0, estimatedCost: 0 };
  const currentDaySummary = { count: currentDayRow.count, total: currentDayRow.total, profit: currentDayRow.profit };
  const activeSummary = level === "months"
    ? (yearRows.find(row => row.year === selectedYear) || { count: 0, total: 0, profit: 0, estimatedCost: 0 })
    : level === "days"
      ? ((profitSummaryCache.months[selectedYear] || []).find(row => row.month === selectedMonth) || { count: 0, total: 0, profit: 0, estimatedCost: 0 })
      : level === "dateRecords"
        ? summary
      : level === "today"
        ? summary
        : level === "currentMonth"
          ? currentMonthSummary
          : level === "currentYear"
            ? currentYearSummary
            : summary;
  const mainPeriodLevels = ["today", "currentMonth", "currentYear", "years"];
  const periodMenu = `
    <div class="transaction-period-menu" role="tablist" aria-label="Periode penjualan">
      <button type="button" class="${level === "today" ? "active" : ""}" onclick="setProfitReportLevel('today')" role="tab" aria-selected="${level === "today"}">Hari ini</button>
      <button type="button" class="${level === "currentMonth" ? "active" : ""}" onclick="setProfitReportLevel('currentMonth')" role="tab" aria-selected="${level === "currentMonth"}">Bulan ini</button>
      <button type="button" class="${level === "currentYear" ? "active" : ""}" onclick="setProfitReportLevel('currentYear')" role="tab" aria-selected="${level === "currentYear"}">Tahun ini</button>
      <button type="button" class="${level === "years" ? "active" : ""}" onclick="setProfitReportLevel('years')" role="tab" aria-selected="${level === "years"}">Selama ini</button>
    </div>
  `;
  const activePeriodCard = `
    <div class="profit-detail-header">
      <div class="profit-detail-nav">${mainPeriodLevels.includes(level) ? periodMenu : backButton}</div>
      <div class="profit-period-grid">
        <div class="profit-period-tile"><small>Transaksi</small><b>${activeSummary.count.toLocaleString("id-ID")}</b></div>
        <div class="profit-period-tile"><small>Pendapatan</small><b>${money(activeSummary.total)}</b></div>
        <div class="profit-period-tile accent"><small>Keuntungan</small><b>${money(activeSummary.profit)}</b></div>
      </div>
    </div>
  `;
  const chartRows = ["years", "months", "currentYear", "currentMonth"].includes(level)
    ? buckets.slice().sort((a, b) => String(a.id).localeCompare(String(b.id), "id-ID", { numeric: true }))
    : [];
  const profitChartTitle = level === "years"
    ? "Penjualan Selama Ini"
    : level === "currentYear"
      ? "Penjualan Tahun Ini"
      : level === "currentMonth"
        ? "Penjualan Bulan Ini"
        : `Penjualan Tahun ${selectedYear}`;
  const profitChart = chartRows.length ? renderProfitAreaChart(chartRows, profitChartTitle) : "";
  const summaryCard = (label, value, hint = "", accent = false) => `
    <div class="profit-summary-card ${accent ? "accent" : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
    </div>
  `;

  if (level === "overview") {
    const overviewButton = (levelTarget, heading) => `
      <button class="transaction-report-row" onclick="setProfitReportLevel('${levelTarget}')">
        <span class="transaction-report-icon" aria-hidden="true"></span>
        <strong>${escapeHtml(heading)}</strong>
        <em>&rarr;</em>
      </button>
    `;
    return `
      <section class="report-section-panel profit-drill-panel">
        <div class="transaction-report-menu">
          <form class="transaction-receipt-search" onsubmit="searchReportReceipt(event)">
            <input name="receiptCode" value="${escapeHtml(sessionStorage.getItem("report_receipt_query") || "")}" placeholder="Tulis kode struk" oninput="sessionStorage.setItem('report_receipt_query', this.value)" />
            <button type="submit" aria-label="Cari struk">⌕</button>
          </form>
          ${overviewButton("today", "Penjualan Hari Ini")}
          ${overviewButton("currentMonth", "Penjualan Bulan ini")}
          ${overviewButton("currentYear", "Penjualan Tahun ini")}
          ${overviewButton("years", "Penjualan Selama ini")}
        </div>
      </section>
    `;
  }

  return `
    <section class="report-section-panel profit-drill-panel">
      ${activePeriodCard}
      ${profitChart}
      <div class="card profit-drill-list">
        ${listRows || empty("Belum ada data pada level ini.")}
      </div>
    </section>
  `;
}

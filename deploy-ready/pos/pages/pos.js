// Page renderer extracted from app.js. Depends on shared helpers/globals in app.js.

function renderPos() {
  const mobileView = sessionStorage.getItem("pos_mobile_view") || "items";
  const cartStep = sessionStorage.getItem("pos_cart_step") || "items";
  const saleLocked = !!sessionStorage.getItem("pos_last_result");
  const categories = ["Semua", ...productCategories()];
  const selected = sessionStorage.getItem("pos_category") || "Semua";
  const query = sessionStorage.getItem("pos_query") || "";
  const orderType = sessionStorage.getItem("pos_order_type") || "Dine In";
  const customerName = sessionStorage.getItem("pos_customer_name") || "";
  const serviceInfo = sessionStorage.getItem("pos_service_info") || "";
  const orderNote = sessionStorage.getItem("pos_order_note") || "";
  const paymentMethod = sessionStorage.getItem("pos_payment_method") || "Tunai";
  const paymentSlide = sessionStorage.getItem("pos_payment_slide") || "quick";
  const receivedAmount = Number(sessionStorage.getItem("pos_received_amount") || 0);
  const payingUnpaidId = sessionStorage.getItem("pos_pay_unpaid_id");
  const printReceipt = true;
  const addonProducts = state.addons.filter(addon => addon.active);
  const visible = stableProducts(state.products).filter(product => product.active && product.channelPOS !== false)
    .filter(product => selected === "Semua" || product.category === selected)
    .filter(product => [product.name, product.sku, product.category].join(" ").toLowerCase().includes(query.toLowerCase()));
  const subtotal = cartSubtotal();
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const discount = Number(sessionStorage.getItem("pos_discount") || 0);
  const discountType = sessionStorage.getItem("pos_discount_type") || "rp";
  const discountAmount = orderDiscountAmount(subtotal);
  const grand = Math.max(0, subtotal - discountAmount);
  const change = Math.max(0, receivedAmount - grand);
  return `
    <div class="pos-layout ${mobileView === "cart" ? "cart-view" : "items-view"} display-${itemDisplay}">
      <div class="grid pos-products-pane">
        <div class="pos-control-panel">
          <div class="pos-search-row">
            <div class="field pos-search"><label>Cari produk / barcode</label><input class="input" data-pos-search value="${escapeHtml(query)}" oninput="updatePosSearch(this)" placeholder="Cari nama produk atau scan barcode" /></div>
            <button class="quick-tool search-tool" type="button" title="Cari produk" onclick="focusPosSearch()">${navIcon("search")}</button>
          </div>
          <div class="category-cards">
            ${categories.map(cat => `<button class="category-card ${cat === selected ? "active" : ""}" type="button" onclick="setCategory(${JSON.stringify(cat).replaceAll('"', "&quot;")})"><strong>${escapeHtml(cat)}</strong><span>${categoryCount(cat)} item</span></button>`).join("")}
          </div>
        </div>
        <div class="product-list">
          ${saleLocked ? `<div class="sale-lock-card"><strong>Transaksi terakhir selesai</strong><span>Klik Transaksi Baru sebelum memilih barang lagi.</span><button class="btn green" onclick="startNewSale()">Transaksi Baru</button></div>` : ""}
          ${visible.map(product => productCard(product)).join("") || empty("Produk tidak ditemukan.")}
        </div>
      </div>
      <div class="card cart-panel">
        <button class="cart-back" onclick="setPosMobileView('items')">‹ Kembali pilih barang</button>
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
                <div class="field" data-mobile-label="Bayar"><label>Pembayaran</label><select id="paymentMethod" onchange="sessionStorage.setItem('pos_payment_method', this.value); render()">${["Tunai", "QRIS", "Transfer", "Kartu Debit", "E-wallet", "Pembayaran Delivery"].map(method => `<option ${method === paymentMethod ? "selected" : ""}>${method}</option>`).join("")}</select></div>
                <div class="field" data-mobile-label="Catatan"><label>Catatan</label><input id="orderNote" class="input" value="${escapeHtml(orderNote)}" oninput="sessionStorage.setItem('pos_order_note', this.value)" /></div>
                <div class="field discount-field" data-mobile-label="Diskon"><label>Diskon</label><div class="discount-inline"><input id="pos_discount" class="input" type="number" min="0" max="${discountType === "percent" ? "100" : ""}" value="${discount}" oninput="sessionStorage.setItem('pos_discount', this.value)" onchange="render()" /><div class="discount-type-tabs" role="group" aria-label="Jenis diskon transaksi"><button type="button" class="${discountType === "rp" ? "active" : ""}" onclick="setOrderDiscountType('rp')">Rp</button><button type="button" class="${discountType === "percent" ? "active" : ""}" onclick="setOrderDiscountType('percent')">%</button></div></div></div>
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
    </div>
    ${cartStep !== "success" ? `<div class="mobile-pos-bar">
      <button class="mobile-pos-main" onclick="setPosMobileView('cart')">
        <strong>${totalQty}</strong>
        <span>Barang</span>
        <b>LANJUT</b>
      </button>
    </div>` : ""}
  `;
}

function quickPaymentOptions(total) {
  const rounded = Math.ceil(total / 10000) * 10000;
  return [
    { label: "Uang Pas", value: total },
    ...savedPaymentAmounts.map(value => ({ label: money(value).replace("Rp", "Rp "), value })),
    { label: money(rounded), value: rounded }
  ].filter((option, index, list) => option.value >= total && list.findIndex(item => item.value === option.value) === index);
}

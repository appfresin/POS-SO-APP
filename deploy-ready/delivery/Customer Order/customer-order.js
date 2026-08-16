(function () {
  "use strict";

  const HOME_ACTIVE_KEY = "customer_home_active_orders";
  const HOME_CHECKOUT_KEY = "customer_home_checkout";
  const HOME_PAYMENT_PROVIDER = "mock";
  const HOME_STATUS_REFRESH_MS = 15000;
  const HOME_CONFIG = {
    minimumPrepMinutes: 25,
    pickupSlotInterval: 30,
    pickupLastHour: 22,
    defaultDeliveryFee: 10000,
    driverWhatsapp: "6281234567890",
    driverName: "Andi"
  };
  let homeStatusRefreshLoading = false;
  let homeStatusRefreshAt = 0;

  function homeParams() {
    try {
      const search = new URLSearchParams(location.search || "");
      const hashQuery = String(location.hash || "").split("?")[1] || "";
      return { search, hash: hashQuery ? new URLSearchParams(hashQuery) : new URLSearchParams() };
    } catch {
      return { search: new URLSearchParams(), hash: new URLSearchParams() };
    }
  }

  function homeIsMode() {
    if (window.KASIRIN_DELIVERY_APP === true) return true;
    const path = String(location.pathname || "").toLowerCase();
    const { search, hash } = homeParams();
    const modeValues = [search.get("mode"), search.get("type"), hash.get("mode"), hash.get("type")]
      .map(value => String(value || "").toLowerCase().replace(/[\s_-]+/g, ""));
    return path === "/delivery/" || path === "/delivery" || path.startsWith("/delivery/status/")
      || path === "/order/" || path === "/order" || path.startsWith("/order/status/")
      || modeValues.includes("homeorder") || modeValues.includes("delivery");
  }

  function homeStatusTokenFromPath() {
    const match = String(location.pathname || "").match(/\/(?:delivery|order)\/status\/([^/?#]+)/i);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function homeEscape(value) {
    return typeof escapeHtml === "function"
      ? escapeHtml(value)
      : String(value || "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function homeMoney(value) {
    return typeof money === "function" ? money(value) : `Rp${Number(value || 0).toLocaleString("id-ID")}`;
  }

  function homeOrderTotal(order) {
    return typeof orderTotal === "function" ? orderTotal(order) : Number(order?.grandTotal || order?.subtotal || 0);
  }

  function homeIsPaid(order) {
    if (typeof orderIsPaid === "function") return orderIsPaid(order);
    return String(order?.paymentStatus || "").toLowerCase() === "lunas";
  }

  function homeIsOrder(order) {
    return Boolean(order) && ["PICKUP_PREORDER", "DELIVERY"].includes(order.customerOrderType || order.orderMode);
  }

  function homeOrderKind(order) {
    return order?.customerOrderType || order?.orderMode || "";
  }

  function homeCheckout() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(HOME_CHECKOUT_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function homeSetCheckout(patch) {
    sessionStorage.setItem(HOME_CHECKOUT_KEY, JSON.stringify({ ...homeCheckout(), ...patch }));
  }

  function homeActiveRefs() {
    try {
      const parsed = JSON.parse(localStorage.getItem(HOME_ACTIVE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function homeSaveActiveOrder(order) {
    const ref = {
      id: order.id || "",
      number: order.number || "",
      token: order.publicOrderToken || "",
      type: homeOrderKind(order),
      createdAt: order.createdAt || new Date().toISOString()
    };
    const refs = [ref, ...homeActiveRefs().filter(item => item.token !== ref.token && item.id !== ref.id)].slice(0, 6);
    localStorage.setItem(HOME_ACTIVE_KEY, JSON.stringify(refs));
  }

  function homeFindOrderByToken(token = "") {
    const clean = String(token || "").trim();
    if (!clean) return null;
    const refs = homeActiveRefs();
    const ref = refs.find(item => item.token === clean);
    return (state.orders || []).find(order => homeIsOrder(order) && (
      order.publicOrderToken === clean
      || (ref?.id && order.id === ref.id)
      || (ref?.number && order.number === ref.number)
    )) || null;
  }

  function homeActiveOrders() {
    const refs = homeActiveRefs();
    return refs
      .map(ref => homeFindOrderByToken(ref.token))
      .filter(Boolean)
      .filter(order => !["Selesai", "Dibatalkan"].includes(order.status || "") && homeCustomerStatus(order) !== "COMPLETED");
  }

  function homeCurrentOrder() {
    const token = homeStatusTokenFromPath() || sessionStorage.getItem("customer_home_last_token") || "";
    return homeFindOrderByToken(token) || homeActiveOrders()[0] || null;
  }

  function homeGenerateToken() {
    if (window.crypto?.getRandomValues) {
      const bytes = new Uint8Array(18);
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    }
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
  }

  function homeGenerateNumber(prefix) {
    const max = (state.orders || [])
      .map(order => String(order.number || "").match(new RegExp(`^${prefix}(\\d{1,6})$`, "i")))
      .filter(Boolean)
      .reduce((highest, match) => Math.max(highest, Number(match[1] || 0)), 0);
    return `${prefix}${String(max + 1).padStart(3, "0")}`;
  }

  function homePickupSlots(now = new Date()) {
    const slots = ["Secepatnya"];
    const min = new Date(now.getTime() + HOME_CONFIG.minimumPrepMinutes * 60 * 1000);
    const interval = HOME_CONFIG.pickupSlotInterval;
    const cursor = new Date(min);
    const nextMinute = Math.ceil(cursor.getMinutes() / interval) * interval;
    cursor.setMinutes(nextMinute, 0, 0);
    if (nextMinute >= 60) cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
    while (cursor.getHours() <= HOME_CONFIG.pickupLastHour && slots.length < 9) {
      slots.push(`${String(cursor.getHours()).padStart(2, "0")}:${String(cursor.getMinutes()).padStart(2, "0")}`);
      cursor.setMinutes(cursor.getMinutes() + interval);
    }
    return slots;
  }

  function homeCalculateDeliveryFee() {
    const mode = String(window.DELIVERY_FEE_MODE || "fixed").toLowerCase();
    if (mode === "free") return 0;
    return Number(window.DEFAULT_DELIVERY_FEE || HOME_CONFIG.defaultDeliveryFee || 0);
  }

  function homeCoordinate(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function homeHasPinnedLocation(checkout = homeCheckout()) {
    return homeCoordinate(checkout.latitude) !== null && homeCoordinate(checkout.longitude) !== null;
  }

  function homeGoogleMapsUrl(checkout = homeCheckout()) {
    const latitude = homeCoordinate(checkout.latitude);
    const longitude = homeCoordinate(checkout.longitude);
    if (latitude === null || longitude === null) return "";
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }

  function homeLocationLabel(checkout = homeCheckout()) {
    const latitude = homeCoordinate(checkout.latitude);
    const longitude = homeCoordinate(checkout.longitude);
    if (latitude === null || longitude === null) return "Pin lokasi belum dipilih";
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }

  function homePaymentProvider() {
    const { search } = homeParams();
    return String(window.PAYMENT_PROVIDER || window.CUSTOMER_ORDER_PAYMENT_PROVIDER || search.get("payment_provider") || HOME_PAYMENT_PROVIDER).toLowerCase();
  }

  function homeIsDevelopmentPayment() {
    const host = String(location.hostname || "").toLowerCase();
    const { search } = homeParams();
    return homePaymentProvider() === "mock"
      || search.get("dev") === "1"
      || host === "localhost"
      || host === "127.0.0.1"
      || location.protocol === "file:";
  }

  const PaymentService = {
    createPayment(order) {
      order.paymentProvider = homePaymentProvider();
      order.paymentReference = order.paymentReference || `MOCK-${order.number || Date.now()}`;
      return {
        provider: order.paymentProvider,
        reference: order.paymentReference,
        amount: homeOrderTotal(order),
        qrData: null
      };
    },
    checkPayment(order) {
      return { paid: homeIsPaid(order), reference: order?.paymentReference || "" };
    },
    handleWebhook() {
      return false;
    },
    expirePayment(order) {
      if (!order || homeIsPaid(order)) return false;
      order.customerOrderStatus = "PAYMENT_EXPIRED";
      return true;
    }
  };

  function PaymentQRCode() {
    return `<div class="customer-home-qris-placeholder">Pembayaran QRIS sedang dalam tahap integrasi.</div>`;
  }

  function homePrimeMode() {
    if (!homeIsMode()) return;
    sessionStorage.removeItem("self_order_table");
    if (homeStatusTokenFromPath()) {
      sessionStorage.setItem("customer_home_last_token", homeStatusTokenFromPath());
      sessionStorage.setItem("self_order_step", "success");
    }
  }

  function homeRenderTopbar() {
    const appName = state.settings.selfOrderAppName || state.settings.receiptStoreName || "Kasirin Cafe";
    const outletName = state.settings.selfOrderOutletName || state.outlet || "Outlet Utama";
    const profileImage = String(state.settings.selfOrderProfileImageDataUrl || state.settings.receiptLogoDataUrl || "").trim();
    return `
      <header class="self-order-topbar customer-home-topbar">
        <button type="button" class="self-order-icon-btn ${profileImage ? "has-photo" : ""}" onclick="selfOrderShowMenu()" aria-label="Menu">
          ${profileImage ? mediaImageTag(profileImage, "Foto profil self order", "", 240) : navIcon("selforder")}
        </button>
        <div>
          <strong>${homeEscape(appName)}</strong>
          <span>${homeEscape(outletName)}</span>
        </div>
      </header>
    `;
  }

  function homeRenderCart() {
    const subtotal = selfOrderSubtotal();
    const checkout = homeCheckout();
    const method = checkout.method || "PICKUP_PREORDER";
    homeSetCheckout({ method });
    return `
      <main class="self-order-main cart customer-home-cart">
        <div class="self-order-section-head">
          <div><span>Keranjang</span><h3>${selfOrderItemsTotal()} item</h3></div>
        </div>
        <section class="self-order-cart-list">
          ${selfOrderCart.map(item => `
            <article class="self-order-cart-item">
              <div>
                <strong>${homeEscape(item.name)}</strong>
                ${(item.addons || []).length ? `<small>${item.addons.map(addon => `+ ${homeEscape(addon.name)} ${Number(addon.qty || 0)}x`).join(" ")}</small>` : ""}
                ${orderItemNoteHtml(item, "self-order-cart-item-note")}
                <b>${homeMoney(cartItemTotal(item))}</b>
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
        <section class="self-order-summary customer-home-summary-card">
          <div class="total"><span>Subtotal</span><strong>${homeMoney(subtotal)}</strong></div>
        </section>
        <section class="customer-home-cart-methods">
          <h4>Pilih cara menerima pesanan</h4>
          <div class="customer-home-choice-grid">
            <button class="customer-home-method-card ${method === "PICKUP_PREORDER" ? "active" : ""}" type="button" onclick="CustomerOrder.setMethod('PICKUP_PREORDER')">
              <strong>Ambil Sendiri</strong>
              <span>Bayar online, ambil sesuai slot.</span>
            </button>
            <button class="customer-home-method-card ${method === "DELIVERY" ? "active" : ""}" type="button" onclick="CustomerOrder.setMethod('DELIVERY')">
              <strong>Delivery</strong>
              <span>Diantar ke pin lokasi.</span>
            </button>
          </div>
        </section>
        ${typeof renderSelfOrderUpsellCard === "function" ? renderSelfOrderUpsellCard("cart") : ""}
        <button class="self-order-primary self-order-cart-pay" type="button" onclick="selfOrderShowPayment()" ${selfOrderCart.length ? "" : "disabled"}>Checkout</button>
      </main>
    `;
  }

  function homeInputValue(id, key = id) {
    return homeEscape(document.getElementById(id)?.value || homeCheckout()[key] || "");
  }

  function homeRenderLocationPin(checkout = homeCheckout()) {
    const pinned = homeHasPinnedLocation(checkout);
    const mapsUrl = homeGoogleMapsUrl(checkout);
    const accuracy = Number(checkout.locationAccuracy || 0);
    return `
      <section class="customer-home-location-pin ${pinned ? "is-pinned" : ""}">
        <div class="customer-home-location-visual" aria-hidden="true">
          <span class="customer-home-pin-marker"></span>
        </div>
        <div class="customer-home-location-copy">
          <span>Pin Lokasi Pengantaran</span>
          <strong>${homeEscape(pinned ? "Lokasi sudah dipilih" : "Pilih titik antar")}</strong>
          <p>${homeEscape(pinned ? homeLocationLabel(checkout) : "Driver akan membuka rute Google Maps dari pin ini.")}</p>
          ${pinned && accuracy ? `<small>Akurasi sekitar ${Math.round(accuracy)} meter</small>` : ""}
        </div>
        <div class="customer-home-location-actions">
          <button class="self-order-secondary customer-home-location-btn" type="button" onclick="CustomerOrder.pinCurrentLocation()">${pinned ? "Perbarui Pin" : "Gunakan Lokasi Saya"}</button>
          ${mapsUrl ? `<a class="customer-home-maps-link" href="${homeEscape(mapsUrl)}" target="_blank" rel="noopener">Buka Google Maps</a>` : ""}
        </div>
      </section>
    `;
  }

  function homeRenderCheckout() {
    const checkout = homeCheckout();
    const method = checkout.method || "PICKUP_PREORDER";
    const fee = method === "DELIVERY" ? homeCalculateDeliveryFee(checkout) : 0;
    const subtotal = selfOrderSubtotal();
    const total = subtotal + fee;
    const slots = homePickupSlots();
    const pickupTime = checkout.pickupTime || slots[0] || "Secepatnya";
    if (method === "PICKUP_PREORDER" && checkout.pickupTime !== pickupTime) homeSetCheckout({ pickupTime });
    return `
      <main class="self-order-main payment customer-home-checkout">
        <div class="self-order-section-head">
          <div><span>${method === "DELIVERY" ? "Delivery" : "Ambil Sendiri"}</span><h3>Total ${homeMoney(total)}</h3></div>
        </div>
        <section class="self-order-payment-shell customer-home-checkout-shell">
          <div class="self-order-checkout">
            <section class="customer-home-service-strip ${method === "DELIVERY" ? "delivery" : "pickup"}">
              <span>${method === "DELIVERY" ? "Delivery" : "Pickup"}</span>
              <strong>${method === "DELIVERY" ? "Diantar ke pin lokasi" : "Ambil sesuai slot"}</strong>
              <small>${method === "DELIVERY" ? `Ongkir ${homeMoney(fee)}` : `Waktu ${homeEscape(pickupTime)}`}</small>
            </section>
            <div class="customer-home-field-grid">
              <label class="self-order-customer-field"><span>Nama</span><input id="customerHomeName" value="${homeInputValue("customerHomeName", "name")}" placeholder="Wajib" oninput="CustomerOrder.captureCheckout()" /></label>
              <label class="self-order-customer-field"><span>Nomor WhatsApp</span><input id="customerHomePhone" value="${homeInputValue("customerHomePhone", "phone")}" inputmode="tel" placeholder="08..." oninput="CustomerOrder.captureCheckout()" /></label>
            </div>
            ${method === "PICKUP_PREORDER" ? `
              <label class="wide"><span>Waktu Pengambilan</span>
                <div class="customer-home-slot-list">
                  ${slots.map(slot => `<button class="${slot === pickupTime ? "active" : ""}" type="button" onclick='CustomerOrder.setPickupTime(${JSON.stringify(slot)})'>${homeEscape(slot)}</button>`).join("")}
                </div>
              </label>
            ` : `
              ${homeRenderLocationPin(checkout)}
              <label class="wide"><span>Catatan untuk Driver</span><textarea id="customerHomeAddressNote" placeholder="Contoh: rumah pagar hitam, titip di pos satpam" oninput="CustomerOrder.captureCheckout()">${homeInputValue("customerHomeAddressNote", "addressNote")}</textarea></label>
            `}
            <label class="wide"><span>Catatan Pesanan</span><textarea id="customerHomeNote" placeholder="Opsional" oninput="CustomerOrder.captureCheckout()">${homeInputValue("customerHomeNote", "note")}</textarea></label>
          </div>
        </section>
        ${homeRenderReview({ method, subtotal, fee, total, pickupTime, checkout, compact: true })}
        <button class="self-order-primary self-order-finish" type="button" onclick="CustomerOrder.createWaitingPayment()" ${selfOrderSubmitting ? `disabled aria-busy="true"` : ""}>Lanjut ke Pembayaran</button>
        ${selfOrderSubmitError ? `<p class="self-order-submit-error" role="alert">${homeEscape(selfOrderSubmitError)}</p>` : ""}
      </main>
    `;
  }

  function homeRenderReview({ method, subtotal, fee, total, pickupTime, checkout }) {
    return `
      <section class="customer-home-review">
        <h4>${method === "DELIVERY" ? "Review Delivery" : "Review Ambil Sendiri"}</h4>
        <p>${homeEscape(checkout.name || "Nama belum diisi")}${method === "DELIVERY" ? ` · ${homeEscape(homeHasPinnedLocation(checkout) ? "Pin lokasi siap" : "Pin lokasi belum dipilih")}` : ""}</p>
        ${method === "PICKUP_PREORDER" ? `<div class="customer-home-review-row"><span>Waktu Ambil</span><strong>${homeEscape(pickupTime || checkout.pickupTime || "-")}</strong></div>` : ""}
        ${method === "DELIVERY" ? `<div class="customer-home-review-row"><span>Pin Lokasi</span><strong>${homeEscape(homeLocationLabel(checkout))}</strong></div>` : ""}
        <div class="customer-home-review-row"><span>Subtotal</span><strong>${homeMoney(subtotal)}</strong></div>
        ${method === "DELIVERY" ? `<div class="customer-home-review-row"><span>Biaya Pengantaran</span><strong>${homeMoney(fee)}</strong></div>` : ""}
        <div class="customer-home-total-row"><span>Total</span><strong>${homeMoney(total)}</strong></div>
      </section>
    `;
  }

  function homeValidateCheckout(checkout) {
    if (!String(checkout.name || "").trim()) return "Nama wajib diisi.";
    if (!String(checkout.phone || "").trim()) return "Nomor WhatsApp wajib diisi.";
    if (checkout.method === "PICKUP_PREORDER" && !String(checkout.pickupTime || "").trim()) return "Pilih waktu pengambilan.";
    if (checkout.method === "DELIVERY" && !homeHasPinnedLocation(checkout)) return "Pilih pin lokasi pengantaran.";
    return "";
  }

  async function homeCreateWaitingPayment() {
    if (selfOrderSubmitting) return;
    if (!state.cashSession.open) return toast("Kas belum dibuka. Minta bantuan staff.");
    if (!selfOrderCart.length) return toast("Keranjang masih kosong.");
    CustomerOrder.captureCheckout();
    const checkout = { method: "PICKUP_PREORDER", ...homeCheckout() };
    const validationError = homeValidateCheckout(checkout);
    if (validationError) {
      selfOrderSubmitError = validationError;
      render();
      return;
    }
    if (!canAttemptSupabaseSync()) {
      selfOrderSubmitError = "Pemesanan dari rumah membutuhkan koneksi internet. Periksa koneksi lalu coba lagi.";
      render();
      return;
    }
    let renderedCompletion = false;
    selfOrderSubmitError = "";
    selfOrderSubmitting = true;
    try {
      render();
      await new Promise(resolve => window.setTimeout(resolve, 0));
      const subtotal = selfOrderSubtotal();
      const deliveryFee = checkout.method === "DELIVERY" ? homeCalculateDeliveryFee(checkout) : 0;
      const total = subtotal + deliveryFee;
      const orderCreatedAt = await getSupabaseServerTimeIso();
      const prefix = checkout.method === "DELIVERY" ? "D" : "P";
      const number = homeGenerateNumber(prefix);
      const mapsUrl = homeGoogleMapsUrl(checkout);
      const latitude = homeCoordinate(checkout.latitude);
      const longitude = homeCoordinate(checkout.longitude);
      const noteParts = [
        checkout.note,
        checkout.method === "DELIVERY" ? `Pin lokasi: ${mapsUrl}` : "",
        checkout.addressNote ? `Catatan driver: ${checkout.addressNote}` : ""
      ].filter(Boolean);
      const orderItems = tagOrderBatchItems(selfOrderCart.map(item => ({ ...item })), 1, checkout.note || "", orderCreatedAt);
      const order = {
        id: uid(),
        number,
        source: "Self Order",
        type: checkout.method === "DELIVERY" ? "Delivery" : "Take Away",
        customerOrderType: checkout.method,
        orderMode: checkout.method,
        customerOrderStatus: "WAITING_PAYMENT",
        publicOrderToken: homeGenerateToken(),
        customer: checkout.name,
        customerPhone: checkout.phone,
        pickupTime: checkout.method === "PICKUP_PREORDER" ? checkout.pickupTime : "",
        deliveryAddress: checkout.method === "DELIVERY" ? "Pin lokasi Google Maps" : "",
        deliveryNote: checkout.method === "DELIVERY" ? checkout.addressNote : "",
        deliveryLocation: checkout.method === "DELIVERY" ? mapsUrl : "",
        deliveryLatitude: checkout.method === "DELIVERY" ? latitude : null,
        deliveryLongitude: checkout.method === "DELIVERY" ? longitude : null,
        serviceInfo: checkout.method === "DELIVERY" ? "Delivery" : `Pickup ${checkout.pickupTime}`,
        note: noteParts.join("\n"),
        status: "Pesanan Baru",
        paymentStatus: "Belum dibayar",
        paymentMethod: "QRIS",
        paymentProvider: homePaymentProvider(),
        paymentReference: "",
        receivedAmount: 0,
        changeAmount: 0,
        printReceipt: false,
        items: orderItems,
        subtotal,
        discount: 0,
        tax: 0,
        serviceFee: 0,
        deliveryFee,
        grandTotal: total,
        createdAt: orderCreatedAt,
        updatedAt: orderCreatedAt,
        confirmedAt: null,
        preparedAt: null,
        readyAt: null,
        completedAt: null,
        cancelledAt: null,
        preparedItems: {},
        pendingPushEventType: ""
      };
      PaymentService.createPayment(order);
      const stockValidation = validateLimitedStockItems(orderItems);
      if (!stockValidation.ok) {
        selfOrderSubmitError = limitedStockMessage(stockValidation.product, stockValidation.variantKey, stockValidation.available);
        return;
      }
      const stockCommit = await commitLimitedStockReservations(orderItems, order.number, "Self Order");
      if (!stockCommit.accepted) {
        const failedProduct = stockCommit.product || stockValidation.product;
        selfOrderSubmitError = limitedStockFailureMessage(failedProduct, stockCommit.variantKey || "", stockCommit);
        return;
      }
      order.limitedStockCommitToken = stockCommit.token || "";
      state.orders.unshift(order);
      saveState();
      const synced = await syncOrderToSupabase(order, { silent: true });
      if (!synced) {
        if (stockCommit.token) await restoreLimitedStockCommit(order.number);
        state.orders = state.orders.filter(item => item.id !== order.id);
        state.syncQueue = (state.syncQueue || []).filter(item => item.orderId !== orderSyncQueueId(order));
        saveState();
        selfOrderSubmitError = "Gagal membuat pesanan, cek koneksi lalu coba lagi.";
        return;
      }
      await homeSyncOrderExtras(order);
      audit("Customer order dibuat", `${order.number} ${order.customer} ${homeMoney(homeOrderTotal(order))}`);
      selfOrderCart = [];
      saveSelfOrderCart();
      sessionStorage.removeItem(HOME_CHECKOUT_KEY);
      sessionStorage.removeItem("self_order_customer");
      sessionStorage.removeItem("self_order_checkout_note");
      homeSaveActiveOrder(order);
      sessionStorage.setItem("customer_home_last_token", order.publicOrderToken);
      sessionStorage.setItem("self_order_step", "success");
      pushSelfOrderHistory("success");
      saveState();
      rotateLimitedStockReservationToken("Self Order");
      await loadMasterDataFromSupabase({ reason: "customer-home-submit", force: true, silent: true });
      broadcastRealtimeEvent("orders");
      broadcastRealtimeEvent("products");
      render();
      renderedCompletion = true;
    } catch (error) {
      console.error("Customer order submit failed", error);
      selfOrderSubmitError = error?.userMessage || "Gagal membuat pesanan, cek koneksi lalu coba lagi.";
    } finally {
      selfOrderSubmitting = false;
      if (!renderedCompletion) render();
    }
  }

  async function homeSyncOrderExtras(order) {
    if (!order?.supabaseId || !supabaseReadable()) return false;
    const payload = {
      customer_order_type: homeOrderKind(order),
      customer_order_status: order.customerOrderStatus || "",
      customer_phone: order.customerPhone || "",
      pickup_time: order.pickupTime || null,
      delivery_address: order.deliveryAddress || "",
      delivery_note: order.deliveryNote || "",
      delivery_location: order.deliveryLocation || "",
      delivery_latitude: order.deliveryLatitude,
      delivery_longitude: order.deliveryLongitude,
      payment_provider: order.paymentProvider || "",
      payment_reference: order.paymentReference || "",
      public_order_token: order.publicOrderToken || "",
      driver_id: order.driverId || ""
    };
    let nextPayload = { ...payload };
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { error } = await supabaseClient.from("orders").update(nextPayload).eq("id", order.supabaseId);
      if (!error) return true;
      if (!isSupabaseMissingRelationOrColumnError(error)) {
        console.warn("Customer order extra sync failed", error);
        return false;
      }
      const column = typeof missingSchemaColumnName === "function" ? missingSchemaColumnName(error) : "";
      if (column && Object.prototype.hasOwnProperty.call(nextPayload, column)) {
        delete nextPayload[column];
        continue;
      }
      return false;
    }
    return false;
  }

  function homeCustomerStatus(order) {
    if (!homeIsPaid(order)) return "WAITING_PAYMENT";
    const stored = String(order.customerOrderStatus || "").trim();
    if (stored && stored !== "WAITING_PAYMENT") return stored;
    if (homeOrderKind(order) === "DELIVERY") return "SEARCHING_DRIVER";
    return String(order.pickupTime || "").toLowerCase() === "secepatnya" ? "PREPARING" : "SCHEDULED";
  }

  async function homeMarkPaid() {
    const order = homeCurrentOrder();
    if (!order || !homeIsDevelopmentPayment()) return;
    const now = new Date().toISOString();
    order.paymentStatus = "Lunas";
    order.paymentMethod = "Mock QRIS";
    order.paymentProvider = homePaymentProvider();
    order.paymentReference = order.paymentReference || `MOCK-${order.number}`;
    order.paymentBreakdown = { QRIS: homeOrderTotal(order), Mock: homeOrderTotal(order) };
    order.paidAt = now;
    order.confirmedAt = now;
    order.updatedAt = now;
    order.customerOrderStatus = homeOrderKind(order) === "DELIVERY"
      ? "SEARCHING_DRIVER"
      : (String(order.pickupTime || "").toLowerCase() === "secepatnya" ? "PREPARING" : "SCHEDULED");
    order.pendingPushEventType = homeCustomerStatus(order) === "SCHEDULED" || homeCustomerStatus(order) === "SEARCHING_DRIVER" ? "" : "new_order";
    saveState();
    await syncOrderToSupabase(order, { silent: true });
    await homeSyncOrderExtras(order);
    broadcastRealtimeEvent("orders");
    render();
  }

  async function homeSetStatus(status) {
    const order = homeCurrentOrder();
    if (!order || !homeIsDevelopmentPayment()) return;
    const now = new Date().toISOString();
    order.customerOrderStatus = status;
    order.updatedAt = now;
    if (status === "DRIVER_ASSIGNED") {
      order.driverId = "MOCK_DRIVER";
      order.driverName = HOME_CONFIG.driverName;
      order.driverWhatsapp = HOME_CONFIG.driverWhatsapp;
      order.status = "Pesanan Baru";
      order.pendingPushEventType = "new_order";
    }
    if (status === "PREPARING") {
      order.status = "Sedang Disiapkan";
      order.preparedAt = order.preparedAt || now;
      order.pendingPushEventType = order.pendingPushEventType || "new_order";
    }
    if (status === "READY" || status === "READY_FOR_PICKUP") {
      order.status = "Siap Diambil";
      order.readyAt = order.readyAt || now;
    }
    if (status === "DELIVERING") order.status = "Siap Diambil";
    if (status === "COMPLETED") {
      order.status = "Selesai";
      order.completedAt = order.completedAt || now;
    }
    saveState();
    await syncOrderToSupabase(order, { silent: true });
    await homeSyncOrderExtras(order);
    broadcastRealtimeEvent("orders");
    render();
  }

  function homeStatusLabel(order) {
    const status = homeCustomerStatus(order);
    const labels = {
      WAITING_PAYMENT: "Menunggu Pembayaran",
      SCHEDULED: "Pesanan Dijadwalkan",
      SEARCHING_DRIVER: "Mencari Driver",
      NO_DRIVER_AVAILABLE: "Mencari Driver",
      DRIVER_ASSIGNED: "Driver Ditemukan",
      PREPARING: "Sedang Disiapkan",
      READY: "Siap Diambil",
      READY_FOR_PICKUP: "Siap Diambil Driver",
      PICKED_UP: "Diambil Driver",
      DELIVERING: "Dalam Perjalanan",
      COMPLETED: "Selesai",
      PAYMENT_EXPIRED: "Pembayaran Kedaluwarsa"
    };
    return labels[status] || status || "-";
  }

  function homeProgress(order) {
    const status = homeCustomerStatus(order);
    const delivery = homeOrderKind(order) === "DELIVERY";
    const steps = delivery
      ? [
        ["WAITING_PAYMENT", "Pembayaran berhasil"],
        ["SEARCHING_DRIVER", "Mencari driver"],
        ["DRIVER_ASSIGNED", "Driver ditemukan"],
        ["PREPARING", "Pesanan disiapkan"],
        ["READY_FOR_PICKUP", "Siap diambil driver"],
        ["DELIVERING", "Dalam perjalanan"],
        ["COMPLETED", "Selesai"]
      ]
      : [
        ["WAITING_PAYMENT", "Pesanan dikonfirmasi"],
        ["SCHEDULED", "Pesanan dijadwalkan"],
        ["PREPARING", "Sedang disiapkan"],
        ["READY", "Siap diambil"],
        ["COMPLETED", "Selesai"]
      ];
    const activeIndex = Math.max(0, steps.findIndex(([id]) => id === status));
    return `
      <div class="customer-home-progress">
        ${steps.map(([id, label], index) => {
          const done = homeIsPaid(order) && index < activeIndex;
          const active = homeIsPaid(order) ? index === activeIndex : index === 0;
          return `<span class="${done ? "done" : active ? "active" : ""}"><i>${done ? "✓" : active ? "●" : "○"}</i><b>${homeEscape(label)}</b></span>`;
        }).join("")}
      </div>
    `;
  }

  function homePaymentPage(order) {
    const payment = PaymentService.createPayment(order);
    return `
      <section class="customer-home-payment-card">
        <h3>Selesaikan Pembayaran</h3>
        <strong class="customer-home-order-code">${homeEscape(order.number || "-")}</strong>
        <div class="customer-home-total-row"><span>Total Pembayaran</span><strong>${homeMoney(payment.amount)}</strong></div>
        ${PaymentQRCode(payment)}
        <p>Menunggu pembayaran...</p>
        ${homeIsDevelopmentPayment() ? `
          <div class="customer-home-dev-panel">
            <small>Development mock payment</small>
            <button class="self-order-primary" type="button" onclick="CustomerOrder.mockPaymentSuccess()">Simulasi Pembayaran Berhasil</button>
          </div>
        ` : ""}
      </section>
    `;
  }

  function homeDriverCard(order) {
    if (homeOrderKind(order) !== "DELIVERY" || !["DRIVER_ASSIGNED", "PREPARING", "READY_FOR_PICKUP", "PICKED_UP", "DELIVERING", "COMPLETED"].includes(homeCustomerStatus(order))) return "";
    const driverName = order.driverName || HOME_CONFIG.driverName;
    const phone = String(order.driverWhatsapp || HOME_CONFIG.driverWhatsapp || "").replace(/[^0-9]/g, "");
    const text = encodeURIComponent(`Halo Kak ${driverName}, saya customer pesanan ${order.number}.`);
    return `
      <div class="customer-home-driver-card">
        <strong>Driver ditemukan</strong>
        <span>${homeEscape(driverName)} · Driver Delivery</span>
        ${phone ? `<a href="https://wa.me/${homeEscape(phone)}?text=${text}" target="_blank" rel="noopener">Chat via WhatsApp</a>` : ""}
      </div>
    `;
  }

  function homeDevStatusButtons(order) {
    if (!homeIsDevelopmentPayment() || !homeIsPaid(order)) return "";
    const delivery = homeOrderKind(order) === "DELIVERY";
    const buttons = delivery
      ? [
        ["DRIVER_ASSIGNED", "Simulasi Driver Ditemukan"],
        ["PREPARING", "Simulasi Dapur Proses"],
        ["READY_FOR_PICKUP", "Siap Diambil Driver"],
        ["DELIVERING", "Dalam Perjalanan"],
        ["COMPLETED", "Selesai"]
      ]
      : [
        ["PREPARING", "Simulasi Mulai Disiapkan"],
        ["READY", "Siap Diambil"],
        ["COMPLETED", "Selesai"]
      ];
    return `
      <div class="customer-home-dev-panel">
        <small>Development status simulator</small>
        ${buttons.map(([status, label]) => `<button class="self-order-secondary" type="button" onclick="CustomerOrder.setStatus('${status}')">${homeEscape(label)}</button>`).join("")}
      </div>
    `;
  }

  function homeRenderStatus() {
    const order = homeCurrentOrder();
    if (!order) return homeRenderOrdersList();
    const paid = homeIsPaid(order);
    const kind = homeOrderKind(order);
    const status = homeCustomerStatus(order);
    const nextText = !paid
      ? "Order belum masuk dapur sebelum pembayaran berhasil."
      : kind === "DELIVERY"
        ? (status === "SEARCHING_DRIVER" || status === "NO_DRIVER_AVAILABLE" ? "Sedang mencarikan driver yang tersedia untuk pesanan Anda." : homeStatusLabel(order))
        : (status === "SCHEDULED" ? `Akan disiapkan menjelang pukul ${homeEscape(order.pickupTime || "-")}.` : homeStatusLabel(order));
    return `
      <main class="self-order-main success customer-home-status">
        <section class="customer-home-tracking-card">
          <h3>Pesanan ${homeEscape(order.number || "-")}</h3>
          <strong>${paid ? "Pembayaran berhasil" : "Menunggu Pembayaran"}</strong>
          <p>${homeEscape(nextText)}</p>
          <div class="self-order-success-detail">
            <span><b>Layanan</b><strong>${kind === "DELIVERY" ? "Delivery" : "Ambil Sendiri"}</strong></span>
            ${kind === "PICKUP_PREORDER" ? `<span><b>Waktu Pengambilan</b><strong>${homeEscape(order.pickupTime || "-")}</strong></span>` : ""}
            ${kind === "DELIVERY" ? `<span><b>Pin Lokasi</b><strong>${order.deliveryLocation ? `<a class="customer-home-inline-map" href="${homeEscape(order.deliveryLocation)}" target="_blank" rel="noopener">Buka Google Maps</a>` : "-"}</strong></span>` : ""}
            <span><b>Status</b><strong>${homeEscape(homeStatusLabel(order))}</strong></span>
            <span><b>Total</b><strong>${homeMoney(homeOrderTotal(order))}</strong></span>
          </div>
          ${paid ? "" : homePaymentPage(order)}
          ${homeDriverCard(order)}
          ${homeProgress(order)}
          ${homeDevStatusButtons(order)}
          <button class="self-order-primary" type="button" onclick="CustomerOrder.startNewOrder()">Pesan Lagi</button>
        </section>
      </main>
    `;
  }

  function homeRenderOrdersList() {
    const orders = homeActiveOrders();
    return `
      <main class="self-order-main success">
        <section class="customer-home-tracking-card">
          <h3>Pesanan Aktif</h3>
          <div class="customer-home-active-list">
            ${orders.map(order => `
              <article class="customer-home-active-card">
                <strong>${homeEscape(order.number || "-")} · ${homeEscape(homeStatusLabel(order))}</strong>
                <span>${homeEscape(homeOrderKind(order) === "DELIVERY" ? "Delivery" : "Ambil Sendiri")} · ${homeMoney(homeOrderTotal(order))}</span>
                <button class="self-order-primary" type="button" onclick="CustomerOrder.openStatus('${homeEscape(order.publicOrderToken || "")}')">Lihat Status</button>
              </article>
            `).join("") || empty("Belum ada pesanan aktif di perangkat ini.")}
          </div>
        </section>
      </main>
    `;
  }

  async function homeRefreshActiveOrderFromSupabase(options = {}) {
    if (!homeIsMode() || homeStatusRefreshLoading || !supabaseReadable()) return false;
    const order = homeCurrentOrder();
    if (!order?.number) return false;
    const now = Date.now();
    if (!options.force && now - homeStatusRefreshAt < HOME_STATUS_REFRESH_MS) return false;
    homeStatusRefreshLoading = true;
    homeStatusRefreshAt = now;
    try {
      const { data: orderRows, error: orderError } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("order_number", order.number)
        .limit(1);
      if (orderError) throw orderError;
      const orderRow = (orderRows || [])[0];
      if (!orderRow?.id) return false;
      const [itemsResult, paymentsResult] = await Promise.all([
        supabaseClient.from("order_items").select("*").eq("order_id", orderRow.id).order("id", { ascending: true }),
        supabaseClient.from("payments").select("*").eq("order_id", orderRow.id).order("paid_at", { ascending: false }).limit(1)
      ]);
      if (itemsResult.error) throw itemsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      const liveOrder = normalizeSupabaseLiveOrder(orderRow, itemsResult.data || [], new Map(), (paymentsResult.data || [])[0] || null);
      Object.assign(liveOrder, {
        customerOrderType: order.customerOrderType,
        orderMode: order.orderMode,
        customerOrderStatus: order.customerOrderStatus,
        publicOrderToken: order.publicOrderToken,
        customerPhone: order.customerPhone,
        pickupTime: order.pickupTime,
        deliveryAddress: order.deliveryAddress,
        deliveryNote: order.deliveryNote,
        deliveryLocation: order.deliveryLocation,
        deliveryLatitude: order.deliveryLatitude,
        deliveryLongitude: order.deliveryLongitude,
        driverId: order.driverId,
        driverName: order.driverName,
        driverWhatsapp: order.driverWhatsapp,
        paymentProvider: order.paymentProvider,
        paymentReference: order.paymentReference
      });
      mergeSupabaseLiveOrders([liveOrder]);
      saveState();
      render();
      return true;
    } catch (error) {
      console.warn("Customer order status refresh failed", error);
      return false;
    } finally {
      homeStatusRefreshLoading = false;
    }
  }

  function homeStartNewOrder() {
    sessionStorage.removeItem("customer_home_last_token");
    sessionStorage.removeItem(HOME_CHECKOUT_KEY);
    sessionStorage.setItem("self_order_step", "menu");
    selfOrderCart = [];
    saveSelfOrderCart();
    pushSelfOrderHistory("menu");
    render();
  }

  function homeInstall() {
    homePrimeMode();

    const baseRenderSelfOrderTopbar = renderSelfOrderTopbar;
    renderSelfOrderTopbar = function () {
      return homeIsMode() ? homeRenderTopbar() : baseRenderSelfOrderTopbar();
    };

    const baseRenderSelfOrderCart = renderSelfOrderCart;
    renderSelfOrderCart = function () {
      return homeIsMode() ? homeRenderCart() : baseRenderSelfOrderCart();
    };

    const baseRenderSelfOrderPayment = renderSelfOrderPayment;
    renderSelfOrderPayment = function () {
      return homeIsMode() ? homeRenderCheckout() : baseRenderSelfOrderPayment();
    };

    const baseRenderSelfOrderSuccess = renderSelfOrderSuccess;
    renderSelfOrderSuccess = function () {
      return homeIsMode() ? homeRenderStatus() : baseRenderSelfOrderSuccess();
    };

    const baseSelfOrderShowPayment = selfOrderShowPayment;
    selfOrderShowPayment = async function () {
      if (!homeIsMode()) return baseSelfOrderShowPayment();
      if (!selfOrderCart.length) return toast("Keranjang masih kosong.");
      const stockReady = await ensureLimitedStockCartReservations(selfOrderCart, "Self Order");
      if (!stockReady.ok) return toast(limitedStockFailureMessage(stockReady.product, stockReady.variantKey, stockReady));
      CustomerOrder.captureCheckout();
      sessionStorage.setItem("self_order_step", "payment");
      pushSelfOrderHistory("payment");
      render();
    };

    const baseSelfOrderCreateOrder = selfOrderCreateOrder;
    selfOrderCreateOrder = async function () {
      return homeIsMode() ? homeCreateWaitingPayment() : baseSelfOrderCreateOrder();
    };

    const baseRenderSelfOrderBottomNav = renderSelfOrderBottomNav;
    renderSelfOrderBottomNav = function (step) {
      if (!homeIsMode()) return baseRenderSelfOrderBottomNav(step);
      const navStep = step === "success" ? "orders" : step;
      const items = [
        ["menu", "Menu", "selfOrderShowMenu()"],
        ["cart", "Keranjang", "selfOrderShowCart()"],
        ["orders", "Pesanan", "CustomerOrder.showOrders()"]
      ];
      return `
        <nav class="self-order-bottom-nav">
          ${items.map(([id, label, action]) => `
            <button class="${navStep === id ? "active" : ""}" type="button" onclick="${action}">
              ${id === "orders" ? `<span class="self-order-nav-icon payment-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M14 9h20l5 6v24H9V9h5Z"/><path d="M15 20h18M15 27h18M15 34h11"/></svg><i></i></span>` : selfOrderTabIcon(id)}
              <span>${homeEscape(label)}</span>
            </button>
          `).join("")}
        </nav>
      `;
    };

    if (typeof kitchenOrderIsVisible === "function") {
      const baseKitchenOrderIsVisible = kitchenOrderIsVisible;
      kitchenOrderIsVisible = function (order, filter, visibleStatuses) {
        if (homeIsOrder(order) && (!homeIsPaid(order) || ["SCHEDULED", "SEARCHING_DRIVER", "NO_DRIVER_AVAILABLE"].includes(homeCustomerStatus(order)))) return false;
        return baseKitchenOrderIsVisible(order, filter, visibleStatuses);
      };
    }

    if (typeof kitchenOrderHasSequence === "function") {
      const baseKitchenOrderHasSequence = kitchenOrderHasSequence;
      kitchenOrderHasSequence = function (order) {
        if (homeIsOrder(order) && (!homeIsPaid(order) || ["SCHEDULED", "SEARCHING_DRIVER", "NO_DRIVER_AVAILABLE"].includes(homeCustomerStatus(order)))) return false;
        return baseKitchenOrderHasSequence(order);
      };
    }

    const baseOrderPushNotificationCategories = orderPushNotificationCategories;
    orderPushNotificationCategories = function (order = {}) {
      if (homeIsOrder(order) && (!homeIsPaid(order) || ["SCHEDULED", "SEARCHING_DRIVER", "NO_DRIVER_AVAILABLE"].includes(homeCustomerStatus(order)))) return [];
      return baseOrderPushNotificationCategories(order);
    };

    const baseNotifyNativePushForOrder = notifyNativePushForOrder;
    notifyNativePushForOrder = async function (order, options = {}) {
      if (homeIsOrder(order) && (!homeIsPaid(order) || ["SCHEDULED", "SEARCHING_DRIVER", "NO_DRIVER_AVAILABLE"].includes(homeCustomerStatus(order)))) return false;
      return baseNotifyNativePushForOrder(order, options);
    };

    if (typeof detectNewIncomingOrders === "function") {
      const baseDetectNewIncomingOrders = detectNewIncomingOrders;
      detectNewIncomingOrders = function (orders = [], previousKeys = orderNotificationKnownKeys) {
        return baseDetectNewIncomingOrders(orders, previousKeys)
          .filter(order => !homeIsOrder(order) || (homeIsPaid(order) && !["SCHEDULED", "SEARCHING_DRIVER", "NO_DRIVER_AVAILABLE"].includes(homeCustomerStatus(order))));
      };
    }

    const baseOrderDisplayTitle = orderDisplayTitle;
    orderDisplayTitle = function (order) {
      if (!homeIsOrder(order)) return baseOrderDisplayTitle(order);
      const prefix = homeOrderKind(order) === "DELIVERY" ? "DELIVERY" : "PICKUP";
      return `${prefix} · ${order.number || "-"}${order.customer ? ` - ${order.customer}` : ""}`;
    };

    const baseCompactOrderStatus = compactOrderStatus;
    compactOrderStatus = function (status) {
      if (["Mencari Driver", "Driver Ditemukan", "Pesanan Dijadwalkan"].includes(status)) return { label: status, className: "ready" };
      return baseCompactOrderStatus(status);
    };

    window.CustomerOrder = {
      isMode: homeIsMode,
      isOrder: homeIsOrder,
      setMethod(method) {
        homeSetCheckout({ method });
        render();
      },
      setPickupTime(time) {
        homeSetCheckout({ pickupTime: time });
        render();
      },
      captureCheckout() {
        const patch = {
          name: String(document.getElementById("customerHomeName")?.value || homeCheckout().name || "").trim(),
          phone: String(document.getElementById("customerHomePhone")?.value || homeCheckout().phone || "").trim(),
          addressNote: String(document.getElementById("customerHomeAddressNote")?.value || homeCheckout().addressNote || "").trim(),
          note: String(document.getElementById("customerHomeNote")?.value || homeCheckout().note || "").trim()
        };
        homeSetCheckout(patch);
      },
      pinCurrentLocation() {
        if (!navigator.geolocation) {
          selfOrderSubmitError = "Browser belum mendukung pin lokasi otomatis.";
          render();
          return;
        }
        selfOrderSubmitError = "";
        homeSetCheckout({ locationStatus: "loading" });
        render();
        navigator.geolocation.getCurrentPosition(position => {
          const latitude = Number(position.coords.latitude);
          const longitude = Number(position.coords.longitude);
          homeSetCheckout({
            latitude,
            longitude,
            location: `https://www.google.com/maps?q=${latitude},${longitude}`,
            locationAccuracy: Number(position.coords.accuracy || 0),
            locationPinnedAt: new Date().toISOString(),
            locationStatus: "ready"
          });
          selfOrderSubmitError = "";
          render();
        }, error => {
          homeSetCheckout({ locationStatus: "error" });
          selfOrderSubmitError = error?.code === 1
            ? "Izin lokasi ditolak. Aktifkan izin lokasi browser lalu coba lagi."
            : "Gagal mengambil lokasi. Coba lagi di area dengan sinyal GPS lebih baik.";
          render();
        }, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        });
      },
      createWaitingPayment: homeCreateWaitingPayment,
      mockPaymentSuccess: homeMarkPaid,
      setStatus: homeSetStatus,
      showOrders() {
        sessionStorage.setItem("self_order_step", "success");
        sessionStorage.removeItem("customer_home_last_token");
        pushSelfOrderHistory("success");
        render();
      },
      openStatus(token) {
        sessionStorage.setItem("customer_home_last_token", token);
        sessionStorage.setItem("self_order_step", "success");
        pushSelfOrderHistory("success");
        render();
      },
      startNewOrder: homeStartNewOrder,
      PaymentService
    };

    if (homeIsMode() && (IS_SELF_ORDER_APP || view === "selforder")) {
      window.setTimeout(() => render(), 0);
    }

    if (!window.__customerHomeStatusRefreshTimer) {
      window.__customerHomeStatusRefreshTimer = window.setInterval(homeRefreshActiveOrderFromSupabase, HOME_STATUS_REFRESH_MS);
      window.setTimeout(() => homeRefreshActiveOrderFromSupabase({ force: true }), 1600);
    }
  }

  if (typeof renderSelfOrderTopbar === "function") {
    homeInstall();
  } else {
    window.addEventListener("load", homeInstall, { once: true });
  }
}());

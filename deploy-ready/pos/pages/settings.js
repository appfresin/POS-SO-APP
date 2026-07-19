// Page renderer extracted from app.js. Depends on shared helpers/globals in app.js.

const SETTINGS_TABS = [
  { id: "data", label: "Data" },
  { id: "notifications", label: "Notifikasi" },
  { id: "selforder", label: "Self Order" },
  { id: "receipt", label: "Struk" },
  { id: "printer", label: "Printer" },
  { id: "staff", label: "Staff" }
];

const LIMITED_SETTINGS_TAB_IDS = ["notifications", "receipt", "printer"];

function allowedSettingsTabs() {
  return activeRole() === "owner" ? SETTINGS_TABS : SETTINGS_TABS.filter(tab => LIMITED_SETTINGS_TAB_IDS.includes(tab.id));
}

function renderSettings() {
  const tabs = allowedSettingsTabs();
  const activeTab = tabs.some(tab => tab.id === settingsTab) ? settingsTab : tabs[0]?.id;
  return `
    <div class="settings-tabs">
      ${tabs.map(tab => `
        <button class="${activeTab === tab.id ? "active" : ""}" type="button" onclick="setSettingsTab('${tab.id}')">${tab.label}</button>
      `).join("")}
    </div>
    <div class="settings-tab-body">
      ${activeTab === "receipt" ? renderReceiptSettingsTab() : ""}
      ${activeTab === "notifications" ? renderNotificationSettingsTab() : ""}
      ${activeTab === "selforder" ? renderSelfOrderSettingsTab() : ""}
      ${activeTab === "printer" ? renderPrinterSettingsTab() : ""}
      ${activeTab === "data" ? renderDataSettingsTab() : ""}
      ${activeTab === "staff" ? renderStaffSettingsTab() : ""}
    </div>
  `;
}

function renderNotificationSettingsTab() {
  const settings = state.settings;
  const volume = Math.max(0, Math.min(100, Number(settings.orderNotificationVolume || 70)));
  const tone = settings.orderNotificationTone || "bell";
  const toneOptions = [
    ["bell", "Bell"],
    ["chime", "Chime"],
    ["alert", "Alert"],
    ["soft", "Soft"]
  ];
  const browserStatus = !("Notification" in window)
    ? "Browser belum mendukung notifikasi."
    : Notification.permission === "granted"
      ? "Izin browser aktif."
      : Notification.permission === "denied"
        ? "Izin browser diblokir dari pengaturan browser."
        : "Izin browser akan diminta saat tombol test atau halaman dipakai.";
  return `
    <section class="settings-panel settings-single-panel notification-settings-panel">
      <div class="section-title">
        <div><h3>Notifikasi</h3><p>Atur bunyi dan peringatan pesanan baru untuk kasir dan dapur.</p></div>
      </div>
      <form class="notification-settings-form" onsubmit="saveNotificationSettings(event)">
        <div class="notification-status-card">
          <strong>Pesanan baru</strong>
          <span>${escapeHtml(browserStatus)}</span>
        </div>
        <div class="notification-switch-list">
          ${receiptSwitch("orderNotificationsEnabled", "Aktifkan notifikasi pesanan baru", settings.orderNotificationsEnabled !== false)}
          ${receiptSwitch("orderNotificationSound", "Bunyikan nada pesanan baru", settings.orderNotificationSound !== false)}
          ${receiptSwitch("orderNotificationBrowser", "Tampilkan notifikasi browser", settings.orderNotificationBrowser !== false)}
          ${receiptSwitch("orderNotificationKitchen", "Aktif di halaman Dapur", settings.orderNotificationKitchen !== false)}
          ${receiptSwitch("orderNotificationOrders", "Aktif di halaman Pesanan", settings.orderNotificationOrders !== false)}
        </div>
        <div class="notification-sound-grid">
          <label class="notification-tone-row">
            <span>Jenis nada</span>
            <select name="orderNotificationTone">
              ${toneOptions.map(([value, label]) => `<option value="${value}" ${tone === value ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </label>
          <label class="notification-volume-row">
            <span>Volume nada</span>
            <input name="orderNotificationVolume" type="range" min="0" max="100" value="${volume}" oninput="this.nextElementSibling.textContent = this.value + '%'" />
            <b>${volume}%</b>
          </label>
        </div>
        <div class="receipt-action-row notification-action-row">
          <button class="btn" type="button" onclick="testOrderNotification(this)">Test nada</button>
          <button class="btn accent settings-save-btn" type="submit">Simpan Notifikasi</button>
        </div>
      </form>
    </section>
  `;
}

function renderSelfOrderSettingsPreview() {
  const slides = readSelfOrderPromoSlidesFromSettings({ allowTemporary: true }).map(slide => ({
    image: typeof resolveSelfOrderPromoSlideImage === "function" ? (normalizePersistedImageUrl(slide?.image, { allowTemporary: true }) || resolveSelfOrderPromoSlideImage(slide)) : (slide?.image || ""),
    productId: slide?.productId || "",
    label: slide?.label || "Order Now"
  }));
  const previewSlides = slides.length ? slides : [{
    image: normalizePersistedImageUrl(state.settings.selfOrderPromoImageDataUrl || "", { allowTemporary: true }),
    productId: state.settings.selfOrderPromoTargetProductId || "",
    label: state.settings.selfOrderPromoButtonLabel || "Order Now"
  }];
  const requestedIndex = Number(sessionStorage.getItem("self_order_settings_preview_slide") || 0) || 0;
  const activeIndex = Math.min(Math.max(0, requestedIndex), Math.max(0, previewSlides.length - 1));
  const activeSlide = previewSlides[activeIndex] || previewSlides[0] || { label: "Order Now" };
  const label = String(activeSlide.label || "Order Now").trim() || "Order Now";
  const hasImage = previewSlides.some(slide => String(slide.image || "").trim());
  const fallbackImage = String(previewSlides.find(slide => String(slide.image || "").trim())?.image || "").trim();
  return `
    <section class="self-order-settings-preview" aria-label="Preview badge self order">
      <section class="self-order-promo ${hasImage ? "has-image" : "is-empty"}" data-active-index="${activeIndex}" data-slide-count="${previewSlides.length}" aria-label="Preview badge promosi">
        ${selfOrderPromoFrameMarkup(activeSlide, activeIndex, fallbackImage, { allowTemporary: true, altPrefix: "Preview badge self order" })}
        <button class="self-order-promo-cta" type="button" aria-disabled="true">${escapeHtml(label)}<i aria-hidden="true"></i></button>
        ${previewSlides.length > 1 ? `
          <button class="self-order-promo-nav prev" type="button" onclick="settingsSelfOrderShiftPreviewSlide(-1)" aria-label="Promo sebelumnya"></button>
          <button class="self-order-promo-nav next" type="button" onclick="settingsSelfOrderShiftPreviewSlide(1)" aria-label="Promo berikutnya"></button>
        ` : ""}
        ${previewSlides.length > 1 ? `<div class="self-order-promo-dots">${previewSlides.map((_, index) => `<button class="${index === activeIndex ? "active" : ""}" type="button" onclick="settingsSelfOrderSetPreviewSlide(${index})" aria-label="Promo ${index + 1}"></button>`).join("")}</div>` : ""}
      </section>
    </section>
  `;
}

function settingsSelfOrderSetPreviewSlide(index) {
  const slides = readSelfOrderPromoSlidesFromSettings({ allowTemporary: true });
  const count = Math.max(1, slides.length || 1);
  const nextIndex = Math.min(Math.max(0, Number(index) || 0), count - 1);
  sessionStorage.setItem("self_order_settings_preview_slide", String(nextIndex));
  settingsSelfOrderApplyPreviewSlide(nextIndex, slides);
}

function settingsSelfOrderApplyPreviewSlide(index, slidesInput) {
  const slides = Array.isArray(slidesInput) && slidesInput.length ? slidesInput : readSelfOrderPromoSlidesFromSettings({ allowTemporary: true });
  const preview = document.querySelector(".self-order-settings-preview .self-order-promo");
  if (!preview) return;
  const nextIndex = Math.min(Math.max(0, Number(index) || 0), Math.max(0, slides.length - 1));
  selfOrderApplyPromoSlideToElement(preview, slides, nextIndex, { allowTemporary: true, altPrefix: "Preview badge self order", ctaDisabled: true });
}

function settingsSelfOrderShiftPreviewSlide(direction) {
  const slides = readSelfOrderPromoSlidesFromSettings({ allowTemporary: true });
  if (slides.length < 2) return;
  const currentIndex = Number(sessionStorage.getItem("self_order_settings_preview_slide") || 0) || 0;
  settingsSelfOrderSetPreviewSlide((currentIndex + Number(direction || 0) + slides.length) % slides.length);
}

function selfOrderUploadButtonState(key) {
  const status = (typeof selfOrderUploadStatuses !== "undefined" ? selfOrderUploadStatuses?.[key] : null) || {};
  if (status.status === "uploading") return { label: status.message || "Mengupload...", className: "is-uploading", disabled: "disabled" };
  if (status.status === "success") return { label: status.message || "Berhasil upload", className: "is-success", disabled: "" };
  if (status.status === "error") return { label: status.message || "Gagal upload", className: "is-error", disabled: "" };
  return { label: "Upload", className: "", disabled: "" };
}

function renderSelfOrderSettingsTab() {
  const settings = state.settings;
  const activeProducts = state.products.filter(product => product.active && !product.soldOut);
  const slides = readSelfOrderPromoSlidesFromSettings({ allowTemporary: true }).map(slide => ({
    image: normalizePersistedImageUrl(slide?.image, { allowTemporary: true }) || (typeof resolveSelfOrderPromoSlideImage === "function" ? resolveSelfOrderPromoSlideImage(slide) : ""),
    productId: slide?.productId || "",
    label: slide?.label || "Order Now"
  }));
  const profileImage = String(settings.selfOrderProfileImageDataUrl || settings.receiptLogoDataUrl || "").trim();
  const profileUpload = selfOrderUploadButtonState("profile");
  return `
    <section class="settings-panel settings-single-panel self-order-admin-panel">
      <div class="section-title">
        <div><h3>Self Order</h3><p>Atur identitas aplikasi dan slide promo yang tampil ke pelanggan.</p></div>
      </div>
      <form class="self-order-admin-form" onsubmit="saveSelfOrderSettings(event)">
        <div class="self-order-identity-card">
          <div class="self-order-profile-preview">
            ${profileImage ? mediaImageTag(profileImage, "Foto profil self order", "", 320) : `<span>${navIcon("selforder")}</span>`}
          </div>
          <div class="settings-form-grid">
            <div class="field"><label>Nama aplikasi</label><input class="input" name="selfOrderAppName" value="${escapeHtml(settings.selfOrderAppName || settings.receiptStoreName || "")}" placeholder="Fresin Indonesia" /></div>
            <div class="field"><label>Nama outlet</label><input class="input" name="selfOrderOutletName" value="${escapeHtml(settings.selfOrderOutletName || state.outlet || "")}" placeholder="Outlet Utama" /></div>
            <div class="field">
              <label>Foto profil</label>
              <label class="btn report-import-btn self-order-upload-btn ${profileUpload.className}">
                ${escapeHtml(profileUpload.label)}
                <input type="file" accept="image/*" onchange="uploadSelfOrderProfileImage(this)" ${profileUpload.disabled} hidden />
              </label>
              <input type="hidden" name="selfOrderProfileImageDataUrl" value="${escapeHtml(settings.selfOrderProfileImageDataUrl || "")}" />
            </div>
          </div>
        </div>
        <div class="self-order-admin-preview">
          ${renderSelfOrderSettingsPreview()}
        </div>
        <div class="settings-form-stack self-order-slide-list">
          <div class="self-order-slide-toolbar">
            <strong>Badge promosi</strong>
            <button class="btn" type="button" onclick="addSelfOrderPromoSlide()" ${slides.length >= 4 ? "disabled" : ""}>Tambah badge</button>
          </div>
          ${slides.map((slide, index) => `
            <article class="self-order-slide-row" data-self-order-slide-row>
              <div class="self-order-slide-preview">
                ${slide.image ? mediaImageTag(slide.image, `Badge promo ${index + 1}`, "", 360) : `<span>Badge ${index + 1}</span>`}
              </div>
              <div class="field">
                <label>Foto badge ${index + 1}</label>
                ${(() => {
                  const upload = selfOrderUploadButtonState(`promo-${index}`);
                  return `<label class="btn report-import-btn self-order-upload-btn ${upload.className}">
                    ${escapeHtml(upload.label)}
                    <input type="file" accept="image/*" onchange="uploadSelfOrderPromoImage(this, ${index})" ${upload.disabled} hidden />
                  </label>`;
                })()}
              </div>
              <div class="field">
                <label>Produk tujuan</label>
                <select name="selfOrderPromoTargetProductId_${index}">
                  <option value="">Produk aktif pertama</option>
                  ${activeProducts.map(product => `<option value="${escapeHtml(product.id)}" ${slide.productId === product.id ? "selected" : ""}>${escapeHtml(product.name)} - ${productDisplayPrice(product)}</option>`).join("")}
                </select>
              </div>
              <div class="field">
                <label>Label tombol</label>
                <input class="input" name="selfOrderPromoButtonLabel_${index}" value="${escapeHtml(slide.label || "Order Now")}" />
              </div>
              <input type="hidden" name="selfOrderPromoImage_${index}" value="${escapeHtml(slide.image || "")}" />
              <button class="btn" type="button" onclick="clearSelfOrderPromoImage(${index})">Kosongkan</button>
            </article>
          `).join("") || `<p class="self-order-slide-empty">Belum ada badge promosi. Klik Tambah badge untuk mulai upload.</p>`}
          <input type="hidden" name="selfOrderPromoSlideCount" value="${slides.length}" />
          <div class="receipt-action-row">
            <button class="btn accent self-order-save-btn settings-save-btn ${selfOrderSettingsSaving ? "is-loading" : ""}" type="submit" ${selfOrderSettingsSaving ? "disabled" : ""}>
              ${selfOrderSettingsSaving ? `<span class="button-spinner" aria-hidden="true"></span>Menyimpan...` : "Simpan Setting"}
            </button>
          </div>
        </div>
      </form>
    </section>
  `;
}

function renderStaffAccessPicker(member, draft = {}) {
  const access = new Set(Array.isArray(draft.menuAccess) ? draft.menuAccess : allowedViewsForStaff(member));
  return `
    <div class="staff-access-panel staff-access-edit">
      <div class="staff-access-head">
        <strong>Akses menu staff</strong>
      </div>
      <article class="staff-access-row">
        <div class="staff-access-chips">
          ${ACCESS_VIEW_OPTIONS.map(option => {
            const checked = access.has(option.id);
            return `
              <button class="staff-access-chip ${checked ? "active" : ""}" type="button" aria-pressed="${checked ? "true" : "false"}" onclick="toggleStaffAccessChip(this)">
                <span>${escapeHtml(option.label)}</span>
              </button>
              <input type="hidden" name="staffAccess" value="${escapeHtml(option.id)}" ${checked ? "" : "disabled"} />
            `;
          }).join("")}
        </div>
      </article>
    </div>
  `;
}

function renderStaffSettingsTab() {
  const members = staffMembers();
  const editingId = state.staff?.editingStaffId || "";
  const editingMember = members.find(member => member.id === editingId);
  const addingStaff = Boolean(state.staff?.addingStaff);
  const formVisible = Boolean(editingMember || addingStaff);
  const accessMember = editingMember || { role: "", menuAccess: ["pos"] };
  const draft = formVisible ? readStaffFormDraft(editingMember?.id || "") : {};
  const usernameValue = draft.username ?? (editingMember?.username || editingMember?.name || "");
  const roleValue = draft.role || editingMember?.role || "kasir";
  const pinValue = draft.pin ?? (editingMember?.pin || "");
  return `
    <section class="settings-panel settings-single-panel staff-settings-panel">
      <div class="section-title staff-title">
        <div><h3>Staff</h3><p>Kelola akun dan akses menu. Online: store_settings.self_order_settings.staff.</p></div>
        <button class="btn accent staff-title-action" type="${formVisible ? "submit" : "button"}" ${formVisible ? `form="staffAddForm"` : `onclick="openStaffAddForm()"`}>
          ${formVisible ? "Simpan" : "+ Staff"}
        </button>
      </div>
      ${formVisible ? `
        <form id="staffAddForm" class="staff-add-form" onsubmit="saveStaffMember(event)">
          <input type="hidden" name="staffEditId" value="${escapeHtml(editingMember?.id || "")}" />
          <input class="input" name="staffUsername" placeholder="Username" value="${escapeHtml(usernameValue)}" oninput="saveStaffFormDraft(this.form)" required />
          <select name="staffRole" onchange="saveStaffFormDraft(this.form)" required>
            ${Object.entries(ROLE_DEFINITIONS).map(([role, definition]) => `<option value="${role}" ${roleValue === role ? "selected" : ""}>${definition.label}</option>`).join("")}
          </select>
          <input class="input" name="staffPin" type="password" inputmode="numeric" placeholder="PIN" minlength="4" value="${escapeHtml(pinValue)}" oninput="saveStaffFormDraft(this.form)" required />
          <button class="btn" type="button" onclick="cancelStaffEdit()">Batal</button>
          ${renderStaffAccessPicker(accessMember, draft)}
        </form>
      ` : ""}
      <div class="staff-list">
        ${members.map(member => `
          <article class="staff-member-card">
            <span>${staffInitials(member.username || member.name)}</span>
            <div>
              <strong>${escapeHtml(member.username || member.name)}</strong>
              <small>${escapeHtml(roleLabel(member.role))} &middot; PIN ${escapeHtml(member.pin)} &middot; ${allowedViewsForStaff(member).length} menu</small>
            </div>
            <button class="btn" type="button" onclick="editStaffMember('${escapeHtml(member.id)}')">Edit</button>
            <button class="btn danger-lite" type="button" ${member.id === "owner" ? "disabled" : ""} onclick="confirmRemoveStaffMember('${escapeHtml(member.id)}')">Hapus</button>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderDataSettingsTab() {
  const legacyCount = (state.importedSales || []).length;
  const legacyProductSalesCount = (state.importedProductSales || []).length;
  return `
    <section class="settings-panel settings-panel-wide settings-compact-panel">
      <div class="section-title">
        <div><h3>Sinkronisasi & Import</h3><p>Data lama dan antrean sync aplikasi.</p></div>
        <span class="settings-status">${escapeHtml(localDbStatus || "IndexedDB lokal")}</span>
      </div>
      <div class="settings-import-combo">
        <div class="settings-import-option">
          <div>
            <h4>Transaksi lama</h4>
            <span>${legacyCount ? `${legacyCount} transaksi` : "Belum ada data"}</span>
          </div>
          <label class="btn report-import-btn">Import<input type="file" accept=".xlsx,.xls,.csv" multiple onchange="importLegacySales(event)" hidden /></label>
        </div>
        <div class="settings-import-option">
          <div>
            <h4>Penjualan barang</h4>
            <span>${legacyProductSalesCount ? `${legacyProductSalesCount} baris` : "Belum ada data"}</span>
          </div>
          <label class="btn report-import-btn">Import<input type="file" accept=".xlsx,.xls,.csv" multiple onchange="importLegacyProductSales(event)" hidden /></label>
        </div>
      </div>
    </section>
  `;
}

function receiptSwitch(name, label, enabled) {
  return `
    <label class="receipt-switch-row">
      <span>${label}</span>
      <input type="checkbox" name="${name}" ${enabled ? "checked" : ""} />
      <i></i>
    </label>
  `;
}

function renderReceiptSettingsTab() {
  const settings = state.settings;
  return `
    <section class="settings-panel receipt-settings-panel settings-single-panel receipt-modern-panel settings-receipt-compact">
      <div class="section-title compact-settings-title">
        <div><h3>Struk</h3><p>Atur informasi yang muncul di cetakan.</p></div>
      </div>
      <form class="receipt-settings-modern" onchange="previewReceiptSettings(this)" onsubmit="saveReceiptSettings(event)">
        <div class="receipt-preview-box compact-receipt-preview ${receiptLogoUploading ? "receipt-uploading" : ""}">
          ${renderReceiptPaper()}
        </div>
        <div class="receipt-settings-list">
          <div class="receipt-mini-grid">
            <div class="field"><label>Nama toko</label><input class="input" name="receiptStoreName" required value="${escapeHtml(settings.receiptStoreName)}" /></div>
            <div class="field"><label>Telepon</label><input class="input" name="receiptPhone" value="${escapeHtml(settings.receiptPhone)}" /></div>
            <div class="field"><label>Alamat</label><input class="input" name="receiptAddress" value="${escapeHtml(settings.receiptAddress)}" /></div>
            <div class="field"><label>Lebar struk</label><select name="receiptWidth">${["58mm", "80mm"].map(width => `<option ${settings.receiptWidth === width ? "selected" : ""}>${width}</option>`).join("")}</select></div>
          </div>
          ${receiptSwitch("receiptShowLogo", "Tampilkan logo", settings.receiptShowLogo)}
          <div class="receipt-inline-fields">
            <div class="field receipt-logo-upload-field">
              <label>Icon usaha</label>
              <label class="receipt-logo-upload ${receiptLogoUploading ? "uploading" : ""}">
                <span>${settings.receiptLogoDataUrl ? "Ganti icon usaha" : "Upload icon usaha"}</span>
                <input type="file" accept="image/*" onchange="event.stopPropagation(); uploadReceiptLogo(this)" hidden />
              </label>
            </div>
            <div class="field"><label>Panjang logo</label><input class="input" name="receiptLogoLength" type="number" min="1" max="32" value="${Number(settings.receiptLogoLength || 12)}" /></div>
          </div>
          <div class="receipt-radio-row">
            <span>Mode cetak gambar</span>
            <label><input type="radio" name="receiptImageMode" value="A" ${settings.receiptImageMode !== "B" ? "checked" : ""} /> Mode A</label>
            <label><input type="radio" name="receiptImageMode" value="B" ${settings.receiptImageMode === "B" ? "checked" : ""} /> Mode B</label>
          </div>
          ${receiptSwitch("receiptShowReceiptCode", "Tampilkan kode struk", settings.receiptShowReceiptCode)}
          ${receiptSwitch("receiptShowOrderQueueNumber", "Tampilkan No. Urut", settings.receiptShowOrderQueueNumber)}
          ${receiptSwitch("receiptShowUnitNextToQty", "Tampilkan satuan sebelah qty", settings.receiptShowUnitNextToQty)}
          ${receiptSwitch("receiptShowReceiptNumber", "Tampilkan No. struk", settings.receiptShowReceiptNumber)}
          ${receiptSwitch("receiptShowTotalQuantity", "Tampilkan total kuantitas", settings.receiptShowTotalQuantity)}
          ${receiptSwitch("receiptShowCashierLabel", "Tampilkan label Kasir", settings.receiptShowCashierLabel)}
          ${receiptSwitch("receiptShowTable", "Tampilkan nomor meja", settings.receiptShowTable)}
          ${receiptSwitch("receiptShowQr", "Tampilkan QR promo", settings.receiptShowQr)}
          <div class="field"><label>Keterangan header</label><textarea name="receiptHeaderNote">${escapeHtml(settings.receiptHeaderNote || "")}</textarea></div>
          <div class="field"><label>Keterangan footer</label><textarea name="receiptFooter">${escapeHtml(settings.receiptFooter || "")}</textarea></div>
          <div class="receipt-action-row">
            <button class="btn" type="button" onclick="previewReceiptSettings(this.form)">Preview</button>
            <button class="btn accent settings-save-btn ${receiptSettingsSaving ? "is-loading" : ""}" type="submit" ${receiptSettingsSaving ? "disabled" : ""}>
              ${receiptSettingsSaving ? `<span class="button-spinner" aria-hidden="true"></span>Menyimpan...` : "Simpan Struk"}
            </button>
          </div>
        </div>
      </form>
    </section>
  `;
}

function renderPrinterSettingsTab() {
  const settings = state.settings;
  const hasDevice = Boolean(settings.printerDevice);
  return `
    <section class="settings-panel settings-single-panel printer-settings-panel">
      <div class="section-title">
        <div><h3>Pilih Printer</h3><p>Atur perangkat cetak struk dan label.</p></div>
      </div>
      <div class="printer-note">
        <span>i</span>
        <p>Perangkat terpasang akan terisi dari printer Bluetooth yang tersambung atau dipilih dari perangkat ini.</p>
      </div>
      <form class="printer-form" onsubmit="savePrinterSettings(event)">
        <div class="printer-connect-row">
          <label class="field">
            <span>Pilih koneksi printer</span>
            <select name="printerConnection">
              ${["Bluetooth", "USB", "Network"].map(type => `<option ${settings.printerConnection === type ? "selected" : ""}>${type}</option>`).join("")}
            </select>
          </label>
          <button class="btn printer-scan-btn" type="button" onclick="scanPrinters()">Pindai</button>
        </div>
        <div class="printer-help">
          <strong>Cara menghubungkan printer Bluetooth:</strong>
          <ol>
            <li>Aktifkan printer dan Bluetooth perangkat.</li>
            <li>Tekan pindai, lalu pilih printer yang muncul.</li>
            <li>Simpan pengaturan printer.</li>
          </ol>
        </div>
        <div class="printer-device-card">
          <h4>Perangkat Terpasang</h4>
          ${hasDevice ? `
            <label class="printer-device-row active">
              <input type="radio" name="printerDevice" value="${escapeHtml(settings.printerDevice)}" checked />
              <span>
                <b>${escapeHtml(settings.printerDevice)}</b>
                <small>${escapeHtml(settings.printerDeviceId || "Bluetooth tersimpan")}</small>
              </span>
            </label>
          ` : `
            <div class="printer-device-empty">
              <strong>Belum ada printer tersambung</strong>
              <span>Tekan Pindai untuk memilih printer Bluetooth dari perangkat ini.</span>
            </div>
          `}
        </div>
        <button class="btn accent printer-submit" type="submit">Atur Printer</button>
      </form>
    </section>
  `;
}

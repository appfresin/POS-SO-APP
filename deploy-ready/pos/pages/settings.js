// Page renderer extracted from app.js. Depends on shared helpers/globals in app.js.

const SETTINGS_TABS = [
  { id: "data", label: "Data" },
  { id: "selforder", label: "Self Order" },
  { id: "receipt", label: "Struk" },
  { id: "printer", label: "Printer" },
  { id: "staff", label: "Staff" }
];

function renderSettings() {
  const tabs = activeRole() === "owner" ? SETTINGS_TABS : SETTINGS_TABS.filter(tab => tab.id !== "staff");
  const activeTab = tabs.some(tab => tab.id === settingsTab) ? settingsTab : "data";
  return `
    <div class="settings-tabs">
      ${tabs.map(tab => `
        <button class="${activeTab === tab.id ? "active" : ""}" type="button" onclick="setSettingsTab('${tab.id}')">${tab.label}</button>
      `).join("")}
    </div>
    <div class="settings-tab-body">
      ${activeTab === "receipt" ? renderReceiptSettingsTab() : ""}
      ${activeTab === "selforder" ? renderSelfOrderSettingsTab() : ""}
      ${activeTab === "printer" ? renderPrinterSettingsTab() : ""}
      ${activeTab === "data" ? renderDataSettingsTab() : ""}
      ${activeTab === "staff" ? renderStaffSettingsTab() : ""}
    </div>
  `;
}

function renderSelfOrderSettingsTab() {
  const settings = state.settings;
  const activeProducts = state.products.filter(product => product.active && !product.soldOut);
  const slides = readSelfOrderPromoSlidesFromSettings().map(slide => ({
    image: slide?.image || "",
    productId: slide?.productId || "",
    label: slide?.label || "Order Now"
  }));
  const profileImage = String(settings.selfOrderProfileImageDataUrl || settings.receiptLogoDataUrl || "").trim();
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
              <label class="btn report-import-btn">Upload<input type="file" accept="image/*" onchange="uploadSelfOrderProfileImage(this)" hidden /></label>
              <input type="hidden" name="selfOrderProfileImageDataUrl" value="${escapeHtml(settings.selfOrderProfileImageDataUrl || "")}" />
            </div>
          </div>
        </div>
        <div class="self-order-admin-preview">
          ${renderSelfOrderPromo()}
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
                <label class="btn report-import-btn">Upload<input type="file" accept="image/*" onchange="uploadSelfOrderPromoImage(this, ${index})" hidden /></label>
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
            <button class="btn accent self-order-save-btn ${selfOrderSettingsSaving ? "is-loading" : ""}" type="submit" ${selfOrderSettingsSaving ? "disabled" : ""}>
              ${selfOrderSettingsSaving ? `<span class="button-spinner" aria-hidden="true"></span>Menyimpan...` : "Simpan"}
            </button>
          </div>
        </div>
      </form>
    </section>
  `;
}

function renderStaffSettingsTab() {
  const current = activeStaff();
  const members = staffMembers();
  const editingId = state.staff?.editingStaffId || "";
  const editingMember = members.find(member => member.id === editingId);
  const accessPanel = Object.entries(ROLE_DEFINITIONS).map(([role, definition]) => {
    const access = allowedViews(role);
    const isOwnerRole = role === "owner";
    return `
      <article class="staff-access-row ${isOwnerRole ? "locked" : ""}">
        <div class="staff-access-role">
          <strong>${escapeHtml(definition.label)}</strong>
          <small>${isOwnerRole ? "Semua menu" : `${access.length} menu aktif`}</small>
        </div>
        <div class="staff-access-chips">
          ${ACCESS_VIEW_OPTIONS.map(option => {
            const checked = access.includes(option.id);
            return `
              <label class="staff-access-chip ${checked ? "active" : ""} ${isOwnerRole ? "disabled" : ""}">
                <input type="checkbox" ${checked ? "checked" : ""} ${isOwnerRole ? "disabled" : ""} onchange="toggleRoleAccess('${role}', '${option.id}', this.checked)" />
                <span>${escapeHtml(option.label)}</span>
              </label>
            `;
          }).join("")}
        </div>
      </article>
    `;
  }).join("");
  return `
    <section class="settings-panel settings-single-panel staff-settings-panel">
      <div class="section-title staff-title">
        <div><h3>Staff</h3><p>Kelola akun dan akses menu.</p></div>
        <span class="settings-status">${escapeHtml(roleLabel(current?.role))}</span>
      </div>
      <div class="staff-current-card">
        <span>${staffInitials(current?.name || "S")}</span>
        <div>
          <strong>${escapeHtml(current?.name || "Belum masuk")}</strong>
          <small>${escapeHtml(roleLabel(current?.role))}</small>
        </div>
        <button class="btn" type="button" onclick="logoutStaff()">Logout</button>
      </div>
      <form class="staff-add-form" onsubmit="saveStaffMember(event)">
        <input type="hidden" name="staffEditId" value="${escapeHtml(editingMember?.id || "")}" />
        <input class="input" name="staffName" placeholder="Nama staff" value="${escapeHtml(editingMember?.name || "")}" required />
        <select name="staffRole" required>
          ${Object.entries(ROLE_DEFINITIONS).map(([role, definition]) => `<option value="${role}" ${editingMember?.role === role ? "selected" : ""}>${definition.label}</option>`).join("")}
        </select>
        <input class="input" name="staffPin" type="password" inputmode="numeric" placeholder="PIN" minlength="4" value="${escapeHtml(editingMember?.pin || "")}" required />
        <button class="btn accent" type="submit">${editingMember ? "Simpan" : "+ Staff"}</button>
        ${editingMember ? `<button class="btn" type="button" onclick="cancelStaffEdit()">Batal</button>` : ""}
      </form>
      <div class="staff-access-panel">
        <div class="staff-access-head">
          <strong>Akses menu</strong>
          <small>Owner bisa mengatur menu yang terbuka untuk setiap role.</small>
        </div>
        ${accessPanel}
      </div>
      <div class="staff-list">
        ${members.map(member => `
          <article class="staff-member-card">
            <span>${staffInitials(member.name)}</span>
            <div>
              <strong>${escapeHtml(member.name)}</strong>
              <small>${escapeHtml(roleLabel(member.role))} &middot; PIN ${escapeHtml(member.pin)}</small>
            </div>
            <button class="btn" type="button" onclick="editStaffMember('${escapeHtml(member.id)}')">Edit</button>
            <button class="btn danger-lite" type="button" ${member.id === "owner" ? "disabled" : ""} onclick="removeStaffMember('${escapeHtml(member.id)}')">Hapus</button>
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
            <button class="btn accent" type="submit">Simpan</button>
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

/* StokIn — semua data disimpan di localStorage browser. */
(() => {
  "use strict";

  const STORAGE_ITEMS = "stokin_items_v1";
  const STORAGE_HISTORY = "stokin_history_v1";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  let items = readStorage(STORAGE_ITEMS, []);
  let history = readStorage(STORAGE_HISTORY, []);
  let toastTimer;

  function readStorage(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : fallback;
    } catch (error) {
      console.warn(`Tidak bisa membaca ${key}:`, error);
      return fallback;
    }
  }

  function saveStorage() {
    try {
      localStorage.setItem(STORAGE_ITEMS, JSON.stringify(items));
      localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
      return true;
    } catch (error) {
      showToast("Penyimpanan gagal. Periksa ruang browser.", "error");
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[char]);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("id-ID").format(Number(value) || 0);
  }

  function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency", currency: "IDR", maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function formatDate(value, includeTime = false) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", includeTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function makeId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function getStatus(item) {
    const stock = Number(item.stock) || 0;
    if (stock <= 0) return { key: "out", label: "Habis" };
    if (stock <= (Number(item.minStock) || 0)) return { key: "low", label: "Menipis" };
    return { key: "available", label: "Tersedia" };
  }

  function statusBadge(item) {
    const status = getStatus(item);
    return `<span class="status-pill status-${status.key}">${status.label}</span>`;
  }

  function itemVisual(item) {
    const initial = escapeHTML((item.name || "?").trim().charAt(0).toUpperCase());
    return `<div class="item-cell"><span class="item-thumb">${initial}</span><div><div class="item-name">${escapeHTML(item.name)}</div><div class="item-sub">${escapeHTML(item.code)}</div></div></div>`;
  }

  function showToast(message, type = "success") {
    const toast = $("#toast");
    $("#toastMessage").textContent = message;
    $("#toastIcon").textContent = type === "error" ? "!" : "✓";
    toast.classList.toggle("error", type === "error");
    toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 3000);
  }

  function updateDate() {
    $("#todayDate").textContent = new Intl.DateTimeFormat("id-ID", {
      weekday: "short", day: "numeric", month: "short", year: "numeric"
    }).format(new Date());
  }

  function renderDashboard() {
    const low = items.filter(item => getStatus(item).key === "low").length;
    const out = items.filter(item => getStatus(item).key === "out").length;
    const units = items.reduce((sum, item) => sum + (Number(item.stock) || 0), 0);
    $("#statKinds").textContent = formatNumber(items.length);
    $("#statUnits").textContent = formatNumber(units);
    $("#statLow").textContent = formatNumber(low);
    $("#statOut").textContent = formatNumber(out);

    const latestItems = [...items].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)).slice(0, 5);
    $("#dashboardItems").innerHTML = latestItems.map(item => `
      <tr>
        <td>${itemVisual(item)}</td>
        <td><span class="category-chip">${escapeHTML(item.category)}</span></td>
        <td><strong>${formatNumber(item.stock)}</strong> <span class="item-sub">unit</span></td>
        <td>${statusBadge(item)}</td>
      </tr>`).join("");
    $("#dashboardEmpty").classList.toggle("hidden", latestItems.length > 0);

    const latestHistory = [...history].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
    $("#dashboardActivity").innerHTML = latestHistory.map(activityMarkup).join("");
    $("#activityEmpty").classList.toggle("hidden", latestHistory.length > 0);
  }

  function renderCategoryFilter() {
    const select = $("#categoryFilter");
    const current = select.value;
    const categories = [...new Set(items.map(item => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id"));
    select.innerHTML = `<option value="">Semua kategori</option>` + categories.map(category =>
      `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join("");
    if (categories.includes(current)) select.value = current;
  }

  function renderItemOptions() {
    const select = $("#transactionItem");
    const current = select.value;
    select.innerHTML = `<option value="">Pilih barang...</option>` + [...items]
      .sort((a, b) => a.name.localeCompare(b.name, "id"))
      .map(item => `<option value="${escapeHTML(item.id)}">${escapeHTML(item.name)} — stok ${formatNumber(item.stock)}</option>`).join("");
    if (items.some(item => item.id === current)) select.value = current;
    updateTransactionPreview();
  }

  function renderItemsTable() {
    const query = $("#itemSearch").value.trim().toLowerCase();
    const category = $("#categoryFilter").value;
    const status = $("#statusFilter").value;
    const filtered = [...items].filter(item => {
      const matchesQuery = `${item.name} ${item.code} ${item.category}`.toLowerCase().includes(query);
      return matchesQuery && (!category || item.category === category) && (!status || getStatus(item).key === status);
    }).sort((a, b) => a.name.localeCompare(b.name, "id"));

    $("#itemsTable").innerHTML = filtered.map(item => `
      <tr>
        <td>${itemVisual(item)}</td>
        <td><span class="item-sub">${escapeHTML(item.code)}</span></td>
        <td><span class="category-chip">${escapeHTML(item.category)}</span></td>
        <td>${formatRupiah(item.price)}</td>
        <td><strong>${formatNumber(item.stock)}</strong> <span class="item-sub">unit</span></td>
        <td>${statusBadge(item)}</td>
        <td><div class="row-actions">
          <button class="action-btn" data-action="edit-item" data-id="${escapeHTML(item.id)}" title="Edit ${escapeHTML(item.name)}" aria-label="Edit barang ${escapeHTML(item.name)}">✎</button>
          <button class="action-btn delete" data-action="delete-item" data-id="${escapeHTML(item.id)}" title="Hapus ${escapeHTML(item.name)}" aria-label="Hapus barang ${escapeHTML(item.name)}">⌫</button>
        </div></td>
      </tr>`).join("");

    $("#itemsEmpty").classList.toggle("hidden", filtered.length > 0);
    $("#itemsCount").textContent = `Menampilkan ${formatNumber(filtered.length)} dari ${formatNumber(items.length)} barang`;
  }

  function activityMarkup(activity) {
    const isIn = activity.type === "in";
    return `<div class="activity-item">
      <span class="activity-icon ${isIn ? "in" : "out"}">${isIn ? "↓" : "↑"}</span>
      <div class="activity-copy"><div class="activity-title"><strong>${escapeHTML(activity.itemName)}</strong> ${isIn ? "bertambah" : "berkurang"}</div>
      <div class="activity-meta">${formatDate(activity.timestamp, true)}${activity.note ? ` · ${escapeHTML(activity.note)}` : ""}</div></div>
      <span class="activity-qty ${isIn ? "in" : "out"}">${isIn ? "+" : "−"}${formatNumber(activity.quantity)}</span>
    </div>`;
  }

  function renderHistory() {
    const query = $("#historySearch").value.trim().toLowerCase();
    const type = $("#historyTypeFilter").value;
    const filtered = [...history].filter(entry =>
      `${entry.itemName} ${entry.note || ""} ${entry.itemCode || ""}`.toLowerCase().includes(query) &&
      (!type || entry.type === type)
    ).sort((a, b) => b.timestamp - a.timestamp);

    $("#historyTable").innerHTML = filtered.map(entry => `
      <tr>
        <td><div>${formatDate(entry.timestamp)}</div><div class="item-sub">${new Intl.DateTimeFormat("id-ID", {hour: "2-digit", minute: "2-digit"}).format(new Date(entry.timestamp))}</div></td>
        <td><div class="item-name">${escapeHTML(entry.itemName)}</div><div class="item-sub">${escapeHTML(entry.itemCode || "-")}</div></td>
        <td><span class="status-pill ${entry.type === "in" ? "status-available" : "status-low"}">${entry.type === "in" ? "↓ Masuk" : "↑ Keluar"}</span></td>
        <td><strong>${entry.type === "in" ? "+" : "−"}${formatNumber(entry.quantity)}</strong> unit</td>
        <td>${entry.note ? escapeHTML(entry.note) : '<span class="item-sub">Tidak ada catatan</span>'}</td>
      </tr>`).join("");
    $("#historyEmpty").classList.toggle("hidden", filtered.length > 0);
    $("#historyCount").textContent = `${formatNumber(filtered.length)} transaksi`;
  }

  function renderAll() {
    renderDashboard();
    renderCategoryFilter();
    renderItemsTable();
    renderItemOptions();
    renderHistory();
  }

  function openItemModal(item = null) {
    $("#itemForm").reset();
    $("#editItemId").value = item?.id || "";
    $("#modalTitle").textContent = item ? "Edit Barang" : "Tambah Barang";
    $("#itemName").value = item?.name || "";
    $("#itemCode").value = item?.code || "";
    $("#itemCategory").value = item?.category || "";
    $("#itemPrice").value = item?.price ?? "";
    $("#itemStock").value = item?.stock ?? "";
    $("#itemMinStock").value = item?.minStock ?? 5;
    $("#itemStock").disabled = false;
    $("#itemModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
    setTimeout(() => $("#itemName").focus(), 50);
  }

  function closeItemModal() {
    $("#itemModal").classList.add("hidden");
    document.body.style.overflow = "";
  }

  function handleItemSubmit(event) {
    event.preventDefault();
    const id = $("#editItemId").value;
    const name = $("#itemName").value.trim();
    const code = $("#itemCode").value.trim();
    const category = $("#itemCategory").value.trim();
    const price = Number($("#itemPrice").value);
    const stock = Number($("#itemStock").value);
    const minStock = Number($("#itemMinStock").value || 0);

    if (!name || !code || !category) return showToast("Lengkapi semua data wajib.", "error");
    if (![price, stock, minStock].every(Number.isFinite) || price < 0 || stock < 0 || minStock < 0 || !Number.isInteger(stock) || !Number.isInteger(minStock) || !Number.isInteger(price)) {
      return showToast("Harga dan stok harus berupa angka bulat yang valid.", "error");
    }
    const duplicate = items.some(item => item.code.toLowerCase() === code.toLowerCase() && item.id !== id);
    if (duplicate) return showToast("Kode barang sudah digunakan. Gunakan kode lain.", "error");

    const now = Date.now();
    if (id) {
      const index = items.findIndex(item => item.id === id);
      if (index < 0) return showToast("Barang tidak ditemukan.", "error");
      items[index] = { ...items[index], name, code, category, price, stock, minStock, updatedAt: now };
      showToast("Data barang berhasil diperbarui.");
    } else {
      items.push({ id: makeId(), name, code, category, price, stock, minStock, createdAt: now, updatedAt: now });
      showToast("Barang baru berhasil ditambahkan.");
    }
    saveStorage();
    closeItemModal();
    renderAll();
  }

  function deleteItem(id) {
    const item = items.find(entry => entry.id === id);
    if (!item) return;
    const linkedHistory = history.some(entry => entry.itemId === id);
    const message = linkedHistory
      ? `Hapus "${item.name}" dari daftar barang? Riwayat transaksi lama akan tetap tersimpan.`
      : `Yakin ingin menghapus barang "${item.name}"?`;
    if (!window.confirm(message)) return;
    items = items.filter(entry => entry.id !== id);
    saveStorage();
    renderAll();
    showToast("Barang berhasil dihapus.");
  }

  function selectedTransactionType() {
    return $('input[name="transactionType"]:checked')?.value || "in";
  }

  function updateTransactionPreview() {
    const item = items.find(entry => entry.id === $("#transactionItem").value);
    const qty = Number($("#transactionQty").value);
    const type = selectedTransactionType();
    if (!item) {
      $("#availableStock").textContent = "Pilih barang untuk melihat stok saat ini.";
      $("#stockPreview").textContent = "—";
      return;
    }
    $("#availableStock").textContent = `Stok saat ini: ${formatNumber(item.stock)} unit`;
    if (!Number.isInteger(qty) || qty < 1) {
      $("#stockPreview").textContent = `${formatNumber(item.stock)} unit`;
      return;
    }
    const next = Number(item.stock) + (type === "in" ? qty : -qty);
    $("#stockPreview").textContent = next < 0 ? "Stok tidak cukup" : `${formatNumber(next)} unit`;
    $("#stockPreview").style.color = next < 0 ? "var(--red)" : "var(--text)";
  }

  function handleTransactionSubmit(event) {
    event.preventDefault();
    const item = items.find(entry => entry.id === $("#transactionItem").value);
    const type = selectedTransactionType();
    const quantity = Number($("#transactionQty").value);
    const note = $("#transactionNote").value.trim();

    if (!item) return showToast("Pilih barang terlebih dahulu.", "error");
    if (!Number.isInteger(quantity) || quantity < 1) return showToast("Jumlah harus berupa bilangan bulat minimal 1.", "error");
    if (type === "out" && quantity > Number(item.stock)) return showToast("Stok tidak mencukupi untuk transaksi keluar.", "error");

    item.stock = Number(item.stock) + (type === "in" ? quantity : -quantity);
    item.updatedAt = Date.now();
    history.push({
      id: makeId(), itemId: item.id, itemName: item.name, itemCode: item.code,
      type, quantity, note, timestamp: Date.now(), stockAfter: item.stock
    });
    $("#transactionForm").reset();
    $('input[name="transactionType"][value="in"]').checked = true;
    saveStorage();
    renderAll();
    showToast(`Transaksi ${type === "in" ? "barang masuk" : "barang keluar"} berhasil disimpan.`);
  }

  function downloadCSV(filename, rows) {
    if (!rows.length) return showToast("Tidak ada data untuk diekspor.", "error");
    const csv = rows.map(row => row.map(value => {
      const safe = String(value ?? "").replace(/"/g, '""');
      return `"${safe}"`;
    }).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("File CSV berhasil disiapkan.");
  }

  function exportItems() {
    const rows = [
      ["Kode Barang", "Nama Barang", "Kategori", "Harga per Unit (Rp)", "Stok", "Batas Stok Menipis", "Status"],
      ...items.map(item => [item.code, item.name, item.category, item.price, item.stock, item.minStock, getStatus(item).label])
    ];
    downloadCSV("stokin-data-barang.csv", rows);
  }

  function exportHistory() {
    const rows = [
      ["Tanggal", "Kode Barang", "Nama Barang", "Jenis Transaksi", "Jumlah", "Stok Setelah Transaksi", "Catatan"],
      ...[...history].sort((a, b) => b.timestamp - a.timestamp).map(entry => [
        formatDate(entry.timestamp, true), entry.itemCode, entry.itemName,
        entry.type === "in" ? "Barang Masuk" : "Barang Keluar", entry.quantity,
        entry.stockAfter ?? "", entry.note || ""
      ])
    ];
    downloadCSV("stokin-riwayat-transaksi.csv", rows);
  }

  function navigate(view) {
    const titles = { dashboard: "Dashboard", items: "Data Barang", transactions: "Transaksi Stok", history: "Riwayat Transaksi" };
    if (!titles[view]) return;
    $$(".page-view").forEach(page => page.classList.toggle("active", page.id === `view-${view}`));
    $$(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.view === view));
    $("#pageTitle").textContent = titles[view];
    $("#sidebar").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.addEventListener("click", event => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      event.preventDefault();
      navigate(viewButton.dataset.view);
      return;
    }
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    if (action === "add-item") openItemModal();
    if (action === "close-modal") closeItemModal();
    if (action === "edit-item") {
      const item = items.find(entry => entry.id === actionButton.dataset.id);
      if (item) openItemModal(item);
    }
    if (action === "delete-item") deleteItem(actionButton.dataset.id);
  });

  $("#itemForm").addEventListener("submit", handleItemSubmit);
  $("#transactionForm").addEventListener("submit", handleTransactionSubmit);
  $("#itemSearch").addEventListener("input", renderItemsTable);
  $("#categoryFilter").addEventListener("change", renderItemsTable);
  $("#statusFilter").addEventListener("change", renderItemsTable);
  $("#historySearch").addEventListener("input", renderHistory);
  $("#historyTypeFilter").addEventListener("change", renderHistory);
  $("#transactionItem").addEventListener("change", updateTransactionPreview);
  $("#transactionQty").addEventListener("input", updateTransactionPreview);
  $$('input[name="transactionType"]').forEach(radio => radio.addEventListener("change", updateTransactionPreview));
  $("#exportItems").addEventListener("click", exportItems);
  $("#exportHistory").addEventListener("click", exportHistory);
  $("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#itemModal").addEventListener("click", event => {
    if (event.target === $("#itemModal")) closeItemModal();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeItemModal();
  });

  updateDate();
  renderAll();
})();

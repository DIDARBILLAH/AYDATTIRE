// ===================== AYDATTIRE — Booking Fitting =====================
const SESSIONS = [
  { id: 1, label: "Sesi 1", time: "10:00 – 12:00" },
  { id: 2, label: "Sesi 2", time: "13:00 – 15:00" },
  { id: 3, label: "Sesi 3", time: "15:30 – 17:30" },
];
const QUOTA_PER_SESSION = 4;
const MAX_ITEMS = 3;

const form = document.getElementById("fitForm");
const dateEl = document.getElementById("fitDate");
const sessEl = document.getElementById("fitSessions");
const itemsEl = document.getElementById("fitItems");
const errEl = document.getElementById("fitError");
const ticketEl = document.getElementById("fitTicket");
const pickCount = document.getElementById("pickCount");

const toISO = (d) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD waktu lokal
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
dateEl.min = toISO(tomorrow);

let selectedSession = null;
const selectedItems = new Set();

// Simulasi jumlah booking per tanggal & sesi (nanti diambil dari server)
function bookedCount(dateStr, sessionId) {
  let h = 0;
  for (const c of dateStr + sessionId) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h % (QUOTA_PER_SESSION + 1);
}

function renderSessions() {
  selectedSession = null;
  const val = dateEl.value;
  if (!val) { sessEl.innerHTML = '<p class="hint">Pilih tanggal terlebih dahulu.</p>'; return; }

  if (new Date(val + "T00:00:00").getDay() === 0) {
    sessEl.innerHTML = '<p class="hint warn">Butik tutup di hari Minggu. Silakan pilih tanggal lain.</p>';
    return;
  }

  sessEl.innerHTML = SESSIONS.map((s) => {
    const left = QUOTA_PER_SESSION - bookedCount(val, s.id);
    const full = left <= 0;
    const status = full ? "Penuh" : left <= 2 ? `Sisa ${left} slot` : "Tersedia";
    return `
      <button type="button" class="session ${full ? "full" : ""}" data-id="${s.id}" ${full ? "disabled" : ""}>
        <span>${s.label}</span>
        <strong>${s.time}</strong>
        <small class="quota ${full ? "none" : left <= 2 ? "low" : "ok"}">${status}</small>
      </button>`;
  }).join("");
}

sessEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".session:not(.full)");
  if (!btn) return;
  selectedSession = SESSIONS.find((s) => s.id === +btn.dataset.id);
  sessEl.querySelectorAll(".session").forEach((b) => b.classList.toggle("selected", b === btn));
});
dateEl.addEventListener("change", renderSessions);

// ---------- Pilihan busana (maks. 3) ----------
itemsEl.innerHTML = PRODUCTS.filter((p) => !p.booked).map((p) => `
  <button type="button" class="pick" data-id="${p.id}">
    <img src="${p.img}" alt="" /><span>${p.name}</span>
  </button>`).join("");

function syncPicks() {
  itemsEl.querySelectorAll(".pick").forEach((b) => {
    const on = selectedItems.has(+b.dataset.id);
    b.classList.toggle("on", on);
    b.disabled = !on && selectedItems.size >= MAX_ITEMS;
  });
  pickCount.textContent = `(${selectedItems.size}/${MAX_ITEMS} dipilih)`;
}

itemsEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".pick");
  if (!btn) return;
  const id = +btn.dataset.id;
  selectedItems.has(id) ? selectedItems.delete(id) : selectedItems.add(id);
  hideError();
  syncPicks();
});

// Pilih otomatis busana dari URL, mis. fitting.html?item=3
const preItem = +new URLSearchParams(location.search).get("item");
if (PRODUCTS.some((p) => p.id === preItem && !p.booked)) { selectedItems.add(preItem); syncPicks(); }

// ---------- Submit ----------
function showError(msg) { errEl.textContent = msg; errEl.hidden = false; }
function hideError() { errEl.hidden = true; }

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("fitName").value.trim();
  const wa = document.getElementById("fitWa").value.trim();

  if (!dateEl.value) return showError("Silakan pilih tanggal fitting.");
  if (!selectedSession) return showError("Silakan pilih sesi fitting.");
  if (!name) return showError("Nama wajib diisi.");
  if (!/^(\+62|62|0)8\d{7,12}$/.test(wa.replace(/[\s-]/g, ""))) return showError("Nomor WhatsApp tidak valid.");
  hideError();

  const code = "FIT-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  const dateLabel = new Date(dateEl.value + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const items = PRODUCTS.filter((p) => selectedItems.has(p.id)).map((p) => p.name);

  form.hidden = true;
  ticketEl.hidden = false;
  ticketEl.innerHTML = `
    <div class="ticket-check">✓</div>
    <h3>Janji Temu Terkonfirmasi</h3>
    <p class="ticket-sub">Tunjukkan kode ini saat datang ke butik.</p>
    <div class="ticket-code">${code}</div>
    <dl class="ticket-detail">
      <div><dt>Nama</dt><dd>${name}</dd></div>
      <div><dt>Tanggal</dt><dd>${dateLabel}</dd></div>
      <div><dt>Sesi</dt><dd>${selectedSession.label} · ${selectedSession.time} WIB</dd></div>
      <div><dt>Busana</dt><dd>${items.length ? items.join(", ") : "Belum dipilih (konsultasi di butik)"}</dd></div>
    </dl>
    <button type="button" class="btn btn-outline btn-block" id="fitAgain">Buat Janji Lain</button>`;
  ticketEl.scrollIntoView({ behavior: "smooth", block: "center" });

  document.getElementById("fitAgain").addEventListener("click", () => {
    form.reset();
    selectedItems.clear();
    syncPicks();
    renderSessions();
    ticketEl.hidden = true;
    form.hidden = false;
  });
});

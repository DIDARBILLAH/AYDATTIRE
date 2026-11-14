// ===================== AYDATTIRE — Katalog =====================

const state = {
  kategori: "semua",
  jenis: new Set(),
  ukuran: new Set(),
  warna: new Set(),
  tema: new Set(),
  available: false,
  q: "",
  sort: "populer",
};

const $ = (id) => document.getElementById(id);
const grid = $("catalogGrid");

// Baca ?kategori=pria|wanita dari URL (dari kartu kategori di beranda)
const urlKat = new URLSearchParams(location.search).get("kategori");
if (urlKat === "pria" || urlKat === "wanita") state.kategori = urlKat;

function renderJenis() {
  const list = state.kategori === "semua" ? [...SUBCATS.wanita, ...SUBCATS.pria] : SUBCATS[state.kategori];
  // buang jenis yang tidak relevan lagi
  [...state.jenis].forEach((j) => { if (!list.includes(j)) state.jenis.delete(j); });
  $("fJenis").innerHTML = list.map((j) =>
    `<label><input type="checkbox" value="${j}" ${state.jenis.has(j) ? "checked" : ""}/> ${j}</label>`).join("");
}

function apply() {
  const q = state.q.toLowerCase();
  let list = PRODUCTS.filter((p) =>
    (state.kategori === "semua" || p.cat === state.kategori) &&
    (!state.jenis.size || state.jenis.has(p.sub)) &&
    (!state.ukuran.size || p.sizes.some((s) => state.ukuran.has(s))) &&
    (!state.warna.size || state.warna.has(p.color)) &&
    (!state.tema.size || p.tema.some((t) => state.tema.has(t))) &&
    (!state.available || !p.booked) &&
    (!q || (p.name + " " + p.sub).toLowerCase().includes(q))
  );

  const sorters = {
    murah: (a, b) => a.price - b.price,
    mahal: (a, b) => b.price - a.price,
    nama: (a, b) => a.name.localeCompare(b.name),
    populer: (a, b) => a.id - b.id,
  };
  list.sort(sorters[state.sort]);

  grid.innerHTML = list.map(productCard).join("");
  $("emptyState").hidden = list.length > 0;
  $("resultCount").textContent = `${list.length} busana`;
}

function syncKategoriUI() {
  $("fKategori").querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.v === state.kategori));
}

// ---------- Event listeners ----------
$("fKategori").addEventListener("click", (e) => {
  const b = e.target.closest(".seg-btn"); if (!b) return;
  state.kategori = b.dataset.v;
  syncKategoriUI(); renderJenis(); apply();
});

const bindChecks = (id, set) => $(id).addEventListener("change", (e) => {
  if (e.target.type !== "checkbox") return;
  e.target.checked ? set.add(e.target.value) : set.delete(e.target.value);
  apply();
});
bindChecks("fJenis", state.jenis);
bindChecks("fTema", state.tema);

const bindToggles = (id, set) => $(id).addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  b.classList.toggle("on");
  set.has(b.dataset.v) ? set.delete(b.dataset.v) : set.add(b.dataset.v);
  apply();
});
bindToggles("fUkuran", state.ukuran);
bindToggles("fWarna", state.warna);

$("fAvailable").addEventListener("change", (e) => { state.available = e.target.checked; apply(); });
$("fSearch").addEventListener("input", (e) => { state.q = e.target.value; apply(); });
$("fSort").addEventListener("change", (e) => { state.sort = e.target.value; apply(); });

function resetAll() {
  state.kategori = "semua";
  ["jenis", "ukuran", "warna", "tema"].forEach((k) => state[k].clear());
  state.available = false; state.q = "";
  $("fSearch").value = ""; $("fAvailable").checked = false;
  document.querySelectorAll("#fTema input").forEach((i) => (i.checked = false));
  document.querySelectorAll("#fUkuran button, #fWarna button").forEach((b) => b.classList.remove("on"));
  syncKategoriUI(); renderJenis(); apply();
}
$("resetFilter").addEventListener("click", resetAll);
$("emptyReset").addEventListener("click", resetAll);

// Filter drawer di mobile
const openF = () => document.body.classList.add("filters-open");
const closeF = () => document.body.classList.remove("filters-open");
$("openFilter").addEventListener("click", openF);
$("closeFilter").addEventListener("click", closeF);
$("filterBackdrop").addEventListener("click", closeF);

// Init
syncKategoriUI();
renderJenis();
apply();

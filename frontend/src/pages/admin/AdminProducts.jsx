import { useMemo, useState } from "react";
import { useStore } from "../../context/StoreContext";
import { SUBCATS } from "../../data/products";
import { rupiah as formatIDR, todayISO } from "../../utils/format";
import { buildProductReportRows, exportToExcel } from "../../utils/exportReport";

const SIZES = ["S", "M", "L", "XL"];
const COLORS = ["Merah", "Hijau", "Putih", "Hitam", "Biru", "Emas", "Maroon"];
const TEMA = ["Pernikahan", "Lamaran", "Wisuda", "Adat"];

const EMPTY_FORM = {
  name: "",
  cat: "wanita",
  sub: "Kebaya Modern",
  price: 250000,
  deposit: 150000,
  sizes: ["S", "M", "L"],
  color: "Maroon",
  tema: ["Wisuda", "Lamaran"],
  tag: "Tersedia",
  booked: false,
  img: "",
  galleryText: "",
  bahan: "Brokat Prancis halus dengan furing katun adem & payet jahit tangan.",
  ld: "88–96 cm",
  panjang: "65 cm",
  pinggang: "70–78 cm",
  aksesoriText: "Selendang senada, Bros kebaya, Hanger & garment bag AYDATTIRE",
};

export default function AdminProducts() {
  const {
    products,
    categories,
    subcatsMap,
    getCategoryLabel,
    addCategory,
    deleteCategory,
    addSubcategory,
    removeSubcategory,
    loadingProducts: productsLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadFile,
    refreshProducts,
  } = useStore();

  const safeProducts = useMemo(
    () => (Array.isArray(products) ? products : []),
    [products]
  );

  const safeCategories = useMemo(
    () =>
      Array.isArray(categories) && categories.length
        ? categories
        : [
            { id: "wanita", label: "Kebaya Wanita", shortLabel: "Wanita", subcategories: SUBCATS.wanita },
            { id: "pria", label: "Beskap & Jas Pria", shortLabel: "Pria", subcategories: SUBCATS.pria },
          ],
    [categories]
  );

  const activeSubcatsMap = useMemo(
    () => (subcatsMap && Object.keys(subcatsMap).length ? subcatsMap : SUBCATS),
    [subcatsMap]
  );

  const [catFilter, setCatFilter] = useState("semua");
  const [subFilter, setSubFilter] = useState("semua");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [feedback, setFeedback] = useState("");

  // State Modal Kelola Kategori & Subkategori
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatShort, setNewCatShort] = useState("");
  const [newCatSub, setNewCatSub] = useState("");
  const [subInputs, setSubInputs] = useState({});
  const [catError, setCatError] = useState("");

  // State tambah subkategori cepat di dalam form produk
  const [quickSubOpen, setQuickSubOpen] = useState(false);
  const [quickSubName, setQuickSubName] = useState("");

  const showToast = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 3200);
  };

  const filteredProducts = useMemo(() => {
    return safeProducts.filter((p) => {
      if (catFilter !== "semua" && p?.cat !== catFilter) return false;
      if (subFilter !== "semua" && p?.sub !== subFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const inName = p?.name?.toLowerCase().includes(q);
        const inSub = p?.sub?.toLowerCase().includes(q);
        const inColor = p?.color?.toLowerCase().includes(q);
        if (!inName && !inSub && !inColor) return false;
      }
      return true;
    });
  }, [safeProducts, catFilter, subFilter, search]);

  const openAddModal = () => {
    const firstCat = safeCategories[0]?.id || "wanita";
    const firstSub = activeSubcatsMap[firstCat]?.[0] || "Kebaya Modern";
    setEditingId(null);
    setForm({ ...EMPTY_FORM, cat: firstCat, sub: firstSub });
    setQuickSubOpen(false);
    setQuickSubName("");
    setModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingId(p.id);
    const validImg =
      typeof p.img === "string" && p.img !== "[object Object]"
        ? p.img
        : p.img?.url || p.img?.publicUrl || "";
    const cleanGallery = Array.isArray(p.gallery)
      ? p.gallery.filter((g) => g && g !== "[object Object]").join("\n")
      : validImg;

    const catKey = p.cat || safeCategories[0]?.id || "wanita";
    setForm({
      name: p.name || "",
      cat: catKey,
      sub: p.sub || activeSubcatsMap[catKey]?.[0] || "Kebaya Modern",
      price: Number(p.price) || 250000,
      deposit: Number(p.deposit) || 150000,
      sizes: Array.isArray(p.sizes) && p.sizes.length ? p.sizes : ["M"],
      color: p.color || "Maroon",
      tema: Array.isArray(p.tema) && p.tema.length ? p.tema : ["Wisuda"],
      tag: p.tag || (p.booked ? "Penuh" : "Tersedia"),
      booked: Boolean(p.booked),
      img: validImg,
      galleryText: cleanGallery,
      bahan: p.bahan || "",
      ld: p.ukuran?.LD || "88–96 cm",
      panjang: p.ukuran?.Panjang || "65 cm",
      pinggang: p.ukuran?.Pinggang || "70–78 cm",
      aksesoriText: Array.isArray(p.aksesori) ? p.aksesori.join(", ") : "",
    });
    setQuickSubOpen(false);
    setQuickSubName("");
    setModalOpen(true);
  };

  const toggleArrayItem = (field, value) => {
    setForm((prev) => {
      const current = prev[field] || [];
      const exists = current.includes(value);
      const next = exists ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [field]: next.length ? next : [value] };
    });
  };

  const handleCatChange = (newCat) => {
    const defaultSub = activeSubcatsMap[newCat]?.[0] || "Koleksi Umum";
    setForm((prev) => ({ ...prev, cat: newCat, sub: defaultSub }));
  };

  const handleQuickAddSub = () => {
    const clean = quickSubName.trim();
    if (!clean) return;
    try {
      addSubcategory(form.cat, clean);
      setForm((prev) => ({ ...prev, sub: clean }));
      setQuickSubName("");
      setQuickSubOpen(false);
      showToast(`Subkategori "${clean}" ditambahkan ke ${getCategoryLabel(form.cat)}`);
    } catch (err) {
      showToast(err.message || "Gagal menambah subkategori");
    }
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    setCatError("");
    try {
      const slug = addCategory({
        label: newCatLabel,
        shortLabel: newCatShort || newCatLabel,
        initialSub: newCatSub || "Koleksi Umum",
      });
      setNewCatLabel("");
      setNewCatShort("");
      setNewCatSub("");
      showToast(`Kategori baru "${newCatLabel}" (${slug}) berhasil dibuat`);
    } catch (err) {
      setCatError(err.message || "Gagal membuat kategori baru.");
    }
  };

  const handleAddSubToCat = (catId) => {
    const val = (subInputs[catId] || "").trim();
    if (!val) return;
    try {
      addSubcategory(catId, val);
      setSubInputs((prev) => ({ ...prev, [catId]: "" }));
      showToast(`Subkategori "${val}" berhasil ditambahkan`);
    } catch (err) {
      setCatError(err.message || "Gagal menambah subkategori.");
    }
  };

  const handleDeleteCategory = (catId, label) => {
    setCatError("");
    try {
      deleteCategory(catId);
      if (catFilter === catId) setCatFilter("semua");
      showToast(`Kategori "${label}" berhasil dihapus`);
    } catch (err) {
      setCatError(err.message || "Gagal menghapus kategori.");
    }
  };

  const handleExportProductsExcel = () => {
    const headers = [
      { key: "no", label: "No" },
      { key: "id", label: "ID" },
      { key: "namaProduk", label: "Nama Koleksi" },
      { key: "kategori", label: "Kategori Utama" },
      { key: "subkategori", label: "Subkategori" },
      { key: "warna", label: "Warna" },
      { key: "ukuran", label: "Ukuran" },
      { key: "spesifikasi", label: "Spesifikasi Bawaan" },
      { key: "hargaSewa", label: "Harga Sewa / 3 Hari", isCurrency: true },
      { key: "deposit", label: "Deposit", isCurrency: true },
      { key: "labelTag", label: "Label" },
      { key: "ketersediaan", label: "Status Ketersediaan" },
    ];
    const rows = buildProductReportRows(filteredProducts, getCategoryLabel);
    exportToExcel({
      title: "Laporan Inventaris & Katalog Kebaya AYDATTIRE",
      subtitle: `Filter Kategori: ${catFilter === "semua" ? "Semua" : getCategoryLabel(catFilter)}`,
      summaryItems: [
        { label: "Total Koleksi", value: `${filteredProducts.length} Item` },
        {
          label: "Tersedia",
          value: `${filteredProducts.filter((p) => !p?.booked).length} Item`,
        },
        {
          label: "Sedang Penuh",
          value: `${filteredProducts.filter((p) => p?.booked).length} Item`,
        },
      ],
      headers,
      rows,
      filename: `katalog-aydattire-${todayISO()}.xls`,
    });
    showToast("Katalog produk berhasil diekspor ke Excel (.xls)");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const result = await uploadFile(file, "products", "kebaya");
      const uploadedUrl =
        typeof result === "string"
          ? result
          : result?.url || result?.publicUrl || "";

      if (!uploadedUrl || typeof uploadedUrl !== "string") {
        throw new Error("Gagal mengekstrak URL foto yang diunggah.");
      }

      setForm((prev) => ({
        ...prev,
        img: uploadedUrl,
        galleryText:
          prev.galleryText && prev.galleryText !== "[object Object]"
            ? `${uploadedUrl}\n${prev.galleryText}`
            : uploadedUrl,
      }));
      showToast("Foto produk berhasil diunggah");
    } catch (err) {
      showToast(err.message || "Gagal mengunggah foto produk");
    } finally {
      setUploadingImg(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    let cleanImg =
      typeof form.img === "string"
        ? form.img.trim()
        : form.img?.url || form.img?.publicUrl || "";
    if (cleanImg === "[object Object]") {
      cleanImg = "";
    }

    const galleryLines = (typeof form.galleryText === "string" ? form.galleryText : "")
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s && s !== "[object Object]");

    const primaryImg =
      cleanImg ||
      galleryLines[0] ||
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=900&q=80&auto=format&fit=crop";

    if (!primaryImg || primaryImg === "[object Object]") {
      showToast("URL Foto utama tidak valid.");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      cat: form.cat,
      sub: form.sub,
      price: Number(form.price) || 0,
      deposit: Number(form.deposit) || 150000,
      sizes: form.sizes,
      color: form.color,
      tema: form.tema,
      booked: Boolean(form.booked),
      tag: form.booked ? "Penuh" : form.tag === "Penuh" ? "Tersedia" : form.tag,
      img: primaryImg,
      gallery: galleryLines.length > 0 ? galleryLines : [primaryImg],
      bahan: form.bahan.trim(),
      ukuran: {
        LD: form.ld.trim() || "88–96 cm",
        Panjang: form.panjang.trim() || "65 cm",
        Pinggang: form.pinggang.trim() || "70–78 cm",
      },
      aksesori: form.aksesoriText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      if (editingId !== null) {
        await updateProduct(editingId, payload);
        showToast(`Koleksi "${payload.name}" berhasil diperbarui`);
      } else {
        await createProduct(payload);
        showToast(`Koleksi baru "${payload.name}" berhasil ditambahkan`);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggleBooked = async (p) => {
    const nextBooked = !p.booked;
    const nextTag = nextBooked ? "Penuh" : p.tag === "Penuh" ? "Tersedia" : p.tag;
    await updateProduct(p.id, { booked: nextBooked, tag: nextTag });
    showToast(
      `Status "${p.name}" diubah menjadi ${nextBooked ? "Penuh / Disewa" : "Tersedia"}`
    );
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    await deleteProduct(deleteTarget.id);
    setDeleteTarget(null);
    showToast(`Koleksi "${name}" telah dihapus dari katalog`);
  };

  const availableSubFilters = useMemo(() => {
    if (catFilter === "semua") {
      return Array.from(new Set(Object.values(activeSubcatsMap).flat()));
    }
    return activeSubcatsMap[catFilter] || [];
  }, [catFilter, activeSubcatsMap]);

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">Manajemen Katalog Kebaya &amp; Jas</span>
          <h1>Katalog Produk ({safeProducts.length})</h1>
          <p className="muted">
            Kelola koleksi busana, buat kategori/subkategori baru, perbarui harga sewa, dan atur ketersediaan stok.
          </p>
        </div>
        <div className="admin-head-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setCatError("");
              setCatModalOpen(true);
            }}
          >
            <span className="material-symbols-rounded">category</span>
            <span>Kelola Kategori &amp; Subkategori</span>
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleExportProductsExcel}
          >
            <span className="material-symbols-rounded">table_view</span>
            <span>Export Excel</span>
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={refreshProducts}>
            <span className="material-symbols-rounded">sync</span>
            <span>Muat Ulang</span>
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={openAddModal}>
            <span className="material-symbols-rounded">add_circle</span>
            <span>Tambah Kebaya Baru</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="toast" role="status">
          <span className="material-symbols-rounded">check_circle</span>
          <span>{feedback}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="panel admin-toolbar">
        <div style={{ display: "grid", gap: 10, flex: 1 }}>
          <div className="admin-filter-pills">
            <span className="icon-inline muted" style={{ marginRight: 4, fontSize: ".85rem" }}>
              <span className="material-symbols-rounded">filter_list</span>
              <span>Kategori:</span>
            </span>
            <button
              type="button"
              className={`pill ${catFilter === "semua" ? "active" : ""}`}
              onClick={() => {
                setCatFilter("semua");
                setSubFilter("semua");
              }}
            >
              Semua Koleksi ({safeProducts.length})
            </button>
            {safeCategories.map((c) => {
              const count = safeProducts.filter((p) => p?.cat === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`pill ${catFilter === c.id ? "active" : ""}`}
                  onClick={() => {
                    setCatFilter(c.id);
                    setSubFilter("semua");
                  }}
                >
                  {c.label} ({count})
                </button>
              );
            })}
          </div>

          {availableSubFilters.length > 0 && (
            <div className="admin-filter-pills">
              <span className="icon-inline muted" style={{ marginRight: 4, fontSize: ".8rem" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                  label
                </span>
                <span>Subkategori:</span>
              </span>
              <button
                type="button"
                className={`dep-chip ${subFilter === "semua" ? "on" : ""}`}
                onClick={() => setSubFilter("semua")}
              >
                Semua Subkategori
              </button>
              {availableSubFilters.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  className={`dep-chip ${subFilter === sub ? "on" : ""}`}
                  onClick={() => setSubFilter(sub)}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="search" style={{ minWidth: 280 }}>
          <span className="material-symbols-rounded">search</span>
          <input
            type="search"
            placeholder="Cari nama kebaya, kategori, atau warna..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Product Table */}
      <div className="panel">
        {productsLoading ? (
          <div className="loading-box">
            <span className="spinner dark" /> Memuat katalog kebaya...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-box" style={{ padding: 36 }}>
            <p className="muted">Tidak ada produk yang cocok dengan pencarian Anda.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Kategori &amp; Warna</th>
                  <th>Ukuran &amp; Spesifikasi</th>
                  <th>Harga Sewa / 3 Hari</th>
                  <th>Status Ketersediaan</th>
                  <th className="r">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="admin-prod-cell">
                        <img
                          src={
                            typeof p.img === "string" && p.img !== "[object Object]"
                              ? p.img
                              : "/assets/img/hero.jpg"
                          }
                          alt={p.name}
                          className="admin-prod-thumb"
                          onError={(e) => {
                            e.target.src = "/assets/img/hero.jpg";
                          }}
                        />
                        <div>
                          <strong>{p.name}</strong>
                          <small className="block-muted">
                            ID #{p.id} · Label: <b>{p.tag || "Tersedia"}</b>
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{p.sub}</strong>
                      <small className="block-muted">
                        {getCategoryLabel(p.cat)} · Warna {p.color}
                      </small>
                    </td>
                    <td>
                      <div className="admin-size-badges">
                        {(p.sizes || []).map((s) => (
                          <span key={s} className="mini-pill info">
                            {s}
                          </span>
                        ))}
                      </div>
                      <small className="block-muted">
                        LD {p.ukuran?.LD || "-"} · P {p.ukuran?.Panjang || "-"} · LP{" "}
                        {p.ukuran?.Pinggang || "-"}
                      </small>
                    </td>
                    <td>
                      <strong className="maroon">{formatIDR(p.price)}</strong>
                      <small className="block-muted">
                        Deposit: {formatIDR(p.deposit || 150000)}
                      </small>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`status-badge ${p.booked ? "off" : "paid"} badge-with-icon`}
                        style={{ cursor: "pointer", border: "none" }}
                        onClick={() => handleQuickToggleBooked(p)}
                        title="Klik untuk mengubah status ketersediaan"
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: 15 }}>
                          {p.booked ? "cancel" : "check_circle"}
                        </span>
                        <span>{p.booked ? "Sedang Penuh" : "Tersedia"}</span>
                      </button>
                    </td>
                    <td className="r">
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => openEditModal(p)}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                            edit
                          </span>
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs danger-text"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                            delete
                          </span>
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Kelola Kategori & Subkategori */}
      {catModalOpen && (
        <div className="modal-backdrop" onClick={() => setCatModalOpen(false)}>
          <div
            className="modal admin-prod-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-head" style={{ marginBottom: 4 }}>
              <div>
                <span className="eyebrow">Pengaturan Master Katalog</span>
                <h4>Kelola Kategori &amp; Subkategori</h4>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setCatModalOpen(false)}
              >
                <span className="material-symbols-rounded">close</span>
                <span>Tutup</span>
              </button>
            </div>

            {catError && (
              <p className="form-error" role="alert" style={{ marginTop: 8 }}>
                {catError}
              </p>
            )}

            {/* Form Buat Kategori Utama Baru */}
            <form onSubmit={handleCreateCategory} className="admin-cat-create-box">
              <h5>+ Buat Kategori Utama Baru</h5>
              <div className="admin-cat-create-grid">
                <input
                  type="text"
                  placeholder="Nama Kategori (misal: Busana Anak / Paket Couple)"
                  value={newCatLabel}
                  onChange={(e) => setNewCatLabel(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Subkategori Awal (misal: Kebaya Anak)"
                  value={newCatSub}
                  onChange={(e) => setNewCatSub(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  <span className="material-symbols-rounded">add_circle</span>
                  <span>Tambah Kategori</span>
                </button>
              </div>
            </form>

            {/* Daftar Kategori & Subkategori */}
            <div className="admin-cat-list">
              {safeCategories.map((cat) => {
                const prodCount = safeProducts.filter((p) => p?.cat === cat.id).length;
                const isDefault = cat.id === "wanita" || cat.id === "pria";
                return (
                  <div key={cat.id} className="admin-cat-card">
                    <div className="admin-cat-card-head">
                      <div>
                        <strong>{cat.label}</strong>
                        <small className="block-muted">
                          Kode: <code>{cat.id}</code> · {prodCount} Produk ·{" "}
                          {(cat.subcategories || []).length} Subkategori
                        </small>
                      </div>
                      {!isDefault && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs danger-text"
                          onClick={() => handleDeleteCategory(cat.id, cat.label)}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                            delete
                          </span>
                          <span>Hapus Kategori</span>
                        </button>
                      )}
                    </div>

                    <div className="admin-chip-group" style={{ margin: "10px 0" }}>
                      {(cat.subcategories || []).map((sub) => (
                        <span key={sub} className="admin-subcat-pill">
                          <span>{sub}</span>
                          <button
                            type="button"
                            aria-label={`Hapus subkategori ${sub}`}
                            onClick={() => removeSubcategory(cat.id, sub)}
                            title="Hapus subkategori ini"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="admin-subcat-add">
                      <input
                        type="text"
                        placeholder={`Tambah subkategori di ${cat.label}…`}
                        value={subInputs[cat.id] || ""}
                        onChange={(e) =>
                          setSubInputs((prev) => ({ ...prev, [cat.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSubToCat(cat.id);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() => handleAddSubToCat(cat.id)}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                          add
                        </span>
                        <span>Tambah Subkategori</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCatModalOpen(false)}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Produk */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div
            className="modal admin-prod-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-head" style={{ marginBottom: 4 }}>
              <div>
                <span className="eyebrow">
                  {editingId !== null ? `Edit Produk #${editingId}` : "Koleksi Baru"}
                </span>
                <h4>
                  {editingId !== null
                    ? "Perbarui Detail Kebaya / Jas"
                    : "Tambah Kebaya Baru"}
                </h4>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setModalOpen(false)}
              >
                <span className="material-symbols-rounded">close</span>
                <span>Tutup</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form admin-prod-form">
              <div className="form-grid">
                <div className="form-group full">
                  <label htmlFor="prod-name">Nama Koleksi Kebaya / Beskap *</label>
                  <input
                    id="prod-name"
                    type="text"
                    required
                    placeholder="Contoh: Kebaya Kutubaru Beludru Klasik"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prod-cat">Kategori Utama *</label>
                  <select
                    id="prod-cat"
                    value={form.cat}
                    onChange={(e) => handleCatChange(e.target.value)}
                  >
                    {safeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label htmlFor="prod-sub">Subkategori *</label>
                    <button
                      type="button"
                      className="link-btn"
                      style={{ fontSize: ".75rem" }}
                      onClick={() => setQuickSubOpen((v) => !v)}
                    >
                      {quickSubOpen ? "Batal" : "+ Subkategori Baru"}
                    </button>
                  </div>
                  <select
                    id="prod-sub"
                    value={form.sub}
                    onChange={(e) => setForm({ ...form, sub: e.target.value })}
                  >
                    {(activeSubcatsMap[form.cat] || []).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                    {form.sub &&
                      !(activeSubcatsMap[form.cat] || []).includes(form.sub) && (
                        <option value={form.sub}>{form.sub}</option>
                      )}
                  </select>
                  {quickSubOpen && (
                    <div className="admin-subcat-add" style={{ marginTop: 6 }}>
                      <input
                        type="text"
                        placeholder="Ketik nama subkategori baru…"
                        value={quickSubName}
                        onChange={(e) => setQuickSubName(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={handleQuickAddSub}
                      >
                        Simpan
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="prod-price">Harga Sewa (Rp / Paket 3 Hari) *</label>
                  <input
                    id="prod-price"
                    type="number"
                    min="50000"
                    step="5000"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prod-deposit">Deposit Jaminan (Rp)</label>
                  <input
                    id="prod-deposit"
                    type="number"
                    min="0"
                    step="10000"
                    value={form.deposit}
                    onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prod-color">Warna Dominan</label>
                  <select
                    id="prod-color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                  >
                    {COLORS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="prod-tag">Label Badge &amp; Stok</label>
                  <div className="admin-inline-inputs">
                    <select
                      id="prod-tag"
                      value={form.tag}
                      onChange={(e) => setForm({ ...form, tag: e.target.value })}
                    >
                      <option value="Tersedia">Tersedia</option>
                      <option value="Terlaris">Terlaris</option>
                      <option value="Baru">Baru</option>
                      <option value="Premium">Premium</option>
                      <option value="Penuh">Penuh</option>
                    </select>
                    <label className="admin-check-inline">
                      <input
                        type="checkbox"
                        checked={form.booked}
                        onChange={(e) =>
                          setForm({ ...form, booked: e.target.checked })
                        }
                      />
                      <span>Tandai Penuh</span>
                    </label>
                  </div>
                </div>

                {/* Pilihan Ukuran Tersedia */}
                <div className="form-group full">
                  <span className="field-label">Ukuran Tersedia *</span>
                  <div className="admin-chip-group">
                    {SIZES.map((s) => {
                      const active = form.sizes.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          className={`admin-chip-btn ${active ? "active" : ""}`}
                          onClick={() => toggleArrayItem("sizes", s)}
                        >
                          Ukuran {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pilihan Tema Acara */}
                <div className="form-group full">
                  <span className="field-label">Tema Acara</span>
                  <div className="admin-chip-group">
                    {TEMA.map((t) => {
                      const active = form.tema.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          className={`admin-chip-btn ${active ? "active" : ""}`}
                          onClick={() => toggleArrayItem("tema", t)}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Spesifikasi Ukuran Bawaan (LD, Panjang, Pinggang) */}
                <div className="form-group">
                  <label htmlFor="prod-ld">Lingkar Dada (LD) Bawaan</label>
                  <input
                    id="prod-ld"
                    type="text"
                    placeholder="Contoh: 88–96 cm"
                    value={form.ld}
                    onChange={(e) => setForm({ ...form, ld: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prod-panjang">Panjang Baju Bawaan</label>
                  <input
                    id="prod-panjang"
                    type="text"
                    placeholder="Contoh: 65 cm"
                    value={form.panjang}
                    onChange={(e) => setForm({ ...form, panjang: e.target.value })}
                  />
                </div>

                <div className="form-group full">
                  <label htmlFor="prod-pinggang">Lingkar Pinggang Bawaan</label>
                  <input
                    id="prod-pinggang"
                    type="text"
                    placeholder="Contoh: 70–78 cm"
                    value={form.pinggang}
                    onChange={(e) => setForm({ ...form, pinggang: e.target.value })}
                  />
                </div>

                {/* Unggah Foto Kebaya atau Input URL */}
                <div className="form-group full admin-upload-row">
                  <div style={{ flex: 1 }}>
                    <label htmlFor="prod-img">URL Foto Utama Kebaya *</label>
                    <input
                      id="prod-img"
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={
                        typeof form.img === "string" && form.img !== "[object Object]"
                          ? form.img
                          : ""
                      }
                      onChange={(e) => setForm({ ...form, img: e.target.value })}
                    />
                    <label className="resi-file" style={{ marginTop: 8 }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploadingImg}
                      />
                      <span className="material-symbols-rounded">cloud_upload</span>
                      <span>
                        {uploadingImg
                          ? "Mengunggah ke Supabase Storage..."
                          : "Atau Unggah Foto dari Perangkat (Supabase Storage)"}
                      </span>
                    </label>
                  </div>
                  {form.img &&
                    typeof form.img === "string" &&
                    form.img !== "[object Object]" && (
                      <img
                        src={form.img}
                        alt="Preview"
                        className="admin-upload-preview"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    )}
                </div>

                <div className="form-group full">
                  <label htmlFor="prod-bahan">Deskripsi Bahan &amp; Detail Kebaya *</label>
                  <textarea
                    id="prod-bahan"
                    rows={2}
                    required
                    placeholder="Deskripsikan jenis kain brokat, payet, furing, dan kenyamanan bahan..."
                    value={form.bahan}
                    onChange={(e) => setForm({ ...form, bahan: e.target.value })}
                  />
                </div>

                <div className="form-group full">
                  <label htmlFor="prod-aksesori">Kelengkapan Paket / Aksesori (pisahkan dengan koma)</label>
                  <input
                    id="prod-aksesori"
                    type="text"
                    placeholder="Selendang senada, Bros kebaya, Jarik instan, Hanger & garment bag"
                    value={form.aksesoriText}
                    onChange={(e) =>
                      setForm({ ...form, aksesoriText: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setModalOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || uploadingImg}
                >
                  <span className="material-symbols-rounded">
                    {editingId !== null ? "edit" : "add_circle"}
                  </span>
                  <span>
                    {saving
                      ? "Menyimpan..."
                      : editingId !== null
                      ? "Simpan Perubahan"
                      : "Tambahkan Kebaya"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h4>Hapus Koleksi Kebaya?</h4>
            <p>
              Apakah Anda yakin ingin menghapus <strong>{deleteTarget.name}</strong> dari katalog
              AYDATTIRE? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDeleteTarget(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmDelete}
              >
                <span className="material-symbols-rounded">delete</span>
                <span>Ya, Hapus Produk</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

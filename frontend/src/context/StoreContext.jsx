// ===================== Store global (Supabase + Fallback LocalStorage) =====================
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { defaultCustomSize, PAYMENT_HOLD_MINUTES, PRODUCTS, SUBCATS } from "../data/products";
import { isSupabaseConfigured, supabase, uploadOrderFile } from "../lib/supabase";
import { addDays, buildSchedule } from "../utils/format";

const KEY = "aydattire:v1";
const PRODUCTS_KEY = "aydattire:products:v1";
const CATEGORIES_KEY = "aydattire:categories:v1";
const ADMIN_SESSION_KEY = "aydattire:admin:v1";

export const DEFAULT_CATEGORIES = [
  {
    id: "wanita",
    label: "Kebaya Wanita",
    shortLabel: "Wanita",
    subcategories: [...(SUBCATS.wanita || ["Kebaya Modern", "Kutubaru", "Encim", "Wisuda", "Pengantin"])],
  },
  {
    id: "pria",
    label: "Beskap & Jas Pria",
    shortLabel: "Pria",
    subcategories: [...(SUBCATS.pria || ["Beskap Tradisional", "Basofi", "Jas"])],
  },
];

function loadLocalCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c) => ({
          id: String(c.id || "").trim().toLowerCase(),
          label: String(c.label || c.id || "").trim(),
          shortLabel: String(c.shortLabel || c.label || c.id || "").trim(),
          subcategories: Array.isArray(c.subcategories) ? c.subcategories : [],
        }));
      }
    }
  } catch {
    // abaikan
  }
  return DEFAULT_CATEGORIES;
}

const initial = {
  cart: { schedule: null, items: [] }, // schedule: { type, eventDate }
  orders: [],
  favorites: [],
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...initial, ...JSON.parse(raw) } : initial;
  } catch {
    return initial;
  }
}

function loadLocalProducts() {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p) => {
          let cleanImg =
            typeof p.img === "string"
              ? p.img.trim()
              : p.img?.url || p.img?.publicUrl || "";
          if (!cleanImg || cleanImg === "[object Object]") {
            cleanImg = "/assets/img/hero.jpg";
          }
          return { ...p, img: cleanImg };
        });
      }
    }
  } catch {
    // abaikan error
  }
  return PRODUCTS;
}

function loadLocalAdmin() {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function mapDbOrder(row) {
  const schedule =
    Array.isArray(row.schedule) && row.schedule.length
      ? row.schedule
      : buildSchedule(row.type, row.event_date);

  return {
    id: row.id,
    customer: row.customer || {},
    type: row.type,
    eventDate: row.event_date,
    tglAmbil: row.tgl_ambil,
    tglPakai: row.tgl_pakai,
    tglKembali: row.tgl_kembali,
    tglSelesaiLaundry: row.tgl_selesai_laundry,
    schedule,
    items: (row.order_items || []).map((it) => ({
      id: it.id,
      productId: Number(it.product_id),
      name: it.name,
      img: it.img,
      sub: it.sub,
      size: it.size,
      price: it.price,
      deposit: it.deposit,
      ukuran: it.ukuran || {},
      customSize: it.custom_size || { isCustom: false, ld: "", panjang: "", pinggang: "", note: "" },
    })),
    security: row.security,
    payment: row.payment,
    totals: row.totals || {},
    refund: row.refund || null,
    status: row.status,
    payMethod: row.pay_method || row.payMethod || null,
    proofUrl: row.proof_url || row.proofUrl || "",
    proofName: row.proof_name || row.proofName || null,
    balanceProofUrl: row.balance_proof_url || row.balanceProofUrl || "",
    balancePayMethod: row.balance_pay_method || row.balance_method || row.balancePayMethod || row.balanceMethod || "",
    balanceMethod: row.balance_method || row.balanceMethod || row.balance_pay_method || row.balancePayMethod || "",
    balancePaidAt: row.balance_paid_at
      ? (typeof row.balance_paid_at === "number" ? row.balance_paid_at : new Date(row.balance_paid_at).getTime())
      : row.balancePaidAt
      ? (typeof row.balancePaidAt === "number" ? row.balancePaidAt : new Date(row.balancePaidAt).getTime())
      : null,
    balanceVerified: Boolean(row.balance_verified ?? row.balanceVerified ?? false),
    outboundShipment: (() => {
      const ob = row.outbound_shipment || row.outboundShipment;
      if (!ob || typeof ob !== "object") return null;
      return {
        courier: ob.courier || "JNE",
        number: ob.number || "",
        proofUrl: ob.proof_url || ob.proofUrl || "",
        proofName: ob.proof_name || ob.proofName || "",
        shippedAt: ob.shipped_at || ob.shippedAt || null,
      };
    })(),
    returnShipment: row.return_shipment || row.returnShipment || null,
    depositStatus: row.deposit_status || row.depositStatus || "holding",
    depositPenalty: Number(row.deposit_penalty ?? row.depositPenalty ?? 0),
    depositRefundProofUrl: row.deposit_refund_proof_url || row.depositRefundProofUrl || null,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : (row.createdAt || Date.now()),
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : (row.expiresAt || Date.now() + PAYMENT_HOLD_MINUTES * 60000),
    paidAt: row.paid_at ? new Date(row.paid_at).getTime() : (row.paidAt || null),
  };
}

function reducer(state, action) {
  switch (action.type) {
    case "cart/add": {
      const { productId, size, schedule, customSize, product } = action;
      const baseCustom = customSize || defaultCustomSize(product);
      const sameSchedule =
        state.cart.schedule &&
        state.cart.schedule.type === schedule.type &&
        state.cart.schedule.eventDate === schedule.eventDate;
      const base = sameSchedule ? state.cart.items : [];
      const exists = base.some((i) => i.productId === productId);
      const items = exists
        ? base.map((i) =>
            i.productId === productId
              ? { ...i, size, customSize: i.customSize || baseCustom }
              : i
          )
        : [...base, { productId, size, customSize: baseCustom }];
      return { ...state, cart: { schedule, items } };
    }
    case "cart/remove": {
      const items = state.cart.items.filter((i) => i.productId !== action.productId);
      return { ...state, cart: { schedule: items.length ? state.cart.schedule : null, items } };
    }
    case "cart/size":
      return {
        ...state,
        cart: { ...state.cart, items: state.cart.items.map((i) => (i.productId === action.productId ? { ...i, size: action.size } : i)) },
      };
    case "cart/customSize":
      return {
        ...state,
        cart: {
          ...state.cart,
          items: state.cart.items.map((i) => {
            if (i.productId !== action.productId) return i;
            const prev = i.customSize || defaultCustomSize(action.product);
            return { ...i, customSize: { ...prev, ...action.customSize } };
          }),
        },
      };
    case "cart/schedule":
      return { ...state, cart: { ...state.cart, schedule: action.schedule } };
    case "cart/clear":
      return { ...state, cart: initial.cart };

    case "orders/set": {
      const prevMap = new Map((state.orders || []).map((o) => [o.id, o]));
      const merged = (action.orders || []).map((incoming) => {
        const prev = prevMap.get(incoming.id);
        if (!prev) return incoming;
        return {
          ...incoming,
          balanceProofUrl: incoming.balanceProofUrl || prev.balanceProofUrl || null,
          balancePayMethod: incoming.balancePayMethod || prev.balancePayMethod || null,
          balancePaidAt: incoming.balancePaidAt || prev.balancePaidAt || null,
          balanceVerified: Boolean(incoming.balanceVerified || prev.balanceVerified),
        };
      });
      return { ...state, orders: merged };
    }
    case "order/create": {
      const filtered = state.orders.filter((o) => o.id !== action.order.id);
      return { ...state, orders: [action.order, ...filtered] };
    }
    case "order/update":
      return { ...state, orders: state.orders.map((o) => (o.id === action.id ? { ...o, ...action.patch } : o)) };

    case "fav/toggle": {
      const has = state.favorites.includes(action.id);
      return { ...state, favorites: has ? state.favorites.filter((f) => f !== action.id) : [...state.favorites, action.id] };
    }
    default:
      return state;
  }
}

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const [products, setProducts] = useState(loadLocalProducts);
  const [categories, setCategories] = useState(loadLocalCategories);
  const [loadingProducts, setLoadingProducts] = useState(isSupabaseConfigured);
  const [loadingOrders, setLoadingOrders] = useState(isSupabaseConfigured);
  const [dbError, setDbError] = useState("");

  // Admin Auth state (Supabase Auth + Demo Fallback)
  const [adminUser, setAdminUser] = useState(loadLocalAdmin);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    } catch {
      // abaikan
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    } catch {
      // abaikan
    }
  }, [categories]);

  // Sinkronkan subkategori / kategori baru yang ditemukan dari daftar produk
  useEffect(() => {
    if (!Array.isArray(products) || !products.length) return;
    setCategories((prev) => {
      let changed = false;
      const next = prev.map((c) => ({ ...c, subcategories: [...c.subcategories] }));
      products.forEach((p) => {
        const catId = String(p?.cat || "").trim().toLowerCase();
        const subName = String(p?.sub || "").trim();
        if (!catId) return;
        let foundCat = next.find((c) => c.id === catId);
        if (!foundCat) {
          const cap = catId.charAt(0).toUpperCase() + catId.slice(1);
          foundCat = {
            id: catId,
            label: `Koleksi ${cap}`,
            shortLabel: cap,
            subcategories: subName ? [subName] : [],
          };
          next.push(foundCat);
          changed = true;
        } else if (subName && !foundCat.subcategories.includes(subName)) {
          foundCat.subcategories.push(subName);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [products]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        if (data?.session?.user) {
          const u = { email: data.session.user.email, id: data.session.user.id, mode: "supabase" };
          setAdminUser(u);
          localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(u));
        }
      })
      .catch(() => {
        // Jika gagal terhubung ke Supabase Auth, tetap gunakan sesi lokal jika ada
      })
      .finally(() => {
        if (mounted) setAuthLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = { email: session.user.email, id: session.user.id, mode: "supabase" };
        setAdminUser(u);
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(u));
      } else {
        const local = loadLocalAdmin();
        if (local?.mode !== "demo") {
          setAdminUser(null);
          localStorage.removeItem(ADMIN_SESSION_KEY);
        }
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const findProduct = useCallback(
    (id) => products.find((p) => p.id === Number(id)) || PRODUCTS.find((p) => p.id === Number(id)),
    [products]
  );

  // Ambil katalog produk dari Supabase (fallback ke localStorage / PRODUCTS statis)
  const refreshProducts = useCallback(async () => {
    if (!supabase) {
      const local = loadLocalProducts();
      setProducts(local);
      setLoadingProducts(false);
      return local;
    }
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("id", { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        const mapped = data.map((r) => ({
          id: Number(r.id),
          name: r.name,
          cat: r.cat,
          sub: r.sub,
          img: r.img,
          price: r.price,
          deposit: r.deposit,
          sizes: r.sizes || [],
          color: r.color,
          tema: r.tema || [],
          tag: r.tag || "Tersedia",
          booked: Boolean(r.booked),
          bahan: r.bahan || "",
          ukuran: r.ukuran || { LD: "", Panjang: "", Pinggang: "" },
          aksesori: r.aksesori || undefined,
        }));
        setProducts(mapped);
        setDbError("");
        return mapped;
      }
      const local = loadLocalProducts();
      setProducts(local);
      return local;
    } catch (err) {
      setDbError(err.message || "Gagal memuat katalog dari Supabase, memakai data lokal.");
      const local = loadLocalProducts();
      setProducts(local);
      return local;
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Ambil daftar pesanan beserta order_items dari Supabase
  const refreshOrders = useCallback(async () => {
    if (!supabase) {
      setLoadingOrders(false);
      return;
    }
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        dispatch({ type: "orders/set", orders: data.map(mapDbOrder) });
        setDbError("");
      }
    } catch (err) {
      setDbError(err.message || "Gagal sinkronisasi pesanan dari Supabase.");
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    refreshProducts();
    refreshOrders();
  }, [refreshProducts, refreshOrders]);

  // Peta tanggal yang sudah terkunci oleh pesanan aktif/terbayar/pending yang belum expired
  const bookedDatesByProduct = useMemo(() => {
    const map = {};
    const now = Date.now();
    state.orders.forEach((o) => {
      const isHoldActive = o.status === "pending" && o.expiresAt > now;
      const isConfirmed = ["paid", "active", "returned"].includes(o.status);
      if (!isHoldActive && !isConfirmed) return;

      const dates = [];
      if (o.tglAmbil && o.tglSelesaiLaundry) {
        let cur = o.tglAmbil;
        while (cur <= o.tglSelesaiLaundry) {
          dates.push(cur);
          cur = addDays(cur, 1);
        }
      } else if (Array.isArray(o.schedule)) {
        o.schedule.forEach((s) => dates.push(s.date));
      }

      (o.items || []).forEach((it) => {
        const pid = Number(it.productId);
        if (!map[pid]) map[pid] = new Set();
        dates.forEach((d) => map[pid].add(d));
      });
    });
    return map;
  }, [state.orders]);

  const api = useMemo(() => {
    const cartItems = state.cart.items
      .map((i) => {
        const product = findProduct(i.productId);
        if (!product) return null;
        return {
          ...i,
          product,
          customSize: { ...defaultCustomSize(product), ...(i.customSize || {}) },
        };
      })
      .filter(Boolean);

    const subcatsMap = {};
    categories.forEach((c) => {
      subcatsMap[c.id] = Array.isArray(c.subcategories) ? c.subcategories : [];
    });

    const getCategoryLabel = (catId) => {
      const found = categories.find((c) => c.id === catId);
      if (found) return found.label;
      if (catId === "wanita") return "Kebaya Wanita";
      if (catId === "pria") return "Beskap & Jas Pria";
      return catId ? catId.charAt(0).toUpperCase() + catId.slice(1) : "-";
    };

    return {
      state,
      products,
      categories,
      subcatsMap,
      getCategoryLabel,
      loadingProducts,
      loadingOrders,
      dbError,
      isSupabaseConfigured,
      bookedDatesByProduct,
      cartItems,
      cartCount: cartItems.length,
      getProductById: findProduct,
      refreshProducts,
      refreshOrders,

      // ---------- Manajemen Kategori & Subkategori (Admin) ----------
      addCategory: ({ id, label, shortLabel, initialSub }) => {
        const cleanLabel = String(label || "").trim();
        if (!cleanLabel) throw new Error("Nama kategori wajib diisi.");
        const slug = String(id || cleanLabel)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
        if (!slug) throw new Error("ID kategori tidak valid.");

        setCategories((prev) => {
          if (prev.some((c) => c.id === slug)) {
            throw new Error(`Kategori dengan kode "${slug}" sudah ada.`);
          }
          const cleanSub = String(initialSub || "").trim();
          return [
            ...prev,
            {
              id: slug,
              label: cleanLabel,
              shortLabel: String(shortLabel || cleanLabel).trim(),
              subcategories: cleanSub ? [cleanSub] : ["Koleksi Umum"],
            },
          ];
        });
        return slug;
      },

      updateCategory: (catId, patch) => {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === catId
              ? {
                  ...c,
                  label: patch.label !== undefined ? String(patch.label).trim() : c.label,
                  shortLabel:
                    patch.shortLabel !== undefined ? String(patch.shortLabel).trim() : c.shortLabel,
                }
              : c
          )
        );
      },

      deleteCategory: (catId) => {
        const usedCount = products.filter((p) => p.cat === catId).length;
        if (usedCount > 0) {
          throw new Error(
            `Kategori ini masih digunakan oleh ${usedCount} produk. Pindahkan atau hapus produk tersebut terlebih dahulu.`
          );
        }
        setCategories((prev) => prev.filter((c) => c.id !== catId));
      },

      addSubcategory: (catId, subName) => {
        const cleanSub = String(subName || "").trim();
        if (!cleanSub) throw new Error("Nama subkategori wajib diisi.");
        setCategories((prev) =>
          prev.map((c) => {
            if (c.id !== catId) return c;
            const exists = c.subcategories.some(
              (s) => s.toLowerCase() === cleanSub.toLowerCase()
            );
            if (exists) return c;
            return {
              ...c,
              subcategories: [...c.subcategories, cleanSub],
            };
          })
        );
        return cleanSub;
      },

      removeSubcategory: (catId, subName) => {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === catId
              ? {
                  ...c,
                  subcategories: c.subcategories.filter((s) => s !== subName),
                }
              : c
          )
        );
      },

      // ---------- Admin Auth ----------
      adminUser,
      authLoading,
      adminLogin: async (email, password) => {
        const cleanEmail = email.trim().toLowerCase();
        if (supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (!error && data?.user) {
            const u = { email: data.user.email, id: data.user.id, mode: "supabase" };
            setAdminUser(u);
            localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(u));
            return u;
          }
          // Fallback akun demo jika belum membuat user di Supabase Auth atau saat mode demo
          if (cleanEmail === "admin@aydattire.com" && password === "admin123") {
            const u = { email: cleanEmail, id: "demo-admin", mode: "demo" };
            setAdminUser(u);
            localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(u));
            return u;
          }
          throw new Error(error?.message || "Email atau kata sandi salah.");
        }
        if (cleanEmail === "admin@aydattire.com" && password === "admin123") {
          const u = { email: cleanEmail, id: "demo-admin", mode: "demo" };
          setAdminUser(u);
          localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(u));
          return u;
        }
        throw new Error("Kredensial tidak valid. Gunakan akun demo: admin@aydattire.com / admin123");
      },
      adminLogout: async () => {
        if (supabase) {
          await supabase.auth.signOut().catch(() => {});
        }
        setAdminUser(null);
        localStorage.removeItem(ADMIN_SESSION_KEY);
      },

      // ---------- Cart ----------
      addToCart: (productId, size, schedule, customSize) =>
        dispatch({ type: "cart/add", productId, size, schedule, customSize, product: findProduct(productId) }),
      removeFromCart: (productId) => dispatch({ type: "cart/remove", productId }),
      setItemSize: (productId, size) => dispatch({ type: "cart/size", productId, size }),
      setItemCustomSize: (productId, customSize) =>
        dispatch({ type: "cart/customSize", productId, customSize, product: findProduct(productId) }),
      setCartSchedule: (schedule) => dispatch({ type: "cart/schedule", schedule }),
      clearCart: () => dispatch({ type: "cart/clear" }),

      // ---------- Orders ----------
      createOrder: async (order) => {
        const now = Date.now();
        const expiresAtMs = now + PAYMENT_HOLD_MINUTES * 60000;
        const sched = order.schedule?.length ? order.schedule : buildSchedule(order.type, order.eventDate);
        const tglAmbil = sched[0]?.date || order.eventDate;
        const tglPakai = sched.find((s) => s.role === "pakai")?.date || order.eventDate;
        const tglKembali = sched.find((s) => s.role === "kembali")?.date || order.eventDate;
        const tglSelesaiLaundry = sched.find((s) => s.role === "laundry")?.date || tglKembali;

        const full = {
          ...order,
          schedule: sched,
          tglAmbil,
          tglPakai,
          tglKembali,
          tglSelesaiLaundry,
          createdAt: now,
          expiresAt: expiresAtMs,
          status: "pending",
          depositStatus: "holding",
          balanceProofUrl: null,
          balancePayMethod: null,
          balancePaidAt: null,
          balanceVerified: false,
        };

        if (supabase) {
          const { error: orderErr } = await supabase.from("orders").insert({
            id: full.id,
            customer: full.customer,
            type: full.type,
            event_date: full.eventDate,
            tgl_ambil: tglAmbil,
            tgl_pakai: tglPakai,
            tgl_kembali: tglKembali,
            tgl_selesai_laundry: tglSelesaiLaundry,
            schedule: sched,
            security: full.security,
            payment: full.payment,
            totals: full.totals,
            refund: full.refund,
            status: "pending",
            deposit_status: "holding",
            created_at: new Date(now).toISOString(),
            expires_at: new Date(expiresAtMs).toISOString(),
          });
          if (orderErr) throw new Error(`Gagal menyimpan pesanan ke database: ${orderErr.message}`);

          const itemsPayload = full.items.map((it) => ({
            order_id: full.id,
            product_id: it.productId,
            name: it.name,
            img: it.img,
            sub: it.sub,
            size: it.size,
            price: it.price,
            deposit: it.deposit,
            ukuran: it.ukuran || {},
            custom_size: it.customSize || defaultCustomSize(findProduct(it.productId)),
          }));
          const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
          if (itemsErr) throw new Error(`Gagal menyimpan detail item pesanan: ${itemsErr.message}`);
        }

        dispatch({ type: "order/create", order: full });
        return full;
      },

      updateOrder: async (id, patch) => {
        const existing = state.orders.find((o) => o.id === id);
        if (patch.status === "paid" && !patch.proofUrl && !existing?.proofUrl) {
          throw new Error(
            "Tidak dapat mengonfirmasi pembayaran karena pelanggan belum mengunggah foto bukti transfer."
          );
        }

        if (supabase) {
          const dbPatch = {};
          if (patch.status !== undefined) dbPatch.status = patch.status;
          if (patch.paidAt !== undefined) dbPatch.paid_at = patch.paidAt ? new Date(patch.paidAt).toISOString() : null;
          if (patch.payMethod !== undefined) dbPatch.pay_method = patch.payMethod;
          if (patch.proofUrl !== undefined) dbPatch.proof_url = patch.proofUrl;
          if (patch.proofName !== undefined) dbPatch.proof_name = patch.proofName;
          if (patch.balanceProofUrl !== undefined) dbPatch.balance_proof_url = patch.balanceProofUrl;
          if (patch.balancePayMethod !== undefined) dbPatch.balance_pay_method = patch.balancePayMethod;
          if (patch.balancePaidAt !== undefined) {
            dbPatch.balance_paid_at = patch.balancePaidAt
              ? new Date(patch.balancePaidAt).toISOString()
              : null;
          }
          if (patch.balanceVerified !== undefined) dbPatch.balance_verified = Boolean(patch.balanceVerified);
          if (patch.outboundShipment !== undefined) {
            if (patch.outboundShipment && typeof patch.outboundShipment === "object") {
              dbPatch.outbound_shipment = {
                courier: patch.outboundShipment.courier || "JNE",
                number: patch.outboundShipment.number || "",
                proof_url: patch.outboundShipment.proofUrl || patch.outboundShipment.proof_url || "",
                proof_name: patch.outboundShipment.proofName || patch.outboundShipment.proof_name || "",
                shipped_at: patch.outboundShipment.shippedAt || patch.outboundShipment.shipped_at || new Date().toISOString(),
              };
            } else {
              dbPatch.outbound_shipment = null;
            }
          }
          if (patch.returnShipment !== undefined) dbPatch.return_shipment = patch.returnShipment;
          if (patch.refund !== undefined) dbPatch.refund = patch.refund;
          if (patch.depositStatus !== undefined) dbPatch.deposit_status = patch.depositStatus;
          if (patch.depositPenalty !== undefined) dbPatch.deposit_penalty = patch.depositPenalty;
          if (patch.depositRefundProofUrl !== undefined) dbPatch.deposit_refund_proof_url = patch.depositRefundProofUrl;

          if (Object.keys(dbPatch).length > 0) {
            const { error } = await supabase.from("orders").update(dbPatch).eq("id", id);
            if (error) {
              // Jika kolom balance_* belum dimigrasi di Supabase remote, coba update kolom standar saja
              const isMissingBalanceCol =
                error.message?.includes("balance_") &&
                (dbPatch.balance_proof_url !== undefined ||
                  dbPatch.balance_paid_at !== undefined ||
                  dbPatch.balance_verified !== undefined);
              if (!isMissingBalanceCol) {
                throw new Error(`Gagal memperbarui pesanan: ${error.message}`);
              }
            }
          }
        }
        dispatch({ type: "order/update", id, patch });
      },

      uploadBalanceProof: async (orderId, file, payMethod = "Transfer Manual") => {
        let uploadedUrl = "";
        if (file) {
          const res = await uploadOrderFile(file, "payments", `${orderId}-pelunasan`);
          uploadedUrl =
            typeof res === "string" ? res.trim() : res?.url || res?.publicUrl || "";
          if (!uploadedUrl || uploadedUrl === "[object Object]") {
            throw new Error("Gagal mendapatkan URL bukti transfer pelunasan.");
          }
        }
        const paidAtIso = new Date().toISOString();
        const paidAtMs = new Date(paidAtIso).getTime();

        if (supabase) {
          const dbPayload = {
            balance_proof_url: uploadedUrl,
            balance_paid_at: paidAtIso,
            balance_verified: false,
          };
          if (payMethod) {
            dbPayload.balance_pay_method = payMethod;
          }
          const { error } = await supabase
            .from("orders")
            .update(dbPayload)
            .eq("id", orderId);
          if (error && !error.message?.includes("balance_")) {
            throw new Error(`Gagal menyimpan data pelunasan ke database: ${error.message}`);
          }
        }

        const patch = {
          balanceProofUrl: uploadedUrl,
          balancePayMethod: payMethod,
          balanceMethod: payMethod,
          balancePaidAt: paidAtMs,
          balanceVerified: false,
        };
        dispatch({ type: "order/update", id: orderId, patch });
        return { url: uploadedUrl, publicUrl: uploadedUrl, ...patch };
      },

      verifyBalancePayment: async (orderId, method = null) => {
        try {
          const existing = state.orders.find((o) => o.id === orderId);
          if (!existing) {
            throw new Error(`Pesanan dengan ID ${orderId} tidak ditemukan.`);
          }

          const isCashOrWa =
            typeof method === "string" &&
            (method.toLowerCase().includes("tunai") || method.toLowerCase().includes("wa"));

          if (!isCashOrWa && !existing.balanceProofUrl) {
            throw new Error(
              "Tidak dapat mengonfirmasi pembayaran karena pelanggan belum mengunggah foto bukti transfer."
            );
          }

          const paidAtMs = existing.balancePaidAt || Date.now();
          const paidAtIso = new Date(paidAtMs).toISOString();
          const updatedMethod =
            method || existing.balancePayMethod || existing.balanceMethod || "Pelunasan Terverifikasi";
          const nextStatus = existing.status === "pending" ? "paid" : existing.status;

          if (supabase) {
            const updatePayload = {
              balance_verified: true,
              status: nextStatus,
            };
            if (!existing.balancePaidAt) {
              updatePayload.balance_paid_at = paidAtIso;
            }
            if (method || !existing.balancePayMethod) {
              updatePayload.balance_pay_method = updatedMethod;
            }
            const { error } = await supabase
              .from("orders")
              .update(updatePayload)
              .eq("id", orderId);
            if (error) {
              console.error("[StoreContext] verifyBalancePayment Supabase error:", error);
              if (!error.message?.includes("balance_")) {
                throw new Error(`Gagal memverifikasi pelunasan di Supabase: ${error.message}`);
              }
            }
          }

          const patch = {
            balanceVerified: true,
            status: nextStatus,
            balancePaidAt: paidAtMs,
            balancePayMethod: updatedMethod,
            balanceMethod: updatedMethod,
          };
          dispatch({ type: "order/update", id: orderId, patch });
          return patch;
        } catch (err) {
          console.error("[StoreContext] verifyBalancePayment error:", err);
          throw new Error(err.message || "Gagal memverifikasi pelunasan pesanan.");
        }
      },

      updateOutboundShipment: async (orderId, { courier = "JNE", number = "", proofFile = null }) => {
        const cleanNumber = String(number || "").trim().toUpperCase();
        if (!cleanNumber) {
          throw new Error("Nomor resi pengiriman wajib diisi.");
        }

        const existing = state.orders.find((o) => o.id === orderId);
        let proofUrl = existing?.outboundShipment?.proofUrl || "";
        let proofName = existing?.outboundShipment?.proofName || "";

        if (proofFile) {
          const res = await uploadOrderFile(proofFile, "shipments", `${orderId}-outbound`);
          proofUrl = res?.url || res?.publicUrl || proofUrl;
          proofName = proofFile.name || proofName;
        }

        const shippedAtIso = new Date().toISOString();
        const outboundPayload = {
          courier: courier || "JNE",
          number: cleanNumber,
          proof_url: proofUrl,
          proof_name: proofName,
          shipped_at: shippedAtIso,
        };

        if (supabase) {
          const { error } = await supabase
            .from("orders")
            .update({
              outbound_shipment: outboundPayload,
            })
            .eq("id", orderId);

          if (error) {
            console.error("[StoreContext] updateOutboundShipment error:", error);
            throw new Error(`Gagal menyimpan resi pengiriman ke Supabase: ${error.message}`);
          }
        }

        const patch = {
          outboundShipment: {
            courier: courier || "JNE",
            number: cleanNumber,
            proofUrl,
            proofName,
            shippedAt: shippedAtIso,
          },
        };
        dispatch({ type: "order/update", id: orderId, patch });
        return patch.outboundShipment;
      },

      updateRefundInfo: async (orderId, refundData) => {
        try {
          if (!orderId) throw new Error("ID pesanan tidak valid.");
          const cleanBank = String(refundData?.bank || "BCA").trim();
          const cleanNumber = String(refundData?.number || "").replace(/\s/g, "");
          const cleanHolder = String(refundData?.holder || "").trim();

          if (!cleanNumber || cleanNumber.length < 6) {
            throw new Error("Nomor rekening minimal 6 digit angka.");
          }
          if (!cleanHolder) {
            throw new Error("Nama pemilik rekening wajib diisi.");
          }

          const refundPayload = {
            bank: cleanBank,
            number: cleanNumber,
            holder: cleanHolder,
          };

          if (supabase) {
            const { error } = await supabase
              .from("orders")
              .update({ refund: refundPayload })
              .eq("id", orderId);
            if (error) {
              console.error("[StoreContext] updateRefundInfo error:", error);
              throw new Error(`Gagal menyimpan rekening refund ke database: ${error.message}`);
            }
          }

          dispatch({ type: "order/update", id: orderId, patch: { refund: refundPayload } });
          return refundPayload;
        } catch (err) {
          console.error("[StoreContext] updateRefundInfo exception:", err);
          throw err;
        }
      },

      saveOrderRefund: async (orderId, refundData) => {
        return value.updateRefundInfo(orderId, refundData);
      },

      // ---------- CRUD Katalog Produk (Admin) ----------
      createProduct: async (productData) => {
        const nextId = products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
        let cleanImg =
          typeof productData.img === "string"
            ? productData.img.trim()
            : productData.img?.url || productData.img?.publicUrl || "";
        if (!cleanImg || cleanImg === "[object Object]") {
          cleanImg = "/assets/img/hero.jpg";
        }

        const newProduct = {
          id: productData.id ? Number(productData.id) : nextId,
          name: productData.name.trim(),
          cat: productData.cat || "wanita",
          sub: productData.sub.trim(),
          img: cleanImg,
          price: Number(productData.price) || 0,
          deposit: Number(productData.deposit) || 0,
          sizes: Array.isArray(productData.sizes) && productData.sizes.length ? productData.sizes : ["M", "L"],
          color: productData.color || "Merah",
          tema: Array.isArray(productData.tema) ? productData.tema : ["Pernikahan"],
          tag: productData.booked ? "Penuh" : productData.tag || "Tersedia",
          booked: Boolean(productData.booked),
          bahan: productData.bahan?.trim() || "",
          ukuran: {
            LD: productData.ukuran?.LD || "88–96 cm",
            Panjang: productData.ukuran?.Panjang || "65 cm",
            Pinggang: productData.ukuran?.Pinggang || "70–78 cm",
          },
          aksesori: Array.isArray(productData.aksesori) && productData.aksesori.length ? productData.aksesori : undefined,
        };

        if (supabase) {
          const { error } = await supabase.from("products").insert({
            id: newProduct.id,
            name: newProduct.name,
            cat: newProduct.cat,
            sub: newProduct.sub,
            img: newProduct.img,
            price: newProduct.price,
            deposit: newProduct.deposit,
            sizes: newProduct.sizes,
            color: newProduct.color,
            tema: newProduct.tema,
            tag: newProduct.tag,
            booked: newProduct.booked,
            bahan: newProduct.bahan,
            ukuran: newProduct.ukuran,
            aksesori: newProduct.aksesori || null,
          });
          if (error) throw new Error(`Gagal menambah produk ke Supabase: ${error.message}`);
        }

        setProducts((prev) => [...prev, newProduct]);
        return newProduct;
      },

      updateProduct: async (id, patch) => {
        const targetId = Number(id);
        const existing = findProduct(targetId);
        if (!existing) throw new Error("Produk tidak ditemukan.");

        let cleanImg = existing.img;
        if (patch.img !== undefined) {
          const raw =
            typeof patch.img === "string"
              ? patch.img.trim()
              : patch.img?.url || patch.img?.publicUrl || "";
          cleanImg = raw && raw !== "[object Object]" ? raw : existing.img || "/assets/img/hero.jpg";
        }

        const updated = {
          ...existing,
          ...patch,
          id: targetId,
          img: cleanImg,
          price: patch.price !== undefined ? Number(patch.price) : existing.price,
          deposit: patch.deposit !== undefined ? Number(patch.deposit) : existing.deposit,
          booked: patch.booked !== undefined ? Boolean(patch.booked) : existing.booked,
          tag:
            patch.tag !== undefined
              ? patch.tag
              : patch.booked === true
              ? "Penuh"
              : patch.booked === false && existing.tag === "Penuh"
              ? "Tersedia"
              : existing.tag,
          ukuran: patch.ukuran ? { ...existing.ukuran, ...patch.ukuran } : existing.ukuran,
        };

        if (supabase) {
          const { error } = await supabase
            .from("products")
            .update({
              name: updated.name,
              cat: updated.cat,
              sub: updated.sub,
              img: updated.img,
              price: updated.price,
              deposit: updated.deposit,
              sizes: updated.sizes,
              color: updated.color,
              tema: updated.tema,
              tag: updated.tag,
              booked: updated.booked,
              bahan: updated.bahan,
              ukuran: updated.ukuran,
              aksesori: updated.aksesori || null,
            })
            .eq("id", targetId);
          if (error) throw new Error(`Gagal memperbarui produk di Supabase: ${error.message}`);
        }

        setProducts((prev) => prev.map((p) => (p.id === targetId ? updated : p)));
        return updated;
      },

      deleteProduct: async (id) => {
        const targetId = Number(id);
        if (supabase) {
          const { error } = await supabase.from("products").delete().eq("id", targetId);
          if (error) throw new Error(`Gagal menghapus produk dari Supabase: ${error.message}`);
        }
        setProducts((prev) => prev.filter((p) => p.id !== targetId));
      },

      uploadFile: async (file, folder = "uploads", prefix = "file") => {
        const res = await uploadOrderFile(file, folder, prefix);
        const resolvedUrl = res?.url || res?.publicUrl || null;
        return {
          ...res,
          url: resolvedUrl,
          publicUrl: resolvedUrl,
        };
      },
      getOrder: (id) => state.orders.find((o) => o.id === id),

      isFav: (id) => state.favorites.includes(id),
      toggleFav: (id) => dispatch({ type: "fav/toggle", id }),
    };
  }, [
    state,
    products,
    categories,
    loadingProducts,
    loadingOrders,
    dbError,
    bookedDatesByProduct,
    adminUser,
    authLoading,
    findProduct,
    refreshProducts,
    refreshOrders,
  ]);

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);

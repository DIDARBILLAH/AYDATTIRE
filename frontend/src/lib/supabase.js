// ===================== Konfigurasi Klien Supabase =====================
// Menggunakan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY dari environment.
// Jika variabel belum diisi, `supabase` bernilai null dan aplikasi
// otomatis menggunakan fallback aman (data statis + localStorage).
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const isValidUrl =
  Boolean(supabaseUrl) &&
  /^https?:\/\//.test(supabaseUrl) &&
  !supabaseUrl.includes("your-project-id");

const isValidKey =
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== "your-supabase-anon-key";

export const isSupabaseConfigured = isValidUrl && isValidKey;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const STORAGE_BUCKET = "aydattire-uploads";

/**
 * Upload file bukti transfer / resi ke Supabase Storage.
 * Jika Supabase belum dikonfigurasi atau gagal, mengembalikan URL lokal (blob) sebagai fallback.
 */
export async function uploadOrderFile(file, folder = "proofs", orderId = "order") {
  if (!file) return { url: null, publicUrl: null, name: null, isRemote: false };
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (!supabase) {
    const localUrl = URL.createObjectURL(file);
    return { url: localUrl, publicUrl: localUrl, name: file.name, isRemote: false };
  }

  const path = `${folder}/${orderId}-${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: true });

  if (error) {
    throw new Error(`Gagal mengunggah file ke Storage: ${error.message}`);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const publicUrl = data?.publicUrl || null;
  return { url: publicUrl, publicUrl, name: file.name, isRemote: true };
}

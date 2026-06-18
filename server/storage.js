import { randomBytes } from "node:crypto";
import { extname } from "node:path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "aslim-boutique";

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

export function isSupabaseStorageEnabled() {
  return Boolean(supabase);
}

function fileExtension(file) {
  const fromName = extname(file.originalname || "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(fromName)) return fromName;
  return {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif"
  }[file.mimetype] || ".jpg";
}

export async function uploadImage(file) {
  if (!file) throw new Error("Geçerli bir görsel seçin.");

  if (!supabase) {
    return `/uploads/${file.filename}`;
  }

  const path = `uploads/${Date.now()}-${randomBytes(5).toString("hex")}${fileExtension(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file.buffer, {
    contentType: file.mimetype,
    cacheControl: "31536000",
    upsert: false
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

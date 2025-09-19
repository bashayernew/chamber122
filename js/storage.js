// /js/storage.js
import { supabase } from "./supabase-client.js";

function slugify(name = "file") {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Upload a logo to the 'business-assets' bucket under:
 *   <user.id>/logos/<timestamp>_<slugified-name>.<ext>
 * Returns { path, url } where url is a 7-day signed URL.
 */
export async function uploadLogo(file) {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose a logo file.");
  }

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("Not signed in.");

  const name = file.name || "logo.png";
  const ext = (name.split(".").pop() || "png").toLowerCase();
  const key = `${user.id}/logos/${Date.now()}_${slugify(name)}.${ext}`;

  const { error: upErr } = await supabase
    .storage
    .from("business-assets")
    .upload(key, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || `image/${ext}`
    });

  if (upErr) {
    throw new Error(`Failed to upload logo: ${upErr.message}`);
  }

  const { data: signed, error: urlErr } = await supabase
    .storage
    .from("business-assets")
    .createSignedUrl(key, 60 * 60 * 24 * 7); // 7 days

  if (urlErr) {
    throw new Error(`Could not create logo URL: ${urlErr.message}`);
  }

  return { path: key, url: signed.signedUrl };
}

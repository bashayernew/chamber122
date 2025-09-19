import { sb, requireAuth } from "./supabase.js";

const form = document.querySelector("form");
const note = document.getElementById("form-status");

(async () => { 
  await requireAuth("/auth.html"); 
})();

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = (await sb().auth.getUser()).data.user;
  if (!user) { 
    window.location.href="/auth.html"; 
    return; 
  }
  
  const fd = new FormData(form);
  const name = fd.get("businessName")?.toString().trim();
  if (!name) { 
    note.textContent = "Business name is required."; 
    return; 
  }
  
  let logo_url = null;
  const file = fd.get("logo");
  if (file && file.size > 0) {
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await sb().storage.from("business-media").upload(path, file, { upsert:false });
    if (upErr) { 
      note.textContent = upErr.message; 
      return; 
    }
    const { data: pub } = sb().storage.from("business-media").getPublicUrl(path);
    logo_url = pub.publicUrl;
  }
  
  const payload = {
    owner_id: user.id, 
    name,
    category: fd.get("category")?.toString() || null,
    description: fd.get("description")?.toString() || null,
    email: fd.get("email")?.toString() || null,
    phone: fd.get("phone")?.toString() || null,
    website: fd.get("website")?.toString() || null,
    city: fd.get("city")?.toString() || null,
    country: fd.get("country")?.toString() || "Kuwait",
    logo_url, 
    status: "pending"
  };
  
  const { error } = await sb().from("businesses").insert(payload);
  note.textContent = error ? error.message : "Submitted! Your listing is pending review.";
  if (!error) form.reset();
});

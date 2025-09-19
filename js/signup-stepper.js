import { supabase, getAccountAndCompleteness } from "./supabase-client.js";
import { initAuthState } from "./auth-state-manager.js";
import { ensureSignedIn } from "./signup-utils.js";

initAuthState();

const nextBtn = document.querySelector("#signup-next");
if (nextBtn) nextBtn.addEventListener("click", onNextClick);

function collectStepOneFields() {
  // TODO: map your inputs correctly
  return {
    country: document.querySelector('[name="country"]')?.value || null,
    city: document.querySelector('[name="city"]')?.value || null,
    short_description: document.querySelector('[name="short_description"]')?.value || null,
    business_name: document.querySelector('[name="business_name"]')?.value || null,
    industry: document.querySelector('[name="industry"]')?.value || null
  };
}

export async function onNextClick(e) {
  e?.preventDefault?.();

  // 1) Ensure user is signed in
  const user = await ensureSignedIn();
  if (!user) { alert("Please complete sign-in to continue."); return; }

  // 2) Gather fields
  const payload = collectStepOneFields();

  // 3) Save to DB (created_by set by trigger)
  const { error: upsertErr } = await supabase.from("businesses").upsert({
    owner_id: user.id,
    country: payload.country,
    city: payload.city,
    short_description: payload.short_description,
    name: payload.business_name,
    industry: payload.industry
  }, { onConflict: "owner_id" });

  if (upsertErr) { console.error(upsertErr); alert(upsertErr.message); return; }

  // 4) Recompute and advance
  const { data, error } = await getAccountAndCompleteness();
  if (error || data?.error) { console.error(error ?? data?.error); alert("Could not check onboarding."); return; }

  const next = data.next_step;
  if (next === "done") window.location.assign("/dashboard");
  else goToStep(next); // implement to switch UI panels
}

/** Implement UI transition between steps */
function goToStep(stepName) {
  // Example: swap visible panels
  document.querySelectorAll("[data-step]").forEach(el => el.classList.add("hidden"));
  const target = document.querySelector(`[data-step="${stepName}"]`);
  if (target) target.classList.remove("hidden");
}

// Bind normally as well
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector("#signup-next, #signup-next-1, [data-action='signup-next']");
  if (!btn) return;
  if (btn.getAttribute("type") !== "button") btn.setAttribute("type", "button");
  btn.addEventListener("click", onNextClick);
});

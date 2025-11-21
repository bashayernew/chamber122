export function bulletinCardPretty(b){
  const contact = [b.contact_phone, b.contact_email].filter(Boolean).join(' • ');
  return `
  <article class="rounded-2xl bg-[#0f0f0f] border border-[#222] overflow-hidden">
    ${b.cover_image_url ? `<div class="h-44 bg-[#111] overflow-hidden">
      <img src="${b.cover_image_url}" class="w-full h-full object-cover" alt="">
    </div>` : ``}
    <div class="p-4 space-y-2">
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 text-xs rounded bg-[#1f2937] text-[#e5e7eb]">Bulletin</span>
        ${b.created_at ? `<span class="text-xs text-[#9ca3af]">${new Date(b.created_at).toLocaleString()}</span>` : ``}
      </div>
      <h3 class="text-white text-lg font-semibold">${b.title ?? 'Announcement'}</h3>
      ${b.location ? `<p class="text-[#d1d5db] text-sm">📍 ${b.location}</p>` : ``}
      ${contact ? `<p class="text-[#9ca3af] text-sm">☎️ ${contact}</p>` : ``}
      <a href="/pages/bulletin.html?id=${encodeURIComponent(b.id)}" class="inline-block mt-2 text-sm text-[#93c5fd]">View details →</a>
    </div>
  </article>`;
}

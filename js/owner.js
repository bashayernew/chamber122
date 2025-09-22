import { supabase } from './supabase-client.js'

const $ = (id) => document.getElementById(id)
const stateEl = $('owner-state')
const contentEl = $('owner-content')
const ctaEl = $('owner-cta')

function showState(text) { stateEl.textContent = text }
function showCTA() { ctaEl.classList.remove('hidden') }
function showContent(html) {
  contentEl.innerHTML = html
  contentEl.classList.remove('hidden')
}

async function getUser() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session?.user ?? null
}

async function getBusiness(uid) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', uid)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data ?? null
}

function renderBusinessCard(b) {
  return `
    <div class="grid gap-6 md:grid-cols-[120px,1fr] items-start">
      <div class="w-[120px] h-[120px] rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden">
        ${b.logo_url ? `<img src="${b.logo_url}" alt="${b.name}" class="w-full h-full object-cover">`
                      : `<span class="text-zinc-500">No logo</span>`}
      </div>
      <div>
        <div class="text-3xl font-semibold">${b.name ?? 'Untitled Business'}</div>
        <div class="text-zinc-400 mt-1">${b.industry ?? '—'}</div>
        <div class="mt-4 grid gap-2 text-sm text-zinc-300">
          <div><span class="text-zinc-500">Phone:</span> ${b.phone ?? '—'}</div>
          <div><span class="text-zinc-500">WhatsApp:</span> ${b.whatsapp ?? '—'}</div>
          <div><span class="text-zinc-500">Website:</span> ${b.website ?? '—'}</div>
          ${b.instagram ? `<div><span class="text-zinc-500">Instagram:</span> ${b.instagram}</div>` : ``}
          <div><span class="text-zinc-500">Location:</span> ${[b.country,b.city,b.area,b.address_line].filter(Boolean).join(', ') || '—'}</div>
          <div><span class="text-zinc-500">Visibility:</span> ${b.is_published ? 'Published' : (b.status ?? 'draft')}</div>
        </div>
        <div class="mt-6 flex gap-3">
          <a href="/owner-form.html" class="rounded-xl px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white">Edit Profile</a>
        </div>
      </div>
    </div>
  `
}

async function main() {
  showState('Checking session…')
  const user = await getUser()
  if (!user) { showState('Signed out'); showCTA(); return }

  showState('Loading business…')
  const biz = await getBusiness(user.id)
  if (!biz) { showState('No business yet'); showCTA(); return }

  showState('')
  showContent(renderBusinessCard(biz))
}

main()
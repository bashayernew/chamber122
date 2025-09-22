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
  const loc = [b.country, b.city, b.area, b.address_line].filter(Boolean).join(', ') || '—'
  const publishedBadge = b.is_published
    ? '<span class="inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-medium px-2 py-1">Published</span>'
    : `<span class="inline-flex items-center rounded-full bg-zinc-700 text-zinc-200 text-xs font-medium px-2 py-1">${(b.status || 'pending')}</span>`

  return `
    <div class="grid gap-8 md:grid-cols-[160px,1fr] items-start">
      <!-- Logo / Placeholder -->
      <div class="w-[160px] h-[160px] rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden ring-1 ring-zinc-700">
        ${b.logo_url
          ? `<img src="${b.logo_url}" alt="${b.name || 'Logo'}" class="w-full h-full object-cover">`
          : `<span class="text-zinc-500">No logo</span>`}
      </div>

      <!-- Details -->
      <div>
        <div class="flex items-center gap-3">
          <h2 class="text-3xl font-semibold">${b.name || 'Untitled Business'}</h2>
          ${publishedBadge}
        </div>
        <div class="text-zinc-400 mt-1">${b.industry || '—'}</div>

        <div class="mt-6 grid gap-6 md:grid-cols-2">
          <dl class="space-y-3">
            <div class="flex items-baseline gap-3">
              <dt class="w-28 text-zinc-500">Phone</dt>
              <dd class="text-zinc-200">${b.phone ? `${b.phone}` : '—'}</dd>
            </div>
            <div class="flex items-baseline gap-3">
              <dt class="w-28 text-zinc-500">WhatsApp</dt>
              <dd class="text-zinc-200">${b.whatsapp || '—'}</dd>
            </div>
            <div class="flex items-baseline gap-3">
              <dt class="w-28 text-zinc-500">Website</dt>
              <dd class="text-zinc-200">
                ${b.website ? `<a class="underline hover:no-underline" href="${b.website}" target="_blank" rel="noopener">${b.website}</a>` : '—'}
              </dd>
            </div>
          </dl>

          <dl class="space-y-3">
            <div class="flex items-baseline gap-3">
              <dt class="w-28 text-zinc-500">Instagram</dt>
              <dd class="text-zinc-200">${b.instagram || '—'}</dd>
            </div>
            <div class="flex items-baseline gap-3">
              <dt class="w-28 text-zinc-500">Location</dt>
              <dd class="text-zinc-200">${loc}</dd>
            </div>
            <div class="flex items-baseline gap-3">
              <dt class="w-28 text-zinc-500">Updated</dt>
              <dd class="text-zinc-400">${b.updated_at ? new Date(b.updated_at).toLocaleString() : '—'}</dd>
            </div>
          </dl>
        </div>

        <div class="mt-8 flex gap-3">
          <a href="/owner-form.html" class="rounded-xl px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white">
            Edit Profile
          </a>
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
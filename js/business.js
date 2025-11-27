import { supabase } from './supabase-client.js'

const qs = new URLSearchParams(location.search)
const id = qs.get('id')

const stateEl = document.getElementById('biz-state')
const contentEl = document.getElementById('biz-content')

function showState(t){ stateEl.textContent = t }
function showContent(html){ contentEl.innerHTML = html; contentEl.classList.remove('hidden') }

function render(b) {
  // Get status and show approved badge
  const status = (b.status || 'pending').toLowerCase();
  const statusBadge = status === 'approved' 
    ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
        <i class="fas fa-check-circle mr-1"></i> Verified Business
       </span>`
    : status === 'pending'
    ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
        <i class="fas fa-clock mr-1"></i> Pending Approval
       </span>`
    : '';
  
  return `
    <div class="grid gap-6 md:grid-cols-[160px,1fr] items-start">
      <div class="w-[160px] h-[160px] rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden">
        ${b.logo_url ? `<img src="${b.logo_url}" alt="${b.name}" class="w-full h-full object-cover">` : `<span class="text-zinc-500">No logo</span>`}
      </div>
      <div>
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-4xl font-bold">${b.name}</h1>
          ${statusBadge}
        </div>
        <p class="text-zinc-400 mt-1">${b.industry ?? ''}</p>
        <div class="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
          ${b.website ? `<a class="underline" href="${b.website}" target="_blank" rel="noopener">Website</a>` : ''}
          ${b.instagram ? `<a class="underline" href="https://instagram.com/${b.instagram.replace('@','')}" target="_blank" rel="noopener">Instagram</a>` : ''}
          ${b.phone ? `<div>Phone: ${b.phone}</div>` : ''}
          ${b.whatsapp ? `<div>WhatsApp: ${b.whatsapp}</div>` : ''}
        </div>
        <div class="mt-6 text-zinc-300">
          <div class="text-zinc-500 mb-1">Location</div>
          <div>${[b.country,b.city,b.area,b.address_line].filter(Boolean).join(', ') || '—'}</div>
        </div>
      </div>
    </div>
  `
}

async function load() {
  try {
    if (!id) { showState('No business id provided.'); return }

    // Rely on RLS: owners can read drafts; others only see rows where is_published=true.
    const { data, error } = await supabase
      .from('businesses')
      .select('id,name,industry,phone,whatsapp,website,instagram,country,city,area,address_line,logo_url,status,is_published')
      .eq('id', id)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) { showState('This business is not published or does not exist.'); return }

    showState(''); showContent(render(data))
  } catch (e) {
    console.error('[business] load error', e)
    showState('Failed to load business.')
  }
}

load()

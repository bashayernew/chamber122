import { supabase } from '/js/supabase-client.js';

const list = document.getElementById('bulletinList');
const grid = document.getElementById('bulletin-grid');
const btnAdd = document.getElementById('btnAddBulletin');

function ensure(el, id){ if(!el){ console.warn(`Bulletin element not found: ${id}`); } return !!el; }

async function loadBulletins(){
  // Use the existing bulletin-grid if bulletinList is not available
  const container = list || grid;
  if (!ensure(container, container?.id || 'bulletin container')) return;
  
  try {
    const { data, error } = await supabase.from('bulletins').select('*').order('created_at',{ascending:false});
    if (error){ 
      container.innerHTML = `<div class="error">${error.message}</div>`; 
      return; 
    }
    if (!data?.length){ 
      container.innerHTML = `<div class="empty">No bulletins yet.</div>`; 
      return; 
    }
    container.innerHTML = data.map(row => `
      <div class="card" data-id="${row.id}">
        <div class="title">${row.title||''}</div>
        <div class="body">${row.content||''}</div>
        <div class="meta">${new Date(row.created_at).toLocaleString()}</div>
        <div class="actions">
          <button class="edit btn btn-sm">Edit</button>
          <button class="del btn btn-sm btn-danger">Delete</button>
        </div>
      </div>
    `).join('');
    wireRowActions();
  } catch (e) {
    console.error('Error loading bulletins:', e);
    if (container) container.innerHTML = `<div class="error">Failed to load bulletins</div>`;
  }
}

function wireRowActions(){
  document.querySelectorAll('.card .del').forEach(btn=>{
    btn.onclick = async (e)=>{
      const id = e.currentTarget.closest('.card').dataset.id;
      try {
        await supabase.from('bulletins').delete().eq('id', id);
        loadBulletins();
      } catch (e) {
        alert('Failed to delete bulletin: ' + e.message);
      }
    };
  });
  document.querySelectorAll('.card .edit').forEach(btn=>{
    btn.onclick = (e)=>{
      const card = e.currentTarget.closest('.card');
      openModal(card.dataset.id, card.querySelector('.title').textContent, card.querySelector('.body').textContent);
    };
  });
}

// ——— Simple modal for add/edit ———
const modal = document.getElementById('bulletinModal');
const iTitle = document.getElementById('bulletinTitle');
const iBody  = document.getElementById('bulletinBody');
const btnSave= document.getElementById('bulletinSave');
const btnCancel=document.getElementById('bulletinCancel');

function openModal(id=null, title='', body=''){
  if (!modal) return;
  modal.style.display = 'block';
  modal.dataset.id = id || '';
  if (iTitle) iTitle.value = title;
  if (iBody) iBody.value = body;
}
function closeModal(){ if(modal) modal.style.display = 'none'; }

btnAdd?.addEventListener('click', ()=>openModal());
btnCancel?.addEventListener('click', closeModal);
btnSave?.addEventListener('click', async ()=>{
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return alert('Not logged in');

  const payload = { 
    account_id: user.id, // Using account_id as per the schema
    title: iTitle?.value?.trim(), 
    content: iBody?.value?.trim() 
  };
  if (!payload.title) return alert('Title required');

  try {
    if (modal?.dataset.id){
      await supabase.from('bulletins').update(payload).eq('id', modal.dataset.id);
    } else {
      await supabase.from('bulletins').insert(payload);
    }
    closeModal(); 
    loadBulletins();
  } catch (e) {
    alert('Failed to save bulletin: ' + e.message);
  }
});

// Load bulletins when page loads
document.addEventListener('DOMContentLoaded', loadBulletins);

import { supabase } from '/js/supabase-client.js';

const list = document.getElementById('activitiesList');
const grid = document.getElementById('events-grid');
const btn  = document.getElementById('btnAddEvent');

async function load(){
  // Use the existing events-grid if activitiesList is not available
  const container = list || grid;
  if(!container) return console.warn('activities: no container found');
  
  try {
    const { data, error } = await supabase.from('activities').select('*').order('created_at',{ascending:false});
    if (error) {
      container.innerHTML = `<div class="error">${error.message}</div>`;
      return;
    }
    container.innerHTML = (data||[]).map(a=>`
      <div class="card" data-id="${a.id}">
        <div class="title">${a.title||''}</div>
        <div class="dates">${a.starts_at||''} → ${a.ends_at||''}</div>
        <div class="status">${a.status||'draft'}</div>
        <div class="actions">
          <button class="edit btn btn-sm">Edit</button>
          <button class="del btn btn-sm btn-danger">Delete</button>
        </div>
      </div>
    `).join('') || `<div class="empty">No events yet.</div>`;
    
    // Wire delete buttons
    document.querySelectorAll('.card .del').forEach(b=>{
      b.onclick = async (e)=>{
        const id = e.currentTarget.closest('.card').dataset.id;
        try {
          await supabase.from('activities').delete().eq('id', id);
          load();
        } catch (e) {
          alert('Failed to delete event: ' + e.message);
        }
      };
    });
    
    // Wire edit buttons (basic implementation)
    document.querySelectorAll('.card .edit').forEach(b=>{
      b.onclick = (e)=>{
        const card = e.currentTarget.closest('.card');
        const id = card.dataset.id;
        const title = card.querySelector('.title').textContent;
        // TODO: Implement edit functionality
        alert(`Edit functionality for "${title}" - TODO`);
      };
    });
  } catch (e) {
    console.error('Error loading activities:', e);
    if (container) container.innerHTML = `<div class="error">Failed to load events</div>`;
  }
}

btn?.addEventListener('click', async ()=>{
  const title = prompt('Event title');
  if(!title) return;
  
  try {
    const { data:{ user } } = await supabase.auth.getUser();
    if (!user) return alert('Not logged in');
    
    const { data: row, error } = await supabase.from('activities').insert({ 
      owner_user_id: user.id, 
      title, 
      status: 'draft',
      is_published: false,
      description: 'Event created from events page'
    }).select().single();
    
    if (error) { 
      console.warn('[activities] insert error', error); 
      alert(error.message || 'Insert failed'); 
      throw error; 
    }
    load();
  } catch (e) {
    alert('Failed to create event: ' + e.message);
  }
});

// Load activities when page loads
document.addEventListener('DOMContentLoaded', load);

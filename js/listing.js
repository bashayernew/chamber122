// Handle Get Listed form submission to Supabase

async function handleListingSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
  submitBtn.disabled = true;

  try {
    if (!window.SUPABASE_ENABLED || !window.supabaseClient) {
      alert('Supabase is not configured yet. Submission simulated.');
      form.reset();
      return;
    }
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) {
      alert('Please login first to submit your business.');
      window.location.href = 'auth.html';
      return;
    }
    const userId = session.user.id;

    const biz = {
      owner_id: userId,
      name: document.getElementById('bizName').value.trim(),
      owner_name: document.getElementById('ownerName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      category: document.getElementById('category').value,
      location: document.getElementById('location') ? document.getElementById('location').value : null,
      short_description: document.getElementById('description') ? document.getElementById('description').value.trim() : '',
      why_started: document.getElementById('story').value.trim(),
      status: 'pending',
      is_verified: false
    };

    // Upload logo if provided
    const logoInput = document.getElementById('logo');
    let logoUrl = null;
    if (logoInput && logoInput.files && logoInput.files[0]) {
      const file = logoInput.files[0];
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `logos/${userId}-${Date.now()}.${ext}`;
      const { error: upErr } = await window.supabaseClient.storage.from('business-media').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = window.supabaseClient.storage.from('business-media').getPublicUrl(path);
      logoUrl = pub.publicUrl;
    }

    const { error } = await window.supabaseClient.from('businesses').insert([{ ...biz, logo_url: logoUrl }]);
    if (error) throw error;
    alert('Thanks! Your listing was submitted and is pending review.');
    form.reset();
  } catch (err) {
    console.error(err);
    alert('Submission failed: ' + err.message);
  } finally {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

const msmeForm = document.getElementById('msme-form');
if (msmeForm) {
  msmeForm.addEventListener('submit', handleListingSubmit);
}



// Registration Modal for Events and Bulletins
import { supabase } from './supabase-client.global.js';

let modalInstance = null;

function getModalHTML() {
  return `
    <div id="registration-modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); z-index: 100000; display: none; align-items: center; justify-content: center; padding: 20px;">
      <div id="registration-modal-content" style="background: #1a1a1a; border-radius: 16px; padding: 30px; max-width: 500px; width: 100%; border: 1px solid #333; position: relative; max-height: 90vh; overflow-y: auto;">
        <button id="registration-close-btn" style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: #aaa; font-size: 24px; cursor: pointer;">×</button>
        <h2 id="registration-modal-title" style="margin: 0 0 20px; color: #fff; font-size: 24px;">Register for Event</h2>
        <p id="registration-modal-desc" style="color: #aaa; margin-bottom: 20px;">Fill in your details to register</p>
        <form id="registration-form">
          <input type="hidden" id="registration-type" />
          <input type="hidden" id="registration-id" />
          
          <div style="margin-bottom: 15px;">
            <label for="reg-name" style="display: block; color: #fff; margin-bottom: 8px; font-weight: 500;">Full Name *</label>
            <input type="text" id="reg-name" required style="width: 100%; padding: 12px; border: 1px solid #333; border-radius: 8px; background: #0f0f0f; color: #fff; font-size: 14px;" placeholder="Enter your full name" />
          </div>
          
          <div style="margin-bottom: 15px;">
            <label for="reg-email" style="display: block; color: #fff; margin-bottom: 8px; font-weight: 500;">Email Address *</label>
            <input type="email" id="reg-email" required style="width: 100%; padding: 12px; border: 1px solid #333; border-radius: 8px; background: #0f0f0f; color: #fff; font-size: 14px;" placeholder="Enter your email" />
          </div>
          
          <div style="margin-bottom: 20px;">
            <label for="reg-phone" style="display: block; color: #fff; margin-bottom: 8px; font-weight: 500;">Contact Number *</label>
            <input type="tel" id="reg-phone" required style="width: 100%; padding: 12px; border: 1px solid #333; border-radius: 8px; background: #0f0f0f; color: #fff; font-size: 14px;" placeholder="Enter your phone number" />
          </div>
          
          <div style="display: flex; gap: 12px;">
            <button type="button" id="registration-cancel" style="flex: 1; padding: 12px; background: #333; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancel</button>
            <button type="submit" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #10B981, #059669); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Submit</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function initializeModal() {
  if (modalInstance) return;
  
  document.body.insertAdjacentHTML('beforeend', getModalHTML());
  modalInstance = {
    overlay: document.getElementById('registration-modal-overlay'),
    form: document.getElementById('registration-form'),
    closeBtn: document.getElementById('registration-close-btn'),
    cancelBtn: document.getElementById('registration-cancel')
  };
  
  modalInstance.closeBtn.addEventListener('click', closeModal);
  modalInstance.cancelBtn.addEventListener('click', closeModal);
  modalInstance.overlay.addEventListener('click', (e) => {
    if (e.target === modalInstance.overlay) closeModal();
  });
  
  modalInstance.form.addEventListener('submit', handleSubmit);
}

function openRegistrationModal(type, id, title) {
  if (!modalInstance) initializeModal();
  
  document.getElementById('registration-modal-title').textContent = 
    type === 'event' ? `Register for Event` : `Respond to Bulletin`;
  document.getElementById('registration-modal-desc').textContent = title || '';
  document.getElementById('registration-type').value = type;
  document.getElementById('registration-id').value = id;
  
  modalInstance.overlay.style.display = 'flex';
  document.getElementById('reg-name').focus();
}

function closeModal() {
  if (!modalInstance) return;
  modalInstance.overlay.style.display = 'none';
  modalInstance.form.reset();
}

async function handleSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const type = document.getElementById('registration-type').value;
  const itemId = document.getElementById('registration-id').value;
  
  if (!name || !email || !phone) {
    alert('Please fill in all required fields');
    return;
  }
  
  try {
    // Save registration to database
    const { data, error } = await supabase
      .from('registrations')
      .insert({
        type: type, // 'event' or 'bulletin'
        item_id: itemId,
        name: name,
        email: email,
        phone: phone,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Registration error:', error);
      
      // If registrations table doesn't exist, still send the email
      await sendRegistrationEmail(type, itemId, name, email, phone);
      alert('✅ Registration submitted! We\'ll contact you soon.');
      closeModal();
      return;
    }
    
    // Send email notification
    await sendRegistrationEmail(type, itemId, name, email, phone);
    
    alert('✅ Registration successful! We\'ll contact you soon.');
    closeModal();
    
  } catch (err) {
    console.error('Registration failed:', err);
    alert('Registration failed. Please try again.');
  }
}

async function sendRegistrationEmail(type, itemId, name, email, phone) {
  try {
    // Get event/bulletin details to send to creator
    const table = type === 'event' ? 'events' : 'bulletins';
    const { data: item, error } = await supabase
      .from(table)
      .select('title, contact_email, businesses(name, owner_id)')
      .eq('id', itemId)
      .single();
    
    if (error || !item) {
      console.error('Failed to fetch item details:', error);
      return;
    }
    
    // Send email via Supabase Edge Function or custom service
    // For now, we'll log the registration
    console.log('Registration details:', {
      type,
      itemTitle: item.title,
      creatorEmail: item.contact_email,
      registrant: { name, email, phone }
    });
    
    // In production, you would call your email service here
    // await supabase.functions.invoke('send-email', {
    //   body: { to: item.contact_email, subject: `New registration for ${item.title}`, ... }
    // });
    
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}

// Make functions globally available
window.openRegistrationModal = openRegistrationModal;



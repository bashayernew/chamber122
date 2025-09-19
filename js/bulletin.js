// Bulletin page functionality
import { supabase } from '/js/supabase-client.js';

// Real bulletin data from Supabase
let bulletinData = [];

let currentBulletinFilter = 'all';
let filteredBulletins = [...bulletinData];

// Initialize bulletin page
document.addEventListener('DOMContentLoaded', async function() {
  await loadBulletinsFromSupabase();
  displayBulletins(filteredBulletins);
});

// Load bulletins from Supabase
async function loadBulletinsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('bulletins')
      .select(`
        *,
        businesses:owner_business_id (
          business_name,
          logo_url
        ),
        profiles:owner_user_id (
          full_name
        )
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) throw error;
    
    // Transform Supabase data to match expected format
    bulletinData = (data || []).map(bulletin => ({
      id: bulletin.id,
      category: bulletin.type,
      title: bulletin.title,
      description: bulletin.description,
      company: bulletin.businesses?.business_name || bulletin.profiles?.full_name || 'Anonymous',
      contact: bulletin.location || 'Contact via Chamber122',
      date: bulletin.published_at || bulletin.created_at,
      deadline: bulletin.deadline_date,
      link: bulletin.attachment_url,
      attachment_name: bulletin.attachment_name,
      location: bulletin.location
    }));
    
    filteredBulletins = [...bulletinData];
    
  } catch (error) {
    console.error('Error loading bulletins from Supabase:', error);
    // Keep empty array if there's an error
    bulletinData = [];
    filteredBulletins = [];
  }
}

// Filter bulletins by category
function filterBulletin(category) {
  currentBulletinFilter = category;
  
  // Update button states
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-category="${category}"]`).classList.add('active');
  
  // Filter data
  if (category === 'all') {
    filteredBulletins = [...bulletinData];
  } else {
    filteredBulletins = bulletinData.filter(item => item.category === category);
  }
  
  displayBulletins(filteredBulletins);
}

// Display bulletins
function displayBulletins(bulletins) {
  const bulletinList = document.getElementById('bulletin-grid');
  if (!bulletinList) {
    console.warn('Bulletin list element not found');
    return;
  }
  
  bulletinList.innerHTML = '';
  
  if (bulletins.length === 0) {
    bulletinList.innerHTML = '<p class="no-results">No bulletins found in this category.</p>';
    return;
  }
  
  bulletins.forEach(bulletin => {
    const card = createBulletinCard(bulletin);
    bulletinList.appendChild(card);
  });
}

// Create bulletin card
function createBulletinCard(bulletin) {
  const card = document.createElement('div');
  card.className = 'bulletin-card';
  
  const date = new Date(bulletin.date);
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const categoryIcons = {
    announcements: 'fas fa-bullhorn',
    jobs: 'fas fa-briefcase',
    training: 'fas fa-graduation-cap',
    funding: 'fas fa-money-bill-wave',
    opportunities: 'fas fa-star'
  };
  
  const categoryColors = {
    announcements: 'var(--gold)',
    jobs: 'var(--success)',
    training: 'var(--warning)',
    funding: 'var(--bronze)',
    opportunities: 'var(--gold)'
  };
  
  let deadlineHtml = '';
  if (bulletin.deadline) {
    const deadline = new Date(bulletin.deadline);
    const deadlineFormatted = deadline.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    deadlineHtml = `
      <span class="bulletin-deadline">
        <i class="fas fa-clock"></i> Deadline: ${deadlineFormatted}
      </span>
    `;
  }
  
  let linkHtml = '';
  if (bulletin.link) {
    linkHtml = `
      <a href="${bulletin.link}" class="bulletin-link" target="_blank">
        <i class="fas fa-external-link-alt"></i> Learn More
      </a>
    `;
  }
  
  card.innerHTML = `
    <div class="bulletin-header">
      <div class="bulletin-meta">
        <span class="bulletin-category ${bulletin.category}" style="color: ${categoryColors[bulletin.category]}">
          <i class="${categoryIcons[bulletin.category]}"></i> ${bulletin.category.charAt(0).toUpperCase() + bulletin.category.slice(1)}
        </span>
        <span class="bulletin-date">${formattedDate}</span>
      </div>
      <h3>${bulletin.title}</h3>
    </div>
    <div class="bulletin-content">
      <p>${bulletin.description}</p>
      <div class="bulletin-details">
        <span class="bulletin-company">
          <i class="fas fa-building"></i> ${bulletin.company}
        </span>
        ${deadlineHtml}
      </div>
      <div class="bulletin-actions">
        <button class="bulletin-contact-btn" onclick="contactBulletin('${bulletin.contact}')">
          <i class="fas fa-envelope"></i> Contact
        </button>
        ${linkHtml}
      </div>
    </div>
  `;
  
  return card;
}

// Contact bulletin poster
function contactBulletin(contact) {
  if (contact.includes('@')) {
    window.location.href = `mailto:${contact}`;
  } else if (contact.includes('+')) {
    window.location.href = `https://wa.me/${contact.replace(/[^0-9]/g, '')}`;
  } else {
    alert(`Contact: ${contact}`);
  }
}

// Load more bulletins
function loadMoreBulletins() {
  // Simulate loading more data
  alert('Loading more bulletins... (This would load additional posts in a real application)');
}

// Open bulletin form modal - redirect to bulletin management for providers
async function openBulletinForm() {
  try {
    // Check if user is a provider
    const { supabase } = await import('/js/supabase-client.js');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Not logged in - show login prompt
      window.location.href = '/auth.html#login';
      return;
    }
    
    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    const isProvider = profile?.role === 'provider_individual' || profile?.role === 'provider_company';
    
    if (isProvider) {
      // Provider - redirect to bulletin management
      window.location.href = '/owner-bulletins.html';
    } else {
      // Customer - show message about becoming a provider
      alert('Only MSME providers can post bulletins. Please upgrade to a provider account to access this feature.');
      window.location.href = '/auth.html#signup';
    }
    
  } catch (error) {
    console.error('Error checking user role:', error);
    // Fallback to old modal if there's an error
    const modal = document.getElementById('bulletin-form-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }
}

// Make function available globally
window.openBulletinForm = openBulletinForm;

// Debug: log that the function is available
console.log('Bulletin.js loaded, openBulletinForm function available:', typeof window.openBulletinForm);

// Close bulletin form modal
function closeBulletinForm() {
  document.getElementById('bulletin-form-modal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

// Make function available globally
window.closeBulletinForm = closeBulletinForm;

// Handle bulletin form submission
document.getElementById('bulletin-submission-form').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const submitBtn = this.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
  submitBtn.disabled = true;
  
  setTimeout(() => {
    alert('Thank you for your submission! We\'ll review your bulletin post and publish it within 24 hours.');
    this.reset();
    closeBulletinForm();
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }, 2000);
});


// Bulletin page functionality

// Sample bulletin data
const bulletinData = [
  {
    id: 1,
    category: 'funding',
    title: 'Kuwait Development Fund - MSME Support Program',
    description: 'The Kuwait Development Fund announces a new KD 10,000 grant program for innovative MSMEs. Applications are now open for technology, healthcare, and sustainable business ventures.',
    company: 'Kuwait Development Fund',
    contact: 'grants@kdf.gov.kw',
    date: '2025-01-27',
    deadline: '2025-03-15',
    link: 'https://kdf.gov.kw/msme-grants'
  },
  {
    id: 2,
    category: 'jobs',
    title: 'Digital Marketing Specialist - Remote',
    description: 'Growing e-commerce MSME seeks experienced digital marketing specialist. Must have experience with social media marketing, Google Ads, and content creation. Flexible hours, competitive salary.',
    company: 'Kuwait Online Store',
    contact: '+965-99887766',
    date: '2025-01-26',
    deadline: '2025-02-10',
    link: null
  },
  {
    id: 3,
    category: 'training',
    title: 'Free Business Plan Writing Workshop',
    description: 'Learn to write a compelling business plan that attracts investors and helps you grow your MSME. Includes templates, one-on-one mentoring, and pitch practice.',
    company: 'Chamber122 Training',
    contact: 'training@chamber122.com',
    date: '2025-01-25',
    deadline: '2025-02-05',
    link: null
  },
  {
    id: 4,
    category: 'announcements',
    title: 'New MSME Tax Incentives Announced',
    description: 'The Ministry of Finance has announced new tax incentives for MSMEs with annual revenue under KD 100,000. Reduced corporate tax rates and simplified filing procedures now available.',
    company: 'Ministry of Finance',
    contact: 'info@mof.gov.kw',
    date: '2025-01-24',
    deadline: null,
    link: 'https://mof.gov.kw/msme-incentives'
  },
  {
    id: 5,
    category: 'opportunities',
    title: 'Kuwait International Fair - Vendor Applications',
    description: 'Kuwait International Fair 2025 is now accepting applications from local MSMEs. Subsidized booth rates available for registered small businesses. Great opportunity for international exposure.',
    company: 'Kuwait International Fair',
    contact: 'vendors@kif2025.com',
    date: '2025-01-23',
    deadline: '2025-02-28',
    link: 'https://kif2025.com/vendors'
  },
  {
    id: 6,
    category: 'jobs',
    title: 'Part-time Graphic Designer',
    description: 'Local fashion MSME needs creative graphic designer for social media content, product photography editing, and marketing materials. Portfolio required.',
    company: 'Desert Rose Boutique',
    contact: 'careers@desertrose.kw',
    date: '2025-01-22',
    deadline: '2025-02-15',
    link: null
  },
  {
    id: 7,
    category: 'training',
    title: 'Export Readiness Program',
    description: 'Free 3-day program to help MSMEs prepare for international markets. Covers export regulations, shipping, international payments, and market research.',
    company: 'Kuwait Chamber of Commerce',
    contact: 'export@kcci.org.kw',
    date: '2025-01-21',
    deadline: '2025-02-12',
    link: 'https://kcci.org.kw/export-program'
  },
  {
    id: 8,
    category: 'funding',
    title: 'Women Entrepreneurs Grant - Round 2',
    description: 'Special funding opportunity for women-led MSMEs in Kuwait. Grants up to KD 15,000 available for business expansion, equipment purchase, or working capital.',
    company: 'Kuwait Women\'s Association',
    contact: 'grants@kwa.org.kw',
    date: '2025-01-20',
    deadline: '2025-03-01',
    link: 'https://kwa.org.kw/entrepreneur-grants'
  }
];

let currentBulletinFilter = 'all';
let filteredBulletins = [...bulletinData];

// Initialize bulletin page
document.addEventListener('DOMContentLoaded', function() {
  displayBulletins(filteredBulletins);
});

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
  const bulletinList = document.getElementById('bulletin-list');
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

// Open bulletin form modal
function openBulletinForm() {
  document.getElementById('bulletin-form-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close bulletin form modal
function closeBulletinForm() {
  document.getElementById('bulletin-form-modal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

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


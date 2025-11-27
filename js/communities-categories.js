// js/communities-categories.js - Predefined community categories for Chamber122

/**
 * All available community categories organized by industry/sector
 * Used in forms, filters, and search throughout the Communities feature
 */
export const COMMUNITY_CATEGORIES = [
  // Construction & Building
  'Construction & Contracting',
  'Real Estate & Property',
  'Interior Design & Decoration',
  'Architecture & Engineering',
  'Landscaping & Outdoor Design',
  'Furniture & Woodwork',
  'Aluminum, Glass & Metal Works',
  'Electrical & Lighting',
  'Plumbing & Sanitary',
  'HVAC & Air Conditioning',
  'Building Materials Suppliers',
  'Water Suppliers',
  'Cleaning Services',
  'Moving & Logistics',
  'Packaging & Storage',
  
  // Manufacturing & Trade
  'Manufacturing',
  'Wholesale & Distribution',
  'Retail & General Trading',
  'Import & Export',
  'Automotive & Spare Parts',
  'Marine & Boats',
  'Oil & Gas Services',
  'Industrial Equipment',
  
  // Technology & IT
  'Web Development',
  'Mobile App Development',
  'Software & SaaS',
  'Cybersecurity',
  'IT Support & Networking',
  'AI & Automation',
  'E-Commerce',
  'Digital Marketing',
  'SEO & Ads',
  'UI/UX Design',
  'Graphic Design',
  'Video Editing',
  'Animation & 3D',
  'Game Development',
  'Data & Analytics',
  'Hosting & Domains',
  
  // Marketing & Creative
  'Social Media Marketing',
  'Influencer Marketing',
  'Photography',
  'Videography',
  'Content Creation',
  'Branding & Identity',
  'Printing & Signage',
  'Advertising Agencies',
  'PR & Media Relations',
  'Event Marketing',
  'Exhibition & Booth Design',
  
  // Business Services
  'Accounting & Auditing',
  'Tax & VAT',
  'Company Formation',
  'Legal Services',
  'Contracts & Compliance',
  'HR & Recruitment',
  'Payroll Services',
  'Business Consulting',
  'Investment & Funding',
  'Business Loans',
  'Banking & Payment Systems',
  
  // Food & Hospitality
  'Restaurants & Cafés',
  'Catering & Events',
  'Bakeries & Sweets',
  'Coffee & Roasters',
  'Food Trucks',
  'Grocery & Mini Markets',
  'Fashion & Clothing',
  'Shoes & Accessories',
  'Jewelry & Watches',
  'Perfumes & Cosmetics',
  'Beauty Salons & Barbers',
  'Gyms & Fitness Centers',
  'Spas & Wellness',
  
  // Education & Training
  'Universities & Colleges',
  'Training Centers',
  'Online Courses',
  'Technical Training',
  'Language Training',
  'Business Training',
  'Coding & Programming',
  'Cybersecurity Training',
  'Design & Creative Skills',
  'Entrepreneurship',
  
  // Healthcare & Safety
  'Clinics & Medical Centers',
  'Dental Clinics',
  'Pharmacies',
  'Medical Equipment Suppliers',
  'Home Nursing',
  'Health Insurance',
  'Workplace Safety',
  'Fire Systems & Safety',
  'PPE & Protective Gear',
  
  // Transportation & Logistics
  'Car Rental',
  'Taxis & Transport',
  'Shipping & Freight',
  'Customs Clearance',
  'Warehousing',
  'Delivery Services',
  'Travel Agencies',
  'Tourism Services',
  'Aviation Services',
  
  // Business Opportunities
  'Business Networking',
  'Partnerships & Collaborations',
  'Supplier Requests',
  'Buyer Requests',
  'Tenders & Projects',
  'Auctions & Bidding',
  'Joint Ventures',
  'Franchise Opportunities',
  'Investment Opportunities',
  'Business for Sale',
  
  // Government & Compliance
  'Commercial Licensing',
  'Municipality Approvals',
  'Civil Defense Approval',
  'Environmental Permits',
  'Zoning & Planning',
  'Residency & Visas',
  'Labor & Work Permits',
  
  // Regional & Associations
  'Kuwait City MSMEs',
  'Hawally MSMEs',
  'Farwaniya MSMEs',
  'Ahmadi MSMEs',
  'Jahra MSMEs',
  'Free Trade Zones',
  'Business Associations',
  'Chambers of Commerce',
  
  // Innovation & Startups
  'Startups',
  'Incubators',
  'Accelerators',
  'Coworking Spaces',
  'Pitching & Demo Days',
  'Tech Innovation',
  'Green & Sustainability',
  'Smart Cities',
  'IoT & Hardware',
  
  // Events & Conferences
  'Local Exhibitions',
  'International Exhibitions',
  'Business Conferences',
  'Workshops & Seminars',
  'Career Fairs',
  'B2B Meetups',
  'Launch Events',
  
  // Support & Help
  'Platform Help',
  'Account Support',
  'Verification Issues',
  'Payment Support',
  'Reporting & Compliance',
  'Feature Requests',
  'Bug Reports',
  
  // General Discussion
  'Business Talk',
  'Advice & Mentorship',
  'Success Stories',
  'Challenges & Problems',
  'Daily Deals',
  'Announcements'
];

/**
 * Get all categories as an array
 * @returns {string[]} Array of category names
 */
export function getAllCategories() {
  return [...COMMUNITY_CATEGORIES];
}

/**
 * Check if a category is valid
 * @param {string} category - Category name to validate
 * @returns {boolean} True if category exists
 */
export function isValidCategory(category) {
  return COMMUNITY_CATEGORIES.includes(category);
}

/**
 * Get categories grouped by industry (for UI organization)
 * @returns {Object} Object with industry keys and category arrays
 */
export function getCategoriesByIndustry() {
  return {
    'Construction & Building': COMMUNITY_CATEGORIES.slice(0, 14),
    'Manufacturing & Trade': COMMUNITY_CATEGORIES.slice(14, 22),
    'Technology & IT': COMMUNITY_CATEGORIES.slice(22, 37),
    'Marketing & Creative': COMMUNITY_CATEGORIES.slice(37, 48),
    'Business Services': COMMUNITY_CATEGORIES.slice(48, 59),
    'Food & Hospitality': COMMUNITY_CATEGORIES.slice(59, 72),
    'Education & Training': COMMUNITY_CATEGORIES.slice(72, 82),
    'Healthcare & Safety': COMMUNITY_CATEGORIES.slice(82, 91),
    'Transportation & Logistics': COMMUNITY_CATEGORIES.slice(91, 100),
    'Business Opportunities': COMMUNITY_CATEGORIES.slice(100, 110),
    'Government & Compliance': COMMUNITY_CATEGORIES.slice(110, 117),
    'Regional & Associations': COMMUNITY_CATEGORIES.slice(117, 125),
    'Innovation & Startups': COMMUNITY_CATEGORIES.slice(125, 134),
    'Events & Conferences': COMMUNITY_CATEGORIES.slice(134, 141),
    'Support & Help': COMMUNITY_CATEGORIES.slice(141, 148),
    'General Discussion': COMMUNITY_CATEGORIES.slice(148)
  };
}


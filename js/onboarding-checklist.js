// Onboarding Checklist Component
// Two-tier checklist with Required and Recommended sections

class OnboardingChecklist {
  constructor(containerId, status = {}) {
    this.container = document.getElementById(containerId);
    this.status = status;
    this.init();
  }

  init() {
    if (!this.container) {
      console.error('Onboarding checklist container not found');
      return;
    }

    this.render();
    this.setupEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="onboarding-checklist max-w-6xl mx-auto p-6 space-y-8">
        <!-- Required Section -->
        <div class="required-section bg-gray-800 rounded-xl p-6 border border-red-500/20">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-2xl font-bold text-white mb-2">
                Required for Activation
                <span class="text-sm font-normal text-gray-400 block">مطلوب للتفعيل</span>
              </h2>
              <div class="flex items-center space-x-4 rtl:space-x-reverse">
                <div class="text-sm text-gray-300">
                  <span class="font-semibold text-red-400">${this.getRequiredCompleted()}/${this.getRequiredTotal()}</span> Complete
                </div>
                <div class="w-32 bg-gray-700 rounded-full h-2">
                  <div class="bg-red-500 h-2 rounded-full transition-all duration-300" 
                       style="width: ${this.getRequiredPercentage()}%"></div>
                </div>
                <span class="text-sm text-gray-400">${this.getRequiredPercentage()}%</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-3xl font-bold text-red-400">${this.getRequiredPercentage()}%</div>
              <div class="text-sm text-gray-400">Complete</div>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${this.renderRequiredItems()}
          </div>
        </div>

        <!-- Recommended Section -->
        <div class="recommended-section bg-gray-800 rounded-xl p-6 border border-yellow-500/20">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-2xl font-bold text-white mb-2">
                Recommended for Profile Strength
                <span class="text-sm font-normal text-gray-400 block">موصى به لقوة الملف الشخصي</span>
              </h2>
              <div class="flex items-center space-x-4 rtl:space-x-reverse">
                <div class="text-sm text-gray-300">
                  <span class="font-semibold text-yellow-400">${this.getRecommendedCompleted()}/${this.getRecommendedTotal()}</span> Complete
                </div>
                <div class="w-32 bg-gray-700 rounded-full h-2">
                  <div class="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
                       style="width: ${this.getRecommendedPercentage()}%"></div>
                </div>
                <span class="text-sm text-gray-400">${this.getRecommendedPercentage()}%</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-3xl font-bold text-yellow-400">${this.getRecommendedPercentage()}%</div>
              <div class="text-sm text-gray-400">Profile Strength</div>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${this.renderRecommendedItems()}
          </div>
        </div>
      </div>
    `;
  }

  renderRequiredItems() {
    const requiredItems = [
      { key: 'businessName', en: 'Business Name', ar: 'اسم المنشأة' },
      { key: 'industryCountry', en: 'Industry & Country', ar: 'الصناعة والدولة' },
      { key: 'businessLogo', en: 'Business Logo', ar: 'شعار المنشأة' },
      { key: 'businessLicense', en: 'Business License', ar: 'رخصة العمل' },
      { key: 'articlesIncorporation', en: 'Articles of Incorporation', ar: 'عقد التأسيس' },
      { key: 'signatureAuthorization', en: 'Signature Authorization', ar: 'تفويض التوقيع' },
      { key: 'ibanCertificate', en: 'IBAN Certificate', ar: 'شهادة الـIBAN' }
    ];

    return requiredItems.map(item => this.renderChecklistItem(item, true)).join('');
  }

  renderRecommendedItems() {
    const recommendedItems = [
      { key: 'contactEmail', en: 'Contact Email', ar: 'البريد الإلكتروني للتواصل' },
      { key: 'phoneWhatsapp', en: 'Phone/WhatsApp', ar: 'رقم الهاتف / واتساب' },
      { key: 'businessDescription', en: 'Business Description', ar: 'وصف قصير' },
      { key: 'aboutStory', en: 'About/Story', ar: 'نبذة عن الشركة' },
      { key: 'businessCategory', en: 'Business Category/Tags', ar: 'الفئة / الكلمات المفتاحية' },
      { key: 'socialMediaLinks', en: 'Social Media Links', ar: 'روابط السوشيال ميديا' },
      { key: 'physicalAddress', en: 'Physical Address', ar: 'العنوان' },
      { key: 'googleMapsLink', en: 'Google Maps Link', ar: 'رابط خرائط جوجل' },
      { key: 'serviceArea', en: 'Service Area', ar: 'منطقة الخدمة' },
      { key: 'openingHours', en: 'Opening Hours', ar: 'أوقات العمل' },
      { key: 'languagesSupported', en: 'Languages Supported', ar: 'اللغات المدعومة' },
      { key: 'numberEmployees', en: 'Number of Employees', ar: 'عدد الموظفين' },
      { key: 'coverImage', en: 'Cover Image', ar: 'صورة الغلاف' },
      { key: 'galleryPortfolio', en: 'Gallery/Portfolio', ar: 'معرض الصور' },
      { key: 'introVideo', en: 'Intro Video', ar: 'فيديو تعريفي' },
      { key: 'certificatesAwards', en: 'Certificates/Awards', ar: 'شهادات أو جوائز' }
    ];

    return recommendedItems.map(item => this.renderChecklistItem(item, false)).join('');
  }

  renderChecklistItem(item, isRequired) {
    const isCompleted = this.status[item.key] || false;
    const statusIcon = isCompleted ? '✅' : '❌';
    const statusClass = isCompleted ? 'text-green-400' : 'text-red-400';
    const cardClass = isCompleted 
      ? 'bg-gray-700/50 border-green-500/30' 
      : isRequired 
        ? 'bg-red-900/20 border-red-500/30' 
        : 'bg-yellow-900/20 border-yellow-500/30';

    return `
      <div class="checklist-item ${cardClass} border rounded-lg p-4 transition-all duration-200 hover:shadow-lg">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center space-x-3 rtl:space-x-reverse">
            <span class="text-2xl">${statusIcon}</span>
            <div>
              <div class="font-semibold text-white text-sm">${item.en}</div>
              <div class="text-gray-400 text-xs mt-1">${item.ar}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs ${statusClass} font-medium">
              ${isCompleted ? 'Complete' : 'Incomplete'}
            </div>
          </div>
        </div>
        
        ${!isCompleted ? `
          <button class="complete-btn w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                        text-white text-sm font-medium py-2 px-4 rounded-lg transition-all duration-200 
                        transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  data-item="${item.key}">
            Complete Now
          </button>
        ` : `
          <div class="text-green-400 text-sm font-medium text-center py-2">
            ✓ Completed
          </div>
        `}
      </div>
    `;
  }

  setupEventListeners() {
    // Handle complete button clicks
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('complete-btn')) {
        const itemKey = e.target.getAttribute('data-item');
        this.handleCompleteItem(itemKey);
      }
    });
  }

  handleCompleteItem(itemKey) {
    // Emit custom event for parent components to handle
    const event = new CustomEvent('onboardingItemComplete', {
      detail: { itemKey, itemName: this.getItemName(itemKey) }
    });
    this.container.dispatchEvent(event);

    // Update status locally
    this.status[itemKey] = true;
    this.render();
  }

  getItemName(itemKey) {
    const allItems = [
      { key: 'businessName', en: 'Business Name', ar: 'اسم المنشأة' },
      { key: 'industryCountry', en: 'Industry & Country', ar: 'الصناعة والدولة' },
      { key: 'businessLogo', en: 'Business Logo', ar: 'شعار المنشأة' },
      { key: 'businessLicense', en: 'Business License', ar: 'رخصة العمل' },
      { key: 'articlesIncorporation', en: 'Articles of Incorporation', ar: 'عقد التأسيس' },
      { key: 'signatureAuthorization', en: 'Signature Authorization', ar: 'تفويض التوقيع' },
      { key: 'ibanCertificate', en: 'IBAN Certificate', ar: 'شهادة الـIBAN' },
      { key: 'contactEmail', en: 'Contact Email', ar: 'البريد الإلكتروني للتواصل' },
      { key: 'phoneWhatsapp', en: 'Phone/WhatsApp', ar: 'رقم الهاتف / واتساب' },
      { key: 'businessDescription', en: 'Business Description', ar: 'وصف قصير' },
      { key: 'aboutStory', en: 'About/Story', ar: 'نبذة عن الشركة' },
      { key: 'businessCategory', en: 'Business Category/Tags', ar: 'الفئة / الكلمات المفتاحية' },
      { key: 'socialMediaLinks', en: 'Social Media Links', ar: 'روابط السوشيال ميديا' },
      { key: 'physicalAddress', en: 'Physical Address', ar: 'العنوان' },
      { key: 'googleMapsLink', en: 'Google Maps Link', ar: 'رابط خرائط جوجل' },
      { key: 'serviceArea', en: 'Service Area', ar: 'منطقة الخدمة' },
      { key: 'openingHours', en: 'Opening Hours', ar: 'أوقات العمل' },
      { key: 'languagesSupported', en: 'Languages Supported', ar: 'اللغات المدعومة' },
      { key: 'numberEmployees', en: 'Number of Employees', ar: 'عدد الموظفين' },
      { key: 'coverImage', en: 'Cover Image', ar: 'صورة الغلاف' },
      { key: 'galleryPortfolio', en: 'Gallery/Portfolio', ar: 'معرض الصور' },
      { key: 'introVideo', en: 'Intro Video', ar: 'فيديو تعريفي' },
      { key: 'certificatesAwards', en: 'Certificates/Awards', ar: 'شهادات أو جوائز' }
    ];

    const item = allItems.find(i => i.key === itemKey);
    return item ? item.en : itemKey;
  }

  getRequiredCompleted() {
    const requiredKeys = ['businessName', 'industryCountry', 'businessLogo', 'businessLicense', 
                         'articlesIncorporation', 'signatureAuthorization', 'ibanCertificate'];
    return requiredKeys.filter(key => this.status[key]).length;
  }

  getRequiredTotal() {
    return 7;
  }

  getRequiredPercentage() {
    return Math.round((this.getRequiredCompleted() / this.getRequiredTotal()) * 100);
  }

  getRecommendedCompleted() {
    const recommendedKeys = ['contactEmail', 'phoneWhatsapp', 'businessDescription', 'aboutStory',
                            'businessCategory', 'socialMediaLinks', 'physicalAddress', 'googleMapsLink',
                            'serviceArea', 'openingHours', 'languagesSupported', 'numberEmployees',
                            'coverImage', 'galleryPortfolio', 'introVideo', 'certificatesAwards'];
    return recommendedKeys.filter(key => this.status[key]).length;
  }

  getRecommendedTotal() {
    return 16;
  }

  getRecommendedPercentage() {
    return Math.round((this.getRecommendedCompleted() / this.getRecommendedTotal()) * 100);
  }

  updateStatus(newStatus) {
    this.status = { ...this.status, ...newStatus };
    this.render();
  }

  getStatus() {
    return { ...this.status };
  }
}

// Export for use in other modules
window.OnboardingChecklist = OnboardingChecklist;

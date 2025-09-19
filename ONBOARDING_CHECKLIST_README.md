# Onboarding Checklist Component

A comprehensive two-tier onboarding checklist component with Arabic and English labels, designed for the Chamber122 website.

## Features

- **Two-tier System**: Required items (blocking) and Recommended items (profile strength)
- **Bilingual Support**: Arabic and English labels side by side
- **Real-time Progress**: Dynamic progress bars and completion percentages
- **Dark Theme**: Consistent with Chamber122's design system
- **Responsive Design**: Works on all screen sizes
- **Interactive**: Click to complete items with custom event handling

## Files

- `js/onboarding-checklist.js` - Main component class
- `css/onboarding-checklist.css` - Styling for the component
- `js/onboarding-integration.js` - Integration helper for existing pages
- `onboarding-demo.html` - Demo page showcasing the component

## Quick Start

### 1. Basic Usage

```html
<!-- Include the CSS -->
<link rel="stylesheet" href="css/onboarding-checklist.css">

<!-- Include the JavaScript -->
<script src="js/onboarding-checklist.js"></script>

<!-- Create a container -->
<div id="onboarding-checklist"></div>

<script>
// Initialize with status data
const status = {
  businessName: true,
  industryCountry: false,
  businessLogo: false,
  // ... other items
};

const checklist = new OnboardingChecklist('onboarding-checklist', status);
</script>
```

### 2. Integration with Existing Pages

```html
<!-- Include integration script -->
<script src="js/onboarding-integration.js"></script>

<!-- The component will automatically initialize on owner pages -->
```

## Required Items

These items must be completed for account activation:

1. **Business Name** | اسم المنشأة
2. **Industry & Country** | الصناعة والدولة
3. **Business Logo** | شعار المنشأة
4. **Business License** | رخصة العمل
5. **Articles of Incorporation** | عقد التأسيس
6. **Signature Authorization** | تفويض التوقيع
7. **IBAN Certificate** | شهادة الـIBAN

## Recommended Items

These items improve profile strength:

1. **Contact Email** | البريد الإلكتروني للتواصل
2. **Phone/WhatsApp** | رقم الهاتف / واتساب
3. **Business Description** | وصف قصير
4. **About/Story** | نبذة عن الشركة
5. **Business Category/Tags** | الفئة / الكلمات المفتاحية
6. **Social Media Links** | روابط السوشيال ميديا
7. **Physical Address** | العنوان
8. **Google Maps Link** | رابط خرائط جوجل
9. **Service Area** | منطقة الخدمة
10. **Opening Hours** | أوقات العمل
11. **Languages Supported** | اللغات المدعومة
12. **Number of Employees** | عدد الموظفين
13. **Cover Image** | صورة الغلاف
14. **Gallery/Portfolio** | معرض الصور
15. **Intro Video** | فيديو تعريفي
16. **Certificates/Awards** | شهادات أو جوائز

## API Reference

### OnboardingChecklist Class

#### Constructor
```javascript
new OnboardingChecklist(containerId, status)
```

- `containerId` (string): ID of the container element
- `status` (object): Object with boolean values for each checklist item

#### Methods

##### updateStatus(newStatus)
Update the checklist status and re-render.

```javascript
checklist.updateStatus({
  businessName: true,
  industryCountry: false
});
```

##### getStatus()
Get the current status object.

```javascript
const status = checklist.getStatus();
```

##### getRequiredCompleted()
Get the number of completed required items.

```javascript
const completed = checklist.getRequiredCompleted(); // Returns number
```

##### getRequiredPercentage()
Get the percentage of completed required items.

```javascript
const percentage = checklist.getRequiredPercentage(); // Returns number 0-100
```

##### getRecommendedCompleted()
Get the number of completed recommended items.

```javascript
const completed = checklist.getRecommendedCompleted(); // Returns number
```

##### getRecommendedPercentage()
Get the percentage of completed recommended items.

```javascript
const percentage = checklist.getRecommendedPercentage(); // Returns number 0-100
```

### Events

#### onboardingItemComplete
Fired when a user clicks "Complete Now" on an item.

```javascript
document.getElementById('onboarding-checklist').addEventListener('onboardingItemComplete', (e) => {
  console.log('Item completed:', e.detail.itemKey);
  console.log('Item name:', e.detail.itemName);
});
```

## Integration with Supabase

The integration helper automatically maps Supabase account data to checklist status:

```javascript
// The integration will automatically:
// 1. Load user's account data from Supabase
// 2. Map account fields to checklist items
// 3. Update the checklist display
// 4. Handle completion events by routing to appropriate pages
```

## Customization

### Styling
The component uses Tailwind CSS classes and can be customized by modifying `css/onboarding-checklist.css`.

### Item Routes
Modify the `getItemRoute()` method in `onboarding-integration.js` to change where users are directed when completing items.

### Status Mapping
Update the `mapAccountToChecklistStatus()` method to change how Supabase data maps to checklist items.

## Demo

Visit `onboarding-demo.html` to see the component in action with interactive controls.

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Dependencies

- Tailwind CSS (for styling)
- Inter font (for typography)
- Modern JavaScript (ES6+)

## License

Part of the Chamber122 project.

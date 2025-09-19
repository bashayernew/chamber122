# Chamber122 - Kuwait MSME Community Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-blue.svg)](https://supabase.com/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E%20Testing-orange.svg)](https://playwright.dev/)

A comprehensive platform connecting Kuwait's Micro, Small, and Medium Enterprises (MSMEs) with opportunities for growth and success. Built with modern web technologies and featuring full bilingual support (English/Arabic) with RTL layout.

## 🚀 Live Demo

- **Production**: [https://chamber122.com](https://chamber122.com)
- **Staging**: [https://staging.chamber122.com](https://staging.chamber122.com)

## 📱 Screenshots

### Desktop View
![Desktop Homepage](docs/screenshots/desktop-homepage.png)
![MSME Directory](docs/screenshots/desktop-directory.png)

### Mobile View
![Mobile Homepage](docs/screenshots/mobile-homepage.png)
![Mobile Auth](docs/screenshots/mobile-auth.png)

### Arabic (RTL) View
![Arabic Homepage](docs/screenshots/arabic-homepage.png)
![Arabic Directory](docs/screenshots/arabic-directory.png)

## ✨ Features

### 🏢 **Core Platform Features**
- **MSME Directory**: Discover and connect with local businesses
- **Events & Promotions**: Stay updated with community events and opportunities
- **MSME Bulletin**: Community announcements and job postings
- **Contact Management**: Direct communication with MSMEs
- **Search & Filtering**: Advanced search with category and location filters

### 🌐 **Internationalization**
- **Bilingual Support**: Full English and Arabic (RTL) interface
- **Language Switching**: Seamless toggle between languages
- **RTL Layout**: Proper right-to-left layout for Arabic
- **Localized Content**: All text, dates, and numbers properly localized

### 🔐 **Authentication & Authorization**
- **Multi-Role System**: Admin, MSME, Guest user roles
- **Profile Completeness**: Dynamic scoring system (80%+ for instant publishing)
- **Guest Mode**: Unauthenticated users can submit content for review
- **Account Management**: Complete profile management with file uploads

### 📊 **Admin Features**
- **Content Moderation**: Approve/reject MSME applications and posts
- **User Management**: Manage user accounts and permissions
- **Analytics Dashboard**: Track platform usage and engagement
- **Guest Submissions**: Review and approve guest-submitted content

### 🎨 **User Experience**
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Dark Theme**: Modern dark theme with gold accents
- **Sticky Navigation**: Persistent navigation elements
- **File Uploads**: Drag-and-drop file upload with preview
- **Real-time Validation**: Instant feedback on form inputs

## 🛠️ Technology Stack

### **Frontend**
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Custom CSS with CSS Variables and modern features
- **JavaScript (ES6+)**: Modern JavaScript with modules
- **Font Awesome**: Icon library for UI elements
- **Google Fonts**: Inter (English), Tajawal (Arabic)

### **Backend & Database**
- **Supabase**: Backend-as-a-Service platform
- **PostgreSQL**: Relational database with RLS policies
- **Supabase Auth**: User authentication and authorization
- **Supabase Storage**: File upload and management
- **Row Level Security**: Database-level security policies

### **Development & Testing**
- **Playwright**: End-to-end testing framework
- **Node.js**: Development environment and build tools
- **GitHub Actions**: CI/CD pipeline
- **ESLint**: Code linting and formatting

### **Deployment**
- **Static Hosting**: Optimized for static site deployment
- **CDN**: Global content delivery
- **Environment Variables**: Secure configuration management

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+** (for development tools and testing)
- **Git** (for version control)
- **Supabase Account** (for backend services)
- **Modern Browser** (Chrome, Firefox, Safari, Edge)

### System Requirements

- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 1GB free space
- **Internet**: Stable connection for Supabase services

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/your-org/chamber122-website.git
cd chamber122-website
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up Supabase:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the database migrations in `supabase/migrations/`
   - Enable Row Level Security policies
   - Create a storage bucket named `public`

4. **Configure environment variables:**
```bash
# Copy the example environment file
cp .env.e2e.example .env.e2e

# Edit with your Supabase credentials
nano .env.e2e
```

Required environment variables:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

5. **Start the development server:**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Quick Start (5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/your-org/chamber122-website.git
cd chamber122-website
npm install

# 2. Set up environment
cp .env.e2e.example .env.e2e
# Add your Supabase credentials to .env.e2e

# 3. Start development server
npm run dev

# 4. Open browser
open http://localhost:3000
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run start` - Start production server
- `npm run build` - Build application (static site)

### E2E Testing

The project includes comprehensive end-to-end tests using Playwright.

#### Setup E2E Testing

1. Install Playwright browsers:
```bash
npx playwright install
```

2. Set up test environment:
```bash
cp env.e2e.example .env.e2e
# Fill in your test credentials
```

3. Run tests:
```bash
# Run all tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run in headed mode
npm run test:e2e:headed

# View test report
npm run test:e2e:report
```

#### Test Data Management

```bash
# Seed test data
npm run seed:e2e

# Clean test data
npm run clean:e2e
```

## Demo Mode

The project includes a demo mode with pre-configured users and sample data for testing and demonstration purposes.

### Demo Users

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| Admin | admin@demo.com | AdminPass123! | Full admin access with moderation capabilities |
| Pending MSME | pending@demo.com | Pending123! | Incomplete profile, requires approval |
| Approved MSME | approved@demo.com | Approved123! | Complete profile with instant publishing |

### Demo Data Management

```bash
# Seed demo data
npm run seed:demo

# Clean demo data
npm run clean:demo
```

### Testing the Signup Flow

The platform includes a comprehensive signup flow with multi-step validation. Here's how to test it:

#### 1. **Access the Signup Page**
- Navigate to `/auth.html#signup` or click "Sign Up & Get Listed" in the header
- The page will show a tabbed interface with Login and Signup options

#### 2. **Complete the Signup Process**

**Step 1 - Account Creation:**
- Email: Use a valid email format (e.g., `newuser@example.com`)
- Password: Minimum 8 characters
- Confirm Password: Must match the password
- Terms: Must be accepted

**Step 2 - Business Information (Required):**
- Business Name: Minimum 2 characters
- Category: Select from dropdown (Food & Beverage, Technology, etc.)
- Country: Select from dropdown (Kuwait, UAE, etc.)
- City: Enter city name
- Description: 50-140 characters with live counter
- WhatsApp/Phone: Valid phone number format
- Logo: Optional file upload (images only, max 5MB)

**Step 3 - Business Verification (Optional):**
- Registration Type: Choose "Registered" or "Unregistered"
- License Number: Required if "Registered" is selected

**Step 4 - Review & Create:**
- Confirm all information is accurate
- Click "Create My Account"

#### 3. **Expected Behavior After Signup**

- **New User**: Redirected to `/owner-activities.html?tab=profile&needs=approval`
- **Profile Status**: Shows "Pending Review" banner
- **Publishing**: Posts are created with `status='pending'` until admin approval
- **Profile Completeness**: Calculated based on filled fields (minimum 80% for instant publishing)

#### 4. **Testing Different Scenarios**

**Complete Profile (80%+ completeness):**
- Fill all required fields in Step 2
- Upload a logo
- Select registration type
- Result: Higher completeness score, faster approval

**Minimal Profile:**
- Fill only required fields
- Skip optional fields
- Result: Lower completeness score, requires more fields for approval

**Validation Testing:**
- Try invalid email formats
- Use passwords less than 8 characters
- Leave required fields empty
- Use descriptions shorter than 50 characters
- Result: Appropriate error messages displayed

#### 5. **RTL/Arabic Testing**

- Switch to Arabic using the language toggle
- Verify all text is translated correctly
- Check that form layout adapts to RTL
- Test form validation messages in Arabic

#### 6. **Integration with Existing Users**

**Login with Demo Users:**
- Use `approved@demo.com` / `Approved123!` for instant publishing
- Use `pending@demo.com` / `Pending123!` for pending approval flow
- Use `admin@demo.com` / `AdminPass123!` for admin panel access

**Account Status Flow:**
- **Pending**: Can create posts but they remain pending until approval
- **Approved + Complete**: Posts publish immediately
- **Approved + Incomplete**: Redirected to profile completion

#### 7. **E2E Testing**

Run the automated signup flow tests:

```bash
# Run all signup tests
npm run test:e2e -- --grep "Signup Flow"

# Run specific test
npm run test:e2e -- --grep "should proceed through all steps and create account"

# Run RTL tests
npm run test:e2e -- --grep "RTL Support"
```

#### 8. **Sticky Tabs & Enhanced Features**

**Sticky Navigation:**
- Tabs remain visible when scrolling through the form
- Tabs have a glassmorphism effect with backdrop blur
- Proper z-index ensures tabs stay above content but below navbar
- Smooth transitions between login and signup panels

**File Upload System:**
- **Logo**: Required, PNG/JPG/WebP, max 2MB
- **Cover**: Optional, PNG/JPG/WebP, max 2MB  
- **Gallery**: Optional, 0-6 images, PNG/JPG/WebP, max 2MB each
- **Documents**: PDF/JPG/PNG, max 5MB
- Real-time validation with error messages
- File preview with remove functionality

**Enhanced Validation:**
- Real-time character counter for description (50-140 chars)
- Password strength requirements (8+ characters)
- Email format validation with Arabic numeral support
- File type and size validation before upload
- Required field validation with inline error messages

#### 9. **Common Issues & Troubleshooting**

**Form Validation:**
- Ensure all required fields are filled before proceeding
- Check that email format is valid
- Verify password confirmation matches
- Description must be 50-140 characters
- Logo upload is required for step 2

**File Upload:**
- Only specified file types are accepted for each upload type
- Maximum file sizes enforced (2MB for images, 5MB for documents)
- If upload fails, check file type and size
- File previews show uploaded files with remove options

**Navigation:**
- Use "Back" button to return to previous steps
- Form data is preserved when navigating between steps
- URL hash routing works for direct access to specific tabs
- Sticky tabs remain visible during scrolling

**Browser Compatibility:**
- Test in Chrome, Firefox, Safari, and Edge
- Verify mobile responsiveness
- Check RTL layout in Arabic browsers
- Ensure sticky tabs work on all screen sizes

#### 10. **E2E Testing Commands**

```bash
# Run all auth signup tests
npm run test:e2e -- --grep "Auth Signup Flow"

# Run specific test scenarios
npm run test:e2e -- --grep "should complete full signup flow"
npm run test:e2e -- --grep "should handle file uploads"
npm run test:e2e -- --grep "should test sticky behavior"

# Run RTL tests
npm run test:e2e -- --grep "RTL Support"
```

### Demo Features

- **Admin User**: Can access admin dashboard, moderate content, and manage users
- **Pending MSME**: Can log in but cannot publish content until profile is complete
- **Approved MSME**: Can publish events and bulletins instantly
- **Guest Mode**: Unauthenticated users can submit content for review

### Testing User Flows

1. **Visitor Flow**:
   - Visit site → See "Login" / "Sign Up" buttons
   - Click "Add Event" → Login required modal appears
   - Click "Continue as Guest" → Email prompt appears
   - Enter email → Guest form opens

2. **Pending MSME Flow**:
   - Login with `pending@demo.com` → See "Account" menu
   - Click "Add Event" → Redirected to profile completion
   - No admin panel link visible

3. **Approved MSME Flow**:
   - Login with `approved@demo.com` → See avatar + name in header
   - Click "Add Event" → Goes to owner forms
   - Publish event → Appears on public events page

4. **Admin Flow**:
   - Login with `admin@demo.com` → See "Admin Panel" link
   - Access admin dashboard → See pending approvals and guest submissions

### Test Coverage

The E2E test suite covers:

- **Smoke Tests**: Basic functionality and language switching
- **Guest Flow**: Unauthenticated user submissions
- **MSME Pending**: Authenticated but incomplete profiles
- **MSME Full**: Approved users with instant publishing
- **Admin Flow**: Content moderation and user management
- **RTL/Arabic**: Right-to-left layout and Arabic translations

## Project Structure

```
chamber122-website/
├── css/                    # Stylesheets
│   ├── style.css          # Main stylesheet
│   └── rtl-overrides.css  # RTL-specific styles
├── js/                     # JavaScript modules
│   ├── i18n.js            # Internationalization
│   ├── supabase.js        # Database client
│   ├── analytics.js       # Analytics tracking
│   └── language-switcher.js # Language switching
├── i18n/                   # Translation files
│   ├── en.json            # English translations
│   └── ar.json            # Arabic translations
├── e2e/                    # E2E test suite
│   ├── fixtures/          # Test utilities
│   ├── specs/             # Test specifications
│   └── playwright.config.ts # Playwright config
├── supabase/               # Database migrations
└── .github/workflows/      # CI/CD workflows
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test:e2e`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## 📚 API Documentation

### Authentication Endpoints

```javascript
// User authentication
supabase.auth.signUp({ email, password })
supabase.auth.signInWithPassword({ email, password })
supabase.auth.signOut()

// Account management
supabase.from('accounts').select('*').eq('owner_user_id', userId)
supabase.from('accounts').insert(accountData)
supabase.from('accounts').update(data).eq('id', accountId)
```

### Content Management

```javascript
// Events
supabase.from('events').select('*').eq('status', 'published')
supabase.from('events').insert(eventData)

// Bulletins
supabase.from('bulletins').select('*').eq('status', 'published')
supabase.from('bulletins').insert(bulletinData)

// Guest submissions
supabase.from('event_suggestions').insert(suggestionData)
supabase.from('bulletin_submissions').insert(submissionData)
```

### File Upload

```javascript
// Upload files to Supabase Storage
supabase.storage.from('public').upload(filePath, file)
supabase.storage.from('public').getPublicUrl(filePath)
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SUPABASE_URL` | Supabase project URL | Yes | - |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin operations | Yes | - |
| `NODE_ENV` | Environment mode | No | `development` |

### Database Schema

The platform uses the following main tables:

- **`accounts`**: MSME business profiles
- **`events`**: Community events and promotions
- **`bulletins`**: Community announcements
- **`event_suggestions`**: Guest-submitted events
- **`bulletin_submissions`**: Guest-submitted bulletins
- **`content_views`**: Analytics tracking

### RLS Policies

Row Level Security is enabled on all tables with policies for:
- Public read access for published content
- Owner CRUD access for user content
- Admin access for moderation
- Anonymous insert for guest submissions

## 🚀 Deployment

### Production Deployment

1. **Build the application:**
```bash
npm run build
```

2. **Deploy to your hosting provider:**
   - Upload the `dist/` folder contents
   - Configure environment variables
   - Set up custom domain

3. **Configure Supabase:**
   - Set up production database
   - Configure RLS policies
   - Set up storage buckets

### Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### CI/CD Pipeline

The project includes GitHub Actions workflows for:
- Automated testing on pull requests
- E2E test execution
- Deployment to staging/production
- Database migration management

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests:**
   ```bash
   npm run test:e2e
   ```
5. **Commit your changes:**
   ```bash
   git commit -m "Add amazing feature"
   ```
6. **Push to your branch:**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Code Style

- Use ESLint for code formatting
- Follow the existing code structure
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Supabase** for providing the backend infrastructure
- **Playwright** for the excellent testing framework
- **Font Awesome** for the icon library
- **Google Fonts** for the typography
- **Kuwait MSME Community** for inspiration and feedback

## 📞 Support

### Getting Help

- **Documentation**: Check this README and inline code comments
- **Issues**: Create an issue in the repository
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact the development team

### Reporting Bugs

When reporting bugs, please include:
- Browser and version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

### Feature Requests

We welcome feature requests! Please:
- Check existing issues first
- Provide detailed description
- Explain the use case
- Consider implementation complexity

---

**Made with ❤️ for the Kuwait MSME Community**

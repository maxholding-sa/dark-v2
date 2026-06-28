# Site Management - Quick Reference Guide

## 🚀 Access Admin Pages

All pages are located under `/admin/site-management/`

### Main Dashboard
**URL**: http://localhost:3000/admin/site-management
- Central hub for all site management
- Quick access cards to all sections

---

## 📱 Social Media Links Management

**URL**: http://localhost:3000/admin/site-management/social-media

### Features:
- ➕ Add new social media platform links
- ✏️ Edit existing links
- 🗑️ Delete links
- 🔄 Manage display order
- ⚙️ Toggle active/inactive status

### Supported Platforms:
- Facebook
- Instagram
- Twitter (X)
- YouTube
- TikTok
- Snapchat
- WhatsApp
- LinkedIn
- Pinterest

### Database Fields:
```
{
  platform: "facebook",          // Platform name
  url: "https://facebook.com/...", // Full URL
  icon: "📘",                    // Optional emoji/icon
  order: 0,                      // Display order
  isActive: true                 // Enable/disable
}
```

---

## 🏪 Store Information Management

**URL**: http://localhost:3000/admin/site-management/store-info

### Features:
- Edit store name
- Update business description
- Manage address and location
- Update contact information (phone, email, WhatsApp)
- Add GPS coordinates for map integration

### Fields Managed:
- **name**: Business/store name
- **description**: Business description (HTML supported)
- **address**: Physical street address
- **city**: City name
- **country**: Country name
- **phone**: Main phone number
- **whatsapp**: WhatsApp contact
- **email**: Primary email
- **latitude**: GPS latitude for maps
- **longitude**: GPS longitude for maps

### Notes:
- Single store info record (auto-creates on first save)
- All fields auto-save on update

---

## 🖼️ Logo Management

**URL**: http://localhost:3000/admin/site-management/logo

### Features:
- ➕ Upload multiple logos
- 🖼️ Image preview before saving
- 📂 Different logo types support
- 🎯 Set active logo per type
- ♿ Alt text for accessibility
- 📊 Manage display order

### Logo Types:
- **main**: Primary site logo
- **favicon**: Browser tab icon
- **navbar**: Navigation bar logo
- **footer**: Footer logo

### Database Fields:
```
{
  imageUrl: "https://example.com/logo.png",
  altText: "Company Logo",
  type: "main",              // main, favicon, navbar, footer
  isActive: true,
  order: 0
}
```

### Tips:
- Image preview shows before saving
- Only one logo per type can be active
- Supports PNG, JPG, SVG, WebP

---

## 📄 About Page Management

**URL**: http://localhost:3000/admin/site-management/about-page

### Features:
- ✏️ Edit page title
- 📝 Rich HTML content editor
- 🖼️ Hero image support
- 📸 Image preview
- 📤 Publish/draft status
- 🔍 SEO optimization

### Fields:
- **title**: Page title (default: "عن المتجر")
- **content**: Full HTML content
- **heroImage**: Hero/banner image URL
- **isPublished**: Visibility toggle
- **metaDescription**: SEO meta description
- **metaKeywords**: SEO keywords (comma-separated)

### HTML Support:
```html
<h1>Title</h1>
<p>Paragraph text</p>
<ul>
  <li>List item</li>
</ul>
<img src="image.jpg" alt="description">
```

### SEO Tips:
- Meta description: 150-160 characters
- Keywords: 5-10 relevant keywords
- Use heading hierarchy (H1, H2, H3)

---

## 🔐 Authentication & Permissions

- All pages require admin authentication
- Used via `getAuthenticatedUser()` in server actions
- Clerk authentication integration
- Admin role verification

---

## 📊 Database Tables

### Created Tables:
1. **SocialMedia** - Social platform links
2. **StoreInfo** - Business information
3. **Logo** - Logo management
4. **AboutPage** - About page content

### Migration:
- File: `20260111031502_add_social_media_store_info_logo_about_page`
- Status: Applied ✅
- Database: PostgreSQL (Supabase)

---

## 🛠️ Developer Guide

### Server Actions Location
File: `/src/actions/site-management.js`

### Importing Server Actions
```javascript
import {
  getSocialMediaLinks,
  createSocialMediaLink,
  updateSocialMediaLink,
  deleteSocialMediaLink,
  getStoreInfo,
  updateStoreInfo,
  getLogos,
  getActiveLogo,
  createLogo,
  updateLogo,
  deleteLogo,
  getAboutPage,
  updateAboutPage
} from "@/actions/site-management";
```

### Using in Components
```javascript
"use client";
import { getStoreInfo } from "@/actions/site-management";

export default function Component() {
  const [storeInfo, setStoreInfo] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const result = await getStoreInfo();
      if (result.success) {
        setStoreInfo(result.data);
      }
    };
    fetchData();
  }, []);

  return <div>{storeInfo?.name}</div>;
}
```

### Response Format
```javascript
// Success
{ 
  success: true, 
  data: {...} 
}

// Error
{ 
  success: false, 
  error: "Error message" 
}
```

---

## 🎨 UI Components Used

- **Button**: Action buttons
- **Input**: Text fields
- **Textarea**: Large text areas
- **Label**: Form labels
- **Checkbox**: Toggle switches
- **Select**: Dropdown menus
- **Card**: Container cards
- **Image**: Next.js Image component

---

## ⚡ Performance Notes

- Database queries optimized with indexes
- Path revalidation on data changes
- Client-side form validation
- Server-side authentication checks
- Efficient image preview loading

---

## 🔄 API Integration Points

### Fetch Social Media (Frontend)
```javascript
const result = await getSocialMediaLinks();
if (result.success) {
  const links = result.data; // Array of social media
}
```

### Update Store Info (Frontend)
```javascript
const result = await updateStoreInfo({
  name: "New Name",
  phone: "+966...",
  email: "email@example.com"
});
```

### Get Active Logo (Frontend)
```javascript
const result = await getActiveLogo();
if (result.success) {
  const logo = result.data; // Current active logo
}
```

---

## 📱 Mobile Responsive

All admin pages are fully responsive:
- ✅ Mobile devices
- ✅ Tablets
- ✅ Desktop screens
- ✅ RTL (Arabic) layout

---

## 🌍 Language Support

- **Interface Language**: Arabic (RTL)
- **Content**: Supports both Arabic & English
- **Database**: UTF-8 encoding supported

---

## 📞 Support & Documentation

For full implementation details, see: `SITE_MANAGEMENT_IMPLEMENTATION.md`


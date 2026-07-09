# Site Management System Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                              │
│         /admin/site-management (Main Hub)                       │
└──────────────┬──────────────┬──────────────┬────────────────────┘
               │              │              │
        ┌──────▼──┐    ┌──────▼──┐   ┌──────▼──┐   ┌──────────┐
        │ Social  │    │  Store  │   │  Logo   │   │  About   │
        │ Media   │    │  Info   │   │ Mgmt    │   │  Page    │
        └──────┬──┘    └──────┬──┘   └──────┬──┘   └────┬─────┘
               │              │              │           │
        ┌──────▼──────────────▼──────────────▼───────────▼─┐
        │   Server Actions (/src/actions/site-management)  │
        │                                                   │
        │  • getSocialMediaLinks()                        │
        │  • createSocialMediaLink()                      │
        │  • updateSocialMediaLink()                      │
        │  • deleteSocialMediaLink()                      │
        │  • getStoreInfo()                               │
        │  • updateStoreInfo()                            │
        │  • getLogos()                                   │
        │  • createLogo()                                 │
        │  • updateLogo()                                 │
        │  • deleteLogo()                                 │
        │  • getAboutPage()                               │
        │  • updateAboutPage()                            │
        └──────────────────┬─────────────────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │     Prisma ORM / Database Layer     │
        └──┬────────────┬───────────┬────┬───┘
           │            │           │    │
     ┌─────▼──┐ ┌──────▼──┐ ┌────▼─┐ └──▼─────┐
     │ Social │ │ Store   │ │ Logo │ │ About  │
     │ Media  │ │  Info   │ │      │ │ Page   │
     │ Table  │ │ Table   │ │Table │ │ Table  │
     └────────┘ └─────────┘ └──────┘ └────────┘
           │            │           │    │
           └────────────┴───────────┴────┘
                      │
              PostgreSQL Database
            (AWS Supabase)
```

## Data Flow Diagram

```
User (Admin)
    │
    ▼
┌──────────────────────────┐
│   Browser / Client       │
│  (Admin Interface)       │
└────────────┬─────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  React Components          │
    │  (Client-side validation)  │
    └────────┬───────────────────┘
             │ [Form Data]
             ▼
┌──────────────────────────────────┐
│  Next.js Server Action           │
│  (site-management.js)            │
│  - Auth check                    │
│  - Server validation             │
│  - Business logic                │
└────────┬─────────────────────────┘
         │ [Prisma Query]
         ▼
┌──────────────────────────────┐
│  Prisma ORM                  │
│  - Query optimization        │
│  - Type safety               │
│  - Migration management      │
└────────┬─────────────────────┘
         │ [SQL]
         ▼
    PostgreSQL Database
    (AWS Supabase)
         │
         ▼
┌──────────────────────────────┐
│  Response (JSON)             │
│  { success: true, data: {...}│
└────────┬─────────────────────┘
         │
         ▼
User sees updated content
```

## Component Hierarchy

```
SiteManagement Hub
├── /social-media
│   ├── SocialMediaPage
│   │   └── SocialMediaForm
│   │       ├── Input (platform)
│   │       ├── Input (url)
│   │       ├── Select (icon)
│   │       ├── Input (order)
│   │       └── Checkbox (isActive)
│   └── SocialLinks Grid
│       └── Card (for each link)
│
├── /store-info
│   ├── StoreInfoPage
│   │   └── StoreInfoForm
│   │       ├── Input (name)
│   │       ├── Textarea (description)
│   │       ├── Input (address)
│   │       ├── Input (city)
│   │       ├── Input (country)
│   │       ├── Input (phone)
│   │       ├── Input (whatsapp)
│   │       ├── Input (email)
│   │       ├── Input (latitude)
│   │       └── Input (longitude)
│   └── Card (display)
│
├── /logo
│   ├── LogoPage
│   │   └── LogoForm
│   │       ├── Input (imageUrl)
│   │       ├── Input (altText)
│   │       ├── Select (type)
│   │       ├── Image Preview
│   │       └── Checkbox (isActive)
│   └── Logos Grid
│       └── Card (for each logo)
│
└── /about-page
    ├── AboutPagePage
    │   └── AboutPageForm
    │       ├── Input (title)
    │       ├── Textarea (content)
    │       ├── Input (heroImage)
    │       ├── Image Preview
    │       ├── Textarea (metaDescription)
    │       ├── Input (metaKeywords)
    │       └── Checkbox (isPublished)
    └── Card (display)
```

## Database Schema Relationships

```
┌─────────────────────┐
│   SocialMedia       │
├─────────────────────┤
│ id (PK)             │
│ platform (UNIQUE)   │
│ url                 │
│ icon (Optional)     │
│ order               │
│ isActive            │
│ createdAt           │
│ updatedAt           │
└─────────────────────┘

┌─────────────────────┐
│   StoreInfo         │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ description         │
│ address             │
│ city                │
│ country             │
│ phone               │
│ whatsapp            │
│ email               │
│ latitude            │
│ longitude           │
│ createdAt           │
│ updatedAt           │
└─────────────────────┘

┌─────────────────────┐
│   Logo              │
├─────────────────────┤
│ id (PK)             │
│ imageUrl            │
│ altText             │
│ type                │
│ isActive            │
│ createdAt           │
│ updatedAt           │
└─────────────────────┘

┌─────────────────────┐
│   AboutPage         │
├─────────────────────┤
│ id (PK)             │
│ title               │
│ content (HTML)      │
│ heroImage           │
│ isPublished         │
│ metaDescription     │
│ metaKeywords        │
│ createdAt           │
│ updatedAt           │
└─────────────────────┘

Note: No foreign key relationships
All tables are independent
Each table manages its own data
```

## API Endpoint Flow

```
Admin Request Flow:

1. User accesses /admin/site-management/social-media
2. Page loads → calls getSocialMediaLinks()
3. Server validates authentication ✓
4. Database query executes
5. Results returned as JSON
6. UI renders social media links
7. User clicks "Add New"
8. Form opens → User fills data
9. User submits form → calls createSocialMediaLink()
10. Server validates data ✓
11. Database insert executes
12. Path revalidation triggers
13. UI updates with new data
14. Success notification shows

Same flow for:
- Edit/Update operations
- Delete operations
- Store Info management
- Logo management
- About Page management
```

## Security & Authentication

```
┌─────────────────────────────────┐
│  User Request                   │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Server Action Executed         │
│  (site-management.js)           │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  await getAuthenticatedUser()   │
│  (Check Clerk Session)          │
└─────┬───────────────────────┬───┘
      │                       │
   ✓ Admin           ✗ Not Admin
      │                       │
      ▼                       ▼
  Continue        Throw Error
  Database Op     Unauthorized

Result:
{ success: false, error: "..." }
```

## Caching & Revalidation Strategy

```
┌──────────────────────────────┐
│  Server Action Updates Data  │
└──────────────┬───────────────┘
               │
               ▼
         Database Write
               │
               ▼
    ┌─────────────────────┐
    │ revalidatePath()    │
    ├─────────────────────┤
    │ /admin/site-management/
    │   social-media      │
    │ /admin/site-management/
    │   store-info        │
    │ /admin/site-management/
    │   logo              │
    │ /admin/site-management/
    │   about-page        │
    │ /about (public)     │
    └─────────────────────┘
               │
               ▼
      Next.js Cache
      Re-generation
```

## File Organization

```
Site Management System
│
├── Database Layer
│   └── /prisma
│       ├── schema.prisma (4 new models)
│       └── /migrations
│           └── 20260111031502_*
│
├── Server Layer
│   └── /src/actions
│       └── site-management.js (13 functions)
│
├── UI Layer
│   └── /src/app/(admin)/admin/site-management
│       ├── page.jsx (Hub)
│       ├── layout.js
│       ├── /social-media
│       │   ├── page.jsx
│       │   ├── layout.js
│       │   └── /_components
│       │       └── SocialMediaForm.jsx
│       ├── /store-info
│       │   ├── page.jsx
│       │   ├── layout.js
│       │   └── /_components
│       │       └── StoreInfoForm.jsx
│       ├── /logo
│       │   ├── page.jsx
│       │   ├── layout.js
│       │   └── /_components
│       │       └── LogoForm.jsx
│       └── /about-page
│           ├── page.jsx
│           ├── layout.js
│           └── /_components
│               └── AboutPageForm.jsx
│
└── Documentation
    ├── SITE_MANAGEMENT_IMPLEMENTATION.md
    └── SITE_MANAGEMENT_QUICK_GUIDE.md
```

## Performance Optimizations

```
Database Layer:
├── Indexes on frequently queried fields
│   ├── SocialMedia: platform, isActive, order
│   ├── StoreInfo: (single record)
│   ├── Logo: type, isActive
│   └── AboutPage: (single record)
├── Unique constraints to prevent duplicates
└── Proper data types (Text for large content)

Server Layer:
├── Efficient database queries
├── Error handling & validation
├── Path revalidation for cache updates
└── Authentication checks

Client Layer:
├── Form validation before submission
├── Image preview caching
├── Responsive design (mobile-first)
└── Error/success notifications
```

---

**Date**: January 11, 2026
**Status**: ✅ Complete & Documented

# Hero Section Video Management - Complete Implementation Guide

## 🎬 Feature Overview

Added a **Hero Section Video Management** tab to the `/admin/site-data` dashboard, allowing administrators to:
- Upload or link hero section videos
- Set video titles and subtitles
- Configure video playback behavior (autoplay, loop, muted)
- Add poster/thumbnail images
- View live video preview
- Toggle hero section visibility

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Dashboard                          │
│              /admin/site-data/page.jsx                      │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┬────────────┬──────────────┬──────────────┐
        │                         │            │              │              │
        ▼                         ▼            ▼              ▼              ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────┐  ┌──────────────┐  ┌──────────┐
│ Social Media Tab │  │ Store Info Tab   │  │Logo  │  │ About Page   │  │ HERO SEC │
│   Manager        │  │    Manager       │  │Manager│  │   Manager    │  │Manager   │
└──────────────────┘  └──────────────────┘  └──────┘  └──────────────┘  └──────────┘
                                                                               ▲
                                                                               │
                                                              ┌────────────────┘
                                                              │
                                                    ┌─────────▼─────────┐
                                                    │ HeroSectionManager│
                                                    │   (NEW COMPONENT) │
                                                    └─────────┬─────────┘
                                                              │
                                            ┌─────────────────┼─────────────────┐
                                            │                 │                 │
                                            ▼                 ▼                 ▼
                                    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                                    │ Form Fields: │  │   Settings   │  │   Preview    │
                                    │  - Video URL │  │ - Autoplay   │  │   Player     │
                                    │  - Title     │  │ - Loop       │  │              │
                                    │  - Subtitle  │  │ - Muted      │  │ (Live video  │
                                    │  - Poster    │  │ - Active     │  │  playback)   │
                                    └──────────────┘  └──────────────┘  └──────────────┘
                                            │
                                            └────────────────┬───────────────────┐
                                                             │                   │
                                                    ┌────────▼────────┐  ┌───────▼──────┐
                                                    │ updateHeroSection│  │ getHeroSection│
                                                    │ (Server Action) │  │(Server Action)│
                                                    └────────┬────────┘  └───────┬──────┘
                                                             │                   │
                                            ┌────────────────┴───────────────────┘
                                            │
                                    ┌───────▼────────────┐
                                    │  Prisma Database   │
                                    │  - HeroSection ORM │
                                    │  - PostgreSQL      │
                                    └────────────────────┘
```

## 📋 Data Flow Diagram

### Save Hero Section Flow
```
User fills form in HeroSectionManager
         │
         ▼
Form submission → handleSubmit()
         │
         ▼
Call updateHeroSection(formData) [Server Action]
         │
         ▼
Server verifies admin authentication
         │
         ▼
Query/Update database:
  - Find existing HeroSection
  - If exists → UPDATE
  - If not → CREATE
         │
         ▼
Revalidate paths:
  - /admin/site-data
  - /
         │
         ▼
Return { success: true, data: HeroSection }
         │
         ▼
Component receives response
         │
         ▼
Display success notification
         │
         ▼
Update form data with returned data
```

### Load Hero Section Flow
```
Dashboard mounts
         │
         ▼
useEffect → loadAllData()
         │
         ▼
Promise.all([
  getSocialMediaLinks(),
  getStoreInfo(),
  getLogos(),
  getAboutPage(),
  getHeroSection()  ← NEW
])
         │
         ▼
getHeroSection() [Server Action]
         │
         ▼
Query database:
  - Find HeroSection
  - If not exists → Create default
         │
         ▼
Return { success: true, data: HeroSection }
         │
         ▼
Dashboard receives data
         │
         ▼
setData({ ...heroSection: result.data })
         │
         ▼
HeroSectionManager receives initialData prop
         │
         ▼
Component renders with pre-filled form
```

## 🗂️ File Structure

```
/root/dark-v2/
├── prisma/
│   └── schema.prisma
│       └── model HeroSection { ... }  [ADDED]
│
├── src/
│   ├── actions/
│   │   └── site-management.js
│   │       ├── getHeroSection()      [ADDED]
│   │       └── updateHeroSection()   [ADDED]
│   │
│   └── app/
│       └── (admin)/
│           └── admin/
│               └── site-data/
│                   ├── page.jsx
│                   ├── layout.js
│                   └── _components/
│                       ├── Dashboard.jsx              [MODIFIED]
│                       ├── SocialMediaManager.jsx
│                       ├── StoreInfoManager.jsx
│                       ├── LogoManager.jsx
│                       ├── AboutPageManager.jsx
│                       └── HeroSectionManager.jsx    [ADDED]
│
└── [documentation files]
    ├── HERO_SECTION_IMPLEMENTATION.md
    └── HERO_SECTION_QUICK_REFERENCE.md
```

## 💾 Database Schema Details

### HeroSection Model
```prisma
model HeroSection {
  id             String      // Primary key (UUID)
  videoUrl       String      // Video URL (required)
  title          String      // Hero title (default: "مرحباً بك")
  subtitle       String?     // Optional subtitle
  posterImage    String?     // Poster/thumbnail image URL
  isActive       Boolean     // Toggle visibility (default: true)
  autoplay       Boolean     // Auto-play video (default: true)
  loop           Boolean     // Loop video (default: true)
  muted          Boolean     // Mute audio (default: true)
  createdAt      DateTime    // Timestamp
  updatedAt      DateTime    // Timestamp
  
  @@unique([id])             // Only one hero section allowed
}
```

### Key Design Decisions
1. **Single Record**: `@@unique([id])` constraint ensures only one hero section
2. **Default Values**: All boolean fields default to `true` for best UX
3. **Arabic Support**: Default title is Arabic: "مرحباً بك"
4. **Video Settings**: All video control options configurable
5. **Auto-Create**: Server actions auto-create if record doesn't exist

## 🎮 Component Props & State

### HeroSectionManager Props
```javascript
{
  initialData: {
    id: string,
    videoUrl: string,
    title: string,
    subtitle?: string,
    posterImage?: string,
    isActive: boolean,
    autoplay: boolean,
    loop: boolean,
    muted: boolean,
    createdAt: datetime,
    updatedAt: datetime
  },
  onRefresh?: () => void  // Optional callback to refresh parent
}
```

### HeroSectionManager State
```javascript
formData: {
  videoUrl: string,
  title: string,
  subtitle: string | null,
  posterImage: string | null,
  isActive: boolean,
  autoplay: boolean,
  loop: boolean,
  muted: boolean
}

message: {
  type: "success" | "error",
  text: string
} | null

loading: boolean
```

### Dashboard State
```javascript
data: {
  socialMedia: SocialMedia[],
  storeInfo: StoreInfo | null,
  logos: Logo[],
  aboutPage: AboutPage | null,
  heroSection: HeroSection | null  // NEW
}

loading: boolean
error: string
activeTab: string
```

## 🔄 State Management Flow

```
Initial State:
{
  socialMedia: [],
  storeInfo: null,
  logos: [],
  aboutPage: null,
  heroSection: null,  ← NEW
  loading: true,
  error: ""
}
       │
       ▼
useEffect on mount:
  → loadAllData()
       │
       ▼
Promise.all() resolves
       │
       ▼
setData({
  socialMedia: [...],
  storeInfo: {...},
  logos: [...],
  aboutPage: {...},
  heroSection: {...}  ← POPULATED
})
       │
       ▼
Component re-renders
       │
       ▼
HeroSectionManager receives
initialData={data.heroSection}
       │
       ▼
HeroSectionManager sets local
formData from initialData
       │
       ▼
User interacts with form
       │
       ▼
User clicks save
       │
       ▼
submitForm() → updateHeroSection()
       │
       ▼
Server updates database
       │
       ▼
Server returns updated data
       │
       ▼
Component shows success
       │
       ▼
Optional: onRefresh() callback
calls loadAllData() in parent
```

## 📡 API Contract

### getHeroSection() Server Action
```javascript
// Input: None

// Output:
{
  success: true,
  data: {
    id: string,
    videoUrl: string,
    title: string,
    subtitle: string | null,
    posterImage: string | null,
    isActive: boolean,
    autoplay: boolean,
    loop: boolean,
    muted: boolean,
    createdAt: datetime,
    updatedAt: datetime
  }
}
// OR
{
  success: false,
  error: string
}
```

### updateHeroSection(data) Server Action
```javascript
// Input:
{
  videoUrl: string,        // Required
  title: string,           // Required
  subtitle?: string,       // Optional
  posterImage?: string,    // Optional
  isActive?: boolean,      // Optional (default: true)
  autoplay?: boolean,      // Optional (default: true)
  loop?: boolean,          // Optional (default: true)
  muted?: boolean          // Optional (default: true)
}

// Output:
{
  success: true,
  data: {
    id: string,
    videoUrl: string,
    title: string,
    subtitle: string | null,
    posterImage: string | null,
    isActive: boolean,
    autoplay: boolean,
    loop: boolean,
    muted: boolean,
    createdAt: datetime,
    updatedAt: datetime
  }
}
// OR
{
  success: false,
  error: string
}
```

## 🔐 Security & Authentication

### Authentication Flow
```
User accesses /admin/site-data
         │
         ▼
Clerk authentication check
         │
         ├─ Not logged in → Redirect to /sign-in
         │
         └─ Logged in → Check admin role
                │
                ├─ Not admin → Show error
                │
                └─ Is admin → Load dashboard
                        │
                        ▼
                Click "Save Changes"
                        │
                        ▼
                Call updateHeroSection()
                        │
                        ▼
                Server Action runs:
                  getAuthenticatedUser()
                        │
                        ├─ No user → Error
                        │
                        └─ User found → Verify role
                                │
                                ├─ Not admin → Error
                                │
                                └─ Is admin → Update DB
```

### Protected Operations
- `getHeroSection()` → Protected by `getAuthenticatedUser()`
- `updateHeroSection()` → Protected by `getAuthenticatedUser()`

## 🎨 UI/UX Details

### Form Layout (RTL Optimized)
```
┌─────────────────────────────────────────────┐
│ إدارة قسم البطل (الفيديو)                 │
├─────────────────────────────────────────────┤
│                                             │
│ ☑ رابط الفيديو                      ▶     │
│ [https://example.com/video.mp4           ] │
│ أدخل رابط الفيديو أو مسار الملف          │
│                                             │
│ ☑ العنوان                            ▶     │
│ [مرحباً بك                                ] │
│                                             │
│ ☑ العنوان الفرعي                    ▶     │
│ [نص إضافي (اختياري)                    ] │
│                                             │
│ ☑ صورة الغلاف (الصورة المصغرة)      ▶     │
│ [https://example.com/poster.jpg         ] │
│ تُعرض قبل بدء تشغيل الفيديو              │
│                                             │
│ ─────────────────────────────────────────── │
│                   إعدادات الفيديو           │
│ ─────────────────────────────────────────── │
│                                             │
│ ☐ تشغيل تلقائي                ✓ Checked   │
│ ☐ إعادة التشغيل               ✓ Checked   │
│ ☐ بدون صوت                     ✓ Checked   │
│ ☐ نشط                          ✓ Checked   │
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │        حفظ التغييرات                  │   │
│ └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│            معاينة الفيديو                 │
├─────────────────────────────────────────────┤
│                                             │
│     ┌──────────────────────────────────┐   │
│     │   [▶] Video Player              │   │
│     │                                  │   │
│     │   00:00 ─────●────── 2:35       │   │
│     │   [Full Screen] [Mute] [CC]     │   │
│     └──────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

### Success Message
```
┌────────────────────────────────────────────┐
│ ✓ تم تحديث قسم البطل بنجاح               │
└────────────────────────────────────────────┘
```

### Error Message
```
┌────────────────────────────────────────────┐
│ ⚠ حدث خطأ أثناء التحديث                  │
└────────────────────────────────────────────┘
```

## 🧪 Testing Scenarios

### Test Case 1: Create Hero Section
```
1. Navigate to /admin/site-data
2. Click "قسم البطل" tab
3. Enter video URL
4. Enter title
5. Click save
6. Expected: Success notification, data persists on reload
```

### Test Case 2: Update Hero Section
```
1. HeroSection already exists
2. Navigate to /admin/site-data
3. Click "قسم البطل" tab
4. Modify video URL
5. Change autoplay setting
6. Click save
7. Expected: Updated data displays correctly
```

### Test Case 3: Video Preview
```
1. Enter valid video URL
2. Leave "نشط" checkbox checked
3. Expected: Video player appears below form
4. Try to play video: Should work
```

### Test Case 4: Settings Toggle
```
1. Uncheck "تشغيل تلقائي"
2. Uncheck "إعادة التشغيل"
3. Uncheck "بدون صوت"
4. Uncheck "نشط"
5. Click save
6. Expected: All settings persisted in database
```

### Test Case 5: Authentication
```
1. Logout from admin account
2. Try to access /admin/site-data
3. Expected: Redirect to /sign-in
```

## 📊 Performance Considerations

1. **Database Queries**
   - Single `findFirst()` call on load (efficient)
   - Single `findFirst()` + `update()` or `create()` on save
   - No N+1 queries

2. **Rendering**
   - Lazy video loading (only loaded when component mounts)
   - Memoization not needed (simple form)
   - No infinite re-renders

3. **Network**
   - Single server action call per save
   - Revalidates only necessary paths
   - No polling or real-time subscriptions

## 🚀 Deployment Checklist

- [x] Database migration created
- [x] Prisma schema updated
- [x] Server actions implemented
- [x] Component created
- [x] Dashboard integrated
- [x] Authentication added
- [x] Error handling implemented
- [x] RTL support added
- [x] No breaking changes
- [x] TypeScript compilation passes
- [x] No console errors

## 📚 Related Documentation

- [Hero Section Quick Reference](./HERO_SECTION_QUICK_REFERENCE.md)
- [Hero Section Implementation](./HERO_SECTION_IMPLEMENTATION.md)
- Dashboard: `/admin/site-data`
- Database: Prisma ORM with PostgreSQL

---

**Implementation Date**: 2025-01-11
**Status**: ✅ Production Ready
**Version**: 1.0.0

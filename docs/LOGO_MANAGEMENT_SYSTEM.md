# Logo Management System - Implementation Summary

## Overview
A comprehensive logo management system has been implemented to allow dynamic management of 4 different logo types from the database:

1. **nav** - Navigation bar logo
2. **main** - Homepage about/main section logo
3. **footer** - Footer logo
4. **favicon** - Browser tab, metadata, and search engine logo

## Changes Made

### 1. **Database Functions** (`src/actions/site-management.js`)
- Added `getLogoByType(type)` function to fetch specific logo types by their type identifier
- Filters by type and isActive status
- Returns the most recent active logo for the specified type

### 2. **API Routes**

#### `/api/upload` (Updated)
- Now handles all file uploads including logos
- Uses busboy for streaming multipart form data
- Bypasses Clerk middleware to avoid body size limitations
- Supports uploads up to 150MB

#### `/api/favicon` (New)
- Serves favicon logo data from database
- Falls back to `/logo1.png` if no favicon is configured
- Returns JSON with logo information

#### `/api/logos/main` (New)
- Serves the main/about section logo from database
- Falls back to `/logo.jpg` if no main logo is configured
- Used by homepage to display dynamic main logo

### 3. **Components Updated**

#### Header Component (`src/components/header.jsx`)
- Fetches nav logo on component mount using `getLogoByType('nav')`
- Displays dynamic nav logo instead of hardcoded `/logo1.png`
- Falls back to `/logo1.png` if database logo is unavailable

#### Footer Component (`src/components/Footer.jsx`)
- Updated to fetch footer logo using `getLogoByType('footer')` instead of generic active logo
- Displays footer-specific logo from database
- Falls back to `/logo1.png` if not configured

#### HomePage (`src/app/page.jsx`)
- Added `mainLogo` state to store fetched main logo
- Fetches main logo from `/api/logos/main` on component mount
- Displays dynamic main logo in the about section
- Falls back to `/logo.jpg` if no database logo exists

#### LogoManager Component (`src/app/(admin)/admin/site-data/_components/LogoManager.jsx`)
- Updated to use new `/api/upload` endpoint instead of server action
- Removed dependency on `uploadFile` server action
- Now uses FormData + fetch to upload logos
- Supports uploading logos for all 4 types: nav, main, footer, favicon

### 4. **Middleware Configuration** (`src/middleware.js`)
- Excludes `/api/upload` route from middleware to prevent body size limitations
- Allows streaming file uploads without the 10MB limit

### 5. **Next.js Configuration** (`next.config.mjs`)
- Set `middlewareClientMaxBodySize: '150mb'`
- Set `api.bodyParser.sizeLimit: '150mb'`
- Set `httpMaxRequestSize: '150mb'`
- These configurations allow large file uploads

## Logo Type Reference

### nav
- **Purpose**: Navigation bar logo
- **Display**: Top-left of header across all pages
- **Recommended Size**: 100x60 or similar aspect ratio
- **Format**: PNG, JPG, or WebP

### main
- **Purpose**: Homepage about/main section logo
- **Display**: In the hero/about section on homepage
- **Recommended Size**: Larger, responsive image
- **Format**: PNG, JPG, or WebP

### footer
- **Purpose**: Footer branding logo
- **Display**: Bottom of all pages in footer
- **Recommended Size**: 100x100 pixels
- **Format**: PNG with transparency recommended

### favicon
- **Purpose**: Browser tab icon, search engines, metadata
- **Display**: Browser tab, bookmarks, search results
- **Recommended Size**: 512x512 (will be resized)
- **Format**: PNG with transparency recommended

## How to Use

### For Admins (Managing Logos)
1. Go to Admin Panel → Site Management → Logo Manager
2. Select the logo type (nav, main, footer, favicon)
3. Upload the image file
4. Set as active
5. Click Save

### For Developers (Using Logos in Components)
```javascript
// Fetch logo by type
import { getLogoByType } from '@/actions/site-management';

const result = await getLogoByType('nav');
if (result.success) {
  const logo = result.data;
  // Use logo.imageUrl and logo.altText
}
```

### For Frontend Integration
```javascript
// Fetch via API route
const response = await fetch('/api/logos/main');
const result = await response.json();
if (result.success) {
  const mainLogo = result.data;
}
```

## File Upload Endpoints

### POST /api/upload
Handles all file uploads with streaming support
- **Body**: FormData with `file` and `folder` fields
- **Max Size**: 150MB
- **Returns**: JSON with `success`, `url`, and `filePath`

## Default Fallbacks
- **nav**: `/logo1.png`
- **main**: `/logo.jpg`
- **footer**: `/logo1.png`
- **favicon**: `/logo1.png`

These defaults are used when no logo is configured in the database.

## Database Schema
```prisma
model Logo {
  id        String   @id @default(uuid())
  imageUrl  String   // Logo image URL/path
  altText   String   @default("Company Logo")
  type      String   @default("main") // main, favicon, nav, footer
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([type])
  @@index([isActive])
}
```

## Benefits
✅ Centralized logo management
✅ Dynamic logo updates without code changes
✅ Support for multiple logo types
✅ Automatic fallbacks to defaults
✅ Large file upload support (150MB)
✅ SEO-friendly favicon management
✅ Easy admin interface


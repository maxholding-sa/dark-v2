# Featured Brands Admin Panel - Documentation

## Overview
This feature allows administrators to manage the "العلامات التجارية المميزة" (Featured Brands) section displayed on the homepage through a comprehensive admin interface.

## Database Schema
A new `FeaturedBrand` model has been added to the Prisma schema with the following fields:
- `id`: Unique identifier (UUID)
- `name`: Brand name in English
- `nameAr`: Brand name in Arabic
- `image`: Image URL (stored in Supabase storage)
- `order`: Display order (integer, lower numbers appear first)
- `isActive`: Boolean flag to show/hide the brand
- `createdAt`: Timestamp when created
- `updatedAt`: Timestamp when last updated

## Features

### CRUD Operations
1. **Create**: Add new featured brands with image upload
2. **Read**: View all featured brands with search functionality
3. **Update**: Edit brand details and images
4. **Delete**: Remove brands from the database

### Admin Interface
Located at: `/admin/featured-brands`

#### Components Created:
1. **page.jsx**: Main admin page
2. **FeaturedBrandList.jsx**: List view with table display
3. **FeaturedBrandDialog.jsx**: Modal dialog for add/edit operations

#### Features:
- ✅ Search by Arabic or English name
- ✅ Toggle brand active/inactive status
- ✅ Drag-and-drop or click to upload images
- ✅ Image preview before saving
- ✅ Display order management
- ✅ Responsive design (mobile and desktop)
- ✅ Loading states and error handling
- ✅ Toast notifications for success/error messages

### Homepage Integration
The homepage has been updated to:
- Fetch featured brands from the database instead of hardcoded data
- Display only active brands (`isActive: true`)
- Sort brands by the `order` field
- Show loading skeleton while fetching
- Display empty state when no brands are available

### Image Upload
Images are uploaded to Supabase storage in the `car-images/brands/` folder:
- Supports: PNG, JPG, WEBP formats
- Max file size: 5MB
- Images are automatically deleted when a brand is removed or image is replaced

## Server Actions
Located at: `src/actions/featured-brands.js`

### Available Actions:
1. `getFeaturedBrands()` - Public: Get active brands for homepage
2. `getAllFeaturedBrandsAdmin(search)` - Admin: Get all brands with search
3. `createFeaturedBrand(data)` - Admin: Create new brand
4. `updateFeaturedBrand(id, data)` - Admin: Update existing brand
5. `deleteFeaturedBrand(id)` - Admin: Delete brand
6. `toggleFeaturedBrandStatus(id)` - Admin: Toggle active status

## Navigation
A new menu item "العلامات التجارية" (Featured Brands) has been added to the admin sidebar with an Award icon.

## Usage Instructions

### For Administrators:

1. **Access the Admin Panel**
   - Navigate to `/admin/featured-brands`
   - You must be logged in as an admin user

2. **Add a New Brand**
   - Click "إضافة علامة تجارية" (Add Featured Brand)
   - Fill in the Arabic and English names
   - Set the display order (optional, defaults to 0)
   - Upload a brand logo image
   - Click "إضافة" (Add)

3. **Edit a Brand**
   - Click the three dots menu (⋮) next to a brand
   - Select "تعديل" (Edit)
   - Update the fields as needed
   - Click "تحديث" (Update)

4. **Toggle Visibility**
   - Click on the status badge (نشط/غير نشط)
   - Or use the dropdown menu to show/hide

5. **Delete a Brand**
   - Click the three dots menu (⋮)
   - Select "حذف" (Delete)
   - Confirm the deletion

6. **Search Brands**
   - Use the search box to filter by Arabic or English name
   - Results update automatically as you type

### For Developers:

1. **Run Migration**
   ```bash
   npx prisma migrate dev --name add_featured_brand_model
   npx prisma generate
   ```

2. **Seed Initial Data (Optional)**
   You can manually add brands through the admin interface or create a seed script.

3. **Environment Variables Required**
   - `DATABASE_URL`: PostgreSQL connection string
   - `DIRECT_URL`: Direct database connection
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
   - `SUPABASE_ANON_KEY`: Supabase anonymous key

## File Structure
```
src/
├── actions/
│   └── featured-brands.js           # Server actions for CRUD
├── app/
│   ├── (admin)/
│   │   └── admin/
│   │       ├── featured-brands/
│   │       │   ├── page.jsx         # Main admin page
│   │       │   └── _components/
│   │       │       ├── FeaturedBrandList.jsx    # List component
│   │       │       └── FeaturedBrandDialog.jsx  # Add/Edit dialog
│   │       └── _components/
│   │           └── Sidebar.jsx      # Updated with new menu item
│   └── page.jsx                     # Updated homepage
└── prisma/
    └── schema.prisma                # Updated with FeaturedBrand model
```

## API Endpoints (Server Actions)

### Public Endpoint
- `getFeaturedBrands()` - No authentication required, returns only active brands

### Admin Endpoints (Requires ADMIN role)
- `getAllFeaturedBrandsAdmin(search)` - Get all brands with optional search
- `createFeaturedBrand({ name, nameAr, image, order })`
- `updateFeaturedBrand(id, { name, nameAr, image, order, isActive })`
- `deleteFeaturedBrand(id)`
- `toggleFeaturedBrandStatus(id)`

## Security
- All admin actions require authentication via Clerk
- Only users with `role: "ADMIN"` can perform CRUD operations
- Public endpoint only returns active brands
- Image uploads are validated for type and size

## Testing Checklist
- [ ] Navigate to `/admin/featured-brands` as admin
- [ ] Add a new brand with image
- [ ] Edit an existing brand
- [ ] Toggle brand active/inactive status
- [ ] Delete a brand
- [ ] Search for brands
- [ ] Verify homepage displays active brands
- [ ] Test responsive design on mobile
- [ ] Verify image uploads work correctly
- [ ] Test error handling (invalid images, missing fields)

## Future Enhancements
- Bulk upload/import brands
- Brand categories or groups
- Analytics for brand clicks
- Drag-and-drop reordering
- Brand link customization (currently links to `/cars?make={brand.name}`)

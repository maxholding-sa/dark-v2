# Admin Site Data - File Upload Quick Reference

## ✅ What Changed

All videos and images in `/admin/site-data` now use **file uploads** instead of URL links.

### Affected Components

| Component | Before | After |
|-----------|--------|-------|
| Hero Section Video | Text URL input | File upload + preview |
| Hero Section Poster | Text URL input | File upload + image preview |
| Logo Manager | Text URL input | File upload + image preview |

## 🚀 How to Use

### Upload a Video (Hero Section Tab)

1. Go to `/admin/site-data` → "قسم البطل" tab
2. Click the dashed box under "فيديو البطل"
3. Select a video file (MP4, WebM, Ogg, etc.)
4. File uploads automatically
5. Name appears below box when done
6. Click save

### Upload a Poster Image (Hero Section Tab)

1. Click the dashed box under "صورة الغلاف"
2. Select an image (JPG, PNG, WebP, etc.)
3. Image uploads and preview appears
4. Click save

### Upload a Logo (Logos Tab)

1. Go to `/admin/site-data` → "الشعارات" tab
2. Click "إضافة شعار جديد" or edit existing
3. Click dashed upload box under "صورة الشعار"
4. Select image and wait for upload
5. Select type (main, favicon, navbar, footer)
6. Click save

## 📁 File Storage

All files uploaded to Supabase Storage in `car-images` bucket:
- Hero videos: `hero-videos/` folder
- Poster images: `hero-posters/` folder  
- Logo images: `logos/` folder

**Naming**: `{type}-{timestamp}-{uuid}.{ext}`

Example: `hero-videos-1705999200000-a1b2c3d4-e5f6.mp4`

## 🎯 Key Features

✅ **Drag-Drop Upload** - Dashed box interface
✅ **Upload Status** - Shows "جاري الرفع..." while uploading
✅ **File Names** - Displays uploaded filename
✅ **Image Preview** - Shows thumbnail for images
✅ **Clear Button** - Remove file with X button
✅ **Error Messages** - Shows problems with red alerts
✅ **Success Messages** - Green confirmation on upload

## ⚡ Supported Formats

### Videos
- MP4
- WebM
- Ogg
- Any HTML5 video format

### Images
- JPG
- PNG
- WebP
- GIF

## 🔧 Server Actions

### uploadFile(file, folder)
```javascript
// Usage
const result = await uploadFile(fileObject, "hero-videos");

// Response
{
  success: true,
  url: "https://supabase.../storage/v1/object/public/...",
  filePath: "hero-videos/filename"
}
```

### deleteFile(filePath)
```javascript
const result = await deleteFile("hero-videos/filename");
// { success: true }
```

## ✅ Verification

Files are automatically:
- ✅ Converted to Base64 format
- ✅ Uploaded to Supabase Storage
- ✅ Stored in public bucket
- ✅ Public URL generated
- ✅ URL saved in database
- ✅ Available immediately for display

## 📊 Upload Limits

- **Size**: Limited by Supabase free tier (usually fine for most media)
- **Types**: Any video/image format supported by HTML5
- **Speed**: Depends on file size and internet speed
  - 5MB video: ~2-5 seconds
  - 1MB image: ~0.5-1 second

## 🐛 Troubleshooting

### "تم رفع الفيديو بنجاح" but file not showing
- Wait a moment and refresh the page
- Check browser console for errors

### Upload fails silently
- Check file size (try smaller file)
- Check internet connection
- Verify admin authentication

### Preview not showing
- Check browser console
- Verify CORS settings on Supabase

## 🔐 Security

- ✅ Admin authentication required
- ✅ Files stored in secure Supabase bucket
- ✅ Public URLs are read-only
- ✅ Only admins can upload/delete

## 📝 Notes

- Old URL-based files still work
- Admins can upload one file at a time
- Files organized by type/folder
- Automatic naming prevents conflicts
- All files are permanent (use clear button to remove)

## 🆘 Need Help?

See detailed documentation in:
- `FILE_UPLOAD_IMPLEMENTATION.md` - Full technical details
- `HERO_SECTION_IMPLEMENTATION.md` - Hero section specifics
- Server actions source: `/src/actions/site-management.js`
- Component code: `/admin/site-data/_components/`

---

**Quick Start**: Go to `/admin/site-data` → Click any upload box → Select file → Wait for confirmation → Save! 🚀

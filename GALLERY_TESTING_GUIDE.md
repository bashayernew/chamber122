# Owner Gallery - Testing Guide

## 🎯 **Gallery Functionality Test**

This guide will walk you through testing the Owner Gallery system to ensure image upload, display, and deletion work correctly.

### **Prerequisites**
- Supabase client is properly configured (`window.supabase` exists)
- You are signed in as a business owner
- Storage bucket "gallery" exists with public read enabled
- RLS policies allow owner to manage files under `gallery/<business_id>/*`

### **Test Flow Overview**
1. Navigate to owner profile page
2. Upload multiple images
3. Verify images appear instantly in grid
4. Test image deletion
5. Refresh page and verify persistence
6. Test error handling

---

## **Step 1: Access Gallery**

### **URL:** `/public/profile.html`

1. **Navigate to Profile**
   - Go to `/public/profile.html`
   - Verify you see the "Gallery" section
   - Verify you see "Upload Images" button
   - Verify gallery grid shows "No images yet" placeholder

### **Expected Result:**
- Gallery section is visible
- Upload button is present
- Empty state shows correctly

---

## **Step 2: Upload Images**

1. **Click Upload Button**
   - Click "Upload Images" button
   - File picker should open
   - Select multiple image files (JPG, PNG, etc.)

2. **Verify Upload Process**
   - Toast notifications should appear for each upload
   - Images should appear in grid immediately (optimistic updates)
   - Success toasts should show for each successful upload

3. **Test Different File Types**
   - Upload a JPG file ✅ (should work)
   - Upload a PNG file ✅ (should work)
   - Try to upload a PDF file ❌ (should show error toast)
   - Try to upload a very large file ❌ (should show error toast)

### **Expected Result:**
- Images upload successfully to `gallery/<business_id>/<timestamp>-<slug>.<ext>`
- Images appear instantly in grid
- Error handling works for invalid files
- Toast notifications provide feedback

---

## **Step 3: Verify Image Display**

1. **Check Grid Layout**
   - Images should be in responsive grid (1-4 columns based on screen size)
   - Each image should show as a card with hover effects
   - Images should have proper aspect ratio (h-48)

2. **Test Hover Effects**
   - Hover over an image card
   - Delete button should appear with fade-in effect
   - Card should have subtle border color change

3. **Check Image Loading**
   - Images should load with lazy loading
   - Fallback error image should show if image fails to load
   - Filename should be displayed below each image

### **Expected Result:**
- Responsive grid layout works correctly
- Hover effects are smooth and functional
- Images load properly with fallbacks

---

## **Step 4: Test Image Deletion**

1. **Delete Single Image**
   - Hover over an image to reveal delete button
   - Click "Delete" button
   - Confirm deletion in dialog
   - Image should disappear from grid immediately
   - Success toast should appear

2. **Delete Multiple Images**
   - Delete several images one by one
   - Each deletion should work independently
   - Grid should update correctly after each deletion

3. **Test Empty State**
   - Delete all images
   - Grid should show "No images yet" placeholder
   - Placeholder should have proper styling and icon

### **Expected Result:**
- Images delete successfully from storage
- UI updates immediately (optimistic updates)
- Empty state shows correctly when no images remain

---

## **Step 5: Test Persistence**

1. **Refresh Page**
   - Refresh the browser page
   - Gallery should reload and show all uploaded images
   - Images should persist from storage

2. **Verify Image URLs**
   - Right-click on images and "Open in new tab"
   - Images should load from public URLs (not signed URLs)
   - URLs should follow pattern: `https://<supabase-url>/storage/v1/object/public/gallery/<business_id>/<filename>`

### **Expected Result:**
- Images persist after page refresh
- Images load from public URLs
- No signed URLs are used

---

## **Step 6: Test Error Handling**

### **Test Network Errors**
1. Disconnect internet
2. Try to upload an image
3. Verify error toast appears
4. Reconnect internet and try again

### **Test File Validation**
1. Try to upload non-image files
2. Try to upload very large files (>10MB)
3. Verify appropriate error messages

### **Test Authentication**
1. Sign out and try to access gallery
2. Verify appropriate error message
3. Sign back in and verify gallery works

### **Expected Result:**
- All error scenarios handled gracefully
- Clear error messages shown to user
- No console errors or crashes

---

## **Step 7: Test Responsive Design**

1. **Desktop View**
   - Gallery should show 4 columns on large screens
   - Images should be properly sized

2. **Tablet View**
   - Gallery should show 2-3 columns on medium screens
   - Layout should be responsive

3. **Mobile View**
   - Gallery should show 1-2 columns on small screens
   - Upload button should be accessible
   - Touch interactions should work

### **Expected Result:**
- Responsive design works across all screen sizes
- Touch interactions work on mobile
- Layout adapts properly

---

## **Acceptance Criteria Checklist**

### **Core Functionality** ✅
- [ ] Upload multiple images successfully
- [ ] Images appear instantly in grid (optimistic updates)
- [ ] Images persist after page refresh
- [ ] Delete images successfully
- [ ] Empty state shows when no images
- [ ] Public URLs used (no signed URLs)

### **Error Handling** ✅
- [ ] File type validation works
- [ ] File size validation works
- [ ] Network error handling works
- [ ] Authentication error handling works
- [ ] No console errors

### **User Experience** ✅
- [ ] Toast notifications provide feedback
- [ ] Hover effects work smoothly
- [ ] Responsive design works
- [ ] Loading states are handled
- [ ] Confirmation dialogs work

### **Technical Requirements** ✅
- [ ] Files uploaded to correct path: `gallery/<business_id>/<timestamp>-<slug>.<ext>`
- [ ] RLS policies respected
- [ ] Public read access works
- [ ] No signed URLs generated
- [ ] Proper file naming with timestamps

---

## **Troubleshooting**

### **Common Issues:**

1. **"Please sign in to access gallery"**
   - Ensure you're authenticated in Supabase
   - Check that your user has a business record

2. **Images not uploading**
   - Check browser console for errors
   - Verify storage bucket exists and is public
   - Check RLS policies allow your business_id

3. **Images not displaying**
   - Check that public read is enabled on bucket
   - Verify image URLs are public (not signed)
   - Check network tab for failed image requests

4. **Delete not working**
   - Check RLS policies allow delete operations
   - Verify you own the images (correct business_id)
   - Check browser console for errors

### **Debug Steps:**
1. Open browser developer tools
2. Check Console tab for JavaScript errors
3. Check Network tab for failed requests
4. Verify Supabase client is initialized
5. Check storage bucket permissions
6. Verify RLS policies are correct

---

## **Success Criteria**

✅ **All acceptance criteria pass**  
✅ **No console errors**  
✅ **Images upload and display correctly**  
✅ **Delete functionality works**  
✅ **Persistence works after refresh**  
✅ **Error handling is robust**  
✅ **Responsive design works**  
✅ **Public URLs used throughout**

**🎉 If all tests pass, the Owner Gallery system is working correctly!**

---

## **File Structure Verification**

Ensure these files exist and are properly configured:

- ✅ `/public/js/owner.gallery.js` - Gallery module
- ✅ `/public/profile.html` - Updated with gallery HTML
- ✅ Gallery HTML elements:
  - `<input id="gallery-input" type="file" multiple>`
  - `<div id="gallery-grid"></div>`
- ✅ Module import: `<script type="module" src="/public/js/owner.gallery.js"></script>`

The gallery system is now fully integrated and ready for testing!


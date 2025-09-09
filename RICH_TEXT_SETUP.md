# Rich Text Editor Setup Guide

## Overview
This implementation adds a Rich Text Editor with image support to the student answer submission system. Images are stored in Cloudinary (free tier) instead of the database for better scalability.

## Features Implemented

### 1. Rich Text Editor (Student Side)
- ✅ Quill.js integration with React
- ✅ Copy-paste image embedding
- ✅ Image upload via file picker
- ✅ Rich text formatting (bold, italic, lists, etc.)
- ✅ Auto-upload to cloud storage

### 2. Cloud Storage Integration
- ✅ Cloudinary free tier setup
- ✅ Image optimization and resizing
- ✅ Secure URL generation
- ✅ Organized folder structure

### 3. Staff Evaluation Page
- ✅ Rich text display in read-only mode
- ✅ Image deletion functionality
- ✅ Cloud storage cleanup
- ✅ Database reference removal

### 4. Performance Optimizations
- ✅ No Base64 storage in database
- ✅ URL-only references
- ✅ Image compression and optimization
- ✅ Lazy loading support

## Setup Instructions

### 1. Install Dependencies
```bash
# Frontend
cd frontend
npm install quill react-quill

# Backend
cd backend
npm install cloudinary multer
```

### 2. Cloudinary Configuration
1. Sign up for free at [Cloudinary](https://cloudinary.com)
2. Get your credentials from the dashboard:
   - Cloud Name
   - API Key
   - API Secret
3. Add to your `.env` file:
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 3. Database Changes
The `StudentAnswer` model now stores rich text HTML with image URLs:
```javascript
{
  answerText: String, // Rich Text (HTML) with image URLs
  // ... other fields remain the same
}
```

## Usage

### For Students
1. Navigate to a test
2. Use the rich text editor to type answers
3. Paste images directly or use the image button
4. Images are automatically uploaded to cloud storage
5. Save answers as usual

### For Staff
1. View student answers with rich text rendering
2. Click on images to see delete option
3. Delete images after marking to optimize storage
4. Images are removed from both cloud storage and database

## API Endpoints

### Upload Image
```
POST /upload/image
Content-Type: multipart/form-data
Body: { image: File }
Response: { url: string, publicId: string }
```

### Delete Image
```
DELETE /upload/image
Body: { publicId: string }
Response: { message: string }
```

### Remove Image from Answer
```
POST /student-answers/:answerId/remove-image
Body: { imageUrl: string }
Response: { message: string }
```

## Scalability Features

### Free Tier Limits (Cloudinary)
- 25,000 transformations/month
- 25 GB storage
- 25 GB bandwidth/month

### Optimization Strategies
- Image compression and resizing
- Auto-format selection
- Quality optimization
- Organized folder structure
- URL-only database storage

## Security Considerations
- File type validation (images only)
- File size limits (5MB max)
- Authentication required for uploads
- Staff-only image deletion
- Secure URL generation

## Troubleshooting

### Common Issues
1. **Images not uploading**: Check Cloudinary credentials
2. **Delete not working**: Verify staff permissions
3. **Rich text not displaying**: Check Quill.js CSS imports

### Performance Tips
1. Delete images after marking to save storage
2. Use image compression settings
3. Monitor Cloudinary usage dashboard
4. Implement pagination for large answer sets

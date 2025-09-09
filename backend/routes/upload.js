import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024, // 50KB limit for better performance
    },
    fileFilter: (req, file, cb) => {
        // Check if file is an image
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    },
});

// Test upload route without authentication (for debugging)
router.post('/test-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        // Always use base64 fallback for testing
        const base64 = req.file.buffer.toString('base64');
        const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

        return res.json({
            message: 'Image uploaded successfully (test route)',
            url: dataUrl,
            publicId: null,
            fallback: true
        });
    } catch (error) {
        console.error('Test upload error:', error);
        res.status(500).json({
            message: 'Failed to upload image',
            error: error.message
        });
    }
});

// Upload image to Cloudinary (temporarily without authentication for testing)
router.post('/image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        // Check if Cloudinary is configured
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            // Fallback: Convert to base64 and return as data URL
            const base64 = req.file.buffer.toString('base64');
            const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

            return res.json({
                message: 'Image uploaded successfully (base64 fallback)',
                url: dataUrl,
                publicId: null,
                fallback: true
            });
        }

        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    resource_type: 'image',
                    folder: 'exam-answers', // Organize images in a folder
                    public_id: `answer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    transformation: [
                        { width: 1200, height: 1200, crop: 'limit' }, // Resize if too large
                        { quality: 'auto' }, // Auto quality optimization
                        { format: 'auto' } // Auto format selection
                    ]
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(req.file.buffer);
        });

        res.json({
            message: 'Image uploaded successfully',
            url: result.secure_url,
            publicId: result.public_id
        });
    } catch (error) {
        console.error('Upload error:', error);

        // Fallback to base64 if Cloudinary fails
        try {
            const base64 = req.file.buffer.toString('base64');
            const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

            return res.json({
                message: 'Image uploaded successfully (base64 fallback)',
                url: dataUrl,
                publicId: null,
                fallback: true
            });
        } catch (fallbackError) {
            res.status(500).json({
                message: 'Failed to upload image',
                error: error.message
            });
        }
    }
});

// Delete image from Cloudinary
router.delete('/image', auth, requireRole(['staff']), async (req, res) => {
    try {
        const { publicId } = req.body;

        if (!publicId) {
            return res.status(400).json({ message: 'Public ID is required' });
        }

        // Delete from Cloudinary
        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result === 'ok') {
            res.json({ message: 'Image deleted successfully' });
        } else {
            res.status(404).json({ message: 'Image not found or already deleted' });
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            message: 'Failed to delete image',
            error: error.message
        });
    }
});

// Extract public ID from Cloudinary URL
export const extractPublicId = (url) => {
    if (!url || !url.includes('cloudinary.com')) {
        return null;
    }

    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    const publicId = filename.split('.')[0];

    // Reconstruct the full public ID with folder
    const folderIndex = url.indexOf('/exam-answers/');
    if (folderIndex !== -1) {
        const folderPath = url.substring(folderIndex + 1, url.lastIndexOf('/'));
        return `${folderPath}/${publicId}`;
    }

    return publicId;
};

export default router;

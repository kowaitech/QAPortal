  import express from 'express';
import fs from 'fs';
import StudentAnswer from '../models/StudentAnswer.js';
import Test from '../models/Test.js';
import Question from '../models/Question.js';
import Domain from '../models/Domain.js';
import cloudinary from '../config/cloudinary.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Removed multer; answers are text-only now

// Start exam session
router.post('/start-exam', auth, requireRole('student'), async (req, res) => {
  try {
    const { domainId, section } = req.body;

    if (!domainId || !section) {
      return res.status(400).json({ message: 'Domain ID and section are required' });
    }

    // Check if domain exists
    const domain = await Domain.findById(domainId);
    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }

    // Check if student has already started this exam
    const existingSession = await StudentAnswer.findOne({
      student: req.user._id,
      domain: domainId,
      section
    });

    if (existingSession) {
      // Check if exam time has expired
      const now = new Date();
      if (now > existingSession.examEndTime) {
        return res.status(403).json({
          message: 'Exam time has expired',
          examExpired: true
        });
      }

      return res.json({
        message: 'Exam session already exists',
        examStartTime: existingSession.examStartTime,
        examEndTime: existingSession.examEndTime,
        timeRemaining: Math.max(0, existingSession.examEndTime - now)
      });
    }

    // Create new exam session (2 hours duration)
    const examStartTime = new Date();
    const examEndTime = new Date(examStartTime.getTime() + (2 * 60 * 60 * 1000)); // 2 hours

    res.json({
      message: 'Exam session started',
      examStartTime,
      examEndTime,
      timeRemaining: 2 * 60 * 60 * 1000 // 2 hours in milliseconds
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit answer for a question
router.post('/submit', auth, requireRole('student'), async (req, res) => {
  try {
    const { questionId, domainId, section, examStartTime, answerText, testId } = req.body;

    if (!questionId || !domainId || !section || !examStartTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify question exists
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Verify domain exists
    const domain = await Domain.findById(domainId);
    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }

    // Check exam time validity
    const startTime = new Date(examStartTime);
    const endTime = new Date(startTime.getTime() + (2 * 60 * 60 * 1000)); // 2 hours
    const now = new Date();

    if (now > endTime) {
      return res.status(403).json({
        message: 'Exam time has expired',
        examExpired: true
      });
    }

    // Check if answer already exists
    let existingAnswer = await StudentAnswer.findOne({
      student: req.user._id,
      question: questionId,
      domain: domainId,
      section
    });

    const answerData = {
      student: req.user._id,
      domain: domainId,
      question: questionId,
      test: testId || undefined,
      section,
      examStartTime: startTime,
      examEndTime: endTime,
      submittedAt: now
    };

    if (typeof answerText === 'string' && answerText.trim().length > 0) {
      answerData.answerText = answerText.trim();
    }

    // Optional image metadata if provided by multer-storage-cloudinary or body
    if (req.file && req.file.path && req.file.filename) {
      answerData.imageUrl = req.file.path;
      answerData.imagePublicId = req.file.filename;
    } else if (req.body && (req.body.imageUrl || req.body.imagePublicId)) {
      if (req.body.imageUrl) answerData.imageUrl = req.body.imageUrl;
      if (req.body.imagePublicId) answerData.imagePublicId = req.body.imagePublicId;
    }

    // Ensure text is provided
    if (!(typeof answerText === 'string' && answerText.trim().length > 0)) {
      return res.status(400).json({ message: 'Answer text is required' });
    }

    if (existingAnswer) {
      // Update existing answer
      Object.assign(existingAnswer, answerData);
      await existingAnswer.save();

      res.json({
        message: 'Answer updated successfully',
        answer: existingAnswer
      });
    } else {
      // Create new answer
      const newAnswer = await StudentAnswer.create(answerData);
      res.json({
        message: 'Answer submitted successfully',
        answer: newAnswer
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Staff: add a mark for a student's specific answer (first time)
router.post('/marks/add', auth, requireRole('staff'), async (req, res) => {
  try {
    const { answerId, mark } = req.body;
    if (typeof mark !== 'number' || mark < 0) {
      return res.status(400).json({ message: 'mark must be a non-negative number' });
    }
    
    const answer = await StudentAnswer.findById(answerId);
    if (!answer) return res.status(404).json({ message: 'Answer not found' });
    
    // Check if mark already exists (not null)
    if (answer.mark !== null && answer.mark !== undefined) {
      return res.status(400).json({ message: 'Mark already exists. Use edit endpoint to update.' });
    }
    
    const updatedAnswer = await StudentAnswer.findByIdAndUpdate(
      answerId, 
      { mark, markSubmitted: true }, 
      { new: true }
    )
      .populate('student', 'name email')
      .populate('question', 'title section');
    
    res.json({ message: 'Mark saved successfully', answer: updatedAnswer });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Staff: edit/update an existing mark for a student's specific answer
router.put('/marks/edit/:id', auth, requireRole('staff'), async (req, res) => {
  try {
    const { id: answerId } = req.params;
    const { mark } = req.body;
    if (typeof mark !== 'number' || mark < 0) {
      return res.status(400).json({ message: 'mark must be a non-negative number' });
    }
    
    const answer = await StudentAnswer.findById(answerId);
    if (!answer) return res.status(404).json({ message: 'Answer not found' });
    
    // Check if mark exists (not null)
    if (answer.mark === null || answer.mark === undefined) {
      return res.status(400).json({ message: 'No mark found. Use add endpoint to create a new mark.' });
    }
    
    const updatedAnswer = await StudentAnswer.findByIdAndUpdate(
      answerId, 
      { mark }, 
      { new: true }
    )
      .populate('student', 'name email')
      .populate('question', 'title section');
    
    res.json({ message: 'Mark updated successfully', answer: updatedAnswer });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Staff: calculate and persist total marks for a student in a domain (optional filter by test)
router.post('/calculate-total', auth, requireRole('staff'), async (req, res) => {
  try {
    const { studentId, domainId, testId } = req.body;
    if (!studentId || !domainId) return res.status(400).json({ message: 'studentId and domainId are required' });

    const filter = { student: studentId, domain: domainId };
    if (testId) filter.test = testId;

    const answers = await StudentAnswer.find(filter).select('mark');
    const total = answers.reduce((sum, a) => sum + (a.mark !== null && a.mark !== undefined ? a.mark : 0), 0);

    // Persist to StudentTest if testId provided, else upsert a standalone record in StudentTest for the domain
    if (testId) {
      await Test.findById(testId); // ensure exists (optional)
      await (await import('../models/StudentTest.js')).default.findOneAndUpdate(
        { student: studentId, test: testId },
        { $set: { score: total } },
        { upsert: true }
      );
    }

    res.json({ total });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Staff: delete image from student answer
router.delete('/answers/image/:id', auth, requireRole('staff'), async (req, res) => {
  try {
    const { id: answerId } = req.params;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }

    const answer = await StudentAnswer.findById(answerId);
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    // Handle Cloudinary deletion if it's a Cloudinary URL
    if (imageUrl.includes('cloudinary.com')) {
      try {
        // Extract public ID from Cloudinary URL
        const parts = imageUrl.split('/');
        const filename = parts[parts.length - 1];
        const publicId = filename.split('.')[0];

        // Reconstruct the full public ID with folder
        const folderIndex = imageUrl.indexOf('/exam-answers/');
        let fullPublicId = publicId;
        if (folderIndex !== -1) {
          const folderPath = imageUrl.substring(folderIndex + 1, imageUrl.lastIndexOf('/'));
          fullPublicId = `${folderPath}/${publicId}`;
        }

        console.log('Deleting from Cloudinary with public ID:', fullPublicId);

        // Delete from Cloudinary
        const result = await cloudinary.uploader.destroy(fullPublicId);
        
        console.log('Cloudinary deletion result:', result);
        
        if (result.result !== 'ok') {
          console.warn('Cloudinary deletion failed:', result);
          // Don't throw error, continue with database deletion
        }
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    } else {
      console.log('Non-Cloudinary URL detected, skipping Cloudinary deletion');
    }

    // Remove only ONE instance of the image URL from the answer text (HTML content)
    if (answer.answerText && answer.answerText.includes(imageUrl)) {
      const pattern = new RegExp(`<img[^>]*src="${imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`);
      const updatedTextOnce = answer.answerText.replace(pattern, '');
      answer.answerText = updatedTextOnce.replace(/\n{3,}/g, '\n\n');
      await answer.save();
    }

    res.json({ message: 'Answer image deleted successfully' });
  } catch (error) {
    console.error('Error removing image from answer:', error);
    res.status(500).json({ message: 'Failed to remove image from answer', error: error.message });
  }
});

// Staff: delete entire student answer (and Cloudinary image if present)
router.delete('/answers/:id', auth, requireRole('staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const answer = await StudentAnswer.findById(id);
    if (!answer) return res.status(404).json({ message: 'Answer not found' });

    if (answer.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(answer.imagePublicId);
      } catch (e) {
        console.warn('Cloudinary destroy failed for', answer.imagePublicId, e.message);
      }
    }

    await StudentAnswer.findByIdAndDelete(id);
    res.json({ message: 'Answer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete answer', error: error.message });
  }
});

// Get student's answers for a domain/section
router.get('/my-answers/:domainId/:section', auth, requireRole('student'), async (req, res) => {
  try {
    const { domainId, section } = req.params;

    const answers = await StudentAnswer.find({
      student: req.user._id,
      domain: domainId,
      section
    })
      .populate('question', 'title description')
      .sort({ submittedAt: -1 })
      .lean();

    res.json({ answers });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check exam status
router.get('/exam-status/:domainId/:section', auth, requireRole('student'), async (req, res) => {
  try {
    const { domainId, section } = req.params;

    const existingSession = await StudentAnswer.findOne({
      student: req.user._id,
      domain: domainId,
      section
    });

    if (!existingSession) {
      return res.json({
        hasStarted: false,
        message: 'No exam session found'
      });
    }

    const now = new Date();
    const timeRemaining = Math.max(0, existingSession.examEndTime - now);
    const hasExpired = now > existingSession.examEndTime;

    res.json({
      hasStarted: true,
      examStartTime: existingSession.examStartTime,
      examEndTime: existingSession.examEndTime,
      timeRemaining,
      hasExpired
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Removed download endpoint; answers are text-only

export default router;

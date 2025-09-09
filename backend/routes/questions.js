import express from 'express';
import fs from 'fs';
import Question from '../models/Question.js';
import Domain from '../models/Domain.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Removed multer; answers are text-only now

// Get questions by domain ID
router.get('/domain/:domainId', auth, async (req, res) => {
  try {
    const { section } = req.query;
    const filter = {
      domain: req.params.domainId,
      isActive: true
    };

    if (section) filter.section = section;

    const questions = await Question.find(filter)
      .populate('createdBy', 'name')
      .sort({ section: 1, createdAt: 1 })
      .lean();

    res.json({ questions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all questions (for staff/admin)
router.get('/', auth, requireRole(['staff', 'admin']), async (req, res) => {
  try {
    const { domain, difficulty, page = 1, limit = 10, search, section } = req.query;
    const filter = { isActive: true };

    if (domain) filter.domain = domain;
    if (difficulty) filter.difficulty = difficulty;
    if (section) filter.section = section;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const questions = await Question.find(filter)
      .populate('domain', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .lean();

    const total = await Question.countDocuments(filter);
    res.json({ total, questions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create question for a specific domain (with optional file upload)
router.post('/domain/:domainId', auth, requireRole('staff'), async (req, res) => {
  try {
    const { title, description, section = 'A', difficulty = 'medium', answerText } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    // Verify domain exists and user has permission
    const domain = await Domain.findById(req.params.domainId);
    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }

    // Check if user is the creator of the domain
    if (domain.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Can only add questions to domains you created' });
    }

    // Check for duplicate question (same title and description)
    const duplicateQuestion = await Question.findOne({
      domain: req.params.domainId,
      title: title.trim(),
      description: description.trim(),
      isActive: true
    });

    if (duplicateQuestion) {
      return res.status(400).json({
        message: 'Question already added, please add another question.'
      });
    }

    // Check if domain already has 5 questions for this section
    const existingCount = await Question.countDocuments({
      domain: req.params.domainId,
      section,
      isActive: true
    });

    if (existingCount >= 5) {
      return res.status(400).json({
        message: `Domain already has maximum 5 questions for section ${section}`
      });
    }

    const questionData = {
      title: title.trim(),
      description,
      domain: req.params.domainId,
      section,
      difficulty,
      createdBy: req.user._id
    };
    if (typeof answerText === 'string' && answerText.trim().length > 0) {
      questionData.answerText = answerText.trim();
    }

    const question = await Question.create(questionData);

    const populatedQuestion = await Question.findById(question._id)
      .populate('createdBy', 'name')
      .lean();

    res.json({ question: populatedQuestion });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Update question
// router.put('/:id', auth, requireRole('staff'), async (req, res) => {
//   try {
//     const { title, description, difficulty } = req.body;

//     const question = await Question.findById(req.params.id).populate('domain');
//     if (!question) {
//       return res.status(404).json({ message: 'Question not found' });
//     }

//     // Check if user is the creator of the domain
//     if (question.domain.createdBy.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: 'Can only edit questions in domains you created' });
//     }

//     if (title) question.title = title.trim();
//     if (description) question.description = description;
//     if (difficulty) question.difficulty = difficulty;
//     question.updatedBy = req.user._id;

//     await question.save();

//     const updatedQuestion = await Question.findById(question._id)
//       .populate('createdBy', 'name')
//       .populate('updatedBy', 'name')
//       .lean();

//     res.json({ question: updatedQuestion });
//   } catch(e) {
//     res.status(500).json({ message: e.message });
//   }
// });

router.put('/:id', auth, requireRole('staff'), async (req, res) => {
  try {
    const { title, description, difficulty, section, answerText } = req.body;

    const question = await Question.findById(req.params.id).populate('domain');
    if (!question) return res.status(404).json({ message: 'Question not found' });

    if (question.domain.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Can only edit questions in domains you created' });
    }

    if (title) question.title = title.trim();
    if (description) question.description = description;
    if (difficulty) question.difficulty = difficulty;
    if (section) question.section = section;

    question.answerText = typeof answerText === 'string' && answerText.trim().length > 0 ? answerText.trim() : undefined;

    question.updatedBy = req.user._id;
    await question.save();

    const updatedQuestion = await Question.findById(question._id)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .lean();

    res.json({ question: updatedQuestion });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Delete question
router.delete('/:id', auth, requireRole('staff'), async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).populate('domain');
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if user is the creator of the domain
    if (question.domain.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Can only delete questions in domains you created' });
    }

    await Question.findByIdAndDelete(req.params.id);
    res.json({ message: 'Question deleted successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;

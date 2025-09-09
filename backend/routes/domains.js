import express from 'express';
import Domain from '../models/Domain.js';
import Question from '../models/Question.js';
import StudentAnswer from '../models/StudentAnswer.js';
import { auth, requireRole } from '../middleware/auth.js';
import Test from '../models/Test.js';
import StudentTest from '../models/StudentTest.js';

const router = express.Router();

// Create domain (staff only)
router.post('/', auth, requireRole('staff'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const existing = await Domain.findOne({ name: name.trim() });
    if (existing) return res.status(400).json({ message: 'Domain exists' });
    const dom = await Domain.create({ name: name.trim(), createdBy: req.user._id });
    res.json({ domain: dom });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// List all domains (unified endpoint)
router.get('/', auth, async (req, res) => {
  try {
    const domains = await Domain.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Add question counts for each domain
    const domainsWithCounts = await Promise.all(domains.map(async (domain) => {
      const sectionACounts = await Question.countDocuments({
        domain: domain._id,
        section: 'A',
        isActive: true
      });
      const sectionBCounts = await Question.countDocuments({
        domain: domain._id,
        section: 'B',
        isActive: true
      });

      return {
        ...domain,
        questionCounts: {
          sectionA: sectionACounts,
          sectionB: sectionBCounts
        },
        canEdit: req.user.role === 'staff' && domain.createdBy._id.toString() === req.user._id.toString()
      };
    }));

    res.json({ domains: domainsWithCounts });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Get domain details with questions
router.get('/:id', auth, async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!domain) return res.status(404).json({ message: 'Domain not found' });

    const questions = await Question.find({
      domain: req.params.id,
      isActive: true
    }).sort({ section: 1, createdAt: 1 });

    res.json({ domain, questions });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Get student answers for a domain (staff only)
router.get('/:id/answers', auth, requireRole('staff'), async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id);
    if (!domain) return res.status(404).json({ message: 'Domain not found' });

    const { testId } = req.query;
    const findFilter = { domain: req.params.id };
    if (testId) findFilter.test = testId;

    const answers = await StudentAnswer.find(findFilter)
      .populate('student', 'name email')
      .populate('question', 'title section')
      .sort({ submittedAt: -1 })
      .lean();

    // Group answers by student and section
    const groupedAnswers = {};
    answers.forEach(answer => {
      const studentId = answer.student._id.toString();
      const section = answer.section;

      if (!groupedAnswers[studentId]) {
        groupedAnswers[studentId] = {
          student: answer.student,
          sections: { A: [], B: [] },
          totalMark: 0
        };
      }

      groupedAnswers[studentId].sections[section].push(answer);
      groupedAnswers[studentId].totalMark += (answer.mark !== null && answer.mark !== undefined) ? answer.mark : 0;
    });

    res.json({ answers: Object.values(groupedAnswers) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Staff: list tests that include this domain (for filtering UI)
router.get('/:id/tests', auth, requireRole('staff'), async (req, res) => {
  try {
    const tests = await Test.find({ domains: req.params.id }).select('_id title startDate endDate').sort({ startDate: -1 }).lean();
    res.json({ tests });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Staff: get users who completed tests for this domain (optionally filter by testId)
router.get('/:id/completed-users', auth, requireRole('staff'), async (req, res) => {
  try {
    const { testId } = req.query;
    const filter = { selectedDomain: req.params.id, status: 'completed' };
    if (testId) filter.test = testId;

    const records = await StudentTest.find(filter)
      .populate('student', 'name email')
      .populate('test', 'title')
      .lean();

    // Ensure one row per user per test
    const unique = new Map();
    for (const r of records) {
      const key = `${r.student?._id}-${r.test?._id}`;
      if (!unique.has(key)) unique.set(key, { student: r.student, test: r.test });
    }

    res.json({ users: Array.from(unique.values()) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Update domain (only by creator)
router.put('/:id', auth, requireRole('staff'), async (req, res) => {
  try {
    const { name } = req.body;
    const domain = await Domain.findById(req.params.id);

    if (!domain) return res.status(404).json({ message: 'Domain not found' });

    // Check if user is the creator
    if (domain.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Can only edit domains you created' });
    }

    if (name) {
      const existing = await Domain.findOne({
        name: name.trim(),
        _id: { $ne: req.params.id }
      });
      if (existing) return res.status(400).json({ message: 'Domain name already exists' });
      domain.name = name.trim();
    }

    await domain.save();
    res.json({ domain });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Delete domain (only by creator)
router.delete('/:id', auth, requireRole('staff'), async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id);
    if (!domain) return res.status(404).json({ message: 'Domain not found' });

    // Check if user is the creator
    if (domain.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Can only delete domains you created' });
    }

    // Delete associated questions and answers
    await Question.deleteMany({ domain: req.params.id });
    await StudentAnswer.deleteMany({ domain: req.params.id });
    await Domain.findByIdAndDelete(req.params.id);

    res.json({ message: 'Domain deleted successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;

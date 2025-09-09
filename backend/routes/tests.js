
import express from 'express';
import Test from '../models/Test.js';
import StudentTest from '../models/StudentTest.js';
import Question from '../models/Question.js';
import Domain from '../models/Domain.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = express.Router();

function computeStatus(t) {
  const now = Date.now();
  if (now < new Date(t.startDate).getTime()) return 'inactive';
  if (now > new Date(t.endDate).getTime()) return 'finished';
  return 'active';
}

// Check if test title exists
router.get('/check-title/:title', auth, requireRole('admin'), async (req, res) => {
  try {
    const { title } = req.params;
    const existingTest = await Test.findOne({ title: title.trim() });
    res.json({ exists: !!existingTest });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to check test title' });
  }
});

// Admin create test
router.post('/admin', auth, requireRole('admin'), async (req, res) => {
  try {
    const { title, domains = [], startDate, endDate, durationMinutes = 60, sections = ['A', 'B'], eligibleStudents = [] } = req.body;
    if (!title || !startDate || !endDate) return res.status(400).json({ message: 'title, startDate, endDate required' });
    if (!domains.length) return res.status(400).json({ message: 'At least one domain is required' });

    // Check if test title already exists
    const existingTest = await Test.findOne({ title: title.trim() });
    if (existingTest) {
      return res.status(400).json({ message: 'This test name is already used. Please choose another name.' });
    }

    // Validate that all domain IDs exist
    const validDomains = await Domain.find({ _id: { $in: domains } });
    if (validDomains.length !== domains.length) {
      return res.status(400).json({ message: 'One or more invalid domain IDs' });
    }

    const test = await Test.create({
      title,
      domains,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      durationMinutes,
      sections,
      eligibleStudents,
      status: 'inactive'
    });
    res.status(201).json(test);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to create test' });
  }
});

// List all tests (admin) - with domain names populated
router.get('/list', auth, requireRole('admin'), async (req, res) => {
  try {
    const tests = await Test.find().populate('domains', 'name').lean();
    res.json(tests);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to fetch tests' });
  }
});

// Student: list categorized tests
router.get('/student', auth, requireRole('student'), async (req, res) => {
  try {
    const now = new Date();
    // Get tests that are either open to all students or include this specific student
    const tests = await Test.find({
      $or: [
        { eligibleStudents: { $exists: false } }, // No eligibleStudents field (open to all)
        { eligibleStudents: { $size: 0 } }, // Empty eligibleStudents array (open to all)
        { eligibleStudents: req.user._id } // Student is in eligibleStudents
      ]
    }).populate('domains', 'name').lean();

    const withStatus = tests.map(t => ({ ...t, status: computeStatus(t) }));

    // Get student's test history to filter out completed tests
    const studentTests = await StudentTest.find({ student: req.user._id }).lean();
    const completedTestIds = studentTests
      .filter(st => st.status === 'completed' || st.status === 'expired')
      .map(st => st.test.toString());

    const upcoming = withStatus.filter(t => t.status === 'inactive');
    // Filter out tests that student has already completed
    const active = withStatus.filter(t => t.status === 'active' && !completedTestIds.includes(t._id.toString()));
    const completed = withStatus.filter(t => completedTestIds.includes(t._id.toString()));

    res.json({ upcoming, active, completed });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to fetch student tests' });
  }
});

// Get test by id (populate domains)
router.get('/:id', auth, async (req, res) => {
  const t = await Test.findById(req.params.id).populate('domains', 'name').lean();
  if (!t) return res.status(404).json({ message: 'Not found' });
  return res.json({ ...t, status: computeStatus(t) });
});

// Student start test
router.post('/:id/start', auth, requireRole('student'), async (req, res) => {
  try {
    const { domainId, section } = req.body;
    const test = await Test.findById(req.params.id).lean();
    if (!test) return res.status(404).json({ message: 'Test not found' });
    const status = computeStatus(test);
    if (status !== 'active') return res.status(400).json({ message: 'Test is not active' });
    if (!test.domains.map(String).includes(String(domainId))) return res.status(400).json({ message: 'Domain not in this test' });
    if (test.sections && !test.sections.includes(section)) return res.status(400).json({ message: 'Invalid section' });

    // Check if student already took this test
    const existingTest = await StudentTest.findOne({ student: req.user._id, test: test._id });
    if (existingTest && (existingTest.status === 'completed' || existingTest.status === 'expired')) {
      return res.status(400).json({ message: 'You have already completed this test' });
    }

    const start = new Date();
    // Use actual test duration instead of hardcoded 2 hours
    const durationMs = (test.durationMinutes || 60) * 60 * 1000;
    const due = new Date(start.getTime() + durationMs);

    const st = await StudentTest.findOneAndUpdate(
      { student: req.user._id, test: test._id },
      { $set: { startTime: start, dueTime: due, status: 'in-progress', selectedDomain: domainId, selectedSection: section } },
      { upsert: true, new: true }
    );

    // Fetch questions for chosen domain+section
    const qFilter = { domain: domainId };
    if (Question.schema.paths.section) qFilter.section = section;
    const questions = await Question.find(qFilter).select('title description domain section options type').lean();

    res.json({ studentTest: st, questions, dueTime: due });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to start test' });
  }
});

// Student submit
router.post('/:id/submit', auth, requireRole('student'), async (req, res) => {
  try {
    const st = await StudentTest.findOne({ student: req.user._id, test: req.params.id });
    if (!st) return res.status(404).json({ message: 'Not started' });
    const now = new Date();
    const expired = st.dueTime && now > st.dueTime;
    st.endTime = now;
    st.status = expired ? 'expired' : 'completed';
    await st.save();
    res.json({ ok: true, status: st.status });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to submit' });
  }
});

// Admin: list all tests
router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const tests = await Test.find({}).select('title startDate endDate durationMinutes domains createdAt updatedAt');
    res.json(tests);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch tests' });
  }
});

// Admin: update a test by id
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, domains, startDate, endDate, durationMinutes } = req.body;

    const updatedTest = await Test.findByIdAndUpdate(
      id,
      { title, domains, startDate, endDate, durationMinutes },
      { new: true }
    );

    if (!updatedTest) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.json(updatedTest);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to update test' });
  }
});

// Admin: delete a test by id
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const t = await Test.findByIdAndDelete(id);
    if (!t) return res.status(404).json({ message: 'Test not found' });
    // Also remove related StudentTest allocations
    await StudentTest.deleteMany({ test: id });
    res.json({ message: 'Test deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete test' });
  }
});

// Student: get "Your Tests" - tests the student has started
router.get('/student/my-tests', auth, requireRole('student'), async (req, res) => {
  try {
    const studentTests = await StudentTest.find({ student: req.user._id })
      .populate({
        path: 'test',
        populate: {
          path: 'domains',
          select: 'name'
        }
      })
      .populate('selectedDomain', 'name')
      .lean();

    const now = new Date();
    const categorized = { upcoming: [], active: [], completed: [] };

    studentTests.forEach(st => {
      if (!st.test) return;

      const test = st.test;
      const testStatus = computeStatus(test);
      const studentTestWithStatus = {
        ...st,
        test: { ...test, status: testStatus }
      };

      // Categorize based on student test status and test timing
      if (st.status === 'completed' || st.status === 'expired' || testStatus === 'finished') {
        categorized.completed.push(studentTestWithStatus);
      } else if (st.status === 'in-progress' && testStatus === 'active') {
        categorized.active.push(studentTestWithStatus);
      } else if (st.status === 'pending' && testStatus === 'inactive') {
        categorized.upcoming.push(studentTestWithStatus);
      }
    });

    res.json(categorized);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to fetch your tests' });
  }
});


export default router;

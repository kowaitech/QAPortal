import express from 'express';
import User from '../models/User.js';
import Test from '../models/Test.js';
import { auth, requireRole } from '../middleware/auth.js';
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(auth, requireRole('admin'));

// Get all tests
router.get("/tests", async (req, res) => {
  try {
    logger.info('Fetching all tests');
    const tests = await Test.find().populate("eligibleStudents", "name email college class group");
    logger.info('Tests fetched successfully', { count: tests.length });
    res.json(tests);
  } catch (err) {
    logger.error('Failed to fetch tests', { error: err.message });
    res.status(500).json({ message: err.message });
  }
});

// Create test
router.post("/tests", async (req, res) => {
  try {
    const { title, domains, startDate, endDate, eligibleStudents } = req.body;
    logger.info('Creating new test', { title, domainsCount: domains?.length, studentCount: eligibleStudents?.length });

    if (!title || !domains || !startDate || !endDate) {
      logger.warn('Test creation failed: Missing required fields', { title, hasdomains: !!domains, hasStartDate: !!startDate, hasEndDate: !!endDate });
      return res.status(400).json({ message: 'Missing required fields: title, domains, startDate, endDate' });
    }

    // Check for duplicate test title
    const existingTest = await Test.findOne({ title: title.trim() });
    if (existingTest) {
      logger.warn('Test creation failed: Duplicate title', { title });
      return res.status(400).json({ message: 'Test with this title already exists.' });
    }

    const test = await Test.create({ 
      title: title.trim(), 
      domains, 
      startDate, 
      endDate, 
      eligibleStudents: eligibleStudents || [] 
    });
    logger.info('Test created successfully', { testId: test._id, title: test.title });
    res.status(201).json(test);
  } catch (error) {
    logger.error('Failed to create test', { error: error.message });
    res.status(500).json({ message: error.message });
  }
});

// Update test status manually
router.put("/tests/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['inactive', 'active', 'finished'];
    
    logger.info('Updating test status', { testId: req.params.id, newStatus: status });

    if (!status || !validStatuses.includes(status)) {
      logger.warn('Test status update failed: Invalid status', { testId: req.params.id, providedStatus: status });
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const test = await Test.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!test) {
      logger.warn('Test status update failed: Test not found', { testId: req.params.id });
      return res.status(404).json({ message: 'Test not found' });
    }
    
    logger.info('Test status updated successfully', { testId: test._id, status: test.status });
    res.json(test);
  } catch (err) {
    logger.error('Failed to update test status', { testId: req.params.id, error: err.message });
    res.status(500).json({ message: err.message });
  }
});


// Helper: send email with error handling
async function sendMail(to, subject, text) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    logger.warn('Email not configured', { to, subject });
    return;
  }
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { 
        user: process.env.MAIL_USER, 
        pass: process.env.MAIL_PASS 
      },
    });
    
    await transporter.sendMail({ 
      from: `"Interview Portal" <${process.env.MAIL_USER}>`, 
      to, 
      subject, 
      text 
    });
    logger.info('Email sent successfully', { to, subject });
  } catch (err) {
    logger.error('Email send failed', { to, subject, error: err.message });
  }
}

// Get pending users (newest first). Supports optional pagination via query params
router.get('/pending', async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);

    logger.info('Fetching pending users', { page, limit });

    if (page && limit && page > 0 && limit > 0) {
      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        User.find({ isActive: false })
          .select('name email role createdAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments({ isActive: false })
      ]);
      logger.info('Pending users fetched with pagination', { page, limit, returned: users.length, total });
      return res.json({ users, page, totalPages: Math.ceil(total / limit), total });
    }

    const users = await User.find({ isActive: false })
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .lean();
    logger.info('All pending users fetched', { count: users.length });
    res.json({ users });
  } catch (err) {
    logger.error('Failed to fetch pending users', { error: err.message });
    res.status(500).json({ message: err.message });
  }
});

// Approve user
router.put('/approve/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    logger.info('Attempting to approve user', { userId });

    if (!userId || userId.length !== 24) {
      logger.warn('User approval failed: Invalid user ID format', { userId });
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findByIdAndUpdate(userId, { isActive: true }, { new: true }).lean();
    if (!user) {
      logger.warn('User approval failed: User not found', { userId });
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info('User approved successfully', { userId: user._id, userEmail: user.email, userName: user.name });

    // Respond immediately; send email in background
    res.json({ message: 'User approved', user });

    // Fire-and-forget email
    sendMail(
      user.email,
      'Your account has been approved',
      `Hello ${user.name},\n\nYour account has been approved by Admin. You can now login.\n\nRegards,\nInterview Portal`
    );
  } catch (err) {
    logger.error('Failed to approve user', { userId: req.params.id, error: err.message });
    res.status(500).json({ message: err.message });
  }
});

// Get registered users (approved = isActive true), newest first. Optional pagination via query params
router.get('/registered', async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);

    logger.info('Fetching registered users', { page, limit });

    if (page && limit && page > 0 && limit > 0) {
      const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find({ isActive: true })
        .select('name email role createdAt updatedAt collegeName mobileNumber department yearOfPassing')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments({ isActive: true })
      ]);
      logger.info('Registered users fetched with pagination', { page, limit, returned: users.length, total });
      return res.json({ users, page, totalPages: Math.ceil(total / limit), total });
    }

    const users = await User.find({ isActive: true })
      .select('name email role createdAt updatedAt collegeName mobileNumber department yearOfPassing')
      .sort({ createdAt: -1 })
      .lean();
    logger.info('All registered users fetched', { count: users.length });
    res.json({ users });
  } catch (err) {
    logger.error('Failed to fetch registered users', { error: err.message });
    res.status(500).json({ message: err.message });
  }
});

// Delete user (send email on deletion)
router.delete('/remove/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    logger.info('Attempting to delete user', { userId });

    if (!userId || userId.length !== 24) {
      logger.warn('User deletion failed: Invalid user ID format', { userId });
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      logger.warn('User deletion failed: User not found', { userId });
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info('User deleted successfully', { userId: user._id, userEmail: user.email, userName: user.name });

    // Respond immediately; email in background
    res.json({ message: 'User removed' });

    sendMail(
      user.email,
      'Your account has been removed',
      `Hello ${user.name},\n\nYour account access has been denied/deleted. Please register again if needed.\n\nRegards,\nInterview Portal`
    );
  } catch (err) {
    logger.error('Failed to delete user', { userId: req.params.id, error: err.message });
    res.status(500).json({ message: err.message });
  }
});

// Get all students for test eligibility selection
router.get('/students', async (req, res) => {
  try {
    logger.info('Fetching all active students');
    const students = await User.find({
      isActive: true,
      role: 'student'
    })
      .select('_id name email collegeName department yearOfPassing mobileNumber')
      .sort({ name: 1 })
      .lean();

    logger.info('Students fetched successfully', { count: students.length });
    res.json({ students, count: students.length });
  } catch (err) {
    logger.error('Failed to fetch students', { error: err.message });
    res.status(500).json({ message: err.message });
  }
});

export default router;








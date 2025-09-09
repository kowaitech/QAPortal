// import express from 'express';
// import User from '../models/User.js';
// import { auth, requireRole } from '../middleware/auth.js';
// import nodemailer from 'nodemailer';

// const router = express.Router();
// router.use(auth, requireRole('admin'));

// router.get('/pending', async (req, res) => {
//   const users = await User.find({ isActive: false }).select('name email role createdAt').lean();
//   res.json({ users });
// });

// router.put('/approve/:id', async (req, res) => {
//   const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true }).lean();
//   if (!user) return res.status(404).json({ message: 'User not found' });

//   try {
//     if (process.env.MAIL_USER && process.env.MAIL_PASS) {
//       const transporter = nodemailer.createTransport({
//         service: 'gmail',
//         auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
//       });
//       await transporter.sendMail({
//         from: `"Interview Portal" <${process.env.MAIL_USER}>`,
//         to: user.email,
//         subject: 'Your account has been approved',
//         text: `Hello ${user.name},\n\nYour account has been approved by Admin. You can now login.\n\nRegards, Interview Portal`
//       });
//     } else {
//       console.log('MAIL not set; skip email to', user.email);
//     }
//   } catch (e) {
//     console.error('Email error', e);
//   }

//   res.json({ message: 'User approved', user });
// });

// router.delete('/remove/:id', async (req, res) => {
//   try {
//     const u = await User.findByIdAndDelete(req.params.id);
//     if(!u) return res.status(404).json({ message: 'User not found' });
//     res.json({ message: 'User removed' });
//   } catch(e) { res.status(500).json({ message: e.message }); }
// });

// //  Get all registered users (isActive = true)
// router.get('/registered', async (req, res) => {
//   try {
//     const users = await User.find({ isActive: true })
//       .select('name email role createdAt updatedAt')
//       .lean();
//     res.json({ users });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// //  Delete user (works for both pending & registered)
// router.delete('/remove/:id', async (req, res) => {
//   try {
//     const u = await User.findByIdAndDelete(req.params.id);
//     if (!u) return res.status(404).json({ message: 'User not found' });
//     res.json({ message: 'User removed' });
//   } catch (e) {
//     res.status(500).json({ message: e.message });
//   }
// });

import express from 'express';
import User from '../models/User.js';
import { auth, requireRole } from '../middleware/auth.js';
import nodemailer from 'nodemailer';

const router = express.Router();
router.use(auth, requireRole('admin'));
import Test from "../models/Test.js";

// Get all tests
router.get("/tests", auth, requireRole("admin"), async (req, res) => {
  const tests = await Test.find().populate("eligibleStudents", "name email college class group");
  res.json(tests);
});

// Create test
router.post("/tests", auth, requireRole("admin"), async (req, res) => {
  try {
    const { title, domains, startDate, endDate, eligibleStudents } = req.body;

    // Check for duplicate test title
    const existingTest = await Test.findOne({ title: title.trim() });
    if (existingTest) {
      return res.status(400).json({ message: 'Text/Name already been there.' });
    }

    const test = await Test.create({ title: title.trim(), domains, startDate, endDate, eligibleStudents });
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update test status manually
router.put("/tests/:id/status", auth, requireRole("admin"), async (req, res) => {
  const { status } = req.body;
  const test = await Test.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.json(test);
});


// helper: send email
async function sendMail(to, subject, text) {
  if (process.env.MAIL_USER && process.env.MAIL_PASS) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
    });
    await transporter.sendMail({ from: `"Interview Portal" <${process.env.MAIL_USER}>`, to, subject, text });
  } else {
    console.log('MAIL not set; skip email to', to);
  }
}

// Get pending users (newest first). Supports optional pagination via query params
router.get('/pending', async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);

    if (page && limit) {
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
      return res.json({ users, page, totalPages: Math.ceil(total / limit), total });
    }

    const users = await User.find({ isActive: false })
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Approve user
router.put('/approve/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    // respond immediately; send email in background
    res.json({ message: 'User approved', user });

    // fire-and-forget email
    sendMail(
      user.email,
      'Your account has been approved',
      `Hello ${user.name},\n\nYour account has been approved by Admin. You can now login.\n\nRegards,\nInterview Portal`
    ).catch(() => { });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get registered users (approved = isActive true), newest first. Optional pagination via query params
router.get('/registered', async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        User.find({ isActive: true })
          .select('name email role createdAt updatedAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments({ isActive: true })
      ]);
      return res.json({ users, page, totalPages: Math.ceil(total / limit), total });
    }

    const users = await User.find({ isActive: true })
      .select('name email role createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete user (send email on deletion)
router.delete('/remove/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // respond immediately; email in background
    res.json({ message: 'User removed' });

    sendMail(
      user.email,
      'Your account has been removed',
      `Hello ${user.name},\n\nYour account access has been denied/deleted. Please register again if needed.\n\nRegards,\nInterview Portal`
    ).catch(() => { });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all students for test eligibility selection
router.get('/students', async (req, res) => {
  try {
    const students = await User.find({
      isActive: true,
      role: 'student'
    })
      .select('_id name email')
      .sort({ name: 1 })
      .lean();

    res.json({ students });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;








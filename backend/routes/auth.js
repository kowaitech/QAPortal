import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
const router = express.Router();

const signAccess = (user) => jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.ACCESS_EXPIRES || '15m' });
const signRefresh = (user) => jwt.sign({ sub: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.REFRESH_EXPIRES || '7d' });

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  const normalizedName = (name || '').trim();

  // Check for duplicate email
  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) return res.status(400).json({ message: 'Already registered, please login.' });

  // Check for duplicate username/name
  const existingName = await User.findOne({ name: normalizedName });
  if (existingName) return res.status(400).json({ message: 'Already registered, please login.' });

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name: normalizedName, email: normalizedEmail, password: hash, role: (role || '').trim().toLowerCase() || 'student', isActive: false });
  res.json({ message: 'Registered. Await admin approval.' });
});



router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
  if (!user.isActive || user.disabled) return res.status(403).json({ message: 'Account not active or disabled' });
  const access = signAccess(user);
  const refresh = signRefresh(user);
  res.cookie('jid', refresh, { httpOnly: true, sameSite: 'lax', secure: false, path: '/' });
  res.json({ accessToken: access, user: { id: user._id, name: user.name, role: user.role } });
});

router.post('/refresh', async (req, res) => {
  const token = req.cookies?.jid;
  if (!token) return res.status(401).json({ message: 'No refresh token' });
  try {
    const p = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(p.sub);
    if (!user || !user.isActive || user.disabled) return res.status(401).json({ message: 'Invalid refresh' });
    const access = signAccess(user);
    res.json({ accessToken: access });
  } catch (e) {
    return res.status(401).json({ message: 'Invalid refresh' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('jid', { path: '/' });
  res.json({ message: 'Logged out' });
});

export default router;

// =============== OTP password reset ===============

async function sendMail(to, subject, text) {
  if (process.env.MAIL_USER && process.env.MAIL_PASS) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
    });
    await transporter.sendMail({ from: `"Interview Portal" <${process.env.MAIL_USER}>`, to, subject, text });
  } else {
    console.log('MAIL not set; skip email to', to, subject, text);
  }
}

// Request OTP
router.post('/request-reset-otp', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(200).json({ message: 'If account exists, OTP sent' });

  const code = ('' + Math.floor(100000 + Math.random() * 900000)); // 6 digits
  user.resetOtpCode = code;
  user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  await user.save();

  await sendMail(user.email, 'Your password reset OTP', `Hello ${user.name},\n\nUse this OTP to reset your password: ${code}. It expires in 10 minutes.\n\nIf you did not request this, please ignore.\n`);
  res.json({ message: 'OTP sent if account exists' });
});

// Verify OTP (optional step if you want explicit verification)
router.post('/verify-reset-otp', async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user || !user.resetOtpCode || !user.resetOtpExpires) return res.status(400).json({ message: 'Invalid request' });
  if (user.resetOtpCode !== otp) return res.status(400).json({ message: 'Invalid OTP' });
  if (Date.now() > new Date(user.resetOtpExpires).getTime()) return res.status(400).json({ message: 'OTP expired' });
  res.json({ message: 'OTP verified' });
});

// Reset password using OTP
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email });
  if (!user || !user.resetOtpCode || !user.resetOtpExpires) return res.status(400).json({ message: 'Invalid request' });
  if (user.resetOtpCode !== otp) return res.status(400).json({ message: 'Invalid OTP' });
  if (Date.now() > new Date(user.resetOtpExpires).getTime()) return res.status(400).json({ message: 'OTP expired' });

  const hash = await bcrypt.hash(newPassword, 10);
  user.password = hash;
  user.resetOtpCode = undefined;
  user.resetOtpExpires = undefined;
  await user.save();

  res.json({ message: 'Password reset successful' });
});

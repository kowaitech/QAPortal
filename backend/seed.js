import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from './config/db.js';
import User from './models/User.js';
import bcrypt from 'bcryptjs';

async function seed() {
  await connectDB(process.env.MONGO_URI);
  
  // Create admin user
  const adminEmail = 'admin@gmail.com';
  if (!await User.findOne({ email: adminEmail })) {
    const hash = await bcrypt.hash('admin@123', 10);
    await User.create({ name: 'Admin', email: adminEmail, password: hash, role: 'admin', isActive: true });
    console.log('Created admin user:', adminEmail, 'password: admin@123');
  } else {
    console.log('Admin already exists');
  }
  
  // Create staff user (needs approval)
  const staffEmail = 'staff@example.com';
  if (!await User.findOne({ email: staffEmail })) {
    const hash = await bcrypt.hash('Staff@123', 10);
    await User.create({ name: 'Staff', email: staffEmail, password: hash, role: 'staff', isActive: false });
    console.log('Created staff user (needs approval):', staffEmail, 'password: Staff@123');
  } else {
    console.log('Staff exists');
  }
  
  // Create student user (active)
  const studentEmail = 'student@example.com';
  if (!await User.findOne({ email: studentEmail })) {
    const hash = await bcrypt.hash('Student@123', 10);
    await User.create({ name: 'Student', email: studentEmail, password: hash, role: 'student', isActive: true });
    console.log('Created student user:', studentEmail, 'password: Student@123');
  } else {
    console.log('Student exists');
  }
  
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });

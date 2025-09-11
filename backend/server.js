import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import questionRoutes from './routes/questions.js';
import domainRoutes from './routes/domains.js';
import studentAnswerRoutes from './routes/studentAnswers.js';
import testsRoutes from './routes/tests.js';
import uploadRoutes from './routes/upload.js';

dotenv.config();
const app = express();

// ✅ CORS first
app.use(cors({
  origin: [
    process.env.CLIENT_ORIGIN || "http://localhost:5173",
    "https://qaportal-1.onrender.com"
  ],
  credentials: true
}));

// ✅ Helmet after cors
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // disable CSP for now
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// ✅ Serve static uploads
app.use('/uploads', express.static('uploads'));

// ✅ Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/questions', questionRoutes);
app.use('/domains', domainRoutes);
app.use('/student-answers', studentAnswerRoutes);
app.use('/tests', testsRoutes);
app.use('/upload', uploadRoutes);

// ✅ Root route
app.get('/', (req, res) => res.json({ ok: true }));

// ✅ Connect DB and start server
const PORT = process.env.PORT || 8080;
connectDB(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`API running on port ${PORT}`));
});

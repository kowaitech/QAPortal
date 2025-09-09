import mongoose from 'mongoose';

const StudentAnswerSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  domain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: true
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  test: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test'
  },
  section: {
    type: String,
    enum: ['A', 'B'],
    required: true
  },
  answerText: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  imagePublicId: {
    type: String,
    trim: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  examStartTime: {
    type: Date,
    required: true
  },
  examEndTime: {
    type: Date,
    required: true
  },
  isSubmitted: {
    type: Boolean,
    default: true
  },
  mark: {
    type: Number,
    default: null,
    min: 0
  }
}, {
  timestamps: true
});

// Index for efficient querying
StudentAnswerSchema.index({ student: 1, domain: 1, section: 1 });
StudentAnswerSchema.index({ domain: 1, section: 1, submittedAt: -1 });
StudentAnswerSchema.index({ student: 1, test: 1 });

export default mongoose.model('StudentAnswer', StudentAnswerSchema);

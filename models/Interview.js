// backend/models/Interview.js
const mongoose = require('mongoose');

// Duygu analizi sonuçları şeması
const emotionAnalysisSchema = new mongoose.Schema({
  stressScore: { type: Number, required: true },
  matchBonus: { type: Number, required: true },
  generalScore: { type: Number, required: true },
  totalAnalyses: { type: Number, required: true },
  matchCount: { type: Number, required: true }
}, { _id: false });

// Bilgi analizi sonuçları şeması
const knowledgeAnalysisSchema = new mongoose.Schema({
  evaluationText: { type: String, required: true },
  totalScore: { type: Number, required: true },
  reportText: { type: String, required: true }
}, { _id: false });

// Her bir soru cevabı için şema
const questionResponseSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  questionNumber: {
    type: Number,
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  speechToText: {
    type: String,
    required: true
  },
  emotionAnalysis: {
    type: emotionAnalysisSchema,
    required: true
  },
  knowledgeAnalysis: {
    type: knowledgeAnalysisSchema,
    required: true
  }
});

// Katılımcı şeması
const participantSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { 
    type: String, 
    required: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Geçerli bir email adresi giriniz']
  },
  phone:     { type: String, required: true },
  responses: [questionResponseSchema],
  registeredAt: { type: Date, default: Date.now },
  completedAt: Date,
  overallScores: {
    totalEmotionScore: Number,
    totalKnowledgeScore: Number,
    finalScore: Number
  }
});

// Ana mülakat şeması
const interviewSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  mulakatAdi: {
    type: String,
    required: true
  },
  questions: [{
    text: {
      type: String,
      required: true
    },
    maxScore: {
      type: Number,
      required: true,
      default: 100
    }
  }],
  duygusalDegerlendirme: {
    type: Number,
    required: true,
    default: 30
  },
  teknikDegerlendirme: {
    type: Number,
    required: true,
    default: 70
  },
  uniqueUrl: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return require('crypto').randomBytes(32).toString('hex');
    }
  },
  participants: [participantSchema],
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Interview', interviewSchema);

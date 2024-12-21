// models/Practice.js
const mongoose = require('mongoose');

// Duygu analiz veri şeması
const EmotionDataSchema = new mongoose.Schema({
  faceEmotions: [{
    type: String
  }],
  audioEmotions: [{
    emotion: String,
    score: Number
  }],
  speechText: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Duygu analiz sonuç şeması
const AnalysisResultSchema = new mongoose.Schema({
  stress_score: {
    type: Number,
    default: 0
  },
  match_bonus: {
    type: Number,
    default: 0
  },
  general_score: {
    type: Number,
    default: 0
  }
});

// Bilgi analizi şeması
const BilgiAnaliziSchema = new mongoose.Schema({
  puan: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  rapor: {
    type: String
  },
  degerlendirmeMetni: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Soru şeması
const QuestionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  emotionData: [EmotionDataSchema],
  analysisResults: AnalysisResultSchema,
  bilgiAnalizi: BilgiAnaliziSchema,
  totalAnalyses: {
    type: Number,
    default: 0
  },
  matchCount: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  }
});

// Ana pratik şeması
const PracticeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  pratikAdi: {
    type: String,
    required: true
  },
  questions: [QuestionSchema],
  duyguAnaliz: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  bilgiAnaliz: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  }
});

module.exports = mongoose.model('Practice', PracticeSchema);
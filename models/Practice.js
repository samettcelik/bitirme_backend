// models/Practice.js
const mongoose = require('mongoose');

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
  questions: [{
    text: {
      type: String,
      required: true
    }
  }],
  duyguAnaliz: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  bilgiAnaliz: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Practice', PracticeSchema);
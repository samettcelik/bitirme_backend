const express = require('express');
const router = express.Router();
const Practice = require('../models/Practice');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// Yeni bir pratik oluştur
router.post('/practices', auth, async (req, res) => {
  try {
    const { pratikAdi, questions, duyguAnaliz, bilgiAnaliz } = req.body;
    
    const practice = new Practice({
      userId: req.user.id,
      pratikAdi,
      questions,
      duyguAnaliz,
      bilgiAnaliz
    });
    
    await practice.save();
    
    res.status(201).json({
      message: 'Yeni pratik başarıyla oluşturuldu.',
      practice: {
        id: practice._id,
        pratikAdi: practice.pratikAdi,
        createdAt: practice.createdAt
      }
    });
  } catch (error) {
    console.error('Pratik oluşturma hatası:', error);
    res.status(400).json({ message: 'Pratik oluşturulamadı.', error: error.message });
  }
});

// Kullanıcının en son pratiğini getir
router.get('/latest-practice', auth, async (req, res) => {
  try {
    const practice = await Practice.findOne({ userId: req.user.id })
      .sort({ createdAt: -1 });
    
    if (!practice) {
      return res.status(404).json({ message: 'Henüz hiç pratik oluşturulmamış' });
    }
    
    res.json(practice);
  } catch (error) {
    console.error('Son pratik getirme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// En son pratiğin belirli bir sorusunu getir
router.get('/latest-practice/questions/:questionNumber', auth, async (req, res) => {
  try {
    const { questionNumber } = req.params;
    
    const practice = await Practice.findOne({ userId: req.user.id })
      .sort({ createdAt: -1 });
    
    if (!practice) {
      return res.status(404).json({ message: 'Henüz hiç pratik oluşturulmamış' });
    }
    
    const questionIndex = parseInt(questionNumber) - 1;
    
    if (questionIndex < 0 || questionIndex >= practice.questions.length) {
      return res.status(404).json({ message: 'Soru bulunamadı' });
    }
    
    res.json({
      practiceId: practice._id,
      question: {
        number: questionIndex + 1,
        text: practice.questions[questionIndex].text
      },
      totalQuestions: practice.questions.length
    });
  } catch (error) {
    console.error('Soru getirme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Kullanıcının tüm pratiklerini getir
router.get('/practices', auth, async (req, res) => {
  try {
    const practices = await Practice.find({ userId: req.user.id })
      .select('_id pratikAdi createdAt')
      .sort({ createdAt: -1 });
    
    res.json(practices);
  } catch (error) {
    console.error('Pratik listesi alma hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Kullanıcı profili için pratik özeti
router.get('/profile/practice-summary', auth, async (req, res) => {
  try {
    const practices = await Practice.find({ userId: req.user.id })
      .select('pratikAdi questions createdAt')
      .sort({ createdAt: -1 })
      .limit(5);
    
    const summary = {
      totalPractices: await Practice.countDocuments({ userId: req.user.id }),
      recentPractices: practices.map(p => ({
        id: p._id,
        pratikAdi: p.pratikAdi,
        questionCount: p.questions.length,
        createdAt: p.createdAt
      }))
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Pratik özeti getirme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

module.exports = router;
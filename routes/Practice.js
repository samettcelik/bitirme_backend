// routes/practice.js
const express = require('express');
const router = express.Router();
const Practice = require('../models/Practice');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const { ObjectId } = mongoose.Types;

// Yeni pratik oluştur
router.post('/practices', auth, async (req, res) => {
  try {
    const { pratikAdi, questions, duyguAnaliz, bilgiAnaliz } = req.body;
    
    const practice = new Practice({
      userId: req.user.id,
      pratikAdi,
      questions: questions.map(q => ({
        text: q.text,
        emotionData: [],
        analysisResults: {},
        bilgiAnalizi: {}
      })),
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
router.get('/practices', auth, async (req, res) => {
  try {
    const { limit = 10, skip = 0 } = req.query;
    
    const practices = await Practice.find({ 
      userId: req.user.id 
    })
    .sort({ createdAt: -1 }) // En yeniden eskiye sırala
    .limit(parseInt(limit))
    .skip(parseInt(skip));

    const total = await Practice.countDocuments({ userId: req.user.id });
    
    res.json({
      practices,
      total,
      hasMore: total > (parseInt(skip) + practices.length),
      duyguAnaliz: practices[0]?.duyguAnaliz || 0,
      bilgiAnaliz: practices[0]?.bilgiAnaliz || 0
    });

  } catch (error) {
    console.error('Pratik getirme hatası:', error);
    res.status(500).json({ message: 'Pratikler getirilemedi', error: error.message });
  }
});

// En son pratiğin belirli bir sorusunu getir
router.get('/latest-practice/questions/:questionNumber', auth, async (req, res) => {
  try {
    const { questionNumber } = req.params;
    
    const practice = await Practice.findOne({ 
      userId: req.user.id,
      status: 'active'
    }).sort({ createdAt: -1 });
    
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
        text: practice.questions[questionIndex].text,
        emotionData: practice.questions[questionIndex].emotionData,
        analysisResults: practice.questions[questionIndex].analysisResults,
        bilgiAnalizi: practice.questions[questionIndex].bilgiAnalizi,
        totalAnalyses: practice.questions[questionIndex].totalAnalyses,
        matchCount: practice.questions[questionIndex].matchCount,
        completed: practice.questions[questionIndex].completed
      },
      totalQuestions: practice.questions.length
    });
  } catch (error) {
    console.error('Soru getirme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Duygu analiz verilerini ve sonuçları kaydet
router.post('/latest-practice/emotion-data/:questionNumber', auth, async (req, res) => {
  try {
    const { questionNumber } = req.params;
    const { 
      faceEmotions, 
      audioEmotions, 
      speechText,
      analysisResults,
      totalAnalyses,
      matchCount 
    } = req.body;
     
    const practice = await Practice.findOne({ 
      userId: req.user.id,
      status: 'active'
    }).sort({ createdAt: -1 });
    
    if (!practice) {
      return res.status(404).json({ message: 'Pratik bulunamadı' });
    }
    
    const questionIndex = parseInt(questionNumber) - 1;
    
    if (questionIndex < 0 || questionIndex >= practice.questions.length) {
      return res.status(404).json({ message: 'Soru bulunamadı' });
    }
    
    const question = practice.questions[questionIndex];
    
    // Yeni duygu verilerini ekle
    question.emotionData.push({
      faceEmotions,
      audioEmotions,
      speechText,
      timestamp: new Date()
    });

    // Analiz sonuçlarını güncelle
    if (analysisResults) {
      question.analysisResults = {
        stress_score: analysisResults.stress_score || 0,
        match_bonus: analysisResults.match_bonus || 0,
        general_score: analysisResults.general_score || 0
      };
    }

    question.totalAnalyses = totalAnalyses || question.totalAnalyses;
    question.matchCount = matchCount || question.matchCount;
    
    await practice.save();
    
    res.json({
      message: 'Veriler başarıyla kaydedildi',
      practiceId: practice._id,
      questionNumber,
      latestData: {
        emotionData: question.emotionData.slice(-1)[0],
        analysisResults: question.analysisResults,
        totalAnalyses: question.totalAnalyses,
        matchCount: question.matchCount
      }
    });
  } catch (error) {
    console.error('Veri kaydetme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Bilgi analizi ve değerlendirme sonuçlarını kaydet
router.post('/latest-practice/assessment/:questionNumber', auth, async (req, res) => {
  try {
    const { questionNumber } = req.params;
    const { 
      assessmentReport, 
      totalScore,
      questionId,
      userId 
    } = req.body;
    
    const practice = await Practice.findOne({ 
      userId: req.user.id,
      status: 'active'
    }).sort({ createdAt: -1 });
    
    if (!practice) {
      return res.status(404).json({ message: 'Pratik bulunamadı' });
    }
    
    const questionIndex = parseInt(questionNumber) - 1;
    
    if (questionIndex < 0 || questionIndex >= practice.questions.length) {
      return res.status(404).json({ message: 'Soru bulunamadı' });
    }
    
    // Soru bilgi analizini güncelle
    const question = practice.questions[questionIndex];
    question.bilgiAnalizi = {
      puan: totalScore || 0,
      rapor: assessmentReport,
      degerlendirmeMetni: assessmentReport,
      timestamp: new Date()
    };
    question.completed = true;

    // Pratik seviyesi bilgi analiz puanını güncelle
    const completedQuestions = practice.questions.filter(q => q.completed);
    if (completedQuestions.length > 0) {
      const totalBilgiAnaliz = completedQuestions.reduce(
        (sum, q) => sum + (q.bilgiAnalizi?.puan || 0), 
        0
      );
     
    }

    // Tüm sorular tamamlandıysa pratiği tamamla
    if (practice.questions.every(q => q.completed)) {
      practice.status = 'completed';
      practice.completedAt = new Date();
    }
    
    await practice.save();

    // Değerlendirme sonuçlarını dosyaya kaydet
    const resultFileName = `assessment_${questionId}_${Date.now()}.json`;
    await fs.writeFile(resultFileName, JSON.stringify({
      questionId,
      userId,
      assessmentReport,
      totalScore,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    res.json({
      message: 'Değerlendirme sonuçları kaydedildi',
      data: {
        practiceId: practice._id,
        questionNumber,
        bilgiAnalizi: question.bilgiAnalizi,
        practiceBilgiAnaliz: practice.bilgiAnaliz,
        status: practice.status
      }
    });
  } catch (error) {
    console.error('Değerlendirme kaydetme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Değerlendirme sonuçlarını getir
router.get('/latest-practice/assessment/:questionNumber', auth, async (req, res) => {
  try {
    const { questionNumber } = req.params;
    
    const practice = await Practice.findOne({ 
      userId: req.user.id,
      status: 'active'
    }).sort({ createdAt: -1 });
    
    if (!practice) {
      return res.status(404).json({ message: 'Pratik bulunamadı' });
    }
    
    const questionIndex = parseInt(questionNumber) - 1;
    
    if (questionIndex < 0 || questionIndex >= practice.questions.length) {
      return res.status(404).json({ message: 'Soru bulunamadı' });
    }
    
    const question = practice.questions[questionIndex];
    
    res.json({
      practiceId: practice._id,
      questionNumber,
      bilgiAnalizi: question.bilgiAnalizi,
      assessmentReport: question.bilgiAnalizi?.degerlendirmeMetni || null,
      totalScore: question.bilgiAnalizi?.puan || 0,
      practiceBilgiAnaliz: practice.bilgiAnaliz,
      completed: question.completed,
      practiceStatus: practice.status
    });
  } catch (error) {
    console.error('Değerlendirme getirme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});



// Tüm pratikleri getir (paginate ile)
router.get('/practices', auth, async (req, res) => {
  try {
    const { limit = 500, skip = 0 } = req.query;
    
    const practices = await Practice.find({ 
      userId: req.user.id 
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip));

    const total = await Practice.countDocuments({ userId: req.user.id });
    
    res.json({
      practices,
      total,
      hasMore: total > (parseInt(skip) + practices.length)
    });

  } catch (error) {
    res.status(500).json({ message: 'Pratikler getirilemedi', error: error.message });
  }
});

// Tek bir pratiğin detayını getir
router.get('/practices/:id', auth, async (req, res) => {
  try {
    const practice = await Practice.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!practice) {
      return res.status(404).json({ message: 'Pratik bulunamadı' });
    }

    res.json(practice);
  } catch (error) {
    res.status(500).json({ message: 'Pratik getirilemedi', error: error.message });
  }
});


module.exports = router;
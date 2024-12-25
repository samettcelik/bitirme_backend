// backend/routes/interviews.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Interview = require('../models/Interview');
const companyAuth = require('../middleware/companyAuth');

// Belirli bir mülakatı getir
router.get('/:uniqueUrl', async (req, res) => {
  try {
    const interview = await Interview.findOne({ uniqueUrl: req.params.uniqueUrl });
    if (!interview) {
      return res.status(404).json({ message: 'Mülakat bulunamadı' });
    }
    res.json(interview);
  } catch (error) {
    console.error('Hata:', error);
    res.status(500).json({ 
      message: 'Mülakat getirilemedi', 
      error: error.message 
    });
  }
});

// Mülakat oluşturma
router.post('/', companyAuth, async (req, res) => {
  try {
    const { mulakatAdi, questions, duygusalDegerlendirme, teknikDegerlendirme } = req.body;
    
    const interview = new Interview({
      companyId: req.company._id,
      mulakatAdi,
      questions,
      duygusalDegerlendirme,
      teknikDegerlendirme
    });

    await interview.save();
    
    res.status(201).json({
      message: 'Mülakat başarıyla oluşturuldu',
      interview,
      interviewUrl: `/interview/${interview.uniqueUrl}`
    });
  } catch (error) {
    console.error('Hata:', error);
    res.status(400).json({ 
      message: 'Mülakat oluşturulamadı', 
      error: error.message 
    });
  }
});

// Katılımcı kayıt
router.post('/:uniqueUrl/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    const interview = await Interview.findOne({ uniqueUrl: req.params.uniqueUrl });
    
    if (!interview) {
      return res.status(404).json({ message: 'Mülakat bulunamadı' });
    }

    const existingParticipant = interview.participants.find(p => p.email === email);
    if (existingParticipant) {
      return res.status(400).json({ message: 'Bu e-posta adresi ile daha önce kayıt yapılmış' });
    }

    const participant = {
      firstName,
      lastName,
      email,
      phone,
      registeredAt: new Date(),
      responses: []
    };

    interview.participants.push(participant);
    await interview.save();

    res.status(201).json({
      message: 'Kayıt başarılı',
      participantId: interview.participants[interview.participants.length - 1]._id
    });
  } catch (error) {
    console.error('Kayıt hatası:', error);
    res.status(400).json({ 
      message: 'Kayıt işlemi başarısız oldu', 
      error: error.message 
    });
  }
});

// Analiz sonuçlarını kaydetme
router.post('/:uniqueUrl/responses', async (req, res) => {
  try {
    const { uniqueUrl } = req.params;
    const {
      email,
      questionId,
      questionNumber,
      questionText,
      speechToText,
      emotionAnalysis,
      knowledgeAnalysis
    } = req.body;

    // Gerekli alanları kontrol et
    if(!speechToText || !emotionAnalysis || !knowledgeAnalysis) {
      return res.status(400).json({ message: 'Gerekli alanlar eksik' });
    }

    const interview = await Interview.findOne({ uniqueUrl });
    if (!interview) {
      return res.status(404).json({ message: 'Mülakat bulunamadı' });
    }

    const participant = interview.participants.find(p => p.email === email);
    if (!participant) {
      return res.status(404).json({ message: 'Katılımcı bulunamadı' });
    }

    const response = {
      questionId: new mongoose.Types.ObjectId(questionId),
      questionNumber,
      questionText,
      speechToText,
      emotionAnalysis: {
        stressScore: emotionAnalysis.stress_score,
        matchBonus: emotionAnalysis.match_bonus,
        generalScore: emotionAnalysis.general_score,
        totalAnalyses: emotionAnalysis.total_analyses,
        matchCount: emotionAnalysis.match_count
      },
      knowledgeAnalysis: {
        evaluationText: knowledgeAnalysis.evaluation_text,
        totalScore: knowledgeAnalysis.total_score,
        reportText: knowledgeAnalysis.report_text
      }
    };

    participant.responses.push(response);

    // Tüm sorular yanıtlandıysa, toplam skorları hesapla
    if (participant.responses.length === interview.questions.length) {
      participant.completedAt = new Date();
      
      const totalEmotionScore = participant.responses.reduce(
        (sum, resp) => sum + resp.emotionAnalysis.generalScore, 
        0
      ) / participant.responses.length;

      const totalKnowledgeScore = participant.responses.reduce(
        (sum, resp) => sum + resp.knowledgeAnalysis.totalScore, 
        0
      ) / participant.responses.length;

      const finalScore = (
        (totalEmotionScore * interview.duygusalDegerlendirme / 100) +
        (totalKnowledgeScore * interview.teknikDegerlendirme / 100)
      );

      participant.overallScores = {
        totalEmotionScore,
        totalKnowledgeScore,
        finalScore
      };
    }

    await interview.save();

    res.status(201).json({
      message: 'Yanıt kaydedildi',
      response,
      isComplete: participant.completedAt ? true : false,
      overallScores: participant.overallScores
    });

  } catch (error) {
    console.error('Yanıt kaydetme hatası:', error);
    res.status(500).json({
      message: 'Yanıt kaydedilemedi',
      error: error.message
    });
  }
});

// Mülakat sonuçlarını getirme (belirli katılımcı)
router.get('/:uniqueUrl/results/:email', async (req, res) => {
  try {
    const { uniqueUrl, email } = req.params;

    const interview = await Interview.findOne({ uniqueUrl });
    if (!interview) {
      return res.status(404).json({ message: 'Mülakat bulunamadı' });
    }

    const participant = interview.participants.find(p => p.email === email);
    if (!participant) {
      return res.status(404).json({ message: 'Katılımcı bulunamadı' });
    }

    res.json({
      participant: {
        firstName: participant.firstName,
        lastName: participant.lastName,
        email: participant.email,
        registeredAt: participant.registeredAt,
        completedAt: participant.completedAt,
        overallScores: participant.overallScores
      },
      responses: participant.responses
    });

  } catch (error) {
    console.error('Sonuçlar getirme hatası:', error);
    res.status(500).json({
      message: 'Sonuçlar getirilemedi',
      error: error.message
    });
  }
});

// Tüm mülakat sonuçlarını getirme (companyAuth ile)
router.get('/:uniqueUrl/all-results', companyAuth, async (req, res) => {
  try {
    const { uniqueUrl } = req.params;

    const interview = await Interview.findOne({ uniqueUrl });
    if (!interview) {
      return res.status(404).json({ message: 'Mülakat bulunamadı' });
    }

    const results = interview.participants.map(participant => ({
      firstName: participant.firstName,
      lastName: participant.lastName,
      email: participant.email,
      status: participant.completedAt ? 'Tamamlandı' : 'Devam Ediyor',
      registeredAt: participant.registeredAt,
      completedAt: participant.completedAt,
      overallScores: participant.overallScores,
      responseCount: participant.responses.length
    }));

    res.json({
      mulakatAdi: interview.mulakatAdi,
      questionCount: interview.questions.length,
      participantCount: interview.participants.length,
      results
    });

  } catch (error) {
    console.error('Sonuçlar getirme hatası:', error);
    res.status(500).json({
      message: 'Sonuçlar getirilemedi',
      error: error.message
    });
  }
});

router.get('/company/all', companyAuth, async (req, res) => {
  try {
    const interviews = await Interview.find({ companyId: req.company._id })
      .select('mulakatAdi uniqueUrl createdAt participants questions');
    
    const formattedInterviews = interviews.map(interview => ({
      id: interview._id,
      mulakatAdi: interview.mulakatAdi,
      url: `/interview/${interview.uniqueUrl}`,
      createdAt: interview.createdAt,
      katilimciSayisi: interview.participants.length,
      soruSayisi: interview.questions.length
    }));

    res.json({
      count: interviews.length,
      interviews: formattedInterviews
    });

  } catch (error) {
    console.error('Mülakatları getirme hatası:', error);
    res.status(500).json({
      message: 'Mülakatlar getirilemedi',
      error: error.message
    });
  }
});

router.get('/:uniqueUrl/all-results', companyAuth, async (req, res) => {
  try {
    const { uniqueUrl } = req.params;

    const interview = await Interview.findOne({ uniqueUrl });
    if (!interview) {
      return res.status(404).json({ message: 'Mülakat bulunamadı' });
    }

    const results = interview.participants.map(participant => ({
      firstName: participant.firstName,
      lastName: participant.lastName,
      email: participant.email,
      status: participant.completedAt ? 'Tamamlandı' : 'Devam Ediyor',
      registeredAt: participant.registeredAt,
      completedAt: participant.completedAt,
      overallScores: participant.overallScores,
      responseCount: participant.responses.length
    }));

    res.json({
      mulakatAdi: interview.mulakatAdi,
      questionCount: interview.questions.length,
      participantCount: interview.participants.length,
      results
    });

  } catch (error) {
    console.error('Sonuçlar getirme hatası:', error);
    res.status(500).json({
      message: 'Sonuçlar getirilemedi',
      error: error.message
    });
  }
});

router.get('/company/all-interview-results', companyAuth, async (req, res) => {
  try {
    // Şirkete ait tüm mülakatları bul
    const interviews = await Interview.find({ companyId: req.company._id });

    // Her mülakat için sonuçları topla
    const interviewResults = await Promise.all(interviews.map(async (interview) => {
      // Katılımcı sonuçlarını hazırla
      const participantResults = interview.participants.map(participant => ({
        firstName: participant.firstName,
        lastName: participant.lastName,
        email: participant.email,
        status: participant.completedAt ? 'Tamamlandı' : 'Devam Ediyor',
        registeredAt: participant.registeredAt,
        completedAt: participant.completedAt,
        overallScores: participant.overallScores,
        responseCount: participant.responses.length
      }));

      // Mülakat detaylarını ve sonuçlarını birleştir
      return {
        id: interview._id,
        mulakatAdi: interview.mulakatAdi,
        url: `/interview/${interview.uniqueUrl}`,
        createdAt: interview.createdAt,
        questionCount: interview.questions.length,
        participantCount: interview.participants.length,
        results: participantResults,
        
        // İstatistikler
        statistics: {
          tamamlananMulakatSayisi: participantResults.filter(p => p.status === 'Tamamlandı').length,
          devamEdenMulakatSayisi: participantResults.filter(p => p.status === 'Devam Ediyor').length,
          ortalamaBasariPuani: participantResults
            .filter(p => p.overallScores && p.overallScores.length > 0)
            .reduce((acc, curr) => {
              const avgScore = curr.overallScores.reduce((sum, score) => sum + score, 0) / curr.overallScores.length;
              return acc + avgScore;
            }, 0) / (participantResults.filter(p => p.overallScores && p.overallScores.length > 0).length || 1)
        }
      };
    }));

    // Sonuçları gönder
    res.json({
      totalInterviewCount: interviews.length,
      totalParticipantCount: interviews.reduce((acc, interview) => acc + interview.participants.length, 0),
      interviews: interviewResults
    });

  } catch (error) {
    console.error('Mülakat sonuçları getirme hatası:', error);
    res.status(500).json({
      message: 'Mülakat sonuçları getirilemedi',
      error: error.message
    });
  }
});

// Detaylı mülakat sonuçlarını getirme endpoint'i
router.get('/interview-detail/:interviewId/:participantEmail', companyAuth, async (req, res) => {
  try {
    const { interviewId, participantEmail } = req.params;

    const interview = await Interview.findOne({ 
      _id: interviewId,
      companyId: req.company._id
    });

    if (!interview) {
      return res.status(404).json({ message: 'Mülakat bulunamadı' });
    }

    const participant = interview.participants.find(p => p.email === participantEmail);
    
    if (!participant) {
      return res.status(404).json({ message: 'Katılımcı bulunamadı' });
    }

    // Detaylı bilgileri hazırla
    const detailedResults = {
      interview: {
        id: interview._id,
        mulakatAdi: interview.mulakatAdi,
        questions: interview.questions,
        duygusalDegerlendirme: interview.duygusalDegerlendirme,
        teknikDegerlendirme: interview.teknikDegerlendirme,
      },
      participant: {
        firstName: participant.firstName,
        lastName: participant.lastName,
        email: participant.email,
        registeredAt: participant.registeredAt,
        completedAt: participant.completedAt,
        status: participant.completedAt ? 'Tamamlandı' : 'Devam Ediyor',
        overallScores: participant.overallScores,
        responses: participant.responses.map(response => ({
          questionId: response.questionId,
          questionNumber: response.questionNumber,
          questionText: response.questionText,
          speechToText: response.speechToText,
          emotionAnalysis: response.emotionAnalysis,
          knowledgeAnalysis: response.knowledgeAnalysis
        }))
      }
    };

    res.json(detailedResults);

  } catch (error) {
    console.error('Detaylı sonuç getirme hatası:', error);
    res.status(500).json({
      message: 'Detaylı sonuçlar getirilemedi',
      error: error.message
    });
  }
});

module.exports = router;

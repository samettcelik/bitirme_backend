const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = '102030'; // Güvenli bir ortam değişkenine taşıyın

// Kullanıcı Kaydı
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Bu e-posta zaten kayıtlı.' });
    }

    const user = new User({ username, email, password });
    await user.save();

    res.status(201).json({ message: 'Kullanıcı başarıyla kaydedildi!' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası.', error });
  }
});

// Kullanıcı Girişi
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Geçersiz e-posta veya şifre.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Geçersiz e-posta veya şifre.' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token, message: 'Giriş başarılı.' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası.', error });
  }
});

module.exports = router;

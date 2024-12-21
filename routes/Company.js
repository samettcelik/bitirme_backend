const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

const registerValidation = [
  check('name', 'Şirket adı zorunludur').notEmpty(),
  check('taxNumber', 'Vergi numarası zorunludur').notEmpty(),
  check('email', 'Geçerli bir email giriniz').isEmail(),
  check('password', 'Şifre en az 6 karakter olmalıdır').isLength({ min: 6 }),
  check('phone', 'Telefon numarası zorunludur').notEmpty(),
  check('address', 'Adres zorunludur').notEmpty()
];

// Şirket Kayıt
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, taxNumber, email, phone, address, password } = req.body;

    let company = await Company.findOne({ taxNumber });
    if (company) {
      return res.status(400).json({ message: 'Bu vergi numarası ile kayıtlı şirket var.' });
    }

    company = await Company.findOne({ email });
    if (company) {
      return res.status(400).json({ message: 'Bu email ile kayıtlı şirket var.' });
    }

    company = new Company({ name, taxNumber, email, phone, address, password, employees: [] });
    await company.save();

    res.status(201).json({ message: 'Şirket kaydı başarılı', company: { id: company._id, name: company.name, email: company.email }});
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Şirket Giriş
router.post('/login', [
  check('email', 'Geçerli email giriniz').isEmail(),
  check('password', 'Şifre zorunludur').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    const company = await Company.findOne({ email });
    if (!company) {
      return res.status(400).json({ message: 'Geçersiz email veya şifre' });
    }

    const isMatch = await company.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Geçersiz email veya şifre' });
    }

    const payload = { company: { id: company.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;

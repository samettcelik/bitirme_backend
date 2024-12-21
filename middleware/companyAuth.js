const jwt = require('jsonwebtoken');
const Company = require('../models/Company');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ message: 'Token bulunamadı' });

    const token = authHeader.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Geçersiz token formatı' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.company || !decoded.company.id) {
      return res.status(401).json({ message: 'Geçersiz token yapısı' });
    }

    const company = await Company.findById(decoded.company.id);
    if (!company) {
      return res.status(401).json({ message: 'Şirket bulunamadı' });
    }

    req.company = company;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Yetkilendirme hatası' });
  }
};

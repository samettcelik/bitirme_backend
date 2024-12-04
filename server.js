require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/Auth');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Çevresel Değişkenleri Kullanma
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// MongoDB Bağlantısı
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB bağlantısı başarılı!'))
  .catch((err) => console.error('MongoDB bağlantı hatası:', err));

// Rotalar
app.use('/api/auth', authRoutes);

// Sunucu Başlatma
app.listen(PORT, () => console.log(`Server http://localhost:${PORT} üzerinde çalışıyor...`));

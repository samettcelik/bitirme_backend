require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/Auth');
const practiceRoutes = require('./routes/Practice');
const companyRoutes = require('./routes/Company');
const interviewRoutes = require('./routes/Interview');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());


// Çevresel Değişkenleri Kullanma
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// MongoDB Bağlantısı
mongoose
  .connect(MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
  })
  .then(() => console.log('MongoDB bağlantısı başarılı!'))
  .catch((err) => console.error('MongoDB bağlantı hatası:', err));

// Rotalar
app.use('/api/auth', authRoutes);

// Kullanıcı Profil Bilgilerini Getirme
app.get('/api/user/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token bulunamadı' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error });
  }
});

app.use('/api', practiceRoutes); 
app.use('/api/companies', companyRoutes);
app.use('/api/interviews', interviewRoutes);




// Sunucu Başlatma
app.listen(PORT, () => 
  console.log(`Server http://localhost:${PORT} üzerinde çalışıyor...`)
);

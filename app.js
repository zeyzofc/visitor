const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const { connectMongoDb } = require('./connect');

const app = express();
const port = process.env.PORT || 3003;

connectMongoDb();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// Database Model
const visitorSchema = new mongoose.Schema({
  domain: { type: String },
  key: { type: String },
  timestamp: { type: Date, default: Date.now },
  total: { type: Number, default: 0 },
  daily: { type: Number, default: 0 }
});

const Visitor = mongoose.model('Visitor', visitorSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/api/domain/register', async (req, res) => {
  try {
    const { domain, key } = req.query;

    // Validasi apakah domain dan key telah diberikan dalam permintaan
    if (!domain || !key) {
      return res.status(400).json({ error: 'Domain and key are required' });
    }

    // Validasi apakah domain dan key adalah string yang valid
    if (typeof domain !== 'string' || typeof key !== 'string') {
      return res.status(400).json({ error: 'Domain and key must be valid strings' });
    }

    // Periksa apakah pengguna sudah terdaftar
    const existingUser = await Visitor.findOne({ domain, key }).select('-_id -timestamp -__v').lean();

    if (existingUser) {
      // Hapus properti yang tidak diinginkan
      delete existingUser._id;
      delete existingUser.__v;
      delete existingUser.timestamp;

      return res.status(400).json({ error: 'User already registered', user: existingUser });
    }

    // Registrasi pengguna baru dengan menyediakan nilai untuk domain dan key
    const newUser = new Visitor({ domain, key, total: 0, daily: 0 });
    await newUser.save();

    // Hapus properti yang tidak diinginkan dari objek baru
    const formattedUser = JSON.parse(JSON.stringify(newUser, null, 2));
    delete formattedUser._id;
    delete formattedUser.__v;
    delete formattedUser.timestamp;

    // Kirim respons JSON dengan format yang lebih rapi
    res.status(201).json({ message: 'User registered successfully', user: formattedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Rute untuk menghapus semua data pengunjung berdasarkan domain
app.get('/api/domain/delete', async (req, res) => {
  try {
    const { domain, key } = req.query;

    // Validasi apakah domain dan key telah diberikan dalam permintaan
    if (!domain || !key) {
      return res.status(400).json({ error: 'Domain and key are required' });
    }

    // Validasi apakah domain dan key adalah string yang valid
    if (typeof domain !== 'string' || typeof key !== 'string') {
      return res.status(400).json({ error: 'Domain and key must be valid strings' });
    }

    // Periksa apakah pengguna sudah terdaftar
    const existingUser = await Visitor.findOne({ domain, key });

    if (!existingUser) {
      return res.status(400).json({ error: 'User not registered' });
    }

    // Hapus semua data pengunjung berdasarkan domain
    await Visitor.deleteMany({ domain });

    res.status(200).json({ message: `Domain ${domain} deleted successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// rute add view

app.get('/api/views/add', async (req, res) => {
  try {
    const { domain } = req.query;

    // Validasi apakah domain dan key telah diberikan dalam permintaan
    if (!domain) {
      return res.status(400).json({ error: 'Domain are required' });
    }

    let visitor = await Visitor.findOne({ domain });

    if (!visitor) {
      visitor = new Visitor({ domain, total: 1, daily: 1 });
    } else {
      visitor.total += 1;
      visitor.daily += 1;
    }

    await visitor.save();

    // Kirim respons JSON dengan properti yang diinginkan
    res.status(201).json({
      message: 'Visitor added successfully',
      domain: visitor.domain,
      total: visitor.total,
      daily: visitor.daily
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/views', async (req, res) => {
  try {
    const { domain } = req.query;

    // Validasi apakah domain dan key telah diberikan dalam permintaan
    if (!domain) {
      return res.status(400).json({ error: 'Domain are required' });
    }

    // Periksa apakah pengguna sudah terdaftar
    const existingUser = await Visitor.findOne({ domain });

    if (!existingUser) {
      return res.status(400).json({ error: 'User not registered' });
    }

    // Menampilkan result daily dan total dari database
    res.status(200).json({
      domain: existingUser.domain,
      total: existingUser.total,
      daily: existingUser.daily
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// reset daily limit
async function ResetRequestToday() {
  await Visitor.updateMany({}, { $set: { daily: 0 } });
  console.log("Berhasil Reset Visitor Daily");
}

// Reset Request Everyday
cron.schedule(
  "0 0 * * *",
  () => {
    ResetRequestToday();
  },
  {
    scheduled: true,
    timezone: "Asia/Jakarta",
  }
);

// Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

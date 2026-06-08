require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const matchesRouter = require('./routes/matches');
const oddsRouter = require('./routes/odds');
const predictionsRouter = require('./routes/predictions');
const analysisRouter = require('./routes/analysis');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST'],
  credentials: true,
}));

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Routes
app.use('/api/matches', matchesRouter);
app.use('/api/odds', oddsRouter);
app.use('/api/predictions', predictionsRouter);
app.use('/api/analysis', analysisRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Sports Predictor API running on port ${PORT}`);
});

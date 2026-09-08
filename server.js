const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');

const app = express();

// Cloudways / most Node hosts set PORT via env var — always fall back to 3000 for local dev
const PORT = process.env.PORT || 3000;

app.use(compression());

// Relaxed CSP so inline canvas/game scripts + fonts work; tighten if you add external assets
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
      },
    },
  })
);

app.use(express.static(path.join(__dirname, 'public')));

// Simple health check endpoint — handy for Cloudways monitoring / uptime checks
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Pixel Runner server listening on port ${PORT}`);
});

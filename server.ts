import express from 'express';
import { createServer as createViteServer } from 'vite';
import { analyzeEcoPhoto, VerifyImagePayload } from './src/services/imageVerificationService';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // JSON body parser with 20mb limit for high-res photo uploads
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // API endpoint for photo verification
  // Compatible with Netlify Functions /api/verify-photo
  app.post(['/api/verify-photo', '/.netlify/functions/verify-photo'], async (req, res) => {
    try {
      const payload: VerifyImagePayload = req.body;

      if (!payload.imageB64 || payload.imageB64.trim() === '') {
        return res.status(400).json({
          status: 'NO_PHOTO',
          statusLabelKz: 'Фото жүктелмеді',
          reasonKz: 'Алдымен фотосуретті жүктеңіз.',
          confidenceScore: 0,
          detectedObjects: [],
          metricsSummary: '0',
          isCompliant: false,
        });
      }

      // Check allowed MIME types
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const mime = (payload.mimeType || '').toLowerCase();
      if (!allowedMimes.includes(mime)) {
        return res.status(400).json({
          status: 'REJECTED',
          statusLabelKz: 'Фото сәйкес келмейді',
          reasonKz: 'Тек JPG, JPEG, PNG және WEBP форматтарындағы нақты суреттер қабылданады.',
          confidenceScore: 0,
          detectedObjects: [],
          metricsSummary: '0',
          isCompliant: false,
        });
      }

      const result = await analyzeEcoPhoto(payload);
      return res.json(result);
    } catch (err: any) {
      console.error('API /api/verify-photo error:', err);
      return res.status(500).json({
        status: 'NEEDS_REVIEW',
        statusLabelKz: 'Қосымша тексеру қажет',
        reasonKz: 'Серверлік өңдеуде қате орын алды. Қосымша тексеру қажет.',
        confidenceScore: 0,
        detectedObjects: [],
        metricsSummary: 'Қате',
        isCompliant: false,
      });
    }
  });

  // Mount Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EcoQala full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

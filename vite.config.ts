import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';
import { defineConfig, Plugin } from 'vite';

dotenv.config();

function apiVerificationPlugin(): Plugin {
  return {
    name: 'api-verification-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (
          req.method === 'POST' &&
          (req.url === '/api/verify-cleanup' || req.url === '/.netlify/functions/verify-cleanup')
        ) {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(bodyStr);
              const { verifyCleanupSubmission } = await import('./src/services/verificationEngine');
              const result = await verifyCleanupSubmission(payload);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err: any) {
              console.error('API verify-cleanup middleware error:', err);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(
                JSON.stringify({
                  status: 'manual_review',
                  statusLabelKz: 'Қосымша тексеру қажет',
                  decision: {
                    status: 'manual_review',
                    decisionReason: 'Middleware processing error',
                    decisionReasonKz: 'Серверлік өңдеу қатесі',
                    decisionReasonRu: 'Ошибка обработки на сервере',
                    pointsAwarded: 0,
                    ruleViolations: ['INTERNAL_SERVER_ERROR'],
                  },
                })
              );
            }
          });
        } else if (
          req.method === 'POST' &&
          (req.url === '/api/verify-photo' || req.url === '/.netlify/functions/verify-photo')
        ) {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(bodyStr);
              const { analyzeEcoPhoto } = await import('./src/services/imageVerificationService');
              const result = await analyzeEcoPhoto(payload);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err: any) {
              console.error('API verify-photo middleware error:', err);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  status: 'NEEDS_REVIEW',
                  statusLabelKz: 'Қосымша тексеру қажет',
                  reasonKz:
                    'AI тексеру кезінде серверлік қате туындады. Өтінім модератордың қосымша тексеруіне жіберілді.',
                  confidenceScore: 0,
                  detectedObjects: [],
                  metricsSummary: 'Қосымша тексеруде',
                  isCompliant: false,
                })
              );
            }
          });
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiVerificationPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

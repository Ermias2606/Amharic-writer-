// server.ts
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  serverGenerateStructure,
  serverGenerateChapterContent,
  serverReviewBook,
  serverModifyChapter,
  serverAddChapter,
  serverRefineBook,
  serverGenerateGlossary,
  serverGeneratePodcast,
  serverRefinePodcast,
  serverExpandShortWriting,
  serverGenerateImage
} from './server/geminiBackend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '20mb' }));

  // API router for Gemini operations
  app.post('/api/gemini/:action', async (req: Request, res: Response): Promise<void> => {
    const { action } = req.params;
    const payload = req.body || {};

    try {
      switch (action) {
        case 'generate-structure': {
          const result = await serverGenerateStructure(payload);
          res.json({ success: true, data: result });
          return;
        }
        case 'generate-chapter-content': {
          const result = await serverGenerateChapterContent(payload);
          res.json({ success: true, data: result });
          return;
        }
        case 'review-book': {
          const result = await serverReviewBook(payload.anthology);
          res.json({ success: true, data: result });
          return;
        }
        case 'modify-chapter': {
          const result = await serverModifyChapter(payload);
          res.json({ success: true, data: result });
          return;
        }
        case 'add-chapter': {
          const result = await serverAddChapter(payload.anthology);
          res.json({ success: true, data: result });
          return;
        }
        case 'refine-book': {
          const result = await serverRefineBook(payload.anthology);
          res.json({ success: true, data: result });
          return;
        }
        case 'generate-glossary': {
          const result = await serverGenerateGlossary(payload.anthology);
          res.json({ success: true, data: result });
          return;
        }
        case 'generate-podcast': {
          const result = await serverGeneratePodcast(payload);
          res.json({ success: true, data: result });
          return;
        }
        case 'refine-podcast': {
          const result = await serverRefinePodcast(payload.script);
          res.json({ success: true, data: result });
          return;
        }
        case 'expand-short-writing': {
          const result = await serverExpandShortWriting(payload);
          res.json({ success: true, data: result });
          return;
        }
        case 'generate-image': {
          const result = await serverGenerateImage(payload.prompt || payload.concept || '');
          res.json({ success: true, data: result });
          return;
        }
        default:
          res.status(404).json({ error: `Unknown Gemini action: ${action}` });
          return;
      }
    } catch (error: any) {
      console.error(`Error in /api/gemini/${action}:`, error);
      res.status(500).json({
        error: error.message || 'An error occurred during AI processing on the server.',
        status: error.status || 'INTERNAL_ERROR',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

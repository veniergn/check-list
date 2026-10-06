import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';
import dotenv from 'dotenv';
import { uploadToDrive } from './src/server/driveService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables for the dev server
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

function driveUploadPlugin(): Plugin {
  return {
    name: 'vite-plugin-drive-upload',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/upload' && req.method === 'POST') {
          try {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body);
                const result = await uploadToDrive(parsed);
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = result.success ? 200 : 400;
                res.end(JSON.stringify(result));
              } catch (e: any) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: e.message || 'Error procesando cuerpo de solicitud.' }));
              }
            });
          } catch (err: any) {
            next(err);
          }
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), driveUploadPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

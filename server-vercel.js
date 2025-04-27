// Import required modules
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Setup Express
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve static files
app.use(express.static(path.join(__dirname, 'client')));

// Handle API requests (these will be routed to Python via Vercel config)
app.get('/api/*', (req, res) => {
  res.status(404).send('API route not found - should be handled by Vercel routing');
});

// Serve the index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Export for Vercel
export default app; 
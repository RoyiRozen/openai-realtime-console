// Import required modules
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import 'dotenv/config';

// Setup Express
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Determine the correct path for static files
// In Vercel, the files will be in the root directory after build
const staticPath = fs.existsSync(path.join(__dirname, 'client')) 
  ? path.join(__dirname, 'client')  // Local development
  : __dirname;                      // Vercel deployment

// Serve static files
app.use(express.static(staticPath));

// Handle API requests (these will be routed to Python via Vercel config)
app.get('/api/*', (req, res) => {
  res.status(404).send('API route not found - should be handled by Vercel routing');
});

// Check if index.html exists and where it is
let indexHtmlPath;
if (fs.existsSync(path.join(staticPath, 'index.html'))) {
  indexHtmlPath = path.join(staticPath, 'index.html');
} else if (fs.existsSync(path.join(__dirname, 'index.html'))) {
  indexHtmlPath = path.join(__dirname, 'index.html');
}

// Serve the index.html for all other routes (SPA)
app.get('*', (req, res) => {
  if (indexHtmlPath) {
    res.sendFile(indexHtmlPath);
  } else {
    res.status(404).send('Index.html not found. Check build configuration.');
  }
});

// Start server if not running in Vercel
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
export default app; 
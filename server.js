import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 3001;
const apiKey = process.env.OPENAI_API_KEY;
const apiPort = process.env.API_PORT || 8000;

// Check if running in dev mode
const isDev = process.argv.includes('--dev');

// Enable JSON parsing for request bodies
app.use(express.json());

// Configure Vite middleware for React client
const vite = await createViteServer({
  server: { 
    middlewareMode: true,
    hmr: { 
      port: 24679 // Use a different port than the default 24678
    }
  },
  appType: "custom",
});
app.use(vite.middlewares);

// API route for token generation
app.get("/token", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "verse",
        }),
      },
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// Proxy API requests to the FastAPI backend
app.use('/api', async (req, res) => {
  try {
    const targetUrl = `http://localhost:${apiPort}${req.url}`;
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers,
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error(`API proxy error for ${req.url}:`, error);
    res.status(500).json({ error: "Failed to proxy request to API server" });
  }
});

// Render the React client
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;

  try {
    const template = await vite.transformIndexHtml(
      url,
      fs.readFileSync("./client/index.html", "utf-8"),
    );
    const { render } = await vite.ssrLoadModule("./client/entry-server.jsx");
    const appHtml = await render(url);
    const html = template.replace(`<!--ssr-outlet-->`, appHtml?.html);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite.ssrFixStacktrace(e);
    next(e);
  }
});

const server = app.listen(port, () => {
  console.log(`Express server running on *:${port}`);
  console.log(`API requests proxied to localhost:${apiPort}`);
  
  // Open a browser window in dev mode
  if (isDev) {
    try {
      const url = `http://localhost:${port}`;
      console.log(`Opening browser at ${url}...`);
      // Use dynamic import for 'open' module
      import('open').then(open => open.default(url));
    } catch (error) {
      console.error("Failed to open browser:", error);
    }
  }
});

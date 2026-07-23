import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Sync Google Sheet server-side to prevent CORS issues 100%
  app.get("/api/sync-sheet", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'Missing or invalid url parameter' });
        return;
      }

      // Extract sheet ID
      const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!sheetIdMatch || !sheetIdMatch[1]) {
        res.status(400).json({ error: 'ไม่พบ ID ของ Google Sheets ในลิงก์ที่ระบุ' });
        return;
      }
      const sheetId = sheetIdMatch[1];

      // Extract GID (default to 0 if not present)
      const gidMatch = url.match(/[?&]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';

      // Use the export format=csv URL which is highly reliable and bypasses any restrictions
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      
      console.log(`[Server] Fetching Google Sheet: ${csvUrl}`);
      
      const response = await fetch(csvUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Google Sheets returned status ${response.status}`);
      }

      const csvText = await response.text();
      res.json({ csv: csvText });
    } catch (err: any) {
      console.error('[Server] Google Sheets fetch error:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch spreadsheet data' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const STATIC_DIR = __dirname;
const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions";
const API_KEY = process.env.DEEPSEEK_API_KEY || "";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  let filePath = req.url.split("?")[0];
  if (filePath === "/") filePath = "/index.html";

  const fullPath = path.join(STATIC_DIR, filePath);

  if (!fullPath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("not found: " + filePath);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType, ...CORS_HEADERS });
    res.end(data);
  });
}

function streamDeepSeek(body, res) {
  body.stream = true;

  const url = new URL(DEEPSEEK_API);
  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + API_KEY,
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...CORS_HEADERS,
    });

    let lineBuffer = "";

    proxyRes.setEncoding("utf8");
    proxyRes.on("data", (chunk) => {
      lineBuffer += chunk;
      var lines = lineBuffer.split("\n");
      lineBuffer = lines.pop();

      for (var i = 0; i < lines.length; i++) {
        res.write(lines[i] + "\n");
      }
    });

    proxyRes.on("end", () => {
      if (lineBuffer.trim()) {
        res.write(lineBuffer + "\n");
      }
      res.end();
    });
  });

  proxyReq.on("error", (e) => {
    console.error("[proxy] stream error:", e.message);
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS });
    }
    res.end(JSON.stringify({ error: "upstream error: " + e.message }));
  });

  proxyReq.write(JSON.stringify(body));
  proxyReq.end();
}

function nonStreamDeepSeek(body, res) {
  body.stream = false;

  const url = new URL(DEEPSEEK_API);
  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + API_KEY,
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    const chunks = [];
    proxyRes.on("data", (c) => chunks.push(c));
    proxyRes.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      res.writeHead(proxyRes.statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        ...CORS_HEADERS,
      });
      res.end(raw);
    });
  });

  proxyReq.on("error", (e) => {
    console.error("[proxy] non-stream error:", e.message);
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS });
    }
    res.end(JSON.stringify({ error: "upstream error: " + e.message }));
  });

  proxyReq.write(JSON.stringify(body));
  proxyReq.end();
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.url === "/api/nba-ai" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      console.log("[api]", new Date().toISOString(), "model:", body.model, "stream:", body.stream, "msgs:", body.messages?.length);

      if (body.stream) {
        streamDeepSeek(body, res);
      } else {
        nonStreamDeepSeek(body, res);
      }
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS });
      res.end(JSON.stringify({ error: "invalid request body" }));
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
  console.log(`[server] static: ${STATIC_DIR}`);
  console.log(`[server] api: POST /api/nba-ai -> ${DEEPSEEK_API}`);
});

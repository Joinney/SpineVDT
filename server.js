const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = 3456;
const TOOL_DIR = __dirname;
const WORKSPACE_DIR = path.resolve(TOOL_DIR, "..");
const PUBLIC_DIR = path.join(TOOL_DIR, "public");
const TMP_DIR = path.join(TOOL_DIR, "tmp");
const SPINE_WEBGL_JS = path.join(
  TOOL_DIR,
  "node_modules",
  "@esotericsoftware",
  "spine-webgl",
  "dist",
  "iife",
  "spine-webgl.min.js"
);

fs.mkdirSync(TMP_DIR, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".atlas": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".skel": "application/octet-stream",
  ".zip": "application/zip",
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function safePath(baseDir, reqPath) {
  const decoded = decodeURIComponent(reqPath);
  const resolved = path.resolve(baseDir, decoded.replace(/^\/+/, ""));
  if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
    return null;
  }
  return resolved;
}

function scanAssets() {
  const files = [];
  const skipDirs = new Set(["SpineVDT", "tool", "output", "node_modules", ".git"]);
  function walk(dir, relPrefix) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!skipDirs.has(e.name)) {
          walk(path.join(dir, e.name), relPrefix ? `${relPrefix}/${e.name}` : e.name);
        }
      } else if (e.isFile()) {
        if (/\.(json|skel|atlas|atlas\.txt|png|jpg|jpeg|webp)$/i.test(e.name)) {
          files.push(relPrefix ? `${relPrefix}/${e.name}` : e.name);
        }
      }
    }
  }
  walk(WORKSPACE_DIR, "");
  return { workspaceDir: WORKSPACE_DIR, files };
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { windowsHide: true });
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-800)}`));
    });
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = urlObj.pathname;

    if (req.method === "GET" && pathname === "/") {
      const html = fs.readFileSync(path.join(PUBLIC_DIR, "index.html"));
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      return res.end(html);
    }

    if (req.method === "GET" && pathname === "/logo.jpg") {
      const logoPath = path.join(PUBLIC_DIR, "logo.jpg");
      if (!fs.existsSync(logoPath)) {
        res.writeHead(404);
        return res.end("Not found");
      }
      res.writeHead(200, { "Content-Type": MIME[".jpg"] });
      return fs.createReadStream(logoPath).pipe(res);
    }

    if (req.method === "GET" && pathname === "/spine-webgl.min.js") {
      const js = fs.readFileSync(SPINE_WEBGL_JS);
      res.writeHead(200, { "Content-Type": MIME[".js"] });
      return res.end(js);
    }

    if (req.method === "GET" && pathname === "/api/assets") {
      return sendJson(res, 200, scanAssets());
    }

    if (req.method === "GET" && pathname === "/api/fetch-url") {
      const targetUrl = urlObj.searchParams.get("url");
      if (!targetUrl) {
        return sendJson(res, 400, { error: "Missing url parameter" });
      }
      let parsed;
      try {
        parsed = new URL(targetUrl);
      } catch {
        return sendJson(res, 400, { error: "URL không hợp lệ" });
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return sendJson(res, 400, { error: "Chỉ hỗ trợ http:// hoặc https://" });
      }
      const host = parsed.hostname.toLowerCase();
      if (
        host === "localhost" ||
        host === "::1" ||
        host === "0.0.0.0" ||
        /^127\./.test(host) ||
        /^10\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^169\.254\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host)
      ) {
        return sendJson(res, 403, { error: "Không hỗ trợ truy cập địa chỉ nội bộ" });
      }

      const buf = await new Promise((resolve, reject) => {
        const proc = spawn(
          "curl.exe",
          [
            "-sSL",
            "--http1.1",
            "--fail",
            "--max-time",
            "120",
            "--connect-timeout",
            "20",
            "--retry",
            "2",
            "--proto",
            "=http,https",
            "-e",
            `${parsed.origin}/`,
            "-A",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            parsed.toString(),
          ],
          { windowsHide: true }
        );
        const out = [];
        let errTxt = "";
        proc.stdout.on("data", (d) => out.push(d));
        proc.stderr.on("data", (d) => {
          errTxt += d.toString();
        });
        proc.on("error", reject);
        proc.on("close", (code) => {
          if (code === 0) resolve(Buffer.concat(out));
          else reject(new Error(errTxt.trim() || `curl exited with code ${code}`));
        });
      });

      const ext = path.extname(parsed.pathname).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Content-Length": buf.length,
      });
      return res.end(buf);
    }

    if (req.method === "GET" && pathname.startsWith("/assets/")) {
      const rel = pathname.slice("/assets/".length);
      const filePath = safePath(WORKSPACE_DIR, rel);
      if (!filePath || !fs.existsSync(filePath)) {
        res.writeHead(404);
        return res.end("Not found");
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    if (req.method === "GET" && pathname.startsWith("/tmp-export/")) {
      const parts = pathname.slice("/tmp-export/".length).split("/");
      const sessionId = parts[0];
      const rel = decodeURIComponent(parts.slice(1).join("/"));
      if (!sessionId || !/^[a-zA-Z0-9_]+$/.test(sessionId) || !rel) {
        res.writeHead(400);
        return res.end("Invalid request");
      }
      const sessionDir = path.join(TMP_DIR, sessionId);
      const filePath = safePath(sessionDir, rel);
      if (!filePath || !fs.existsSync(filePath)) {
        res.writeHead(404);
        return res.end("Not found");
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${path.basename(filePath)}"`,
      });
      res.on("finish", () => {
        fs.rm(sessionDir, { recursive: true, force: true }, () => {});
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    if (req.method === "POST" && pathname === "/api/export-start") {
      const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const sessionDir = path.join(TMP_DIR, sessionId);
      fs.mkdirSync(sessionDir, { recursive: true });
      return sendJson(res, 200, { sessionId });
    }

    if (req.method === "POST" && pathname === "/api/export-frame") {
      const sessionId = req.headers["x-session-id"];
      const frameIndex = Number(req.headers["x-frame-index"]);
      if (!sessionId || !/^[a-zA-Z0-9_]+$/.test(sessionId) || Number.isNaN(frameIndex)) {
        return sendJson(res, 400, { error: "Invalid session or frame index" });
      }
      const sessionDir = path.join(TMP_DIR, sessionId);
      if (!fs.existsSync(sessionDir)) {
        return sendJson(res, 404, { error: "Session not found" });
      }
      const buf = await readBody(req);
      const fname = `frame_${String(frameIndex).padStart(5, "0")}.png`;
      fs.writeFileSync(path.join(sessionDir, fname), buf);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "POST" && pathname === "/api/export-finish") {
      const raw = await readBody(req);
      const { sessionId, format, fps, baseName } = JSON.parse(raw.toString("utf-8"));
      if (!sessionId || !/^[a-zA-Z0-9_]+$/.test(sessionId)) {
        return sendJson(res, 400, { error: "Invalid sessionId" });
      }
      const sessionDir = path.join(TMP_DIR, sessionId);
      if (!fs.existsSync(sessionDir)) {
        return sendJson(res, 404, { error: "Session not found" });
      }

      const safeBase = (baseName || "spine_output").replace(/[^a-zA-Z0-9_-]/g, "_");
      const rate = Math.max(1, Math.min(60, Number(fps) || 30));
      const inputPattern = path.join(sessionDir, "frame_%05d.png");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

      let outFile;
      let ffmpegArgs;

      if (format === "gif") {
        outFile = `${safeBase}_${stamp}.gif`;
        const outPath = path.join(sessionDir, outFile);
        ffmpegArgs = [
          "-y",
          "-framerate",
          String(rate),
          "-i",
          inputPattern,
          "-vf",
          "split[s0][s1];[s0]palettegen=reserve_transparent=1:stats_mode=diff[p];[s1][p]paletteuse=alpha_threshold=128",
          "-loop",
          "0",
          outPath,
        ];
      } else if (format === "webm") {
        outFile = `${safeBase}_${stamp}.webm`;
        const outPath = path.join(sessionDir, outFile);
        ffmpegArgs = [
          "-y",
          "-framerate",
          String(rate),
          "-i",
          inputPattern,
          "-c:v",
          "libvpx-vp9",
          "-pix_fmt",
          "yuva420p",
          "-b:v",
          "2M",
          "-auto-alt-ref",
          "0",
          outPath,
        ];
      } else if (format === "apng") {
        outFile = `${safeBase}_${stamp}.png`;
        const outPath = path.join(sessionDir, outFile);
        ffmpegArgs = [
          "-y",
          "-framerate",
          String(rate),
          "-i",
          inputPattern,
          "-plays",
          "0",
          "-f",
          "apng",
          outPath,
        ];
      } else if (format === "webp") {
        outFile = `${safeBase}_${stamp}.webp`;
        const outPath = path.join(sessionDir, outFile);
        ffmpegArgs = [
          "-y",
          "-framerate",
          String(rate),
          "-i",
          inputPattern,
          "-c:v",
          "libwebp",
          "-pix_fmt",
          "yuva420p",
          "-lossless",
          "0",
          "-q:v",
          "85",
          "-loop",
          "0",
          "-preset",
          "default",
          "-an",
          "-vsync",
          "0",
          outPath,
        ];
      } else if (format === "mp4") {
        outFile = `${safeBase}_${stamp}.mp4`;
        const outPath = path.join(sessionDir, outFile);
        ffmpegArgs = [
          "-y",
          "-framerate",
          String(rate),
          "-i",
          inputPattern,
          "-vf",
          "pad=ceil(iw/2)*2:ceil(ih/2)*2",
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-crf",
          "18",
          outPath,
        ];
      } else {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        return sendJson(res, 400, { error: "Unsupported format" });
      }

      await runFfmpeg(ffmpegArgs);
      for (const f of fs.readdirSync(sessionDir)) {
        if (f !== outFile) {
          fs.rmSync(path.join(sessionDir, f), { force: true });
        }
      }

      return sendJson(res, 200, {
        ok: true,
        filename: outFile,
        url: `/tmp-export/${sessionId}/${encodeURIComponent(outFile)}`,
      });
    }

    res.writeHead(404);
    res.end("Not found");
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: err.message || "Internal error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Spine Assembler Tool đang chạy tại: http://127.0.0.1:${PORT}`);
  console.log(`Thư mục asset: ${WORKSPACE_DIR}`);
});

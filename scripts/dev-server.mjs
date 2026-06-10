import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 5173);
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

loadDotEnv(path.join(projectRoot, ".env"));

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "POST" && url.pathname === "/api/remove-bg") {
      await handleRemoveBg(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/selection") {
      await handleSelection(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "不支持的请求方式" });
      return;
    }

    await serveStatic(url.pathname, req, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "服务暂时不可用，请稍后再试" });
  }
});

server.listen(PORT, () => {
  console.log(`肤色十二季型自测原型已启动: http://localhost:${PORT}`);
});

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const raw = trimmed.slice(eq + 1).trim();
    const value = raw.replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

async function serveStatic(pathname, req, res) {
  const safePath = decodeURIComponent(pathname).replace(/^\/+/, "");
  const resolved = path.resolve(projectRoot, safePath || "index.html");
  const root = path.resolve(projectRoot);

  if (!resolved.startsWith(root)) {
    sendJson(res, 403, { error: "无权访问该路径" });
    return;
  }

  let filePath = resolved;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, { error: "没有找到这个页面" });
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

async function handleRemoveBg(req, res) {
  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey || apiKey === "your_remove_bg_api_key_here") {
    sendJson(res, 500, { error: "还没有配置 REMOVEBG_API_KEY，请在 .env 里填写 remove.bg API key" });
    return;
  }

  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    sendJson(res, 400, { error: "请使用 multipart/form-data 上传图片" });
    return;
  }

  const body = await readRequestBody(req);
  const parts = parseMultipart(body, boundaryMatch[1] || boundaryMatch[2]);
  const image = parts.find((part) => part.name === "image" && part.data.length > 0);
  if (!image) {
    sendJson(res, 400, { error: "没有收到图片，请重新上传" });
    return;
  }

  const form = new FormData();
  const imageBlob = new Blob([image.data], { type: image.contentType || "application/octet-stream" });
  form.append("image_file", imageBlob, image.filename || "selfie.png");
  form.append("size", "auto");
  form.append("format", "png");

  const removeBgResponse = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: form,
  });

  const responseBuffer = Buffer.from(await removeBgResponse.arrayBuffer());
  if (!removeBgResponse.ok) {
    let message = "remove.bg 抠像失败，请稍后再试";
    try {
      const parsed = JSON.parse(responseBuffer.toString("utf8"));
      message = parsed?.errors?.[0]?.title || parsed?.error || message;
    } catch {
      const text = responseBuffer.toString("utf8").trim();
      if (text) message = text.slice(0, 180);
    }
    sendJson(res, removeBgResponse.status, { error: message });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "image/png",
    "Cache-Control": "no-store",
  });
  res.end(responseBuffer);
}

async function handleSelection(req, res) {
  const body = await readRequestBody(req, 64 * 1024);
  try {
    const selection = JSON.parse(body.toString("utf8"));
    console.log("用户色卡选择:", JSON.stringify(selection));
    sendJson(res, 200, { ok: true });
  } catch {
    sendJson(res, 400, { error: "选择记录格式不正确" });
  }
}

function readRequestBody(req, maxBytes = MAX_UPLOAD_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy(new Error("请求内容太大"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseMultipart(buffer, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];
  let cursor = buffer.indexOf(delimiter);
  while (cursor !== -1) {
    const next = buffer.indexOf(delimiter, cursor + delimiter.length);
    if (next === -1) break;
    const raw = buffer.subarray(cursor + delimiter.length, next);
    cursor = next;

    let part = raw;
    if (part.subarray(0, 2).toString() === "\r\n") part = part.subarray(2);
    if (part.subarray(0, 2).toString() === "--") continue;
    if (part.subarray(part.length - 2).toString() === "\r\n") part = part.subarray(0, part.length - 2);

    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;
    const headerText = part.subarray(0, headerEnd).toString("utf8");
    const data = part.subarray(headerEnd + 4);
    const disposition = headerText.match(/content-disposition:\s*form-data;([^\r\n]*)/i)?.[1] || "";
    const name = disposition.match(/name="([^"]+)"/i)?.[1];
    const filename = disposition.match(/filename="([^"]*)"/i)?.[1];
    const contentType = headerText.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim();
    if (name) parts.push({ name, filename, contentType, data });
  }
  return parts;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

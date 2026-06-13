import http from "node:http";

const PORT = Number(process.env.PORT || 9000);
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url || "/", "http://localhost");
    const pathname = normalizePath(url.pathname);

    if (req.method === "POST" && pathname.endsWith("/remove-bg")) {
      await handleRemoveBg(req, res);
      return;
    }

    if (req.method === "POST" && pathname.endsWith("/selection")) {
      await handleSelection(req, res);
      return;
    }

    sendJson(res, 404, { error: "没有找到这个接口" });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "服务暂时不可用，请稍后再试" });
  }
});

server.listen(PORT, () => {
  console.log(`colorseason-api listening on ${PORT}`);
});

function normalizePath(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

async function handleRemoveBg(req, res) {
  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey || apiKey === "your_remove_bg_api_key_here") {
    sendJson(res, 500, { error: "还没有配置 REMOVEBG_API_KEY" });
    return;
  }

  const contentType = getHeader(req, "content-type");
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
  const responseMode = partText(parts, "response") || "image";
  const wantsJson = responseMode === "json";
  console.log("remove-bg-request", JSON.stringify({
    imageBytes: image.data.length,
    imageType: image.contentType || "",
    responseMode,
  }));

  const form = new FormData();
  const imageBlob = new Blob([image.data], { type: image.contentType || "application/octet-stream" });
  form.append("image_file", imageBlob, image.filename || "selfie.jpg");
  form.append("size", process.env.REMOVEBG_SIZE || "preview");
  form.append("format", "png");

  const removeBgResponse = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: form,
  });

  const responseBuffer = Buffer.from(await removeBgResponse.arrayBuffer());
  console.log("remove-bg-response", JSON.stringify({
    status: removeBgResponse.status,
    ok: removeBgResponse.ok,
    contentType: removeBgResponse.headers.get("content-type") || "",
    bytes: responseBuffer.length,
  }));
  if (!removeBgResponse.ok) {
    sendJson(res, removeBgResponse.status, { error: errorMessageFromRemoveBg(responseBuffer) });
    return;
  }

  if (wantsJson) {
    sendJson(res, 200, {
      imageDataUrl: `data:image/png;base64,${responseBuffer.toString("base64")}`,
      bytes: responseBuffer.length,
    });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "image/png",
    "Cache-Control": "no-store",
  });
  res.end(responseBuffer);
}

function partText(parts, name) {
  const part = parts.find((item) => item.name === name);
  return part ? part.data.toString("utf8").trim() : "";
}

async function handleSelection(req, res) {
  const body = await readRequestBody(req, 64 * 1024);
  try {
    const selection = JSON.parse(body.toString("utf8"));
    console.log("season-test-selection", JSON.stringify({
      step: selection.step,
      seasonGroupId: selection.seasonGroupId,
      seasonId: selection.seasonId,
      cardId: selection.cardId,
      at: selection.at,
    }));
    sendJson(res, 200, { ok: true });
  } catch {
    sendJson(res, 400, { error: "选择记录格式不正确" });
  }
}

function getHeader(req, name) {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value || "";
}

function readRequestBody(req, maxBytes = MAX_UPLOAD_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("请求内容太大，请换一张较小的照片"));
        req.destroy();
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

function errorMessageFromRemoveBg(buffer) {
  try {
    const parsed = JSON.parse(buffer.toString("utf8"));
    return parsed?.errors?.[0]?.title || parsed?.error || "remove.bg 抠像失败，请稍后再试";
  } catch {
    const text = buffer.toString("utf8").trim();
    return text ? text.slice(0, 180) : "remove.bg 抠像失败，请稍后再试";
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

import { getHeader, parseMultipart, readRequestBody, sendBuffer, sendJson } from "./_shared.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "不支持的请求方式" });
    return;
  }

  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey || apiKey === "your_remove_bg_api_key_here") {
    sendJson(res, 500, { error: "还没有配置 REMOVEBG_API_KEY，请在 Vercel 环境变量里填写 remove.bg API key" });
    return;
  }

  try {
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
    if (!removeBgResponse.ok) {
      sendJson(res, removeBgResponse.status, { error: errorMessageFromRemoveBg(responseBuffer) });
      return;
    }

    sendBuffer(res, 200, responseBuffer, "image/png");
  } catch (error) {
    sendJson(res, 500, { error: error.message || "remove.bg 抠像失败，请稍后再试" });
  }
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

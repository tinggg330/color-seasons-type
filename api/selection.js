import { readRequestBody, sendJson } from "../lib/api-shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "不支持的请求方式" });
    return;
  }

  try {
    const body = await readRequestBody(req, 64 * 1024);
    const selection = JSON.parse(body.toString("utf8"));
    console.log("season-test-selection", {
      step: selection.step,
      seasonGroupId: selection.seasonGroupId,
      seasonId: selection.seasonId,
      cardId: selection.cardId,
      at: selection.at,
    });
    sendJson(res, 200, { ok: true });
  } catch {
    sendJson(res, 400, { error: "选择记录格式不正确" });
  }
}

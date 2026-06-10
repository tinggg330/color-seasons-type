const app = document.querySelector("#app");
const rulesTemplate = document.querySelector("#rules-template");

const GROUP_ORDER = ["spring", "summer", "autumn", "winter"];
const GROUP_LABELS = {
  spring: "春季型",
  summer: "夏季型",
  autumn: "秋季型",
  winter: "冬季型",
};

const DIMENSION_LABELS = {
  undertone: {
    warm: "偏暖",
    cool: "偏冷",
    neutral: "中性",
  },
  brightness: {
    high: "高明度",
    medium: "中等明度",
    "medium-low": "中低明度",
    low: "低明度",
  },
  saturation: {
    high: "高饱和",
    "medium-high": "中高饱和",
    medium: "中等饱和",
    "low-medium": "中低饱和",
    low: "低饱和",
  },
};

const UNDERTONE_EN = {
  warm: "Warm",
  cool: "Cool",
  neutral: "Neutral",
};

const SEASON_FOCUS_EN = {
  bright: "Bright",
  warm: "Warm",
  light: "Light",
  soft: "Soft",
  cool: "Cool",
  deep: "Deep",
};

const SATURATION_EN = {
  high: "Clear",
  "medium-high": "Vivid",
  medium: "Moderate",
  "low-medium": "Soft",
  low: "Muted",
};

const MAKEUP_COLOR_MAP = {
  亮玫瑰: "#d85a8a",
  亮玫红: "#d71972",
  冰粉: "#f2c8dc",
  冰蓝: "#b8d5ea",
  冷棕: "#756366",
  冷正红: "#c91532",
  冷玫瑰: "#b85f7a",
  冷玫红: "#c92f68",
  冷粉: "#d9a9b7",
  冷粉紫: "#c9a7cf",
  冷粉豆沙: "#b98291",
  冷紫: "#6d578f",
  冷紫红: "#9f3c6f",
  大地色: "#9a7a63",
  暖桃粉: "#f4a08d",
  暖棕: "#8b5f3d",
  暖棕红: "#9b4934",
  暖橄榄: "#8a8754",
  暖橘: "#e3854f",
  暖橘红: "#d95d3f",
  暖橙棕: "#a85f35",
  暖裸粉: "#d4a08f",
  暗棕红: "#6f2f2c",
  暗砖红: "#8e3f35",
  杏粉: "#efb8a2",
  柔暖棕: "#a47a5c",
  桃粉: "#ef9ca1",
  樱花粉: "#efb5c7",
  橄榄棕: "#6f7044",
  橄榄绿: "#697443",
  橘粉: "#ed8d75",
  正红: "#c9182b",
  浅桃: "#f4b5a8",
  浅棕: "#ad8a72",
  浅灰棕: "#9d8f8b",
  浅玫瑰: "#d48da1",
  浅珊瑚: "#ef8c82",
  浅砖红: "#b86b5f",
  浅紫灰: "#a99db0",
  浅紫粉: "#d0aacb",
  浅紫红: "#b96f90",
  浅金棕: "#bd9468",
  浆果色: "#8d2f58",
  淡紫灰: "#b8aabd",
  深棕: "#4e3428",
  深橘棕: "#8b5134",
  深玫红: "#8f2e58",
  深砖红: "#7f352c",
  深紫: "#4f326f",
  深蓝: "#24385d",
  深酒红: "#612336",
  灰棕: "#8f817e",
  灰玫瑰: "#bd8f9b",
  灰粉: "#b98b94",
  灰蓝: "#6f8396",
  烟灰: "#8d8a90",
  烟熏棕: "#5b4b45",
  烟熏黑: "#2d2d32",
  玫瑰豆沙: "#a86f78",
  珊瑚橘: "#ee725c",
  珍珠灰: "#c9c7c2",
  砖橘: "#c65d3b",
  砖红: "#a84f3c",
  紫灰: "#8d7f9c",
  蜜桃: "#f0aa88",
  蜜桃粉: "#f2a99b",
  裸棕: "#9d7162",
  裸橘: "#d99065",
  裸粉: "#cfa2a6",
  西瓜红: "#e63d55",
  覆盆子: "#b23362",
  豆沙: "#a77278",
  透明西柚: "#f2a078",
  金棕: "#a86f35",
  铜棕: "#8c5638",
  铜绿: "#4f7666",
  铜金: "#b07938",
  银灰: "#9a9ca3",
  银白: "#e8e8ea",
  香槟: "#d8c1a1",
  香槟金: "#d4b47c",
};

const state = {
  manifest: null,
  seasons: [],
  stream: null,
  originalBlob: null,
  originalUrl: "",
  portraitBlob: null,
  portraitUrl: "",
  portraitMode: "original",
  compareMode: "group",
  compareItems: [],
  currentIndex: 0,
  seasonGroupId: "",
  seasonId: "",
};

const MAX_API_UPLOAD_BYTES = 3.7 * 1024 * 1024;

init();

async function init() {
  try {
    const [manifest, seasonsData] = await Promise.all([
      fetchJson("./color-card-templates/manifest.json"),
      fetchJson("./color_seasons.json"),
    ]);
    state.manifest = manifest;
    state.seasons = seasonsData.seasons || [];
    renderHome();
  } catch (error) {
    renderFatalError("资料加载失败，请检查 color_seasons.json 和色卡模板文件是否存在。");
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  return response.json();
}

function renderHome() {
  stopCamera();
  app.classList.remove("report-shell");
  app.innerHTML = `
    <section class="screen hero">
      <div class="brand-panel home-panel">
        <p class="eyebrow">YOUR SKIN COLOR SEASON TYPE</p>
        <h1>肤色十二季型自测</h1>
        ${rulesMarkup()}
        <div class="actions">
          <button class="primary-btn" data-action="start">点击开始</button>
        </div>
      </div>
    </section>
  `;
  app.querySelector('[data-action="start"]').addEventListener("click", renderCapture);
}

function renderCapture() {
  stopCamera();
  app.classList.remove("report-shell");
  app.innerHTML = `
    <section class="screen">
      ${topbarMarkup("自拍或上传", "home")}
      <div class="brand-panel">
        <h2>拍一张自然光正面照</h2>
        ${rulesMarkup()}
      </div>
      <div class="camera-panel">
        <div class="camera-frame">
          <video class="hidden" playsinline autoplay muted></video>
          <img class="preview-img hidden" alt="自拍预览" />
          <div class="camera-guide" aria-hidden="true"></div>
        </div>
        <div class="camera-body">
          <p class="status" data-status>正在尝试打开摄像头，也可以直接上传照片。</p>
          <input class="file-input" type="file" accept="image/*" data-file />
          <div class="button-row">
            <button class="secondary-btn" data-action="capture" disabled>拍照</button>
            <button class="ghost-btn" data-action="retake" disabled>重拍</button>
          </div>
          <button class="primary-btn" data-action="process" disabled>上传并抠像</button>
        </div>
      </div>
    </section>
  `;

  bindTopbar();
  const video = app.querySelector("video");
  const preview = app.querySelector(".preview-img");
  const fileInput = app.querySelector("[data-file]");
  const captureButton = app.querySelector('[data-action="capture"]');
  const retakeButton = app.querySelector('[data-action="retake"]');
  const processButton = app.querySelector('[data-action="process"]');
  const status = app.querySelector("[data-status]");

  captureButton.addEventListener("click", async () => {
    const blob = await captureVideoFrame(video);
    setOriginalImage(blob, preview);
    video.classList.add("hidden");
    preview.classList.remove("hidden");
    retakeButton.disabled = false;
    processButton.disabled = false;
    setStatus(status, "照片已准备好，可以上传抠像。");
  });

  retakeButton.addEventListener("click", () => {
    revokeOriginal();
    preview.classList.add("hidden");
    if (state.stream) video.classList.remove("hidden");
    retakeButton.disabled = true;
    processButton.disabled = true;
    setStatus(status, "请重新拍照或上传一张照片。");
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    setOriginalImage(file, preview);
    video.classList.add("hidden");
    preview.classList.remove("hidden");
    retakeButton.disabled = false;
    processButton.disabled = false;
    setStatus(status, "照片已准备好，可以上传抠像。");
  });

  processButton.addEventListener("click", () => processPortrait(status, processButton));
  startCamera(video, captureButton, status);
}

async function startCamera(video, captureButton, status) {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus(status, "当前浏览器不能直接调动摄像头，请上传自拍照。");
    return;
  }

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1440 } },
      audio: false,
    });
    video.srcObject = state.stream;
    video.classList.remove("hidden");
    captureButton.disabled = false;
    setStatus(status, "请正视摄像头，让脸部尽量位于中间椭圆区域。");
  } catch {
    setStatus(status, "摄像头暂时不可用，请上传一张自然光自拍照。", true);
  }
}

async function captureVideoFrame(video) {
  const canvas = document.createElement("canvas");
  const width = video.videoWidth || 1080;
  const height = video.videoHeight || 1440;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
}

async function cropTransparentEdges(blob) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 12) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  bitmap.close?.();
  if (maxX < minX || maxY < minY) return blob;

  const paddingX = Math.round((maxX - minX + 1) * 0.035);
  const paddingY = Math.round((maxY - minY + 1) * 0.025);
  const cropX = Math.max(0, minX - paddingX);
  const cropY = Math.max(0, minY - paddingY);
  const cropW = Math.min(width - cropX, maxX - minX + 1 + paddingX * 2);
  const cropH = Math.min(height - cropY, maxY - minY + 1 + paddingY * 2);

  const output = document.createElement("canvas");
  output.width = cropW;
  output.height = cropH;
  output.getContext("2d").drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  return new Promise((resolve) => output.toBlob(resolve, "image/png"));
}

function setOriginalImage(blob, preview) {
  revokeOriginal();
  revokePortrait();
  state.originalBlob = blob;
  state.originalUrl = URL.createObjectURL(blob);
  state.portraitMode = "original";
  preview.src = state.originalUrl;
}

async function processPortrait(status, button) {
  if (!state.originalBlob) return;
  button.disabled = true;
  button.textContent = "正在抠像";
  setStatus(status, "正在调用 remove.bg 自动抠像，请稍等。");

  try {
    const uploadBlob = await prepareUploadImage(state.originalBlob);
    const form = new FormData();
    form.append("image", uploadBlob, "selfie.jpg");
    const response = await fetch("/api/remove-bg", { method: "POST", body: form });
    if (!response.ok) {
      const payload = await safeJson(response);
      throw new Error(payload?.error || "抠像失败");
    }
    const blob = await response.blob();
    const croppedBlob = await cropTransparentEdges(blob);
    revokePortrait();
    state.portraitBlob = croppedBlob;
    state.portraitUrl = URL.createObjectURL(croppedBlob);
    state.portraitMode = "cutout";
    setStatus(status, "抠像完成，进入四大季型对比。");
    renderGroupCompare();
  } catch (error) {
    state.portraitUrl = state.originalUrl;
    state.portraitMode = "original";
    renderFallbackChoice(error.message || "抠像失败，可以重试或先用原图裁切继续。");
  }
}

async function prepareUploadImage(blob) {
  if (blob.size <= MAX_API_UPLOAD_BYTES && blob.type === "image/jpeg") return blob;

  const bitmap = await createImageBitmap(blob);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let quality = 0.86;
  let output = await canvasToJpeg(canvas, quality);
  while (output.size > MAX_API_UPLOAD_BYTES && quality > 0.56) {
    quality -= 0.1;
    output = await canvasToJpeg(canvas, quality);
  }
  return output;
}

function canvasToJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((output) => {
      if (output) resolve(output);
      else reject(new Error("照片压缩失败，请换一张照片重试"));
    }, "image/jpeg", quality);
  });
}

function renderFallbackChoice(message) {
  app.innerHTML = `
    <section class="screen">
      ${topbarMarkup("抠像未完成", "capture")}
      <div class="brand-panel">
        <h2>暂时没有得到透明人像</h2>
        <p class="lead">${escapeHtml(message)}</p>
        <p class="lead">你可以回到上一页重新上传，也可以先用原图椭圆裁切继续对比。</p>
        <div class="actions">
          <button class="primary-btn" data-action="continue">继续用原图裁切</button>
          <button class="ghost-btn" data-action="back">重新上传</button>
        </div>
      </div>
    </section>
  `;
  bindTopbar();
  app.querySelector('[data-action="continue"]').addEventListener("click", renderGroupCompare);
  app.querySelector('[data-action="back"]').addEventListener("click", renderCapture);
}

function renderGroupCompare() {
  stopCamera();
  state.compareMode = "group";
  state.compareItems = GROUP_ORDER.map((id) => state.manifest.four_seasons.find((item) => item.id === id)).filter(Boolean);
  state.currentIndex = 0;
  renderCompareScreen({
    title: "先判断四大季型",
    hint: "左右滑动色卡，观察哪一组颜色下肤色更干净、气色更好、五官更清晰。",
    backTarget: "capture",
    confirmText: "选择这个大季型",
  });
}

function renderSubseasonCompare(selectedSeasonId = "") {
  state.compareMode = "subseason";
  state.compareItems = state.manifest.twelve_seasons.filter((item) => item.group === state.seasonGroupId);
  const selectedIndex = selectedSeasonId
    ? state.compareItems.findIndex((item) => item.id === selectedSeasonId)
    : -1;
  state.currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
  renderCompareScreen({
    title: `细分${GROUP_LABELS[state.seasonGroupId]}`,
    hint: "继续左右滑动三张子季型色卡，选择最衬肤色的一张。",
    backTarget: "group",
    confirmText: "确定这个子季型",
  });
}

function renderCompareScreen({ title, hint, backTarget, confirmText }) {
  const item = state.compareItems[state.currentIndex];
  app.classList.remove("report-shell");
  app.innerHTML = `
    <section class="screen">
      ${topbarMarkup(title, backTarget)}
      <p class="hint">${hint}</p>
      <div class="compare-panel">
        <div class="stage-wrap">
          <div class="stage">
            <div class="portrait-slot">
              <img class="portrait ${state.portraitMode === "cutout" ? "cutout" : ""}" src="${state.portraitUrl || state.originalUrl}" alt="用户自拍" />
            </div>
            <img class="template-img" src="./${item.png}" alt="${escapeHtml(item.title)}色卡" />
          </div>
          <button class="nav-btn prev" aria-label="上一张色卡" data-action="prev">‹</button>
          <button class="nav-btn next" aria-label="下一张色卡" data-action="next">›</button>
        </div>
        <div class="choice-meta">
          <div class="choice-title">${escapeHtml(item.title)}</div>
          <div class="choice-subtitle">${escapeHtml(item.subtitle || "")}</div>
        </div>
      </div>
      <button class="primary-btn" data-action="confirm">${confirmText}</button>
    </section>
  `;
  bindTopbar();
  app.querySelector('[data-action="prev"]').addEventListener("click", () => moveCompare(-1));
  app.querySelector('[data-action="next"]').addEventListener("click", () => moveCompare(1));
  app.querySelector('[data-action="confirm"]').addEventListener("click", confirmCurrentChoice);
}

function moveCompare(direction) {
  const total = state.compareItems.length;
  state.currentIndex = (state.currentIndex + direction + total) % total;
  const config = state.compareMode === "group"
    ? {
        title: "先判断四大季型",
        hint: "左右滑动色卡，观察哪一组颜色下肤色更干净、气色更好、五官更清晰。",
        backTarget: "capture",
        confirmText: "选择这个大季型",
      }
    : {
        title: `细分${GROUP_LABELS[state.seasonGroupId]}`,
        hint: "继续左右滑动三张子季型色卡，选择最衬肤色的一张。",
        backTarget: "group",
        confirmText: "确定这个子季型",
      };
  renderCompareScreen(config);
}

function confirmCurrentChoice() {
  const item = state.compareItems[state.currentIndex];
  if (state.compareMode === "group") {
    state.seasonGroupId = item.id;
    state.seasonId = "";
    recordSelection({ step: "group", seasonGroupId: state.seasonGroupId, cardId: item.id });
    renderSubseasonCompare();
    return;
  }
  state.seasonId = item.id;
  recordSelection({
    step: "subseason",
    seasonGroupId: state.seasonGroupId,
    seasonId: state.seasonId,
    cardId: item.id,
  });
  renderResult();
}

function renderResult() {
  const group = state.manifest.four_seasons.find((item) => item.id === state.seasonGroupId);
  const season = state.manifest.twelve_seasons.find((item) => item.id === state.seasonId);
  const seasonDetail = state.seasons.find((item) => item.id === state.seasonId);
  app.classList.add("report-shell");

  if (!seasonDetail) {
    app.innerHTML = `
      <section class="screen hero">
        <div class="brand-panel">
          <h1>没有找到季型资料</h1>
          <p class="lead">当前选择是 ${escapeHtml(season?.title || state.seasonId)}，但 color_seasons.json 中缺少对应报告内容。</p>
          <div class="actions">
            <button class="primary-btn" data-action="restart">重新测试</button>
          </div>
        </div>
      </section>
    `;
    app.querySelector('[data-action="restart"]').addEventListener("click", resetFlow);
    return;
  }

  app.innerHTML = `
    <section class="screen result-screen">
      ${topbarMarkup("季型报告", "subseason")}
      ${seasonReportMarkup(seasonDetail, group)}
      <div class="actions report-actions">
        <button class="secondary-btn" data-action="save-report">保存至相册</button>
        <button class="primary-btn" data-action="restart">重新测试</button>
      </div>
    </section>
  `;
  console.info("season-test-selection", {
    seasonGroupId: state.seasonGroupId,
    seasonId: state.seasonId,
  });
  app.querySelector('[data-action="restart"]').addEventListener("click", resetFlow);
  app.querySelector('[data-action="save-report"]').addEventListener("click", (event) => {
    saveReportImage(event.currentTarget, seasonDetail, group);
  });
  bindTopbar();
}

function seasonReportMarkup(detail, group) {
  return `
    <article class="season-report" aria-label="${escapeHtml(detail.name)}季型报告">
      <section class="report-masthead">
        <p>YOUR SKIN COLOR SEASON TYPE</p>
        <h1>${escapeHtml(detail.name_en)}</h1>
        <div>
          <span>${escapeHtml(detail.name)}</span>
          <span>${escapeHtml(reportMeta(detail))}</span>
          <span>Personal Report</span>
        </div>
      </section>

      <section class="report-summary">
        <h2>${escapeHtml(summaryTitle(detail))}</h2>
        <p>${escapeHtml(detail.description)}</p>
      </section>

      <section class="report-index">
        <div>
          <small>UNDERTONE</small>
          <strong>${escapeHtml(dimensionLabel("undertone", detail.dimensions.undertone))}</strong>
        </div>
        <div>
          <small>VALUE</small>
          <strong>${escapeHtml(dimensionLabel("brightness", detail.dimensions.brightness))}</strong>
        </div>
        <div>
          <small>CHROMA</small>
          <strong>${escapeHtml(dimensionLabel("saturation", detail.dimensions.saturation))}</strong>
        </div>
      </section>

      <section class="report-columns">
        <div>
          <h2>Color Temperament</h2>
          <p>${escapeHtml(detail.palette_character || detail.description)}</p>
        </div>
        <aside>
          <p>Keywords</p>
          <strong>${escapeHtml(keywordLine(detail))}</strong>
        </aside>
      </section>

      <section class="report-palette">
        <div class="report-title-row">
          <h2>Recommended Palette</h2>
          <span>${detail.colors.best.length} colors</span>
        </div>
        <div class="report-swatch-list">
          ${detail.colors.best.map(colorSwatchMarkup).join("")}
        </div>
      </section>

      <section class="report-color-note">
        <h2>Wearing Notes</h2>
        <p>${escapeHtml(wearingNotes(detail, group))}</p>
      </section>

      <section class="report-makeup">
        <h2>Makeup Notes</h2>
        ${makeupLineMarkup("Base", detail.makeup.foundation, foundationSwatches(detail))}
        ${makeupLineMarkup("Eyes", detail.makeup.eye.join("、"), makeupSwatches(detail.makeup.eye, detail.colors.best))}
        ${makeupLineMarkup("Blush", detail.makeup.blush.join("、"), makeupSwatches(detail.makeup.blush, detail.colors.best))}
        ${makeupLineMarkup("Lips", detail.makeup.lip.join("、"), makeupSwatches(detail.makeup.lip, detail.colors.best))}
      </section>

      <section class="report-evidence">
        <h2>判断依据</h2>
        <ul>
          ${detail.skin_clues.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>

      <section class="report-avoid">
        <h2>Colors To Avoid</h2>
        <div>
          ${detail.colors.avoid.map((color) => `<span style="--c: ${escapeHtml(color.hex)}">${escapeHtml(color.name)}</span>`).join("")}
        </div>
        <p>${escapeHtml(detail.draping_effects?.avoid || "过强、过暗或不符合季型属性的颜色容易削弱整体气色。")}</p>
      </section>

      <section class="report-footer">
        <span>${escapeHtml(detail.name_en)} Rule</span>
        <strong>${escapeHtml(finalRule(detail))}</strong>
      </section>
    </article>
  `;
}

function summaryTitle(detail) {
  const undertone = dimensionLabel("undertone", detail.dimensions.undertone);
  const saturation = dimensionLabel("saturation", detail.dimensions.saturation);
  return `${detail.name}：${undertone}、${saturation}的${GROUP_LABELS[detail.parent] || "季型"}`;
}

function reportMeta(detail) {
  const focus = SEASON_FOCUS_EN[detail.id.split("_")[0]] || detail.name_en.split(" ")[0];
  return [
    UNDERTONE_EN[detail.dimensions.undertone] || detail.dimensions.undertone,
    focus,
    SATURATION_EN[detail.dimensions.saturation] || detail.dimensions.saturation,
  ].join(" / ");
}

function dimensionLabel(type, value) {
  return DIMENSION_LABELS[type]?.[value] || value;
}

function keywordLine(detail) {
  const source = detail.palette_character || detail.description || "";
  const cleaned = source
    .replace(/颜色像.*$/, "")
    .replace(/带一点.*$/, "")
    .replace(/[。；;]/g, "")
    .trim();
  const words = cleaned.split(/[、，,]/).map((word) => word.trim()).filter(Boolean);
  return words.slice(0, 5).join(" / ") || detail.aliases.slice(0, 3).join(" / ");
}

function wearingNotes(detail, group) {
  const best = detail.draping_effects?.best || "";
  const tip = detail.style_tip || "";
  const groupName = group?.title ? `你的大季型属于${group.title}。` : "";
  return [best, tip, groupName].filter(Boolean).join(" ");
}

function colorSwatchMarkup(color) {
  return `
    <div>
      <span style="--c: ${escapeHtml(color.hex)}"></span>
      <b>${escapeHtml(color.name)}</b>
      <em>${escapeHtml(color.hex.toUpperCase())}</em>
    </div>
  `;
}

function makeupLineMarkup(label, text, colors) {
  return `
    <div class="makeup-line">
      <span>${label}</span>
      <div class="makeup-copy">
        <p>${escapeHtml(text)}</p>
        <div class="makeup-swatches" aria-label="${label} 推荐色">
          ${colors.slice(0, 3).map((color) => `<i style="--c: ${escapeHtml(color)}"></i>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function makeupSwatches(names, fallbackColors) {
  const mapped = names.map((name) => MAKEUP_COLOR_MAP[name]).filter(Boolean);
  return ensureThreeColors(mapped, fallbackColors.map((color) => color.hex));
}

function foundationSwatches(detail) {
  const text = detail.makeup.foundation || "";
  if (text.includes("深暖")) return ["#b98963", "#9d6b4a", "#7f563f"];
  if (text.includes("深") && (text.includes("冷") || text.includes("中性"))) return ["#c9a39a", "#a87b7d", "#846066"];
  if (text.includes("暖") || text.includes("黄调")) return ["#f2d6b8", "#e5c29a", "#d3a878"];
  if (text.includes("冷") || text.includes("粉调")) return ["#f2dfdc", "#e8d6d2", "#d8c7c5"];
  return ["#ecd7c6", "#dcc3b7", "#c7aaa0"];
}

function ensureThreeColors(colors, fallbackColors) {
  const result = [...colors];
  for (const color of fallbackColors) {
    if (result.length >= 3) break;
    result.push(color);
  }
  while (result.length < 3) result.push("#d8d2cc");
  return result;
}

function finalRule(detail) {
  if (detail.id.includes("soft")) return "颜色越安静，人越清透。";
  if (detail.id.includes("bright")) return "颜色越清亮，五官越有神。";
  if (detail.id.includes("light")) return "颜色越轻盈，气色越干净。";
  if (detail.id.includes("deep")) return "颜色越有深度，轮廓越稳定。";
  if (detail.id.includes("warm")) return "颜色越温暖，气色越饱满。";
  if (detail.id.includes("cool")) return "颜色越冷净，肤色越清晰。";
  return "让颜色衬托你，而不是抢走你。";
}

async function saveReportImage(button, detail, group) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "正在生成";
  try {
    const blob = await createReportImageBlob(detail, group);
    const filename = `${detail.name}-肤色季型报告.png`;
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({
        files: [file],
        title: `${detail.name}肤色季型报告`,
        text: "我的肤色十二季型自测报告",
      });
    } else {
      downloadBlob(blob, filename);
    }
    button.textContent = "已生成";
    window.setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 1200);
  } catch (error) {
    console.error(error);
    button.textContent = originalText;
    button.disabled = false;
    if (error?.name === "AbortError") return;
    window.alert("报告图片暂时生成失败，请稍后再试。");
  }
}

function createReportImageBlob(detail, group) {
  const svg = reportImageSvg(detail, group);
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 2200;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("empty report image"));
      }, "image/png", 0.95);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("cannot render report image"));
    };
    image.src = url;
  });
}

function reportImageSvg(detail, group) {
  const width = 1080;
  const height = 2200;
  const bestColors = detail.colors.best.slice(0, 12);
  const avoidColors = detail.colors.avoid.slice(0, 4);
  const evidence = detail.skin_clues.slice(0, 3);
  const lines = [];
  let y = 0;

  const addText = (text, x, nextY, size = 36, weight = 500, color = "#25231f") => {
    lines.push(`<text x="${x}" y="${nextY}" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeHtml(text)}</text>`);
    y = nextY;
  };
  const addWrapped = (text, x, nextY, maxChars, size = 30, lineHeight = 46, color = "#5f5a51", weight = 400) => {
    let currentY = nextY;
    for (const line of wrapText(text, maxChars)) {
      addText(line, x, currentY, size, weight, color);
      currentY += lineHeight;
    }
    y = currentY - lineHeight;
    return y;
  };

  addText("肤色十二季型自测报告", 78, 112, 42, 800, "#b35d4a");
  addText(detail.name_en, 78, 198, 76, 800, "#171717");
  addText(`${detail.name} · ${reportMeta(detail)}`, 82, 254, 32, 700, "#716c62");
  addText(group?.title ? `大季型：${group.title}` : `大季型：${GROUP_LABELS[detail.parent] || detail.parent}`, 82, 306, 30, 600, "#716c62");

  const dimensions = [
    ["UNDERTONE", dimensionLabel("undertone", detail.dimensions.undertone)],
    ["VALUE", dimensionLabel("brightness", detail.dimensions.brightness)],
    ["CHROMA", dimensionLabel("saturation", detail.dimensions.saturation)],
  ];
  dimensions.forEach(([label, value], index) => {
    const x = 78 + index * 316;
    lines.push(`<rect x="${x}" y="360" width="276" height="128" rx="24" fill="#fffdf8" stroke="#dfd7cb"/>`);
    addText(label, x + 28, 410, 22, 800, "#b35d4a");
    addText(value, x + 28, 458, 36, 800, "#25231f");
  });

  addText(summaryTitle(detail), 78, 570, 38, 800, "#171717");
  addWrapped(detail.description, 78, 626, 28, 31, 48, "#5f5a51");

  addText("推荐色卡", 78, y + 96, 38, 800, "#171717");
  let swatchY = y + 128;
  bestColors.forEach((color, index) => {
    const x = 88 + (index % 6) * 154;
    const rowY = swatchY + Math.floor(index / 6) * 142;
    lines.push(`<circle cx="${x + 38}" cy="${rowY + 38}" r="38" fill="${escapeHtml(color.hex)}" stroke="#ffffff" stroke-width="8"/>`);
    addText(color.name, x, rowY + 104, 24, 700, "#25231f");
  });
  y = swatchY + 272;

  addText("穿搭提示", 78, y + 80, 38, 800, "#171717");
  addWrapped(wearingNotes(detail, group), 78, y + 136, 29, 30, 46, "#5f5a51");

  addText("判断依据", 78, y + 92, 38, 800, "#171717");
  let evidenceY = y + 146;
  evidence.forEach((item) => {
    lines.push(`<circle cx="92" cy="${evidenceY - 10}" r="6" fill="#b35d4a"/>`);
    evidenceY = addWrapped(item, 118, evidenceY, 29, 28, 42, "#5f5a51") + 52;
  });
  y = evidenceY;

  addText("需要避开的颜色", 78, y + 40, 34, 800, "#171717");
  avoidColors.forEach((color, index) => {
    const x = 78 + index * 236;
    const chipY = y + 76;
    lines.push(`<rect x="${x}" y="${chipY}" width="196" height="68" rx="34" fill="${escapeHtml(color.hex)}"/>`);
    lines.push(`<text x="${x + 98}" y="${chipY + 43}" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle">${escapeHtml(color.name)}</text>`);
  });

  lines.push(`<rect x="78" y="${height - 144}" width="924" height="78" rx="26" fill="#25231f"/>`);
  addText(finalRule(detail), 124, height - 94, 32, 800, "#fffdf8");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#f8f6ef"/>
      <rect x="44" y="44" width="992" height="${height - 88}" rx="42" fill="#fffdf8" stroke="#dfd7cb" stroke-width="3"/>
      <circle cx="932" cy="122" r="84" fill="#f4dfd5"/>
      <circle cx="904" cy="178" r="42" fill="#b35d4a" opacity="0.18"/>
      <g font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" text-anchor="start">
        ${lines.join("\n")}
      </g>
    </svg>
  `;
}

function wrapText(text, maxChars) {
  const source = String(text || "").replace(/\s+/g, " ").trim();
  if (!source) return [];
  const chunks = source.split(/([，。；、,.!?！？])/).reduce((result, part, index, array) => {
    if (!part) return result;
    if (/^[，。；、,.!?！？]$/.test(part) && result.length) {
      result[result.length - 1] += part;
      return result;
    }
    result.push(part);
    return result;
  }, []);
  const lines = [];
  let line = "";
  for (const chunk of chunks) {
    for (const char of chunk) {
      if ((line + char).length > maxChars) {
        lines.push(line);
        line = char;
      } else {
        line += char;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function recordSelection(payload) {
  const selection = {
    ...payload,
    at: new Date().toISOString(),
  };
  window.__seasonTestSelection = selection;
  fetch("/api/selection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(selection),
  }).catch(() => {});
}

function resetFlow() {
  stopCamera();
  revokeOriginal();
  revokePortrait();
  state.compareMode = "group";
  state.compareItems = [];
  state.currentIndex = 0;
  state.seasonGroupId = "";
  state.seasonId = "";
  renderHome();
}

async function startDemoFlow() {
  stopCamera();
  revokeOriginal();
  revokePortrait();
  const blob = await createDemoPortrait();
  state.originalBlob = blob;
  state.originalUrl = URL.createObjectURL(blob);
  state.portraitBlob = blob;
  state.portraitUrl = state.originalUrl;
  state.portraitMode = "cutout";
  renderGroupCompare();
}

function createDemoPortrait() {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 840;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#d8a182";
  ctx.beginPath();
  ctx.ellipse(300, 274, 118, 148, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c48970";
  ctx.fillRect(252, 395, 96, 108);
  ctx.fillStyle = "#2f2623";
  ctx.beginPath();
  ctx.ellipse(300, 185, 132, 95, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#a36d58";
  ctx.beginPath();
  ctx.ellipse(300, 680, 210, 190, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a2c28";
  ctx.beginPath();
  ctx.arc(254, 270, 8, 0, Math.PI * 2);
  ctx.arc(346, 270, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9a5b55";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(300, 328, 34, 0.12, Math.PI - 0.12);
  ctx.stroke();
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function rulesMarkup() {
  return rulesTemplate.innerHTML;
}

function topbarMarkup(title, backTarget) {
  return `
    <div class="topbar">
      <button class="back-btn" aria-label="返回" data-back="${backTarget}">‹</button>
      <h2>${escapeHtml(title)}</h2>
      <span aria-hidden="true"></span>
    </div>
  `;
}

function bindTopbar() {
  const backButton = app.querySelector("[data-back]");
  if (!backButton) return;
  backButton.addEventListener("click", () => {
    const target = backButton.dataset.back;
    if (target === "home") renderHome();
    if (target === "capture") renderCapture();
    if (target === "group") renderGroupCompare();
    if (target === "subseason") renderSubseasonCompare(state.seasonId);
  });
}

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function stopCamera() {
  if (!state.stream) return;
  for (const track of state.stream.getTracks()) track.stop();
  state.stream = null;
}

function revokeOriginal() {
  if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
  state.originalBlob = null;
  state.originalUrl = "";
}

function revokePortrait() {
  if (state.portraitUrl && state.portraitUrl !== state.originalUrl) URL.revokeObjectURL(state.portraitUrl);
  state.portraitBlob = null;
  state.portraitUrl = "";
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderFatalError(message) {
  app.innerHTML = `
    <section class="screen hero">
      <div class="brand-panel">
        <h1>页面暂时不可用</h1>
        <p class="lead">${escapeHtml(message)}</p>
      </div>
    </section>
  `;
}

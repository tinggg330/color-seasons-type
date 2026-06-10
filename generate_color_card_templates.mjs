import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require("sharp");
} catch {
  sharp = require("/Users/tiiing/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
}

const WIDTH = 1080;
const HEIGHT = 1440;
const CX = WIDTH / 2;
const CY = HEIGHT / 2 + 18;
const OUTER_RX = 900;
const OUTER_RY = 1120;
const INNER_RX = 315;
const INNER_RY = 430;
const GAP = 0;

const seasonNames = {
  spring: "春季型",
  summer: "夏季型",
  autumn: "秋季型",
  winter: "冬季型",
};

const data = JSON.parse(fs.readFileSync("color_seasons.json", "utf8"));
const outRoot = "color-card-templates";
const dirs = [
  path.join(outRoot, "12-seasons"),
  path.join(outRoot, "4-seasons"),
];
for (const dir of dirs) fs.mkdirSync(dir, { recursive: true });

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function point(rx, ry, angle) {
  return {
    x: CX + rx * Math.cos(angle),
    y: CY + ry * Math.sin(angle),
  };
}

function segmentPath(start, end) {
  const o1 = point(OUTER_RX, OUTER_RY, start);
  const o2 = point(OUTER_RX, OUTER_RY, end);
  const i2 = point(INNER_RX, INNER_RY, end);
  const i1 = point(INNER_RX, INNER_RY, start);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${OUTER_RX} ${OUTER_RY} 0 ${largeArc} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    `A ${INNER_RX} ${INNER_RY} 0 ${largeArc} 0 ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function uniqueColors(colors) {
  const seen = new Set();
  return colors.filter((color) => {
    const key = `${color.name}-${color.hex}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(a, b, weight = 0.5) {
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);
  return rgbToHex({
    r: c1.r * (1 - weight) + c2.r * weight,
    g: c1.g * (1 - weight) + c2.g * weight,
    b: c1.b * (1 - weight) + c2.b * weight,
  });
}

function selectRepresentativeColors(colors, targetCount) {
  const valid = uniqueColors(colors).filter((color) => /^#[0-9a-f]{6}$/i.test(color.hex));
  if (valid.length > targetCount) {
    return Array.from({ length: targetCount }, (_, index) => valid[Math.floor((index * valid.length) / targetCount)]);
  }
  const output = [...valid];
  let pairIndex = 0;
  while (output.length < targetCount && valid.length > 1) {
    const current = valid[pairIndex % valid.length];
    const next = valid[(pairIndex + 1) % valid.length];
    output.push({
      name: `${current.name}/${next.name}`,
      hex: mixHex(current.hex, next.hex, 0.5),
    });
    pairIndex += 2;
  }
  return output.slice(0, targetCount);
}

function buildSvg({ id, title, subtitle, colors, group, targetCount = 12 }) {
  const ringColors = selectRepresentativeColors(colors, targetCount);
  const segmentCount = ringColors.length;
  const step = (Math.PI * 2) / segmentCount;
  const startOffset = -Math.PI / 2;
  const segments = ringColors
    .map((color, index) => {
      const start = startOffset + index * step + GAP;
      const end = startOffset + (index + 1) * step - GAP;
      return `<path d="${segmentPath(start, end)}" fill="${color.hex}" stroke="#ffffff" stroke-width="5" stroke-linejoin="round"><title>${escapeXml(color.name)}</title></path>`;
    })
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" fill="none">
  <metadata>${escapeXml(JSON.stringify({ id, title, group, generatedFrom: "color_seasons.json" }))}</metadata>
  <g id="color-ring" shape-rendering="geometricPrecision">
    ${segments}
  </g>
  <ellipse cx="${CX}" cy="${CY}" rx="${INNER_RX}" ry="${INNER_RY}" fill="transparent" stroke="rgba(255,255,255,0.94)" stroke-width="14"/>
  <ellipse cx="${CX}" cy="${CY}" rx="${INNER_RX + 14}" ry="${INNER_RY + 14}" fill="transparent" stroke="rgba(30,30,30,0.16)" stroke-width="2"/>
</svg>
`;
}

async function writeTemplate(config, dir) {
  const svg = buildSvg(config);
  const selectedColors = selectRepresentativeColors(config.colors, config.targetCount ?? 12);
  const svgPath = path.join(dir, `${config.id}.svg`);
  const pngPath = path.join(dir, `${config.id}.png`);
  fs.writeFileSync(svgPath, svg);
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
  return {
    id: config.id,
    title: config.title,
    subtitle: config.subtitle,
    group: config.group,
    svg: svgPath,
    png: pngPath,
    colors: selectedColors.map((color) => color.hex),
  };
}

const manifest = {
  size: { width: WIDTH, height: HEIGHT },
  selfie_hole: { shape: "ellipse", cx: CX, cy: CY, rx: INNER_RX, ry: INNER_RY },
  usage: [
    "把用户自然光正面自拍放在模板下层。",
    "模板本身透明，中间椭圆区域透明镂空，外圈色块覆盖在自拍外侧。",
    "先使用 4-seasons 判断春夏秋冬，再用对应大季型下的 3 张 12-seasons 模板判断子季型。",
  ],
  four_seasons: [],
  twelve_seasons: [],
};

for (const season of data.seasons) {
  manifest.twelve_seasons.push(
    await writeTemplate(
      {
        id: season.id,
        title: season.name,
        subtitle: season.aliases?.slice(0, 2).join(" / ") || season.name_en,
        group: season.parent,
        colors: season.colors.best,
        targetCount: 12,
      },
      path.join(outRoot, "12-seasons"),
    ),
  );
}

for (const parent of ["spring", "summer", "autumn", "winter"]) {
  const children = data.seasons.filter((season) => season.parent === parent);
  manifest.four_seasons.push(
    await writeTemplate(
      {
        id: parent,
        title: seasonNames[parent],
        subtitle: children.map((season) => season.name).join(" / "),
        group: parent,
        colors: children.flatMap((season) => season.colors.best),
        targetCount: 16,
      },
      path.join(outRoot, "4-seasons"),
    ),
  );
}

const previewCards = [...manifest.four_seasons, ...manifest.twelve_seasons]
  .map((item) => `<figure><img src="${item.png.replaceAll("\\", "/").replace(`${outRoot}/`, "")}" alt="${escapeXml(item.title)}"/><figcaption>${escapeXml(item.title)}</figcaption></figure>`)
  .join("\n");

fs.writeFileSync(
  path.join(outRoot, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);

fs.writeFileSync(
  path.join(outRoot, "preview.html"),
  `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>肤色季型色卡模板预览</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; background: #f4f4f1; color: #252525; }
    main { max-width: 1180px; margin: 0 auto; padding: 32px 20px 56px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p { margin: 0 0 28px; color: #686861; }
    section { margin-top: 34px; }
    h2 { font-size: 20px; margin: 0 0 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 18px; }
    figure { margin: 0; padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 8px; }
    img { width: 100%; display: block; aspect-ratio: 3 / 4; object-fit: contain; background: repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 50% / 24px 24px; border-radius: 6px; }
    figcaption { margin-top: 8px; text-align: center; font-weight: 600; }
  </style>
</head>
<body>
  <main>
    <h1>肤色季型色卡模板预览</h1>
    <p>透明背景，中间椭圆为自拍照露出区域。正式使用时把用户照片放在模板下层。</p>
    <section><h2>四大季型</h2><div class="grid">${manifest.four_seasons
      .map((item) => `<figure><img src="${item.png.replaceAll("\\", "/").replace(`${outRoot}/`, "")}" alt="${escapeXml(item.title)}"/><figcaption>${escapeXml(item.title)}</figcaption></figure>`)
      .join("\n")}</div></section>
    <section><h2>十二子季型</h2><div class="grid">${manifest.twelve_seasons
      .map((item) => `<figure><img src="${item.png.replaceAll("\\", "/").replace(`${outRoot}/`, "")}" alt="${escapeXml(item.title)}"/><figcaption>${escapeXml(item.title)}</figcaption></figure>`)
      .join("\n")}</div></section>
  </main>
</body>
</html>
`,
);

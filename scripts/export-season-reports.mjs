import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "exports", "12-season-reports");
const appSource = fs.readFileSync(path.join(root, "assets", "app.js"), "utf8");
const seasonData = JSON.parse(fs.readFileSync(path.join(root, "color_seasons.json"), "utf8"));

const context = {
  console,
  document: { querySelector: () => null },
};
context.globalThis = context;

vm.runInNewContext(
  `${appSource.replace("init();", "")}\nglobalThis.__reportImageSvg = reportImageSvg;`,
  context,
);

fs.mkdirSync(outputDir, { recursive: true });

seasonData.seasons.forEach((season, index) => {
  const svg = context.__reportImageSvg(season, {
    title: `${parentLabel(season.parent)}季型`,
  });
  const number = String(index + 1).padStart(2, "0");
  const baseName = `${number}-${season.name}-${season.name_en.replaceAll(" ", "-")}`;
  const outputSvg = path.join(outputDir, `${baseName}.svg`);

  fs.writeFileSync(outputSvg, svg, "utf8");
  console.log(path.relative(root, outputSvg));
});

function parentLabel(parent) {
  return {
    spring: "春",
    summer: "夏",
    autumn: "秋",
    winter: "冬",
  }[parent] || "";
}

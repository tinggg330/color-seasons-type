import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, "dist");

const staticEntries = [
  "index.html",
  "assets",
  "styles.css",
  "color_seasons.json",
  "color-card-templates",
  "soft_summer_report_demos.html",
  "soft_summer_report_demos.css",
];

fs.mkdirSync(output, { recursive: true });

for (const entry of staticEntries) {
  const source = path.join(root, entry);
  const target = path.join(output, entry);
  if (!fs.existsSync(source)) continue;
  fs.cpSync(source, target, { recursive: true });
}

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { PNG } from "pngjs";

const root = new URL("../", import.meta.url);
const path = (relative) => new URL(relative, root);
await rm(path("dist"), { recursive: true, force: true });
await mkdir(path("dist/icons"), { recursive: true });
await mkdir(path("dist/icons/models"), { recursive: true });
await mkdir(path("src/assets/icons"), { recursive: true });

const scriptEntries = {
  "service-worker": "src/background/service-worker.ts",
  popup: "src/popup/main.ts",
  options: "src/options/main.ts",
  "content-doubao": "src/content/doubao.ts",
  "content-qwen": "src/content/qwen.ts",
  "content-deepseek": "src/content/deepseek.ts",
  "content-kimi": "src/content/kimi.ts",
  "content-glm": "src/content/glm.ts",
  "content-wenxin": "src/content/wenxin.ts",
  "content-chatgpt": "src/content/chatgpt.ts"
};
await Promise.all(Object.entries(scriptEntries).map(([name, entry]) =>
  build({
    entryPoints: [path(entry).pathname],
    outfile: path(`dist/${name}.js`).pathname,
    bundle: true,
    minify: true,
    sourcemap: false,
    target: "chrome120",
    format: name === "service-worker" ? "esm" : "iife",
    platform: "browser",
    legalComments: "none"
  })
));
await Promise.all([
  build({ entryPoints: [path("src/popup/style.css").pathname], outfile: path("dist/popup.css").pathname, bundle: true, minify: true }),
  build({ entryPoints: [path("src/options/style.css").pathname], outfile: path("dist/options.css").pathname, bundle: true, minify: true })
]);
await Promise.all([
  cp(path("manifest.json"), path("dist/manifest.json")),
  cp(path("src/popup/index.html"), path("dist/popup.html")),
  cp(path("src/options/index.html"), path("dist/options.html")),
  cp(path("src/assets/models"), path("dist/icons/models"), { recursive: true })
]);

const masterIcon = PNG.sync.read(await readFile(path("src/assets/modelany-icon-master.png")));

const resizeIcon = (size) => {
  const png = new PNG({ width: size, height: size, colorType: 6 });
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.floor(x * masterIcon.width / size);
      const sourceY = Math.floor(y * masterIcon.height / size);
      const sourceIndex = (sourceY * masterIcon.width + sourceX) * 4;
      const targetIndex = (y * size + x) * 4;
      const red = masterIcon.data[sourceIndex];
      const green = masterIcon.data[sourceIndex + 1];
      const blue = masterIcon.data[sourceIndex + 2];
      const isBlueBackground = blue > red + 80 && blue > green + 60;
      png.data[targetIndex] = isBlueBackground ? 25 : red;
      png.data[targetIndex + 1] = isBlueBackground ? 131 : green;
      png.data[targetIndex + 2] = isBlueBackground ? 255 : blue;
      png.data[targetIndex + 3] = masterIcon.data[sourceIndex + 3];
    }
  }
  return PNG.sync.write(png);
};
for (const size of [16, 32, 48, 128]) {
  const icon = resizeIcon(size);
  await writeFile(path(`src/assets/icons/icon${size}.png`), icon);
  await writeFile(path(`dist/icons/icon${size}.png`), icon);
}

const manifest = JSON.parse(await readFile(path("dist/manifest.json"), "utf8"));
if (manifest.manifest_version !== 3) throw new Error("Only Manifest V3 builds are supported");

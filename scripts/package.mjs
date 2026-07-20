import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, rm } from "node:fs/promises";

const exec = promisify(execFile);
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const root = new URL("../", import.meta.url);
const output = `modelany-${packageJson.version}.zip`;

await rm(new URL(output, root), { force: true });
await exec("zip", ["-qr", new URL(output, root).pathname, "."], {
  cwd: new URL("dist/", root).pathname
});

console.log(`Created ${output} from dist/`);

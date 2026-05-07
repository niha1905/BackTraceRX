import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootConfigPath = resolve(rootDir, "wrangler.jsonc");
const outputConfigPath = resolve(rootDir, "dist/client/wrangler.json");

const rootConfig = JSON.parse(readFileSync(rootConfigPath, "utf8"));
const pagesConfig = {
  name: rootConfig.name,
  compatibility_date: rootConfig.compatibility_date,
  compatibility_flags: rootConfig.compatibility_flags,
  pages_build_output_dir: ".",
};

mkdirSync(dirname(outputConfigPath), { recursive: true });
writeFileSync(outputConfigPath, `${JSON.stringify(pagesConfig, null, 2)}\n`);

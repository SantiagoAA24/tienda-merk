import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const tokensPath = path.resolve(
  webRoot,
  "../../docs/design/design-system/tokens.json",
);
const outPath = path.resolve(webRoot, "src/styles/tokens.css");

const FONT_IMPORT =
  "@import url(\"https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@500;600;700;800&display=swap\");";

/**
 * @param {string} name
 * @param {string} value
 */
function cssVar(name, value) {
  return `  --${name}: ${value};`;
}

async function main() {
  const raw = await readFile(tokensPath, "utf8");
  const tokens = JSON.parse(raw);
  /** @type {string[]} */
  const lines = [];

  for (const token of tokens.color.tokens) {
    lines.push(cssVar(token.name, token.value.light));
  }

  for (const token of tokens.spacing.tokens) {
    lines.push(cssVar(token.name, token.value));
  }

  for (const token of tokens.radius.tokens) {
    lines.push(cssVar(token.name, token.value));
  }

  for (const token of tokens.shadow.tokens) {
    lines.push(cssVar(token.name, token.value));
  }

  for (const token of tokens.size.tokens) {
    lines.push(cssVar(token.name, token.value));
  }

  lines.push(cssVar("font-display", tokens.type.families.display));
  lines.push(cssVar("font-sans", tokens.type.families.sans));

  const css = [
    "/* Generated from docs/design/design-system/tokens.json — do not edit. */",
    FONT_IMPORT,
    "",
    ":root {",
    ...lines,
    "}",
    "",
  ].join("\n");

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, css, "utf8");
  console.log(`Wrote ${path.relative(webRoot, outPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

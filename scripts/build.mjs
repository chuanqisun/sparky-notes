import esbuild from "esbuild";
import fs from "fs/promises";

async function main() {
  const buildOut = await esbuild.build({
    entryPoints: ["src/ui/main.ts"],
    bundle: true,
    format: "esm",
    sourcemap: "inline", // TODO perf?
    watch: false, // TODO
    minify: false, // TODO
    write: false,
  });

  const jsString = buildOut.outputFiles[0].text;

  const templateHmlt = await fs.readFile("src/ui/ui.html", "utf-8");
  const resultHtml = templateHmlt.replace(
    "<!-- BUILD_OUTPUT -->",
    `<script type="module">${jsString}</script>`
  );
  await fs.mkdir("dist", { recursive: true });
  await fs.writeFile("dist/ui.html", resultHtml);
}
main();

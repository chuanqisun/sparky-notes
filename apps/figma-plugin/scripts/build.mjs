import dotenv from "dotenv";
import esbuild from "esbuild";
import path from "path";

const isDev = process.argv.includes("--dev");
const envName = isDev ? ".env" : ".env.production";
dotenv.config({ path: path.join(process.cwd(), envName) });

async function main() {
  await esbuild.build({
    entryPoints: ["src/main.tsx"],
    bundle: true,
    format: "esm",
    sourcemap: "inline", // TODO perf?
    watch: false, // TODO
    minify: false, // TODO
    define: {
      "process.env.WEB_URL": `"${process.env.WEB_URL}"`,
    },
    watch: isDev
      ? {
          onRebuild(error) {
            if (error) {
              console.error(error);
            } else {
              console.log("rebuilt main");
            }
          },
        }
      : false,
    outdir: "dist",
  });
}

main();

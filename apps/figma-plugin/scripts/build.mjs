import dotenv from "dotenv";
import esbuild from "esbuild";
import path from "path";

const isDev = process.argv.includes("--dev");
const envName = isDev ? ".env" : ".env.production";
dotenv.config({ path: path.join(process.cwd(), envName) });

async function main() {
  const plugins = [
    {
      name: "rebuild-plugin",
      setup(build) {
        let count = 0;
        build.onEnd((_result) => {
          if (count++ === 0) console.log("Build success");
          else console.log("Incremental build success");
        });
      },
    },
  ];

  const context = await esbuild.context({
    entryPoints: ["src/main.tsx"],
    bundle: true,
    format: "esm",
    target: "es6", // Figma sandbox seems to miss some ESNext language features
    sourcemap: "inline", // TODO perf?
    minify: false, // TODO
    loader: {
      ".svg": "text",
    },
    define: {
      "process.env.WEB_URL": `"${process.env.WEB_URL}"`,
    },
    outdir: "dist",
    plugins,
  });

  if (isDev) {
    console.log("watching...");
    await context.watch();
  }

  await context.dispose();
}

main();

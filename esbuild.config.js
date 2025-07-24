const esbuild = require("esbuild");

// Build configuration
esbuild
  .build({
    entryPoints: ["out/index.js"], // Change this to your main entry file
    outdir: "build",
    bundle: true,
    minify: true,
    platform: "node",
    target: "node18", // Adjust for your Node.js version
    format: "cjs", // Keep it as CommonJS
    sourcemap: true,
    logLevel: "info",
    external: ["better-sqlite3", "ffmpeg-static"], // Avoid bundling native modules
    loader: {
      ".json": "json", // Support for JSON imports
    },
  })
  .catch(() => {
    console.error("Build failed.\n" + e);
    process.exit(1);
  });

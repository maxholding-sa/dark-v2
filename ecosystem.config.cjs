/** PM2 process config — used on the VPS after deploy. */
const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        let key = line.slice(0, i).trim();
        let value = line.slice(i + 1).trim();
        if (
          key === "NEXT_PUBLIC_SUPABASE_ANON_KEY" ||
          key === "SUPABASE_SERVICE_ROLE_KEY"
        ) {
          value = value.replace(/\s+/g, "");
        }
        return [key, value];
      })
      .filter(([key]) => key)
  );
}

const appDir = __dirname;
const fileEnv = loadEnvFile(path.join(appDir, ".env"));

module.exports = {
  apps: [
    {
      name: "max-motors",
      cwd: appDir,
      script: "npm",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NODE_OPTIONS: "--dns-result-order=ipv4first",
        ...fileEnv,
      },
    },
  ],
};


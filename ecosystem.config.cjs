/** PM2 process config — used on the VPS after deploy. */
module.exports = {
  apps: [
    {
      name: "max-motors",
      cwd: __dirname,
      script: "npm",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};

import { bootstrapApp } from "./app.js";

const app = bootstrapApp();
app.start();

const shutdown = () => {
  app.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

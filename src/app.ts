import express from "express";
import { envs } from "./config/envs";
import { GitHubController } from "./presentation/github/controller";

(() => {
  main();
})();

function main() {
  console.log("Starting the application...");
  const app = express();
  const controller = new GitHubController();

  app.use(express.json());

  app.post("/api/github", controller.webhookHandler);
  app.listen(envs.PORT, () => {
    console.log(`Server is running on port ${envs.PORT}`);
  });
}

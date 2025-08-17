import express from "express";
import { envs } from "./config/envs";
import { GitHubController } from "./presentation/github/controller";
import { GitHubSha256Middleware } from "./presentation/middlewares/github-sha256.middleware";

(() => {
  main();
})();

function main() {
  console.log("Starting the application...");
  const app = express();
  const controller = new GitHubController();

  app.use(express.json());
  app.use( GitHubSha256Middleware.verifyGithubSignature);

  app.post("/api/github", controller.webhookHandler);
  app.listen(envs.PORT, () => {
    console.log(`Server is running on port ${envs.PORT}`);
  });
}

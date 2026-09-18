import { envs } from "./config/envs";
import { AppRoutes } from "./routes";
import { Server } from "./server";

(async () => {
  main();
})();

function main() {
  const server = new Server({
    port: envs.PORT,
    routes: AppRoutes.routes,
    publicPath: envs.PUBLIC_PATH,
    corsOrigin: envs.CORS_ORIGIN,
  });

  server.start();
}

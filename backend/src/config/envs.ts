import "dotenv/config";
import { get } from "env-var";

export const envs = {
  PORT: get("PORT").required().asPortNumber(),
  POSTGRES_URL: get("POSTGRES_URL").default("public").asString(),
};

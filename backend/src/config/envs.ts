import "dotenv/config";
import { get } from "env-var";

export const envs = {
  PORT: get("PORT").required().asPortNumber(),
  PUBLIC_PATH: get("PUBLIC_PATH").default("public").asString(),
  POSTGRES_URL: get("POSTGRES_URL").required().asString(),
  BASE_URL: get("BASE_URL").required().asString(),
  IP_HASH_SALT: get("IP_HASH_SALT").default("bjurl").asString(),
  TRUST_CF_IPCOUNTRY: get("TRUST_CF_IPCOUNTRY").default("false").asBool(),
};

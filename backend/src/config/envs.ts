import "dotenv/config";
import { get } from "env-var";

const PLACEHOLDER_IP_HASH_SALTS = ["change_me", "bjurl", "REPLACE_WITH_RANDOM_SECRET"];

const ipHashSalt = get("IP_HASH_SALT").required().asString();

if (PLACEHOLDER_IP_HASH_SALTS.includes(ipHashSalt)) {
  throw new Error(
    '"IP_HASH_SALT" must be a random secret, not a known placeholder value',
  );
}

export const envs = {
  PORT: get("PORT").required().asPortNumber(),
  PUBLIC_PATH: get("PUBLIC_PATH").default("public").asString(),
  POSTGRES_URL: get("POSTGRES_URL").required().asString(),
  BASE_URL: get("BASE_URL").required().asString(),
  IP_HASH_SALT: ipHashSalt,
  TRUST_CF_IPCOUNTRY: get("TRUST_CF_IPCOUNTRY").default("false").asBool(),
};

import { randomUUID } from "expo-crypto";

import { betterAuthClient } from "@/auth/better-auth-client";
import { mobileBuild } from "@/config/mobile-build";

import { MobileArenaGateway } from "./mobile-arena-gateway";

export const mobileArenaGateway = new MobileArenaGateway({
  allowPrivateDevelopmentHttp: mobileBuild.environment === "development",
  apiOrigin: mobileBuild.apiOrigin,
  fetcher: fetch,
  getAuthCookie: betterAuthClient.getCookie,
  randomUUID,
});

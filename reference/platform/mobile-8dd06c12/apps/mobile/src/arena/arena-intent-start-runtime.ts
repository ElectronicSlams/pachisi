import { pendingIdentityIntentRepository } from "@/auth/pending-identity-intent-runtime";

import { ArenaIntentStartCoordinator } from "./arena-intent-start";
import { mobileArenaGateway } from "./mobile-arena-gateway-runtime";

export const arenaIntentStartCoordinator = new ArenaIntentStartCoordinator(
  pendingIdentityIntentRepository,
  mobileArenaGateway,
);

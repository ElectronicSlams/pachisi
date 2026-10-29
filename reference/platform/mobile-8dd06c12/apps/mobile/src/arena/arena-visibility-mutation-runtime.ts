import { ArenaVisibilityMutationCoordinator } from "./arena-visibility-mutation";
import { mobileArenaGateway } from "./mobile-arena-gateway-runtime";

export const arenaVisibilityMutationCoordinator = new ArenaVisibilityMutationCoordinator(
  mobileArenaGateway,
);

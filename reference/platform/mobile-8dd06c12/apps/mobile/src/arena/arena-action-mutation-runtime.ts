import { ArenaActionMutationCoordinator } from "./arena-action-mutation";
import { mobileArenaGateway } from "./mobile-arena-gateway-runtime";

export const arenaActionMutationCoordinator = new ArenaActionMutationCoordinator(
  mobileArenaGateway,
);

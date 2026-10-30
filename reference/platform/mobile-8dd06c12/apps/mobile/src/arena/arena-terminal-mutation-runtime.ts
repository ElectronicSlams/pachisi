import { ArenaTerminalMutationCoordinator } from "./arena-terminal-mutation";
import { mobileArenaGateway } from "./mobile-arena-gateway-runtime";

export const arenaTerminalMutationCoordinator = new ArenaTerminalMutationCoordinator(
  mobileArenaGateway,
);

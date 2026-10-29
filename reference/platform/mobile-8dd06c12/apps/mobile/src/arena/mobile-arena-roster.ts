import { useQuery } from "@tanstack/react-query";

import { mobileQueryKeys, publicQueryPersistence } from "@/data/query-policy";
import { mobileSocialGateway } from "@/social/mobile-social-gateway-runtime";
import { requireSocialData } from "@/social/mobile-social-result";

export const MOBILE_ARENA_ROSTER_QUERY_KEY = mobileQueryKeys.arenaDiscovery("model-roster");

export function mobileArenaRosterQueryOptions() {
  return {
    meta: publicQueryPersistence("arena-discovery"),
    queryKey: MOBILE_ARENA_ROSTER_QUERY_KEY,
    queryFn: loadMobileArenaRoster,
    retry: 0,
    staleTime: 60_000,
  } as const;
}

export function useMobileArenaRoster() {
  return useQuery(mobileArenaRosterQueryOptions());
}

async function loadMobileArenaRoster() {
  return requireSocialData(await mobileSocialGateway.arenaModelFacts());
}

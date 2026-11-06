import type { MatchVisibility } from "@eslams/core-types";
import { useQuery } from "@tanstack/react-query";

import { useMobileAuth } from "@/auth/mobile-auth-context";
import { mobileSocialGateway } from "@/social/mobile-social-gateway-runtime";
import { requireSocialData } from "@/social/mobile-social-result";
import { mobilePrivacyQueryKey } from "@/social/mobile-social-query-keys";

import { mobileArenaDefaultVisibility } from "./mobile-arena-default-visibility";

export function useMobileArenaDefaultVisibility(): MatchVisibility {
  const auth = useMobileAuth();
  const query = useQuery({
    enabled: Boolean(auth.sessionUserId),
    queryKey: mobilePrivacyQueryKey(auth.sessionUserId ?? "signed-out"),
    queryFn: async () => requireSocialData(await mobileSocialGateway.privacy()),
    staleTime: 30_000,
  });
  return mobileArenaDefaultVisibility(query.data?.defaultMatchVisibility);
}

/** Presentation contract only. Hosts resolve catalogue records and asset URLs. */
export type ModelIdentity = {
  readonly id: string;
  readonly name: string;
  readonly providerSlug: string;
  readonly providerName: string;
  readonly markUrl: string | null;
};

import type { ReactNode } from "react";
/** Content-only boundary; app/(public)/layout.tsx exclusively owns public chrome and session state. */
export function PageContent({ children }: { readonly children: ReactNode }) {
  return <>{children}</>;
}

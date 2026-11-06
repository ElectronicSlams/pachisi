import { Inter_400Regular } from "@expo-google-fonts/inter";
import { useTypeface, type SkTypeface } from "@shopify/react-native-skia";
import { createContext, type PropsWithChildren, useContext } from "react";

const MobileBoardTypefaceContext = createContext<SkTypeface | null>(null);

export function MobileBoardTypefaceProvider({ children }: PropsWithChildren) {
  const typeface = useTypeface(Inter_400Regular);
  return (
    <MobileBoardTypefaceContext.Provider value={typeface}>
      {children}
    </MobileBoardTypefaceContext.Provider>
  );
}

export function useMobileBoardTypeface(): SkTypeface | null {
  return useContext(MobileBoardTypefaceContext);
}

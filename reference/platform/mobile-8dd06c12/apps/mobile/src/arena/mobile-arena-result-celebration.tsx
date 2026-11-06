import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

export type ResultConfettiParticle = Readonly<{
  colorIndex: number;
  delayMs: number;
  rotation: number;
  size: number;
  startX: number;
  velocityX: number;
  velocityY: number;
}>;

const PARTICLES = Object.freeze(Array.from({ length: 24 }, (_, index): ResultConfettiParticle => {
  const lane = index % 8;
  const row = Math.floor(index / 8);
  return Object.freeze({
    colorIndex: index % 4,
    delayMs: row * 55 + (lane % 3) * 20,
    rotation: (index % 2 === 0 ? 1 : -1) * (150 + index * 13),
    size: 5 + (index % 3) * 2,
    startX: 8 + lane * 12,
    velocityX: (lane - 3.5) * (14 + row * 2),
    velocityY: -86 - (index % 5) * 11,
  });
}));

export function MobileArenaResultCelebration({
  colors,
  reducedMotion,
}: Readonly<{
  colors: readonly [string, string, string, string];
  reducedMotion: boolean;
}>) {
  if (reducedMotion) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[styles.sweep, { backgroundColor: colors[0] }]}
      />
    );
  }
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.confetti}
    >
      {PARTICLES.map((particle) => (
        <ConfettiParticle
          color={colors[particle.colorIndex] ?? colors[0]}
          key={`${particle.startX}:${particle.delayMs}`}
          particle={particle}
        />
      ))}
    </View>
  );
}

function ConfettiParticle({ color, particle }: Readonly<{
  color: string;
  particle: ResultConfettiParticle;
}>) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      particle.delayMs,
      withTiming(1, { duration: 1_500 - particle.delayMs, easing: Easing.out(Easing.cubic) }),
    );
  }, [particle.delayMs, progress]);
  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.72, 1], [0, 1, 0]),
      transform: [
        { translateX: particle.velocityX * p },
        { translateY: particle.velocityY * p + 150 * p * p },
        { rotate: `${particle.rotation * p}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: color,
          height: particle.size * 1.45,
          left: `${particle.startX}%`,
          width: particle.size,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  confetti: {
    height: 210,
    left: 0,
    overflow: "visible",
    position: "absolute",
    right: 0,
    top: -46,
    zIndex: 4,
  },
  particle: { borderRadius: 2, position: "absolute", top: 92 },
  sweep: { height: 3, left: 0, opacity: 0.7, position: "absolute", right: 0, top: 0 },
});

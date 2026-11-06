import { useTheme } from '@/contexts/ThemeContext';
import variables from '@kinsa/cribbage-board-app-tokens';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface CribbageBoardProps {
  player1Points: number;
  player2Points: number;
}

function createStyles(rotation: string) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      marginTop: 10,
    },
    boardContainer: {
      alignItems: 'center',
      marginBottom: 20,
      transform: [{ rotate: rotation }],
    },
    svg: {
      // Scale up for better visibility
      transform: [{ scale: 2.5 }],
    },
  });
}

export default function CribbageBoard({ player1Points, player2Points }: CribbageBoardProps) {
  const { colorScheme } = useTheme();
  const windowDimensions = useWindowDimensions();

  let width = 30;
  let rotation = '15deg';
  if (windowDimensions.width >= 500) {
    if (windowDimensions.width < windowDimensions.height) {
      // Portrait orientation on larger devices (like iPads)
      width = 60;
    } else {
      // Landscape orientation on larger devices
      rotation = '55deg';
      width = 50;
    }
  }

  if (windowDimensions.width > 1360 && windowDimensions.height > 1020) {
    // 13-inch iPads in Landscape
    width = 64;
  }

  const styles = createStyles(rotation);

  const aspectRatio = 388 / 56; // height/width
  const height = width * aspectRatio;
  // outside track
  const player1TrackPath =
    'M1 381V26C1 12.1929 12.1929 1 26 1V1C39.8071 1 51 12.1565 51 25.9637C51 132.082 51 313.33 51 366.149C51 374.433 44.2843 381 36 381V381C27.7157 381 21 374.37 21 366.085C21 312.132 21 125.111 21 26.5';
  // inside track
  const player2TrackPath =
    'M11 381V26C11 17.7157 17.7157 11 26 11V11C34.2843 11 41 17.6297 41 25.914C41 131.362 41 332.447 41 366.151C41 368.912 38.7614 371 36 371V371C33.2386 371 31 368.883 31 366.122C31 331.91 31 126.43 31 27';

  // Original scale factors (these complete the paths at 120 points)
  const dashLength = 1440;
  const player2Scale = 9.13;
  const player1FirstCurveScale = 9.85;
  const firstCurvePointsAtStart = 40;
  const firstCurvePointsAtEnd = 44;
  const player1SecondCurveScale = 9.89;
  const secondCurvePointsAtStart = 81;
  const secondCurvePointsAtEnd = 83;

  // Calculate the adjusted progress for each player
  const calculateProgress = (points: number, isPlayer1: boolean): number => {
    if (points <= 0) return 0;

    if (!isPlayer1 || points < firstCurvePointsAtStart) {
      return points * player2Scale;
    } else if (points <= firstCurvePointsAtEnd) {
      if (points === 40) {
        return points * (9.13 + 0.18);
      } else if (points === 41) {
        return points * (9.13 + 0.18 + 0.18);
      } else if (points === 42) {
        return points * (9.13 + 0.18 + 0.18 + 0.18);
      }
      return points * player1FirstCurveScale;
    } else if (points <= secondCurvePointsAtStart) {
      return (
        (points - firstCurvePointsAtEnd) * player2Scale +
        firstCurvePointsAtEnd * player1FirstCurveScale
      );
    } else if (points <= secondCurvePointsAtEnd) {
      if (points === 82) {
        return points * 9.73;
      }
      return points * player1SecondCurveScale;
    } else {
      return (
        (points - secondCurvePointsAtEnd) * player2Scale +
        secondCurvePointsAtEnd * player1SecondCurveScale
      );
    }
  };

  // Calculate progress for each player
  const player1Progress = calculateProgress(player1Points, true);
  const player2Progress = calculateProgress(player2Points, false);

  // @ts-ignore
  return (
    <View style={styles.container}>
      <View style={styles.boardContainer}>
        <Svg
          width={width}
          height={height}
          viewBox="-2 -2 56 386"
          preserveAspectRatio="xMidYMid meet"
          style={styles.svg}>
          {/* Background tracks (dark grey) */}
          <Path
            d={player1TrackPath}
            stroke={variables[colorScheme].surface.boardTrack}
            strokeWidth="1"
            fill="none"
          />
          <Path
            d={player2TrackPath}
            stroke={variables[colorScheme].surface.boardTrack}
            strokeWidth="1"
            fill="none"
          />

          {/* Progress tracks (colored) */}
          {player1Progress > 0 && (
            <Path
              d={player1TrackPath}
              stroke={variables[colorScheme].surface.player1}
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${player1Progress} ${dashLength}`}
              strokeDashoffset="0"
            />
          )}
          {player2Progress > 0 && (
            <Path
              d={player2TrackPath}
              stroke={variables[colorScheme].surface.player2}
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${player2Progress} ${dashLength}`}
              strokeDashoffset="0"
            />
          )}
        </Svg>
      </View>
    </View>
  );
}

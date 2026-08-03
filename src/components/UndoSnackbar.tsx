import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useApp, useTheme } from '../context/AppContext';
import {
  darkColors,
  font,
  indicium,
  lift,
  lightColors,
  motion,
  onColor,
  radius,
  scale,
  spacing,
  ThemeColors,
} from '../theme';
import { useReducedMotion, useThemedStyles } from './ui';

const DISMISS_AFTER_MS = 5000;

/**
 * The return-to-sender slip: an inverted plane that arrives along its flap and
 * offers the entry back for five seconds.
 */
export function UndoSnackbar() {
  const { undoAction, undo, dismissUndo } = useApp();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reduced = useReducedMotion();
  const driver = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!undoAction) return;
    if (reduced) {
      driver.setValue(1);
    } else {
      driver.setValue(0);
      Animated.timing(driver, {
        toValue: 1,
        duration: motion.flap,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }).start();
    }
    const timer = setTimeout(dismissUndo, DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [undoAction, dismissUndo, driver, reduced]);

  if (!undoAction) return null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        lift(3, colors),
        {
          opacity: driver,
          transform: [
            {
              translateY: driver.interpolate({
                inputRange: [0, 1],
                outputRange: [scale(16), 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        style={styles.bar}
        onPress={undo}
        accessibilityRole="button"
        accessibilityLabel={`${undoAction.label}. Tap to undo.`}
      >
        <Text style={styles.text} numberOfLines={1}>
          {undoAction.label}
        </Text>
        <Text
          style={[
            styles.action,
            // Each theme's primary is tuned to read on its own ground, so the
            // inverted slip borrows the other one. Using this theme's primary
            // here put airmail blue on near-black at about 2:1.
            { color: isDark ? lightColors.primary : darkColors.primary },
          ]}
        >
          UNDO
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: spacing.l,
      right: spacing.l,
      bottom: scale(88),
      borderRadius: radius.m,
      backgroundColor: colors.text,
    },
    bar: {
      paddingVertical: spacing.m,
      paddingHorizontal: spacing.l,
      minHeight: scale(48),
      flexDirection: 'row',
      alignItems: 'center',
    },
    // The slip is an inverted plane, so its foreground is whatever reads on
    // the ink rather than the theme's usual body colour.
    text: {
      flex: 1,
      color: onColor(colors.text),
      fontSize: font.body,
      marginRight: spacing.m,
    },
    // Colour is applied at the call site from `isDark`, which is the theme's
    // own answer — inferring it by comparing a colour value to a palette
    // constant breaks silently the next time the palette moves.
    action: {
      ...indicium,
      fontSize: font.body,
      letterSpacing: font.body * 0.1,
    },
  });

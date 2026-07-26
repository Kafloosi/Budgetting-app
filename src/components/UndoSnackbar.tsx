import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useApp } from '../context/AppContext';
import { font, radius, scale, spacing, ThemeColors } from '../theme';
import { useThemedStyles } from './ui';

const DISMISS_AFTER_MS = 5000;

/** "Entry deleted — UNDO" bar shown briefly after deleting a transaction */
export function UndoSnackbar() {
  const { undoableTransaction, undoRemoveTransaction, dismissUndo } = useApp();
  const styles = useThemedStyles(makeStyles);

  useEffect(() => {
    if (!undoableTransaction) return;
    const timer = setTimeout(dismissUndo, DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [undoableTransaction, dismissUndo]);

  if (!undoableTransaction) return null;

  return (
    <Pressable style={styles.bar} onPress={undoRemoveTransaction}>
      <Text style={styles.text} numberOfLines={1}>
        Deleted “{undoableTransaction.note || 'entry'}”
      </Text>
      <Text style={styles.action}>UNDO</Text>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bar: {
      position: 'absolute',
      left: spacing.l,
      right: spacing.l,
      bottom: scale(78),
      backgroundColor: colors.text,
      borderRadius: radius.m,
      paddingVertical: spacing.m,
      paddingHorizontal: spacing.l,
      flexDirection: 'row',
      alignItems: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    text: {
      flex: 1,
      color: colors.background,
      fontSize: font.body,
      marginRight: spacing.m,
    },
    action: {
      color: colors.primary,
      fontSize: font.body,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
  });

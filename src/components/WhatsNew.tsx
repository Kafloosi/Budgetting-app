import React from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../context/AppContext';
import { font, radius, scale, spacing, ThemeColors } from '../theme';
import { ReleaseNote } from '../changelog';
import { Card, Label, PrimaryButton, useThemedStyles } from './ui';

/**
 * Shown once after an update, listing what changed since the version the
 * user last opened. Several releases can be listed at a time — sideloaded
 * builds get installed in whatever order they're downloaded.
 */
export function WhatsNew({
  notes,
  onDismiss,
}: {
  notes: ReleaseNote[];
  onDismiss: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Card style={styles.sheet}>
          <Text style={styles.title}>What's new</Text>
          <ScrollView style={styles.scroll}>
            {notes.map((note) => (
              <View key={note.version} style={styles.release}>
                {notes.length > 1 ? <Label>Version {note.version}</Label> : null}
                {note.highlights.map((line, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
                    <Text style={styles.bulletText}>{line}</Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          <PrimaryButton label="Got it" onPress={onDismiss} style={{ marginTop: spacing.l }} />
        </Card>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    sheet: {
      marginBottom: 0,
      maxHeight: '80%',
    },
    title: {
      fontSize: font.large,
      fontWeight: '800',
      color: colors.text,
      marginBottom: spacing.m,
    },
    scroll: {
      flexGrow: 0,
    },
    release: {
      marginBottom: spacing.m,
    },
    bulletRow: {
      flexDirection: 'row',
      marginBottom: spacing.m,
    },
    bullet: {
      width: scale(6),
      height: scale(6),
      borderRadius: radius.s,
      marginTop: scale(7),
      marginRight: spacing.m,
    },
    bulletText: {
      flex: 1,
      fontSize: font.body,
      color: colors.text,
      lineHeight: font.body * 1.4,
    },
  });

import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useApp, useTheme } from '../../context/AppContext';
import { spacing } from '../../theme';
import {
  backupFilename,
  csvFilename,
  estimateBackupBytes,
  parseBackup,
  serializeBackup,
  transactionsToCsv,
} from '../../storage';
import { decryptBackup, encryptBackup, isEncryptedBackup } from '../../utils/backupCrypto';
import { Card, Input, Label, PrimaryButton, Row } from '../../components/ui';
import { ToggleRow, useSettingsStyles } from './common';

/** Above this, JS-side encryption takes long enough to look like a freeze */
const MAX_ENCRYPTED_BACKUP_BYTES = 25 * 1024 * 1024;

/** Backup export/import (optionally encrypted) and CSV export. */
export function DataSection() {
  const { state, replaceState } = useApp();
  const { colors } = useTheme();
  const styles = useSettingsStyles();

  const [backupPassword, setBackupPassword] = useState('');
  const [includePhotos, setIncludePhotos] = useState(true);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const shareFile = async (filename: string, contents: string, mimeType: string) => {
    try {
      const uri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(uri, contents);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType });
      } else {
        Alert.alert('Not available', 'Sharing is not available on this device.');
      }
    } catch (e) {
      Alert.alert('Export failed', String(e));
    }
  };

  const applyImport = async (text: string) => {
    const next = await parseBackup(text, state.settings.premium);
    if (!next) {
      Alert.alert('Invalid file', 'This does not look like a budget backup.');
      return;
    }
    Alert.alert(
      'Import backup',
      `Replace everything with this backup? It contains ${next.people.length} people and ${next.transactions.length} entries. Your current data will be overwritten.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import', style: 'destructive', onPress: () => replaceState(next) },
      ],
    );
  };

  const importJson = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/*', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
      if (isEncryptedBackup(text)) {
        setPendingImport(text);
        return;
      }
      await applyImport(text);
    } catch (e) {
      Alert.alert('Import failed', String(e));
    }
  };

  const unlockImport = async () => {
    if (!pendingImport) return;
    const plaintext = decryptBackup(pendingImport, importPassword);
    if (!plaintext) {
      Alert.alert('Wrong password', 'That password does not open this backup.');
      return;
    }
    setPendingImport(null);
    setImportPassword('');
    await applyImport(plaintext);
  };

  const exportBackup = async () => {
    // Encryption runs in JavaScript, so a huge photo payload would block the
    // UI for many seconds. Warn before that happens rather than freezing.
    const estimate = estimateBackupBytes(state, includePhotos);
    if (backupPassword.trim() && estimate > MAX_ENCRYPTED_BACKUP_BYTES) {
      Alert.alert(
        'Backup too large to encrypt',
        'Encrypting this many receipt photos would freeze the app. Export without photos, or without a password.',
      );
      return;
    }
    setBusy('Preparing backup…');
    try {
      const plain = await serializeBackup(state, includePhotos);
      const contents = backupPassword.trim()
        ? encryptBackup(plain, backupPassword.trim())
        : plain;
      await shareFile(backupFilename(), contents, 'application/json');
    } catch (e) {
      Alert.alert('Export failed', String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Label>Data</Label>
      <Card>
        <Label>Password (optional)</Label>
        <Input
          value={backupPassword}
          onChangeText={setBackupPassword}
          placeholder="Encrypt the backup with a passphrase"
          autoCapitalize="none"
          secureTextEntry
        />
        <ToggleRow
          style={{ marginTop: spacing.m }}
          title="Include receipt photos"
          description="Makes the file much larger, but the backup is then complete."
          value={includePhotos}
          onValueChange={setIncludePhotos}
        />
        <PrimaryButton
          label={busy ?? 'Export backup'}
          onPress={exportBackup}
          disabled={busy !== null}
          style={{ marginTop: spacing.m }}
        />
        <PrimaryButton
          label="Export entries (CSV)"
          onPress={() => shareFile(csvFilename(), transactionsToCsv(state), 'text/csv')}
          style={{ marginTop: spacing.m }}
        />
        <PrimaryButton
          label="Import backup"
          onPress={importJson}
          color={colors.expense}
          style={{ marginTop: spacing.m }}
        />
        <Text style={[styles.mutedSmall, { marginTop: spacing.m }]}>
          {backupPassword.trim()
            ? 'This backup will be encrypted — without the password nobody can read it, and it cannot be recovered if you forget it.'
            : 'Without a password the backup is readable by anyone who opens the file. Your Pro unlock is never included.'}
        </Text>
      </Card>

      {pendingImport ? (
        <Card>
          <Label>This backup is encrypted</Label>
          <Input
            value={importPassword}
            onChangeText={setImportPassword}
            placeholder="Backup password"
            autoCapitalize="none"
            secureTextEntry
            autoFocus
            onSubmitEditing={unlockImport}
          />
          <Row style={{ marginTop: spacing.m }}>
            <PrimaryButton
              label="Cancel"
              onPress={() => {
                setPendingImport(null);
                setImportPassword('');
              }}
              color={colors.textSecondary}
              style={{ flex: 1, marginRight: spacing.s }}
            />
            <PrimaryButton label="Open" onPress={unlockImport} style={{ flex: 1 }} />
          </Row>
        </Card>
      ) : null}
    </>
  );
}

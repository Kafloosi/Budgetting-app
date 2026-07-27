import React, { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../../context/AppContext';
import { spacing } from '../../theme';
import { formatCents, formatMonth } from '../../utils/money';
import {
  findDuplicates,
  guessCategory,
  monthsCovered,
  ParsedCsv,
  parseBankCsv,
} from '../../utils/csvImport';
import { Card, Chip, Label, PrimaryButton, SegmentedControl } from '../../components/ui';
import { ToggleRow, useSettingsStyles } from './common';

/** Problems worth listing individually before it turns into a wall of text. */
const VISIBLE_PROBLEMS = 5;

/**
 * Import a bank statement. Parsing is deliberately a two-step: read the file
 * and show what was found, then import on a second, explicit tap. A statement
 * is hundreds of entries, and an import that turned out wrong is far more work
 * to unpick than one that was never started.
 */
export function CsvImportSection() {
  const { state, addTransaction } = useApp();
  const styles = useSettingsStyles();

  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [dayFirst, setDayFirst] = useState(true);
  const [personId, setPersonId] = useState(state.people[0]?.id);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [raw, setRaw] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const duplicates = useMemo(
    () => (parsed ? findDuplicates(parsed.rows, state.transactions) : new Set<number>()),
    [parsed, state.transactions],
  );

  const importable = parsed
    ? parsed.rows.filter((r) => !skipDuplicates || !duplicates.has(r.line))
    : [];

  const pick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/*', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
      setRaw(text);
      setParsed(parseBankCsv(text, dayFirst));
    } catch (e) {
      Alert.alert('Could not read the file', String(e));
    }
  };

  // Re-reading the same text is cheaper than making the user pick the file
  // again just because the date order was read the wrong way round.
  const changeDateOrder = (next: boolean) => {
    setDayFirst(next);
    if (raw) setParsed(parseBankCsv(raw, next));
  };

  const runImport = () => {
    if (!personId || importable.length === 0) return;
    Alert.alert(
      'Import entries',
      `Add ${importable.length} ${importable.length === 1 ? 'entry' : 'entries'} to ${
        state.people.find((p) => p.id === personId)?.name
      }? Anything wrong can be undone from the trash for 30 days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: () => {
            setBusy(true);
            for (const row of importable) {
              addTransaction({
                personId,
                type: row.type,
                amountCents: row.amountCents,
                note: row.note,
                date: row.date,
                shared: false,
                categoryId:
                  row.type === 'expense'
                    ? guessCategory(row.note, state.customCategories)
                    : undefined,
              });
            }
            setBusy(false);
            setParsed(null);
            setRaw(null);
            Alert.alert('Imported', `${importable.length} entries were added.`);
          },
        },
      ],
    );
  };

  const months = parsed ? monthsCovered(parsed.rows) : [];

  return (
    <>
      <Label>Import bank statement</Label>
      <Card>
        {!parsed ? (
          <>
            <Text style={styles.mutedBody}>
              Read a CSV exported from your bank. Nothing is added until you
              have seen what it found and confirmed.
            </Text>
            <PrimaryButton
              label="Choose a CSV file"
              onPress={pick}
              style={{ marginTop: spacing.m }}
            />
          </>
        ) : (
          <>
            <Text style={styles.rowTitle}>
              {parsed.rows.length} {parsed.rows.length === 1 ? 'row' : 'rows'} read
              {months.length > 0
                ? ` · ${months.map(formatMonth).join(', ')}`
                : ''}
            </Text>
            {duplicates.size > 0 ? (
              <Text style={styles.mutedSmall}>
                {duplicates.size} already look like entries you have, matched on
                date, amount and direction.
              </Text>
            ) : null}
            {parsed.problems.length > 0 ? (
              <View style={{ marginTop: spacing.s }}>
                <Text style={styles.danger}>
                  {parsed.problems.length} skipped
                </Text>
                {parsed.problems.slice(0, VISIBLE_PROBLEMS).map((p) => (
                  <Text key={p.line} style={styles.mutedSmall}>
                    line {p.line}: {p.reason}
                  </Text>
                ))}
                {parsed.problems.length > VISIBLE_PROBLEMS ? (
                  <Text style={styles.mutedSmall}>
                    and {parsed.problems.length - VISIBLE_PROBLEMS} more
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={{ marginTop: spacing.m }}>
              <Label>Dates read as</Label>
              <SegmentedControl
                options={[
                  { value: 'dmy', label: 'Day first' },
                  { value: 'mdy', label: 'Month first' },
                ]}
                value={dayFirst ? 'dmy' : 'mdy'}
                onChange={(v) => changeDateOrder(v === 'dmy')}
              />
              {parsed.rows.length > 0 ? (
                <Text style={[styles.mutedSmall, { marginTop: spacing.s }]}>
                  First entry reads as {parsed.rows[0].date} ·{' '}
                  {formatCents(parsed.rows[0].amountCents)} ·{' '}
                  {parsed.rows[0].type}
                </Text>
              ) : null}
            </View>

            {state.people.length > 1 ? (
              <View style={{ marginTop: spacing.m }}>
                <Label>Import as</Label>
                <View style={styles.chipsWrap}>
                  {state.people.map((p) => (
                    <Chip
                      key={p.id}
                      label={p.name}
                      selected={personId === p.id}
                      onPress={() => setPersonId(p.id)}
                      color={p.color}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <ToggleRow
              style={{ marginTop: spacing.m }}
              title="Skip likely duplicates"
              description="Rows matching an entry you already have on the same date, amount and direction."
              value={skipDuplicates}
              onValueChange={setSkipDuplicates}
            />

            <PrimaryButton
              label={
                busy
                  ? 'Importing…'
                  : `Import ${importable.length} ${
                      importable.length === 1 ? 'entry' : 'entries'
                    }`
              }
              onPress={runImport}
              disabled={busy || importable.length === 0 || !personId}
              style={{ marginTop: spacing.m }}
            />
            <PrimaryButton
              label="Choose a different file"
              onPress={() => {
                setParsed(null);
                setRaw(null);
              }}
              color={styles.mutedSmall.color}
              style={{ marginTop: spacing.s }}
            />
            <Text style={[styles.mutedSmall, { marginTop: spacing.m }]}>
              Imported entries are filed to a category by matching the
              description, and left uncategorised when nothing matches. They are
              never marked as shared, since a bank cannot know that.
            </Text>
          </>
        )}
      </Card>
    </>
  );
}

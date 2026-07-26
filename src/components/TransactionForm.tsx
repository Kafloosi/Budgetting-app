import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { pickReceiptPhoto } from '../utils/receipts';
import { useApp, useTheme } from '../context/AppContext';
import { darkColors, font, radius, scale, spacing, ThemeColors } from '../theme';
import {
  centsToInput,
  currencySymbol,
  formatDate,
  FREQUENCY_LABEL,
  FREQUENCY_OPTIONS,
  parseAmountToCents,
  todayIso,
} from '../utils/money';
import {
  OTHER_CATEGORY_ID,
  rootCategoryId,
  subcategoriesOf,
  topLevelCategories,
} from '../categories';
import { Card, Chip, Label, PrimaryButton, SegmentedControl, useThemedStyles } from './ui';
import { IncomeFrequency, TransactionType } from '../types';

type RepeatOption = 'none' | IncomeFrequency;

export interface TransactionValues {
  type: TransactionType;
  amountCents: number;
  note: string;
  personId: string;
  date: string;
  shared: boolean;
  categoryId?: string;
  photoUri?: string;
  accountId?: string;
  repeat: RepeatOption;
}

const REPEAT_OPTIONS: { value: RepeatOption; label: string }[] = [
  { value: 'none', label: 'Once' },
  ...FREQUENCY_OPTIONS,
];

export function TransactionForm({
  initial,
  showRepeat,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<TransactionValues>;
  /** Show the repeat selector (only when creating, not when editing) */
  showRepeat: boolean;
  submitLabel?: string;
  onSubmit: (values: TransactionValues) => void;
}) {
  const { state } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const today = useMemo(() => todayIso(), []);

  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense');
  const [amount, setAmount] = useState(centsToInput(initial?.amountCents ?? 0));
  const [note, setNote] = useState(initial?.note ?? '');
  const [personId, setPersonId] = useState<string | null>(
    initial?.personId ?? state.people[0]?.id ?? null,
  );
  const [date, setDate] = useState(initial?.date ?? today);
  const [shared, setShared] = useState(initial?.shared ?? true);
  const [categoryId, setCategoryId] = useState<string>(
    initial?.categoryId ?? OTHER_CATEGORY_ID,
  );
  const [repeat, setRepeat] = useState<RepeatOption>('none');
  const [showPicker, setShowPicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | undefined>(initial?.photoUri);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [accountId, setAccountId] = useState<string | undefined>(
    initial?.accountId ?? state.accounts[0]?.id,
  );

  const pickPhoto = async (fromCamera: boolean) => {
    try {
      const stored = await pickReceiptPhoto(fromCamera);
      if (stored) setPhotoUri(stored);
    } catch (e) {
      Alert.alert('Could not add photo', String(e));
    }
  };

  const addPhoto = () => {
    Alert.alert('Receipt photo', 'Attach a photo of the receipt', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take photo', onPress: () => pickPhoto(true) },
      { text: 'Choose from library', onPress: () => pickPhoto(false) },
    ]);
  };

  const multiPerson = state.people.length > 1;
  const isExpense = type === 'expense';
  const accent = isExpense ? colors.expense : colors.income;
  const topCategories = useMemo(
    () => topLevelCategories(state.customCategories),
    [state.customCategories],
  );
  const selectedRootId = rootCategoryId(state.customCategories, categoryId);
  const subcategories = useMemo(
    () => subcategoriesOf(state.customCategories, selectedRootId),
    [state.customCategories, selectedRootId],
  );

  const submit = () => {
    const cents = parseAmountToCents(amount);
    if (!cents) {
      Alert.alert('Invalid amount', 'Enter an amount like 12,50');
      return;
    }
    if (!personId) {
      Alert.alert('No person', 'Add a person in the Settings tab first.');
      return;
    }
    onSubmit({
      type,
      amountCents: cents,
      note: note.trim(),
      personId,
      date,
      shared: isExpense && (multiPerson ? shared : false),
      categoryId: isExpense ? categoryId : undefined,
      photoUri,
      accountId: state.accounts.length > 0 ? accountId : undefined,
      repeat,
    });
  };

  return (
    <View>
      <SegmentedControl
        options={[
          { value: 'expense', label: 'Expense' },
          { value: 'income', label: 'Income' },
        ]}
        value={type}
        onChange={setType}
        activeColor={accent}
      />

      <Card style={{ marginTop: spacing.l }}>
        <Label>Amount</Label>
        <View style={styles.amountRow}>
          <Text style={[styles.currency, { color: accent }]}>
            {currencySymbol()}
          </Text>
          <TextInput
            style={[styles.amountInput, { color: accent }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0,00"
            placeholderTextColor={colors.border}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        </View>
      </Card>

      <Card>
        <Label>Description</Label>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder={isExpense ? 'e.g. Groceries' : 'e.g. Salary'}
          placeholderTextColor={colors.textSecondary}
          returnKeyType="done"
        />
      </Card>

      <Card>
        <Label>Date</Label>
        <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateText}>
            {date === today ? `Today · ${formatDate(date)}` : `${formatDate(date)} ${date.slice(0, 4)}`}
          </Text>
        </Pressable>
        {showPicker ? (
          <DateTimePicker
            value={new Date(`${date}T12:00:00Z`)}
            mode="date"
            maximumDate={new Date()}
            onChange={(_event, picked) => {
              setShowPicker(Platform.OS === 'ios');
              if (picked) setDate(picked.toISOString().slice(0, 10));
            }}
          />
        ) : null}
      </Card>

      {isExpense ? (
        <Card>
          <Label>Category</Label>
          <View style={styles.chipsWrap}>
            {topCategories.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                selected={selectedRootId === c.id}
                onPress={() => setCategoryId(c.id)}
                color={c.color}
              />
            ))}
          </View>
          {subcategories.length > 0 ? (
            <>
              <Label>Subcategory</Label>
              <View style={styles.chipsWrap}>
                <Chip
                  label="All"
                  selected={categoryId === selectedRootId}
                  onPress={() => setCategoryId(selectedRootId)}
                />
                {subcategories.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    selected={categoryId === c.id}
                    onPress={() => setCategoryId(c.id)}
                    color={c.color}
                  />
                ))}
              </View>
            </>
          ) : null}
        </Card>
      ) : null}

      {state.accounts.length > 0 ? (
        <Card>
          <Label>{isExpense ? 'Paid from' : 'Received in'}</Label>
          <View style={styles.chipsWrap}>
            {state.accounts.map((a) => (
              <Chip
                key={a.id}
                label={a.name}
                selected={accountId === a.id}
                onPress={() => setAccountId(a.id)}
                color={a.color}
              />
            ))}
          </View>
        </Card>
      ) : null}

      {multiPerson ? (
        <Card>
          <Label>Who?</Label>
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
        </Card>
      ) : null}

      {multiPerson && isExpense ? (
        <Card style={styles.sharedRow}>
          <View style={{ flex: 1, paddingRight: spacing.m }}>
            <Text style={styles.sharedTitle}>Shared expense</Text>
            <Text style={styles.sharedHint}>
              Shared expenses are included when you settle up in the Split tab.
            </Text>
          </View>
          <Switch
            value={shared}
            onValueChange={setShared}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.white}
          />
        </Card>
      ) : null}

      <Card>
        <Label>Receipt photo</Label>
        {photoUri ? (
          <View>
            <Pressable onPress={() => setPhotoViewerOpen(true)}>
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            </Pressable>
            <Pressable onPress={() => setPhotoUri(undefined)} hitSlop={8}>
              <Text style={styles.photoRemove}>Remove photo</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.dateButton} onPress={addPhoto}>
            <Text style={styles.dateText}>Add photo</Text>
          </Pressable>
        )}
      </Card>

      {photoViewerOpen && photoUri ? (
        <Modal visible animationType="fade" onRequestClose={() => setPhotoViewerOpen(false)}>
          <Pressable style={styles.viewer} onPress={() => setPhotoViewerOpen(false)}>
            <Image source={{ uri: photoUri }} style={styles.viewerImage} resizeMode="contain" />
            <Text style={styles.viewerHint}>Tap to close</Text>
          </Pressable>
        </Modal>
      ) : null}

      {showRepeat ? (
        <Card>
          <Label>Repeat</Label>
          <SegmentedControl options={REPEAT_OPTIONS} value={repeat} onChange={setRepeat} />
          {repeat !== 'none' ? (
            <Text style={styles.repeatHint}>
              Repeats every {FREQUENCY_LABEL[repeat]} starting {formatDate(date)} —
              future entries are added automatically.
            </Text>
          ) : null}
        </Card>
      ) : null}

      <PrimaryButton
        label={submitLabel ?? (isExpense ? 'Add expense' : 'Add income')}
        onPress={submit}
        color={accent}
        disabled={state.people.length === 0}
        style={{ marginTop: spacing.s }}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    currency: {
      fontSize: font.xlarge,
      fontWeight: '700',
      marginRight: spacing.s,
    },
    amountInput: {
      flex: 1,
      fontSize: font.huge,
      fontWeight: '800',
      paddingVertical: spacing.xs,
    },
    noteInput: {
      fontSize: font.medium,
      color: colors.text,
      paddingVertical: spacing.xs,
    },
    dateButton: {
      backgroundColor: colors.background,
      borderRadius: radius.m,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: scale(10),
      paddingHorizontal: spacing.m,
    },
    dateText: {
      fontSize: font.body,
      fontWeight: '600',
      color: colors.text,
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    sharedRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sharedTitle: {
      fontSize: font.body,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    sharedHint: {
      fontSize: font.small,
      color: colors.textSecondary,
    },
    repeatHint: {
      fontSize: font.small,
      color: colors.textSecondary,
      marginTop: spacing.m,
    },
    photo: {
      width: '100%',
      height: scale(160),
      borderRadius: radius.m,
      backgroundColor: colors.background,
    },
    photoRemove: {
      marginTop: spacing.s,
      color: colors.expense,
      fontSize: font.body,
      fontWeight: '600',
    },
    viewer: {
      flex: 1,
      backgroundColor: '#000000',
      justifyContent: 'center',
    },
    viewerImage: {
      width: '100%',
      height: '85%',
    },
    viewerHint: {
      color: darkColors.textSecondary,
      textAlign: 'center',
      fontSize: font.small,
      paddingBottom: spacing.xl,
    },
  });

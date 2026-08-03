import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { Text } from '../../components/Text';
import { useApp, useTheme } from '../../context/AppContext';
import { spacing } from '../../theme';
import { formatCents, formatDate, parseAmountToCents, todayIso } from '../../utils/money';
import { accountBalances, isLiability } from '../../utils/aggregate';
import { AccountKind } from '../../types';
import {
  Card,
  Chip,
  Input,
  Label,
  PrimaryButton,
  SegmentedControl,
} from '../../components/ui';
import { SettingRow, useSettingsStyles } from './common';

const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = {
  cash: 'Cash',
  bank: 'Bank account',
  savings: 'Savings',
  debt: 'Debt',
};

const ACCOUNT_KIND_OPTIONS = (
  Object.entries(ACCOUNT_KIND_LABEL) as [AccountKind, string][]
).map(([value, label]) => ({ value, label }));

/** Accounts with their balances, and transfers between them. */
export function AccountsSection() {
  const {
    state,
    addAccount,
    removeAccount,
    addAccountTransfer,
    removeAccountTransfer,
  } = useApp();
  const styles = useSettingsStyles();
  const { colors } = useTheme();

  const [accName, setAccName] = useState('');
  const [accKind, setAccKind] = useState<AccountKind>('bank');
  const [accOpening, setAccOpening] = useState('');
  const [transferFrom, setTransferFrom] = useState<string | null>(null);
  const [transferTo, setTransferTo] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState('');

  const balances = useMemo(
    () => accountBalances(state.accounts, state.transactions, state.accountTransfers),
    [state.accounts, state.transactions, state.accountTransfers],
  );

  const submitAccount = () => {
    const name = accName.trim();
    if (!name) {
      Alert.alert('Missing name', 'Give the account a name, e.g. Checking.');
      return;
    }
    const opening = accOpening.trim() ? parseAmountToCents(accOpening) ?? 0 : 0;
    // On a debt account the user types what they owe; the balance that money
    // actually has is negative, which is what makes net worth honest without
    // a special case anywhere in the arithmetic.
    addAccount(name, accKind, isLiability(accKind) ? -Math.abs(opening) : opening);
    setAccName('');
    setAccOpening('');
  };

  const accountName = (id: string) =>
    state.accounts.find((a) => a.id === id)?.name ?? 'unknown';

  const submitTransfer = () => {
    const cents = parseAmountToCents(transferAmount);
    if (!transferFrom || !transferTo || transferFrom === transferTo || !cents) {
      Alert.alert(
        'Incomplete transfer',
        'Pick two different accounts and an amount like 250.',
      );
      return;
    }
    addAccountTransfer({
      fromAccountId: transferFrom,
      toAccountId: transferTo,
      amountCents: cents,
      date: todayIso(),
      note: '',
    });
    setTransferAmount('');
  };

  return (
    <>
      <Label>Accounts</Label>
      <Card>
        {state.accounts.map((a) => (
          <SettingRow
            key={a.id}
            title={a.name}
            titleLines={2}
            markerColor={a.color}
            sub={ACCOUNT_KIND_LABEL[a.kind]}
            trailing={
              <Text
                style={[
                  styles.rowTitle,
                  { marginRight: spacing.l },
                  isLiability(a.kind) ? { color: colors.expense } : null,
                ]}
              >
                {isLiability(a.kind)
                  ? `owes ${formatCents(Math.abs(balances.get(a.id) ?? 0))}`
                  : formatCents(balances.get(a.id) ?? 0)}
              </Text>
            }
            onRemove={() => removeAccount(a.id)}
          />
        ))}
        <Input
          style={{ marginBottom: spacing.s }}
          value={accName}
          onChangeText={setAccName}
          placeholder="Account name, e.g. Checking"
        />
        <Input
          style={{ marginBottom: spacing.s }}
          value={accOpening}
          onChangeText={setAccOpening}
          placeholder={
            isLiability(accKind) ? 'Amount owed' : 'Starting balance (optional)'
          }
          keyboardType="decimal-pad"
        />
        <View style={{ marginBottom: spacing.m }}>
          <SegmentedControl
            options={ACCOUNT_KIND_OPTIONS}
            value={accKind}
            onChange={setAccKind}
          />
        </View>
        <PrimaryButton label="Add account" onPress={submitAccount} />
        <Text style={[styles.mutedSmall, { marginTop: spacing.s }]}>
          Entries can then say which account they came from, and balances show
          on the Home tab. A debt account holds what you owe — spending on it
          adds to the debt, and a transfer into it is a repayment, so net
          worth counts it against you.
        </Text>
      </Card>

      {state.accounts.length > 1 ? (
        <>
          <Label>Transfer between accounts</Label>
          <Card>
            <Label>From</Label>
            <View style={styles.chipsWrap}>
              {state.accounts.map((a) => (
                <Chip
                  key={a.id}
                  label={a.name}
                  selected={transferFrom === a.id}
                  onPress={() => setTransferFrom(a.id)}
                  color={a.color}
                />
              ))}
            </View>
            <Label>To</Label>
            <View style={styles.chipsWrap}>
              {state.accounts.map((a) => (
                <Chip
                  key={a.id}
                  label={a.name}
                  selected={transferTo === a.id}
                  onPress={() => setTransferTo(a.id)}
                  color={a.color}
                />
              ))}
            </View>
            <Input
              style={{ marginBottom: spacing.m }}
              value={transferAmount}
              onChangeText={setTransferAmount}
              placeholder="Amount"
              keyboardType="decimal-pad"
            />
            <PrimaryButton label="Transfer" onPress={submitTransfer} />
            {state.accountTransfers.slice(0, 10).map((t) => (
              <SettingRow
                key={t.id}
                title={formatCents(t.amountCents)}
                sub={`${accountName(t.fromAccountId)} → ${accountName(
                  t.toAccountId,
                )} · ${formatDate(t.date)}`}
                onRemove={() => removeAccountTransfer(t.id)}
              />
            ))}
            <Text style={[styles.mutedSmall, { marginTop: spacing.s }]}>
              Transfers move money between your own accounts — they are not
              income or expenses, so they never affect your budgets.
            </Text>
          </Card>
        </>
      ) : null}
    </>
  );
}

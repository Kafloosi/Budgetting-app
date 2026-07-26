import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../../context/AppContext';
import { font, scale, spacing, ThemeColors } from '../../theme';
import { formatCents, FREQUENCY_LABEL } from '../../utils/money';
import { Person } from '../../types';
import { Card, EmptyState, Label, Row, useThemedStyles } from '../../components/ui';
import { PersonForm } from '../../components/PersonForm';
import { useSettingsStyles } from './common';

/** The household: each person's income, plus the add-a-person form. */
export function PeopleSection() {
  const { state, addPerson, updatePerson, removePerson } = useApp();
  const shared = useSettingsStyles();
  const styles = useThemedStyles(makeStyles);
  const [editingId, setEditingId] = useState<string | null>(null);

  const confirmRemove = (person: Person) => {
    Alert.alert(
      'Remove person',
      `Remove ${person.name}? Their incomes and expenses will be deleted too.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removePerson(person.id) },
      ],
    );
  };

  return (
    <>
      <Label>People</Label>
      {state.people.length === 0 ? (
        <EmptyState message="No people yet. Add yourself to get started." />
      ) : (
        state.people.map((item) => {
          const editing = editingId === item.id;
          return (
            <Card key={item.id}>
              <Row>
                <View style={[styles.avatar, { backgroundColor: item.color }]}>
                  <Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{item.name}</Text>
                  <Text style={shared.mutedSmall}>
                    {item.incomeCents > 0
                      ? `${formatCents(item.incomeCents)} / ${FREQUENCY_LABEL[item.incomeFrequency]}`
                      : 'No income set'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setEditingId(editing ? null : item.id)}
                  hitSlop={8}
                  style={{ marginRight: spacing.l }}
                >
                  <Text style={shared.link}>{editing ? 'Cancel' : 'Edit'}</Text>
                </Pressable>
                <Pressable onPress={() => confirmRemove(item)} hitSlop={8}>
                  <Text style={shared.danger}>Remove</Text>
                </Pressable>
              </Row>
              {editing ? (
                <View style={styles.editBox}>
                  <PersonForm
                    existingNames={[]}
                    hideName
                    initial={item}
                    submitLabel="Save"
                    onSubmit={({ incomeCents, incomeFrequency }) => {
                      updatePerson(item.id, { incomeCents, incomeFrequency });
                      setEditingId(null);
                    }}
                  />
                </View>
              ) : null}
            </Card>
          );
        })
      )}
      <Card>
        <Label>Add a person</Label>
        <PersonForm
          existingNames={state.people.map((p) => p.name)}
          submitLabel="Add person"
          onSubmit={addPerson}
        />
      </Card>
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    avatar: {
      width: scale(40),
      height: scale(40),
      borderRadius: scale(20),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.m,
    },
    avatarText: {
      color: colors.white,
      fontSize: font.medium,
      fontWeight: '700',
    },
    personName: {
      fontSize: font.medium,
      fontWeight: '600',
      color: colors.text,
    },
    editBox: {
      marginTop: spacing.l,
      paddingTop: spacing.l,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  });

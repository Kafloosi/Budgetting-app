import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, font, radius, scale, spacing } from '../theme';
import { Card, EmptyState, PrimaryButton, Row, ScreenTitle, textStyles } from '../components/ui';
import { Person } from '../types';

export default function PeopleScreen() {
  const { state, addPerson, removePerson } = useApp();
  const [name, setName] = useState('');

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (state.people.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Already exists', `"${trimmed}" is already in the list.`);
      return;
    }
    addPerson(trimmed);
    setName('');
  };

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
    <View style={styles.container}>
      <FlatList
        data={state.people}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <ScreenTitle
              title="People"
              subtitle="Track budgets separately per person, or combined"
            />
            <Card>
              <Text style={textStyles.label}>Add a person</Text>
              <Row>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Name"
                  placeholderTextColor={colors.textSecondary}
                  onSubmitEditing={add}
                  returnKeyType="done"
                />
                <PrimaryButton label="Add" onPress={add} style={styles.addButton} />
              </Row>
            </Card>
          </>
        }
        renderItem={({ item }) => (
          <Card style={styles.personCard}>
            <View style={[styles.avatar, { backgroundColor: item.color }]}>
              <Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <Text style={styles.personName}>{item.name}</Text>
            <Pressable onPress={() => confirmRemove(item)} hitSlop={8}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="👤"
            message="No people yet. Add yourself to get started — add more people to split expenses together."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.l, paddingBottom: scale(100) },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    paddingHorizontal: spacing.m,
    paddingVertical: scale(10),
    fontSize: font.body,
    color: colors.text,
    backgroundColor: colors.background,
    marginRight: spacing.s,
  },
  addButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: scale(11),
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
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
    flex: 1,
    fontSize: font.medium,
    fontWeight: '600',
    color: colors.text,
  },
  remove: {
    color: colors.expense,
    fontSize: font.body,
    fontWeight: '600',
  },
});

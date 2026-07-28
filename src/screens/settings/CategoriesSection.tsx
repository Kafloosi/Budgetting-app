import React, { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useApp, useCategories, usePremium } from '../../context/AppContext';
import { spacing } from '../../theme';
import { FREE_CUSTOM_CATEGORY_LIMIT, topLevelCategories } from '../../categories';
import { Card, Chip, Input, Label, PrimaryButton } from '../../components/ui';
import { SettingRow, useSettingsStyles } from './common';

/** Custom categories and subcategories, capped on the free tier. */
export function CategoriesSection() {
  const { state, addCategory, removeCategory } = useApp();
  const { all: categories, byId: categoryById } = useCategories();
  const categoriesPro = usePremium('categories');
  const styles = useSettingsStyles();
  const topCategories = useMemo(
    () => topLevelCategories(state.customCategories),
    [state.customCategories],
  );

  const [newCatName, setNewCatName] = useState('');
  const [newCatParent, setNewCatParent] = useState<string | undefined>();

  const submitCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Already exists', `A category called "${name}" already exists.`);
      return;
    }
    if (!addCategory(name, newCatParent)) {
      Alert.alert(
        'Category limit reached',
        `The free plan includes ${FREE_CUSTOM_CATEGORY_LIMIT} custom categories. Unlock Budget Pro for unlimited categories.`,
      );
      return;
    }
    setNewCatName('');
    setNewCatParent(undefined);
  };

  return (
    <>
      <Label>Custom categories</Label>
      <Card>
        {state.customCategories.map((c) => (
          <SettingRow
            key={c.id}
            title={c.name}
            titleLines={2}
            markerColor={c.color}
            sub={c.parentId ? `under ${categoryById(c.parentId).name}` : undefined}
            onRemove={() => removeCategory(c.id)}
          />
        ))}
        <Input
          style={{ marginBottom: spacing.s }}
          value={newCatName}
          onChangeText={setNewCatName}
          placeholder="Category name"
          onSubmitEditing={submitCategory}
          returnKeyType="done"
        />
        <Label>Add under</Label>
        <View style={styles.chipsWrap}>
          <Chip
            label="Top level"
            selected={newCatParent === undefined}
            onPress={() => setNewCatParent(undefined)}
          />
          {topCategories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              selected={newCatParent === c.id}
              onPress={() => setNewCatParent(c.id)}
              color={c.color}
            />
          ))}
        </View>
        <PrimaryButton label="Add category" onPress={submitCategory} />
        <Text style={[styles.mutedSmall, { marginTop: spacing.s }]}>
          {categoriesPro
            ? 'Unlimited custom categories with Budget Pro.'
            : `${state.customCategories.length} of ${FREE_CUSTOM_CATEGORY_LIMIT} free custom categories used — Budget Pro removes the limit.`}
        </Text>
      </Card>
    </>
  );
}

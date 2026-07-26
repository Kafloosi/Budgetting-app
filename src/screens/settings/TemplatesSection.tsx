import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp, useCategories, usePeopleById } from '../../context/AppContext';
import { formatCents } from '../../utils/money';
import { Card, Label, Row } from '../../components/ui';
import { useSettingsStyles } from './common';

/** Saved entry shapes that go back in with one tap from the Add tab. */
export function TemplatesSection() {
  const { state, removeTemplate } = useApp();
  const { byId: categoryById } = useCategories();
  const personById = usePeopleById();
  const styles = useSettingsStyles();

  return (
    <>
      <Label>Quick templates</Label>
      <Card>
        {state.templates.length === 0 ? (
          <Text style={styles.mutedBody}>
            No templates yet. Fill in an entry on the Add tab and tap “Save as
            template” to keep its shape — it then goes back in with one tap.
          </Text>
        ) : (
          state.templates.map((template) => (
            <Row key={template.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {template.name}
                </Text>
                <Text style={styles.mutedSmall}>
                  {template.type === 'income' ? '+' : '-'}
                  {formatCents(template.amountCents)} ·{' '}
                  {personById.get(template.personId)?.name ?? '?'}
                  {template.type === 'expense'
                    ? ` · ${categoryById(template.categoryId).name}`
                    : ''}
                </Text>
              </View>
              <Pressable onPress={() => removeTemplate(template.id)} hitSlop={8}>
                <Text style={styles.danger}>Remove</Text>
              </Pressable>
            </Row>
          ))
        )}
      </Card>
    </>
  );
}

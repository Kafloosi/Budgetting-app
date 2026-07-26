import React from 'react';
import { Text } from 'react-native';
import { APP_VERSION } from '../../version';
import { Card, Label, Row } from '../../components/ui';
import { useSettingsStyles } from './common';

/** Which build this is. */
export function AboutSection() {
  const styles = useSettingsStyles();
  return (
    <>
      <Label>About</Label>
      <Card>
        <Row>
          <Text style={[styles.rowTitle, { flex: 1 }]}>Version</Text>
          <Text style={styles.mutedBody}>{APP_VERSION}</Text>
        </Row>
      </Card>
    </>
  );
}

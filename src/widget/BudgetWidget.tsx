import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { darkColors, ThemeColors } from '../theme';

// The widget library types colors as `#${string}`; the palette is all hex.
const palette = darkColors as Record<keyof ThemeColors, `#${string}`>;

interface UnlockedProps {
  locked?: false;
  monthLabel: string;
  balance: string;
  positive: boolean;
  income: string;
  expense: string;
}

interface LockedProps {
  locked: true;
}

/**
 * 3x2 home-screen widget: this month's combined balance.
 * Premium-gated — without Budget Pro it shows an unlock hint instead.
 * Colors come from the dark palette, since widgets sit on the wallpaper.
 */
export function BudgetWidget(props: UnlockedProps | LockedProps) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {props.locked ? (
        <TextWidget
          text="Unlock Budget Pro in the app to see your balance here"
          style={{ fontSize: 13, color: palette.text }}
        />
      ) : (
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text={props.monthLabel}
            style={{ fontSize: 12, color: palette.textSecondary }}
          />
          <TextWidget
            text={props.balance}
            style={{
              fontSize: 28,
              color: props.positive ? palette.income : palette.expense,
            }}
          />
          <TextWidget
            text={`↑ ${props.income}    ↓ ${props.expense}`}
            style={{ fontSize: 12, color: palette.textSecondary }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

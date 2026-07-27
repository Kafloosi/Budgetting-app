import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { darkColors, ThemeColors } from '../theme';

// The widget library types colors as `#${string}`; the palette is all hex.
const palette = darkColors as Record<keyof ThemeColors, `#${string}`>;

/**
 * The widget has no percentage widths, so the meter is two nested boxes at
 * fixed dp: a track and a fill sized as a fraction of it. Clamped to 2-100%
 * exactly as `Meter` does in the app, so a barely-started budget still shows
 * a sliver and an overspent one never runs past its track.
 */
const TRACK_DP = 150;

function MeterRow({ meter }: { meter: WidgetMeter }) {
  const filled = Math.round(
    (Math.min(100, Math.max(2, meter.ratio * 100)) / 100) * TRACK_DP,
  );
  return (
    <FlexWidget style={{ flexDirection: 'column', marginTop: 6 }}>
      <FlexWidget
        style={{ flexDirection: 'row', width: TRACK_DP, justifyContent: 'space-between' }}
      >
        <TextWidget
          text={meter.label}
          maxLines={1}
          style={{ fontSize: 11, color: palette.textSecondary }}
        />
        <TextWidget
          text={meter.value}
          maxLines={1}
          style={{
            fontSize: 11,
            color: meter.over ? palette.expense : palette.textSecondary,
          }}
        />
      </FlexWidget>
      <FlexWidget
        style={{
          width: TRACK_DP,
          height: 4,
          marginTop: 2,
          backgroundColor: palette.background,
        }}
      >
        <FlexWidget
          style={{
            width: filled,
            height: 4,
            backgroundColor: meter.over ? palette.expense : palette.income,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export interface WidgetMeter {
  label: string;
  value: string;
  ratio: number;
  over: boolean;
}

interface UnlockedProps {
  locked?: false;
  monthLabel: string;
  balance: string;
  positive: boolean;
  income: string;
  expense: string;
  /** Fullest budgets first, falling back to goals — see widgetMeters() */
  meters: WidgetMeter[];
}

interface LockedProps {
  locked: true;
}

/**
 * 3x2 home-screen widget: this month's combined balance, plus the fullest
 * budget meters so "is there room in groceries?" is answerable without
 * unlocking the phone.
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
          {props.meters.map((m) => (
            <MeterRow key={m.label} meter={m} />
          ))}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

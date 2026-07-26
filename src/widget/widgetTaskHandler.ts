import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { readState } from '../storage';
import { renderBudgetWidget } from '../utils/widget';

/**
 * Runs headless when Android asks the widget to (re)render. Uses readState,
 * not loadState: this task cannot persist, so it must not advance the clock.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
    case 'WIDGET_CLICK': {
      props.renderWidget(renderBudgetWidget(await readState()));
      break;
    }
    default:
      break;
  }
}

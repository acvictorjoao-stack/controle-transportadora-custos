import {
  ALL_COCKPIT_CHARTS,
  ALL_COCKPIT_WIDGETS,
  DEFAULT_COCKPIT_PREFERENCES,
  type CockpitChartId,
  type CockpitWidgetId,
  type ExecutiveCockpitPreferences,
} from '../types';

function isWidgetId(value: unknown): value is CockpitWidgetId {
  return typeof value === 'string' && ALL_COCKPIT_WIDGETS.includes(value as CockpitWidgetId);
}

function isChartId(value: unknown): value is CockpitChartId {
  return typeof value === 'string' && ALL_COCKPIT_CHARTS.includes(value as CockpitChartId);
}

/** Lê preferências de `profiles.preferences.executive_cockpit`. */
export function mapCockpitPreferences(rawPreferences: unknown): ExecutiveCockpitPreferences {
  const prefs =
    rawPreferences && typeof rawPreferences === 'object'
      ? (rawPreferences as Record<string, unknown>)
      : {};
  const cockpit = prefs.executive_cockpit ?? prefs.executiveCockpit;
  const obj =
    cockpit && typeof cockpit === 'object'
      ? (cockpit as Record<string, unknown>)
      : {};

  const widgetOrderRaw = Array.isArray(obj.widgetOrder) ? obj.widgetOrder : [];
  const hiddenRaw = Array.isArray(obj.hiddenWidgets) ? obj.hiddenWidgets : [];
  const chartsRaw = Array.isArray(obj.favoriteCharts) ? obj.favoriteCharts : [];

  const widgetOrder = widgetOrderRaw.filter(isWidgetId);
  const hiddenWidgets = hiddenRaw.filter(isWidgetId);
  const favoriteCharts = chartsRaw.filter(isChartId);

  const ordered = [
    ...widgetOrder,
    ...ALL_COCKPIT_WIDGETS.filter((id) => !widgetOrder.includes(id)),
  ];

  return {
    widgetOrder: ordered.length > 0 ? ordered : [...DEFAULT_COCKPIT_PREFERENCES.widgetOrder],
    hiddenWidgets,
    favoriteCharts:
      favoriteCharts.length > 0
        ? favoriteCharts
        : [...DEFAULT_COCKPIT_PREFERENCES.favoriteCharts],
  };
}

export function cockpitPreferencesToDb(
  preferences: ExecutiveCockpitPreferences,
): Record<string, unknown> {
  return {
    widgetOrder: preferences.widgetOrder,
    hiddenWidgets: preferences.hiddenWidgets,
    favoriteCharts: preferences.favoriteCharts,
  };
}

export function mergeCockpitPreferencesIntoProfile(
  existing: Record<string, unknown>,
  preferences: ExecutiveCockpitPreferences,
): Record<string, unknown> {
  return {
    ...existing,
    executive_cockpit: cockpitPreferencesToDb(preferences),
  };
}

export const DEFAULT_SYMPTOM_ICONS: Record<string, string> = {
  BESCHWERDEFREIHEIT: 'health_and_safety',
  ENERGIE: 'battery_full',
  STIMMUNG: 'sentiment_satisfied',
  SCHLAF: 'bed',
  ENTSPANNUNG: 'self_improvement',
  HEISSHUNGERFREIHEIT: 'soup_kitchen',
  BEWEGUNG: 'directions_run',
}

export const DEFAULT_STOOL_ICON = 'microbiology'

// Exact titles must match prisma/seed.ts STANDARD_HABITS list (with diacritics)
export const DEFAULT_HABIT_ICONS: Record<string, string> = {
  '1 Glas Wasser mit Salz & Zitrone oder Apfelessig': 'water_ph',
  'Proteinreiches Frühstück & Mittagessen': 'egg_alt',
  'Einnahme Fairment-Produkte': 'pill',
  'Max. 1 Kaffee / 1 grüner Tee': 'local_cafe',
  'Keine Fertigprodukte': 'no_food',
  'Kein Zucker, Softdrinks oder Süßstoffe': 'cookie_off',
  'Keine Margarine und Saatenöle': 'oil_barrel',
  'Keine unfermentierten Milchprodukte': 'grocery',
  'Keine Wurst oder Wurstwaren': 'outdoor_grill',
  'Kein glutenhaltiges Getreide': 'grain',
  'Kein Alkohol': 'no_drinks',
  'Nichts essen ab 3 Std. vor dem Schlafengehen': 'bedtime',
}

# Fairment Darmkur Tagebuch – Product Requirements (MVP)

**Stand:** 03.09.2025  
**Ziel:** Selbstgehostete, mobile-first Web-App (PWA) zur **täglichen** Erfassung der Fairment-Darmkur (Symptome, Stuhl, Habits, Ernährungsnotizen inkl. Zeit & Foto, Bemerkungen, Phase & Darmpflege-Kategorie) und zur **Trend-Auswertung** (Woche/Phase/Gesamt) + **PDF-Export**.

---

## 1) Nutzer & Ziele
- **Nutzer:** Mehrere Profile (z. B. Nutzer/in + Partner/in), je mit Login (Username/Passwort). Keine Freigaben/Sharing nötig.
- **Ziele:**
  - Sehr schnelle **tägliche Erfassung**.
  - **Trends** erkennen (bes. nach Abschluss der 3 Monate).
  - **Export als PDF** (tageweise, textbasiert).

## 2) Kernlogik & Rahmen
- **Tageszentriert:** Alle Eingaben pro Datum (nicht wochenweise). Wochenansicht nur für Auswertungen.
- **Phase (1–3)** pro Tag manuell setzbar.
- **Darmpflege-Kategorie:** `SANFT|MEDIUM|INTENSIV`. Default = Vortag; Erstwert „SANFT“. Manuelle Änderung pro Tag möglich.
- **PWA:** Installierbar (iOS/Android). Offline-Only nicht erforderlich; Drafts lokal speichern, dann Sync.
- **UI Defaults:** Dark Mode, 24-h Zeitformat, Wochenstart Montag, mobile-first, eher Bootstrap-Look via Tailwind-Komponenten.

---

## 3) Erfassungsmodule

### 3.1 Symptome & Stuhl
- **Symptome (1–10):**  
  `Beschwerdefreiheit`, `Energielevel`, `Stimmung`, `Schlaf`, `Zeit für Entspannung`, `Heißhungerfreiheit`, `Bewegungslevel`.
- **Stuhlgang (Bristol 1–7).**
- **Eingabe-UI:** Horizontale **Zahlen-Pills** (1–10 bzw. 1–7). **One-Tap** speichert sofort.
  
### 3.2 Gewohnheiten (Habits)
- **12 Standard-Gewohnheiten (täglich, Checkbox):**
  1) Morgens **1 Glas Wasser** mit **Salz & Zitrone** oder **Apfelessig**  
  2) **Proteinreiches Frühstück & Mittagessen**  
  3) **Einnahme Fairment-Produkte**  
  4) **Max. 1 Kaffee / 1 grüner Tee**  
  5) **Keine Fertigprodukte**  
  6) **Kein Zucker, Softdrinks oder Süßstoffe**  
  7) **Keine Margarine und Saatenöle**  
  8) **Keine unfermentierten Milchprodukte**  
  9) **Keine Wurst oder Wurstwaren**  
  10) **Kein glutenhaltiges Getreide**  
  11) **Kein Alkohol**  
  12) **Nichts essen ab 3 Std. vor dem Schlafengehen**
- **Benutzer-eigene Habits:** Pro Nutzer in **Einstellungen** anleg-/deaktivier-/sortierbar.
- **Tagessicht:** Checkbox-Grid (12 Standard + eigene aktive).

### 3.3 Ernährungsnotizen & Reflexionen
- **Mehrere Einträge pro Tag.** Felder je Eintrag:
  - `occurred_at` (Zeit, **standardmäßig = created_at**, manuell überschreibbar)
  - `created_at` (automatisch)
  - Freitext `text`
  - optional **Foto** (Upload)
  - **Typ**: `meal` (Standard) **oder** `reflection`
- **Monatsreflexion:** Wird durch **Toggle „Monatsreflexion“** in einem Eintrag aktiviert → zeigt zusätzliche Felder:
  - `Was hat sich verändert?`
  - `Wofür bin ich dankbar?`
  - `Vorsätze`

### 3.4 Tages-Bemerkungen
- Freies **Textfeld „Bemerkungen“** pro Tag (zusätzlich zu den Ernährungsnotizen).

---

## 4) Auswertungen (Insights)
- **Woche:** Sparklines für alle 7 Symptome (1–10) + Stuhl (1–7), **Habit-Erfüllungsquote** pro Woche.
- **Phase:** Filter 1/2/3, Kenngrößen (Durchschnitt, Min/Max), Liniencharts.
- **Gesamt:** Zeitreihen über gesamten Zeitraum, **Marker** für Reflexions-Einträge.
- Optional: einfacher **Wohlbefinden-Index** = Mittelwert der 7 Symptomskalen (Stuhl separat).

---

## 5) Export
- **PDF** (tageweise, textbasiert): Datum, Phase, Kategorie, 7×Symptom (1–10), Stuhl (1–7), Habits (Häkchen), Ernährungsnotizen (Zeit/Text/(Foto vorhanden)), Tages-Bemerkungen.

---

## 6) UX – Hauptscreens (Text-Wireframes)

### 6.1 Heute
- **Header:** Datum „Heute“ + **Mini-Kalender/Date-Picker** (Wochenstart Mo)
- **Phase & Kategorie:** 3 Buttons (Phase 1–3), 3 Chips (Sanft/Medium/Intensiv)
- **Symptome** (7 Reihen): `[1 2 3 4 5 6 7 8 9 10]`
- **Stuhl**: `[1 2 3 4 5 6 7]`
- **Habits:** Checkbox-Chips (12 + eigene)
- **Ernährungsnotizen (Liste):** `Zeit — Text — (Foto)`; **„+ Eintrag“** (Form)
- **Bemerkungen:** Freitextfeld
- **Speicherstatus:** „Gespeichert ✓“ / „Änderungen nicht gespeichert…“ (+ **Speichern**-Button, falls Autosave aus)

### 6.2 Kalender
- Monatskalender mit Badges für Tage mit Daten; Tap → Tag öffnen.

### 6.3 Auswertungen
- Tabs: **Woche | Phase | Gesamt**
- Marker **R** für Reflexionen.

### 6.4 Einstellungen
- **Profil:** Anzeigename, Username
- **UI:** Theme (Dark default), 24-h Zeit, Wochenstart Montag
- **Habits:** Eigene hinzufügen, (de)aktivieren, sortieren
- **Erfassung:** **Autosave** an/aus (Intervall), Foto-Komprimierung

---

## 7) Datenmodell (relational, vereinfacht)
**User**(id, username, password_hash, created_at, updated_at)  
**UserSettings**(user_id, theme, time_format_24h, week_start, autosave_enabled, autosave_interval_sec)  
**Habit**(id, user_id|null→Standard, title, is_active, sort_index)  
**DayEntry**(id, user_id, date, phase, care_category, notes, created_at, updated_at)  
**SymptomScore**(id, day_entry_id, type, score) – 7×1–10/Tag  
**StoolScore**(id, day_entry_id, bristol 1–7) – max. 1/Tag  
**HabitTick**(id, day_entry_id, habit_id, checked)  
**DayNote**(id, day_entry_id, type: MEAL|REFLECTION, text, occurred_at, created_at)  
**DayNotePhoto**(id, day_note_id, url)  
**ReflectionFields**(id, day_note_id, changed, gratitude, vows)

**Business-Regeln (Auszug):**
- Beim Erstellen eines DayEntry: `care_category` = Vortag (sonst `SANFT`).
- One-Tap-Save auf Zahlen-Pills.
- Mehrnutzer-Trennung per `user_id`.

---

## 8) API – Route-Skizze (Next.js Route Handlers)
POST /api/auth/register
POST /api/auth/login
GET /api/me

GET /api/day?date=YYYY-MM-DD
PATCH /api/day/:id

PUT /api/day/:id/symptoms
PUT /api/day/:id/stool

GET /api/habits
POST /api/habits
PATCH /api/habits/:id
PUT /api/day/:id/habit-ticks

POST /api/day/:id/notes
PATCH /api/notes/:noteId
POST /api/notes/:noteId/photos
DELETE /api/photos/:photoId

GET /api/analytics/weekly?from=YYYY-MM-DD
GET /api/analytics/phase?phase=1|2|3
GET /api/analytics/overall

GET /api/export/pdf?range=all

---

## 9) Technik
- **Frontend:** Next.js (App Router), React, Tailwind CSS (Bootstrap-naher Look via Komponentenbibliothek möglich)
- **Backend:** Next.js API Routes (oder NestJS)
- **DB:** PostgreSQL; ORM **Prisma**
- **Auth:** einfacher Username/Passwort-Login (Passwörter gehasht, z. B. argon2/bcrypt)
- **Deployment:** Docker; Reverse-Proxy via Cloudflare Tunnel
- **Storage:** lokale Uploads-Dir oder S3-kompatibel (minio), Pfad/URL in DB
- **PWA:** Manifest + Service Worker (App-Shell-Caching, optionale Request-Queue)

---

## 10) Akzeptanzkriterien (MVP)
1. Tagesdatensatz anleg-/editierbar; Kategorie defaultet korrekt.
2. 7×Symptom (1–10) + Stuhl (1–7) **One-Tap** speicherbar.
3. 12 Standard-Habits sichtbar; **eigene Habits** pro Nutzer konfigurierbar; Tages-Häkchen speicherbar.
4. ≥3 Ernährungsnotizen/Tag inkl. Uhrzeit (überschreibbar), Text, optional Foto.
5. **Monatsreflexion** per Toggle in Notiz mit 3 Freitextfeldern.
6. **Bemerkungen** (Freitext) pro Tag.
7. **Auswertungen:** Woche, Phase, Gesamt; Reflexions-Marker.
8. **PDF-Export** aller Tage chronologisch.
9. **Mehrnutzer** vollständig getrennt.

---

## 11) Prisma-Schema (Startpunkt)
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Phase { PHASE_1 PHASE_2 PHASE_3 }
enum CareCategory { SANFT MEDIUM INTENSIV }
enum SymptomType {
  BESCHWERDEFREIHEIT
  ENERGIE
  STIMMUNG
  SCHLAF
  ENTSPANNUNG
  HEISSHUNGERFREIHEIT
  BEWEGUNG
}
enum NoteType { MEAL REFLECTION }

model User {
  id           String        @id @default(uuid())
  username     String        @unique
  displayName  String?
  passwordHash String
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  settings     UserSettings?
  habits       Habit[]
  days         DayEntry[]
}

model UserSettings {
  userId              String  @id
  user                User    @relation(fields: [userId], references: [id])
  theme               String  @default("dark")
  timeFormat24h       Boolean @default(true)
  weekStart           String  @default("mon")
  autosaveEnabled     Boolean @default(true)
  autosaveIntervalSec Int     @default(5)
}

model Habit {
  id        String   @id @default(uuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  title     String
  isActive  Boolean  @default(true)
  sortIndex Int      @default(0)
  ticks     HabitTick[]
}

model DayEntry {
  id           String         @id @default(uuid())
  userId       String
  user         User           @relation(fields: [userId], references: [id])
  date         DateTime
  phase        Phase
  careCategory CareCategory
  notes        String?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  symptoms     SymptomScore[]
  stool        StoolScore?
  habitTicks   HabitTick[]
  notesList    DayNote[]

  @@unique([userId, date])
}

model SymptomScore {
  id         String      @id @default(uuid())
  dayEntryId String
  day        DayEntry    @relation(fields: [dayEntryId], references: [id])
  type       SymptomType
  score      Int

  @@unique([dayEntryId, type])
}

model StoolScore {
  id         String   @id @default(uuid())
  dayEntryId String   @unique
  day        DayEntry @relation(fields: [dayEntryId], references: [id])
  bristol    Int
}

model HabitTick {
  id         String   @id @default(uuid())
  dayEntryId String
  day        DayEntry @relation(fields: [dayEntryId], references: [id])
  habitId    String
  habit      Habit    @relation(fields: [habitId], references: [id])
  checked    Boolean  @default(false)

  @@unique([dayEntryId, habitId])
}

model DayNote {
  id         String     @id @default(uuid())
  dayEntryId String
  day        DayEntry   @relation(fields: [dayEntryId], references: [id])
  type       NoteType
  text       String?
  occurredAt DateTime
  createdAt  DateTime   @default(now())
  photos     DayNotePhoto[]
  reflection ReflectionFields?
}

model DayNotePhoto {
  id        String  @id @default(uuid())
  dayNoteId String
  note      DayNote @relation(fields: [dayNoteId], references: [id])
  url       String
}

model ReflectionFields {
  id        String  @id @default(uuid())
  dayNoteId String  @unique
  note      DayNote @relation(fields: [dayNoteId], references: [id])
  changed   String?
  gratitude String?
  vows      String?
}

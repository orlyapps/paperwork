# Dokument-Template

Orlyapps - Janzen & Strauß GbR

## Voraussetzungen

### macOS

```bash
# weasyprint für PDF-Generierung
brew install weasyprint

# Node.js (falls nicht vorhanden)
brew install node
```

### Projekt-Abhängigkeiten

```bash
npm install
```

## Ordnerstruktur

```
/paperwork
├── assets/              # Logos und Bilder
│   ├── logo.png         # Hauptlogo (Deckblatt)
│   └── logo-footer.png  # Kleines Logo (Footer)
├── documents/           # HTML-Dokumente (Angebote, Rechnungen, Verträge)
├── fonts/               # Schriftarten
│   └── FiraSans-*.ttf
├── output/              # Generierte PDFs
├── scripts/             # Build-Scripts
│   ├── create-document.sh
│   └── calculate-sums.js
├── src/                 # Templates und Styles
│   ├── template.html    # HTML-Vorlage
│   └── template.css     # CSS-Styles
└── package.json
```

## Neues Dokument erstellen

### 1. Template kopieren

```bash
npm run doc -- ANG-2026-XXX
```

### 2. Dokument bearbeiten

In der HTML-Datei anpassen:
- Projekttitel
- Dokumentnummer und Datum
- Empfänger-Adresse
- Anschreiben-Text
- Leistungsbeschreibung
- Positionen und Preise (siehe Automatische Summenberechnung)

### 3. PDF generieren

```bash
npm run doc -- ANG-2026-XXX
```

## Schnellbefehle

```bash
# Einzelnes Dokument erstellen/aktualisieren
npm run doc -- ANG-2026-002    # Angebot
npm run doc -- RE-2026-001     # Rechnung
npm run doc -- Vertrag-Kunde   # Vertrag

# Template testen
npm run test:pdf

# Alle Dokumente als PDF generieren
npm run build
```

## Automatische Summenberechnung

Für Angebote und Rechnungen können Summen automatisch berechnet werden. Die Berechnung erfolgt beim PDF-Export – du musst nur Mengen und Einzelpreise als data-Attribute angeben.

### Aktivierung

Füge `data-calc="true"` und `data-vat="19"` zur Tabelle hinzu:

```html
<table class="positionen-tabelle" data-calc="true" data-vat="19">
```

### Positionen definieren

Jede Zeile erhält `data-quantity` und `data-unit-price`:

```html
<tr data-quantity="1" data-unit-price="250">
  <td>Wartung<br><small>Beschreibung der Leistung</small></td>
  <td></td>           <!-- Menge: wird automatisch eingefügt -->
  <td>Monat</td>      <!-- Einheit: manuell -->
  <td class="betrag"></td>  <!-- Einzelpreis: automatisch -->
  <td class="betrag"></td>  <!-- Gesamt: automatisch -->
</tr>
```

### Summenblock

Der Summenblock verwendet `data-totals="true"` und `data-field` für die Zielfelder:

```html
<div class="summen-block" data-totals="true">
  <div class="summen-zeile">
    <span class="label">Netto</span>
    <span class="betrag" data-field="subtotal"></span>
  </div>
  <div class="summen-zeile">
    <span class="label">MwSt. (19%)</span>
    <span class="betrag" data-field="vat"></span>
  </div>
  <div class="summen-zeile gesamt">
    <span class="label">Brutto</span>
    <span class="betrag" data-field="total"></span>
  </div>
</div>
```

### Übersicht data-Attribute

| Attribut | Element | Beschreibung |
|----------|---------|--------------|
| `data-calc="true"` | `<table>` | Aktiviert Berechnung für diese Tabelle |
| `data-vat="19"` | `<table>` | MwSt.-Satz in Prozent |
| `data-quantity="1"` | `<tr>` | Menge der Position |
| `data-unit-price="250"` | `<tr>` | Einzelpreis in Euro (ohne Formatierung) |
| `data-totals="true"` | `<div>` | Markiert den Summenblock |
| `data-field="subtotal"` | `<span>` | Zielfeld für Netto-Summe |
| `data-field="vat"` | `<span>` | Zielfeld für MwSt.-Betrag |
| `data-field="total"` | `<span>` | Zielfeld für Brutto-Summe |

## Automatisches Datum

Datumsfelder können automatisch mit dem aktuellen Datum befüllt werden.

### Verwendung

```html
<p><strong>Datum:</strong> <span data-date="today"></span></p>
<p><strong>Gültig bis:</strong> <span data-date="+30days"></span></p>
```

### Werte für data-date

| Wert | Beschreibung | Beispiel-Ausgabe |
|------|--------------|------------------|
| `today` | Heutiges Datum | 05.02.2026 |
| `+30days` | Heute + 30 Tage | 07.03.2026 |
| `+7days` | Heute + 7 Tage | 12.02.2026 |
| `-14days` | Heute - 14 Tage | 22.01.2026 |

Das Datum wird im Format `TT.MM.JJJJ` ausgegeben.

### Hinweis

Alle Features (Summenberechnung, Datum) sind optional – Dokumente ohne diese data-Attribute funktionieren wie bisher.

## Dokumenttypen

- **ANG-YYYY-XXX** - Angebote
- **RE-YYYY-XXX** - Rechnungen
- **Vertrag-XXX** - Verträge
- **Abnahme-XXX** - Abnahmeprotokolle

## Corporate Design

- **Primärfarbe:** #A0BD3C (Grün)
- **Sekundärfarbe:** #635049 (Braun)
- **Schrift:** Fira Sans

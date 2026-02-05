# Dokument-Template

Orlyapps - Janzen & Strauß GbR

## Ordnerstruktur

```
/report
├── assets/              # Logos und Bilder
│   ├── logo.png         # Hauptlogo (Deckblatt)
│   └── logo-footer.png  # Kleines Logo (Footer)
├── documents/           # HTML-Dokumente (Angebote, Rechnungen, Verträge)
├── fonts/               # Schriftarten
│   └── FiraSans-*.ttf
├── output/              # Generierte PDFs
├── template.html        # HTML-Vorlage
├── template.css         # CSS-Styles
└── README.md
```

## Neues Dokument erstellen

### 1. Template kopieren

```bash
cp template.html documents/ANG-2026-XXX.html
```

### 2. Dokument bearbeiten

In der HTML-Datei anpassen:
- Projekttitel
- Dokumentnummer und Datum
- Empfänger-Adresse
- Anschreiben-Text
- Leistungsbeschreibung
- Positionen und Preise
- Summen

### 3. PDF generieren

```bash
weasyprint documents/ANG-2026-XXX.html output/ANG-2026-XXX.pdf
```

## Schnellbefehl

Alles in einem Schritt:

```bash
# Neues Dokument anlegen und PDF erstellen
./create-document.sh ANG-2026-002    # Angebot
./create-document.sh RE-2026-001     # Rechnung
./create-document.sh Vertrag-Kunde   # Vertrag
```

## Dokumenttypen

- **ANG-YYYY-XXX** - Angebote
- **RE-YYYY-XXX** - Rechnungen
- **Vertrag-XXX** - Verträge
- **Abnahme-XXX** - Abnahmeprotokolle

## Corporate Design

- **Primärfarbe:** #A0BD3C (Grün)
- **Sekundärfarbe:** #635049 (Braun)
- **Schrift:** Fira Sans

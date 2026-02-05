#!/bin/bash

# Dokument-Generator für Orlyapps
# Usage: ./create-document.sh <dokumentname>
#        ./create-document.sh test
#        ./create-document.sh all

# Verzeichnis des Scripts ermitteln
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ordner erstellen falls nicht vorhanden
mkdir -p documents output

# Funktion: HTML verarbeiten und PDF generieren
build_pdf() {
    local html_file="$1"
    local pdf_file="$2"
    local dir=$(dirname "$html_file")
    local filename=$(basename "$html_file" .html)
    # Temporäre Datei im gleichen Ordner, damit relative Pfade (CSS, Assets) funktionieren
    local temp_file="${dir}/_calc_${filename}.html"
    
    # Summen berechnen (falls data-calc vorhanden)
    node "$SCRIPT_DIR/calculate-sums.js" "$html_file" "$temp_file" 2>/dev/null
    
    if [ $? -eq 0 ] && [ -f "$temp_file" ]; then
        # PDF aus berechneter Datei generieren
        weasyprint "$temp_file" "$pdf_file" 2>/dev/null
        local result=$?
        rm -f "$temp_file"
        return $result
    else
        # Fallback: Original-HTML verwenden
        weasyprint "$html_file" "$pdf_file" 2>/dev/null
        return $?
    fi
}

# Alle Dokumente bauen
if [ "$1" = "all" ]; then
    count=0
    for html_file in documents/*.html; do
        [ -f "$html_file" ] || continue
        filename=$(basename "$html_file" .html)
        # Temporäre Dateien überspringen
        [[ "$filename" == _* ]] && continue
        pdf_file="output/${filename}.pdf"
        echo "→ Building: $filename"
        build_pdf "$html_file" "$pdf_file"
        if [ $? -eq 0 ]; then
            echo "  ✓ $pdf_file"
            ((count++))
        else
            echo "  ✗ Fehler bei $filename"
        fi
    done
    echo ""
    echo "✓ $count PDF(s) generiert"
    exit 0
fi

# Test-Modus: Template testen
if [ "$1" = "test" ]; then
    cp template.html documents/_test.html
    build_pdf documents/_test.html output/_test.pdf
    rm documents/_test.html
    echo "✓ Test-PDF erstellt: output/_test.pdf"
    open output/_test.pdf 2>/dev/null || xdg-open output/_test.pdf 2>/dev/null
    exit 0
fi

if [ -z "$1" ]; then
    echo "Usage: ./create-document.sh <dokumentname>"
    echo "       ./create-document.sh test"
    echo "       ./create-document.sh all"
    echo ""
    echo "Beispiele:"
    echo "  ./create-document.sh ANG-2026-002      # Neues Angebot"
    echo "  ./create-document.sh RE-2026-001      # Neue Rechnung"
    echo "  ./create-document.sh Vertrag-Kunde    # Neuer Vertrag"
    echo "  ./create-document.sh test             # Template testen"
    echo "  ./create-document.sh all              # Alle Dokumente als PDF generieren"
    exit 1
fi

DOC_NAME=$1
HTML_FILE="documents/${DOC_NAME}.html"
PDF_FILE="output/${DOC_NAME}.pdf"

# Template kopieren oder PDF generieren
if [ ! -f "$HTML_FILE" ]; then
    cp template.html "$HTML_FILE"
    echo "✓ Dokument erstellt: $HTML_FILE"
    echo "  → Bitte bearbeiten und dann erneut ausführen"
else
    build_pdf "$HTML_FILE" "$PDF_FILE"
    echo "✓ PDF erstellt: $PDF_FILE"
fi

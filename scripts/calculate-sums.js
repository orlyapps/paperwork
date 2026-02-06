#!/usr/bin/env node

/**
 * Automatische Summenberechnung für Angebotsdokumente
 * 
 * Liest HTML-Dateien mit data-Attributen und berechnet:
 * - Zeilensummen (Menge × Einzelpreis)
 * - Netto-Summe
 * - MwSt.
 * - Brutto-Summe
 * 
 * Usage: node calculate-sums.js <input.html> <output.html>
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

/**
 * Formatiert einen Betrag im deutschen Format
 * @param {number} amount - Betrag in Euro
 * @returns {string} Formatierter Betrag (z.B. "1.234,56 €")
 */
function formatCurrency(amount) {
  return amount.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' €';
}

/**
 * Formatiert eine Zahl im deutschen Format (ohne Währung)
 * @param {number} num - Zahl
 * @returns {string} Formatierte Zahl
 */
function formatNumber(num) {
  return num.toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

/**
 * Formatiert ein Datum im deutschen Format (kurz)
 * @param {Date} date - Datum
 * @returns {string} Formatiertes Datum (z.B. "05.02.2026")
 */
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Berechnet ein Datum basierend auf dem data-date Wert
 * @param {string} value - Wert wie "today", "+30days", "-7days"
 * @returns {Date} Berechnetes Datum
 */
function parseDate(value) {
  const today = new Date();
  
  if (value === 'today') {
    return today;
  }
  
  // Format: +30days oder -7days
  const match = value.match(/^([+-]?)(\d+)days?$/i);
  if (match) {
    const sign = match[1] === '-' ? -1 : 1;
    const days = parseInt(match[2], 10);
    const result = new Date(today);
    result.setDate(result.getDate() + (sign * days));
    return result;
  }
  
  return today;
}

/**
 * Ersetzt alle Datumsfelder im Dokument
 * @param {Document} document - JSDOM Document
 */
function replaceDates(document) {
  const dateElements = document.querySelectorAll('[data-date]');
  
  dateElements.forEach(el => {
    const dateValue = el.dataset.date;
    const date = parseDate(dateValue);
    el.textContent = formatDate(date);
  });
  
  return dateElements.length;
}

/**
 * Berechnet Summen für eine Tabelle mit data-calc="true"
 * @param {Document} document - JSDOM Document
 * @param {Element} table - Tabellen-Element
 * @returns {Object} Berechnete Summen { subtotal, vat, total, vatRate }
 */
function calculateTableSums(document, table) {
  const vatRate = parseFloat(table.dataset.vat) || 19;
  let subtotal = 0;

  // Alle Zeilen mit data-quantity und data-unit-price verarbeiten
  const rows = table.querySelectorAll('tbody tr[data-quantity][data-unit-price]');
  
  rows.forEach(row => {
    const quantity = parseFloat(row.dataset.quantity) || 0;
    const unitPrice = parseFloat(row.dataset.unitPrice) || 0;
    const rowTotal = quantity * unitPrice;
    
    subtotal += rowTotal;

    // Zellen befüllen (Spaltenreihenfolge: Bezeichnung, Menge, Einheit, Einzelpreis, Gesamt)
    const cells = row.querySelectorAll('td');
    
    if (cells.length >= 5) {
      // Menge (2. Spalte, Index 1)
      if (!cells[1].textContent.trim()) {
        cells[1].textContent = formatNumber(quantity);
      }
      
      // Einzelpreis (4. Spalte, Index 3)
      if (!cells[3].textContent.trim()) {
        cells[3].textContent = formatCurrency(unitPrice);
      }
      
      // Gesamt (5. Spalte, Index 4)
      if (!cells[4].textContent.trim()) {
        cells[4].textContent = formatCurrency(rowTotal);
      }
    }
  });

  const vat = subtotal * (vatRate / 100);
  const total = subtotal + vat;

  return { subtotal, vat, total, vatRate };
}

/**
 * Füllt den Summenblock mit berechneten Werten
 * @param {Document} document - JSDOM Document
 * @param {Object} sums - Berechnete Summen
 */
function fillTotalsBlock(document, sums) {
  const totalsBlock = document.querySelector('[data-totals="true"]');
  
  if (!totalsBlock) return;

  // Subtotal (Netto)
  const subtotalField = totalsBlock.querySelector('[data-field="subtotal"]');
  if (subtotalField) {
    subtotalField.textContent = formatCurrency(sums.subtotal);
  }

  // MwSt.
  const vatField = totalsBlock.querySelector('[data-field="vat"]');
  if (vatField) {
    vatField.textContent = formatCurrency(sums.vat);
  }

  // Total (Brutto)
  const totalField = totalsBlock.querySelector('[data-field="total"]');
  if (totalField) {
    totalField.textContent = formatCurrency(sums.total);
  }
}

/**
 * Aktualisiert alle data-total="true" Elemente mit der berechneten Gesamtsumme
 * @param {Document} document - JSDOM Document
 * @param {Object} sums - Berechnete Summen
 */
function updateTotalFields(document, sums) {
  const totalElements = document.querySelectorAll('[data-total="true"]');
  
  totalElements.forEach(el => {
    el.textContent = formatCurrency(sums.total);
  });
}

/**
 * Verarbeitet eine HTML-Datei und berechnet alle Summen
 * @param {string} inputPath - Pfad zur Eingabedatei
 * @param {string} outputPath - Pfad zur Ausgabedatei
 */
function processDocument(inputPath, outputPath) {
  // HTML laden
  const html = fs.readFileSync(inputPath, 'utf-8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  let hasChanges = false;
  let result = { calculated: false, datesReplaced: 0 };

  // Datumsfelder ersetzen
  const datesReplaced = replaceDates(document);
  if (datesReplaced > 0) {
    hasChanges = true;
    result.datesReplaced = datesReplaced;
  }

  // Alle Tabellen mit data-calc="true" finden
  const calcTables = document.querySelectorAll('table[data-calc="true"]');
  
  if (calcTables.length > 0) {
    hasChanges = true;
    result.calculated = true;
    
    let totalSums = { subtotal: 0, vat: 0, total: 0, vatRate: 19 };

    calcTables.forEach(table => {
      const sums = calculateTableSums(document, table);
      totalSums.subtotal += sums.subtotal;
      totalSums.vat += sums.vat;
      totalSums.total += sums.total;
      totalSums.vatRate = sums.vatRate; // Letzter MwSt.-Satz wird verwendet
    });

    // Summenblock befüllen
    fillTotalsBlock(document, totalSums);
    
    // Alle data-total="true" Felder aktualisieren
    updateTotalFields(document, totalSums);
    
    result.subtotal = totalSums.subtotal;
    result.vat = totalSums.vat;
    result.total = totalSums.total;
  }

  if (!hasChanges) {
    // Keine Änderungen nötig - Original kopieren
    fs.copyFileSync(inputPath, outputPath);
    return result;
  }

  // HTML speichern
  fs.writeFileSync(outputPath, dom.serialize(), 'utf-8');
  
  return result;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node calculate-sums.js <input.html> <output.html>');
    process.exit(1);
  }

  const [inputPath, outputPath] = args;

  if (!fs.existsSync(inputPath)) {
    console.error(`Fehler: Datei nicht gefunden: ${inputPath}`);
    process.exit(1);
  }

  try {
    const result = processDocument(inputPath, outputPath);
    
    if (result.datesReplaced > 0) {
      console.log(`✓ ${result.datesReplaced} Datum(s) aktualisiert`);
    }
    
    if (result.calculated) {
      console.log(`✓ Summen berechnet:`);
      console.log(`  Netto:  ${formatCurrency(result.subtotal)}`);
      console.log(`  MwSt.:  ${formatCurrency(result.vat)}`);
      console.log(`  Brutto: ${formatCurrency(result.total)}`);
    }
  } catch (error) {
    console.error(`Fehler: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { processDocument, formatCurrency };

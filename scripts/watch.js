#!/usr/bin/env node

/**
 * Live PDF Watcher
 * 
 * Überwacht HTML-Dateien und generiert PDFs automatisch bei Änderungen.
 * Bietet eine Web-Vorschau mit Auto-Refresh via Server-Sent Events.
 * 
 * Usage: npm run watch
 */

const express = require('express');
const chokidar = require('chokidar');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');
const DOCUMENTS_DIR = path.join(ROOT_DIR, 'documents');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const PORT = 3000;

// SSE Clients
let clients = [];

// Debounce helper
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Generiert ein PDF aus einer HTML-Datei
 * @param {string} htmlFile - Pfad zur HTML-Datei
 * @returns {boolean} true bei Erfolg
 */
function buildPdf(htmlFile) {
  const filename = path.basename(htmlFile, '.html');
  
  // Temporäre Dateien überspringen
  if (filename.startsWith('_')) {
    return false;
  }
  
  const pdfFile = path.join(OUTPUT_DIR, `${filename}.pdf`);
  const tempFile = path.join(DOCUMENTS_DIR, `_calc_${filename}.html`);
  
  console.log(`\n→ Building: ${filename}`);
  
  try {
    // Summen berechnen (falls data-calc vorhanden)
    try {
      execSync(`node "${path.join(__dirname, 'calculate-sums.js')}" "${htmlFile}" "${tempFile}"`, {
        cwd: ROOT_DIR,
        stdio: 'pipe'
      });
    } catch (e) {
      // Fallback: Original verwenden
      fs.copyFileSync(htmlFile, tempFile);
    }
    
    // PDF generieren
    const sourceFile = fs.existsSync(tempFile) ? tempFile : htmlFile;
    execSync(`weasyprint "${sourceFile}" "${pdfFile}"`, {
      cwd: ROOT_DIR,
      stdio: 'pipe'
    });
    
    // Temporäre Datei löschen
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    
    console.log(`  ✓ ${pdfFile}`);
    return true;
  } catch (error) {
    console.error(`  ✗ Fehler: ${error.message}`);
    
    // Temporäre Datei aufräumen
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    return false;
  }
}

/**
 * Sendet ein Event an alle SSE-Clients
 * @param {Object} data - Event-Daten
 */
function broadcastUpdate(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    client.write(message);
  });
}

/**
 * Handler für Dateiänderungen
 * @param {string} filePath - Pfad zur geänderten Datei
 */
const handleFileChange = debounce((filePath) => {
  const filename = path.basename(filePath, '.html');
  
  // Temporäre Dateien ignorieren
  if (filename.startsWith('_')) {
    return;
  }
  
  const success = buildPdf(filePath);
  
  if (success) {
    broadcastUpdate({
      type: 'update',
      file: filename,
      timestamp: Date.now()
    });
  }
}, 500);

/**
 * Listet alle verfügbaren Dokumente
 * @returns {string[]} Liste der Dokumentnamen (ohne .html)
 */
function listDocuments() {
  if (!fs.existsSync(DOCUMENTS_DIR)) {
    return [];
  }
  
  return fs.readdirSync(DOCUMENTS_DIR)
    .filter(f => f.endsWith('.html') && !f.startsWith('_'))
    .map(f => f.replace('.html', ''))
    .sort();
}

// Express Server
const app = express();

// Statische Dateien
app.use('/output', express.static(OUTPUT_DIR, {
  setHeaders: (res) => {
    // Cache deaktivieren für PDFs
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));
app.use('/assets', express.static(path.join(ROOT_DIR, 'assets')));

// API: Liste der Dokumente
app.get('/api/documents', (req, res) => {
  res.json(listDocuments());
});

// SSE Endpoint
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Initial event
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  
  // Client registrieren
  clients.push(res);
  
  // Cleanup bei Verbindungsabbruch
  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

// Preview HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'preview.html'));
});

// Server starten
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                    PDF Live Watcher                        ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Vorschau:  http://localhost:${PORT}                         ║
║                                                            ║
║  Überwache: documents/*.html                               ║
║                                                            ║
║  Drücke Ctrl+C zum Beenden                                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);
});

// File Watcher starten - überwache Verzeichnis, filtere nach .html
const watcher = chokidar.watch(DOCUMENTS_DIR, {
  ignoreInitial: true,
  ignored: (filePath) => {
    const basename = path.basename(filePath);
    // Ignoriere: Nicht-HTML, temporäre Dateien, Verzeichnisse
    if (filePath === DOCUMENTS_DIR) return false; // Verzeichnis selbst nicht ignorieren
    if (!basename.endsWith('.html')) return true;
    if (basename.startsWith('_')) return true;
    return false;
  },
  persistent: true,
  // Polling für zuverlässige Erkennung bei Editoren wie Cursor/VS Code
  usePolling: true,
  interval: 500,
  // Warten bis Datei fertig geschrieben ist
  awaitWriteFinish: {
    stabilityThreshold: 500,
    pollInterval: 100
  }
});

watcher
  .on('ready', () => {
    const files = fs.readdirSync(DOCUMENTS_DIR).filter(f => f.endsWith('.html') && !f.startsWith('_'));
    console.log(`Watcher bereit. Überwache ${files.length} Dateien:`);
    files.forEach(f => console.log(`  - ${f}`));
    console.log('');
  })
  .on('change', (filePath) => {
    if (!filePath.endsWith('.html')) return;
    console.log(`Änderung erkannt: ${path.basename(filePath)}`);
    handleFileChange(filePath);
  })
  .on('add', (filePath) => {
    if (!filePath.endsWith('.html')) return;
    console.log(`Neue Datei: ${path.basename(filePath)}`);
    handleFileChange(filePath);
  });

// Graceful Shutdown
process.on('SIGINT', () => {
  console.log('\n\nWatcher beendet.');
  watcher.close();
  process.exit(0);
});

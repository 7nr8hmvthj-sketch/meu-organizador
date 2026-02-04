import fs from 'fs';

// Parse CSV
const csvPath = '/home/ubuntu/upload/Plantaozinho-Exported-Data.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Get headers
const headers = parseCSVLine(lines[0]);
console.log('Headers:', headers);

// Parse all rows
const rows = [];
for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);
  if (values.length >= headers.length) {
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
}

console.log(`Parsed ${rows.length} rows`);

// Determine event type based on title (ignoring CSV times which are incorrect)
function determineType(title, place) {
  const titleLower = title.toLowerCase();
  const placeLower = place.toLowerCase();
  
  // Check if it's HC
  const isHC = titleLower.includes('hc') || placeLower.includes('hc');
  
  // Check if it's Zona Norte
  const isZN = titleLower.includes('zn') || titleLower.includes('zona norte') || 
               placeLower.includes('zona norte') || titleLower.includes('corredor') ||
               titleLower.includes('observação') || titleLower.includes('observacao');
  
  // Determine shift type from title
  // Apoio (19-01)
  if (titleLower.includes('apoio')) {
    return 'Apoio (19-01)';
  }
  
  // Noturno (19-07)
  if (titleLower.includes('noturno')) {
    if (isHC) return 'HC Noturno';
    return 'Noturno (19-07)';
  }
  
  // Corredor/Observação = Zona Norte Tarde
  if (titleLower.includes('corredor') || titleLower.includes('observação') || titleLower.includes('observacao')) {
    return 'Zona Norte (Tarde)';
  }
  
  // Tarde (13-19) - check for "13-19" or "tarde"
  if (titleLower.includes('13-19') || titleLower.includes('tarde')) {
    if (isHC) return 'HC Tarde';
    return 'Zona Norte (Tarde)';
  }
  
  // Manhã (07-13) - check for "manhã", "manha", or morning indicators
  if (titleLower.includes('manhã') || titleLower.includes('manha') || titleLower.includes('07-13')) {
    if (isHC) return 'HC Manhã';
    if (isZN || titleLower.includes('zn')) return 'Zona Norte (Manhã)';
    // Default to location-based
    if (placeLower.includes('hc')) return 'HC Manhã';
    return 'Zona Norte (Manhã)';
  }
  
  // Personal events (yellow color events or specific keywords)
  if (titleLower.includes('formatura') || titleLower.includes('nutri') || 
      titleLower.includes('samila') || titleLower.includes('oferecer')) {
    return 'Pessoal';
  }
  
  // Fixo patterns - try to determine from context
  if (titleLower.includes('fixo')) {
    if (titleLower.includes('noturno')) return 'Noturno (19-07)';
    if (titleLower.includes('13-19')) return 'Zona Norte (Tarde)';
    // Default fixo to the most common pattern
    return 'Zona Norte (Manhã)';
  }
  
  // If HC is in place but no time indicator, assume manhã (most common)
  if (isHC) return 'HC Manhã';
  
  // If ZN is in title/place but no time indicator
  if (isZN) return 'Zona Norte (Manhã)';
  
  // Default fallback - quando não há informação de local, é sempre Zona Norte
  return 'Zona Norte (Manhã)';
}

// Check if event was passed (place = "Passei" or title contains "passei")
function isPassed(place, title) {
  const placeLower = place.toLowerCase();
  const titleLower = title.toLowerCase();
  return placeLower === 'passei' || placeLower.includes('passei');
}

// Check if it's a personal event (not a shift)
function isPersonalEvent(title, color) {
  const titleLower = title.toLowerCase();
  // Yellow color (#fde3a7) or specific personal keywords
  if (color === '#fde3a7') return true;
  if (titleLower.includes('formatura') || titleLower.includes('nutri') || 
      titleLower.includes('samila') || titleLower.includes('oferecer')) return true;
  return false;
}

// Generate SQL insert statements
const insertStatements = [];

rows.forEach((row, idx) => {
  const title = row.title || '';
  const startDate = row.start_date || '';
  const place = row.place || '';
  const color = row.color || '';
  const notes = row.notes || '';
  
  if (!startDate) return;
  
  // Parse date (format: 2026-01-01T07:00:00-03:00)
  const dateOnly = startDate.split('T')[0];
  
  const type = determineType(title, place);
  const passed = isPassed(place, title);
  const isShift = !isPersonalEvent(title, color);
  
  // Description is the title
  let description = title;
  
  // Passed reason - use the title as it contains info about who it was passed to
  let passedReason = null;
  if (passed) {
    passedReason = title;
  }
  
  // Escape single quotes for SQL
  const escapeSQL = (str) => str.replace(/'/g, "''");
  
  const sql = `INSERT INTO events (userId, date, type, description, isShift, isPassed, passedReason, isCancelled) VALUES (1, '${dateOnly}', '${escapeSQL(type)}', '${escapeSQL(description)}', ${isShift ? 1 : 0}, ${passed ? 1 : 0}, ${passedReason ? `'${escapeSQL(passedReason)}'` : 'NULL'}, 0);`;
  
  insertStatements.push(sql);
});

// Write SQL file
const sqlContent = insertStatements.join('\n');
fs.writeFileSync('/home/ubuntu/meu-organizador/scripts/import-events.sql', sqlContent);

console.log(`Generated ${insertStatements.length} INSERT statements`);
console.log('SQL file written to: /home/ubuntu/meu-organizador/scripts/import-events.sql');

// Summary by type
const typeCounts = {};
rows.forEach(row => {
  const type = determineType(row.title, row.place);
  typeCounts[type] = (typeCounts[type] || 0) + 1;
});

console.log('\nSummary by type:');
Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

const passedCount = rows.filter(r => isPassed(r.place, r.title)).length;
console.log(`\nTotal passed: ${passedCount}`);

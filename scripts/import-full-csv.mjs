import mysql from 'mysql2/promise';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Ler CSV
const csvContent = fs.readFileSync('/home/ubuntu/upload/Plantaozinho-Exported-Data.csv', 'utf-8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true
});

console.log(`Total de eventos no CSV: ${records.length}`);

// Limpar tabela de eventos
await connection.execute('DELETE FROM events WHERE userId = 1');
console.log('Tabela de eventos limpa');

// Mapear tipos
function getEventType(title, place) {
  const t = title.toLowerCase();
  const p = place.toLowerCase();
  
  if (t.includes('hc') && t.includes('manhã')) return 'HC Manhã';
  if (t.includes('hc') && t.includes('manha')) return 'HC Manhã';
  if (t.includes('hc') && (t.includes('tarde') || t.includes('13-19'))) return 'HC Tarde';
  if (t.includes('corredor')) return 'Zona Norte (Tarde)';
  if (t.includes('observação')) return 'Zona Norte (Tarde)';
  if (t.includes('apoio')) return 'Apoio (19-01)';
  if (t.includes('noturno')) return 'Noturno (19-07)';
  if (t.includes('manhã') || t.includes('manha')) return 'Zona Norte (Manhã)';
  if (t.includes('tarde') || t.includes('13-19')) return 'Zona Norte (Tarde)';
  if (t.includes('12') || t.includes('dia')) return 'Plantão 12h';
  if (t.includes('acad') || t.includes('treino') || t.includes('musculação')) return 'Musculação';
  if (t.includes('pilates')) return 'Pilates';
  if (t.includes('natação') || t.includes('natacao')) return 'Natação';
  if (t.includes('virginia') || t.includes('sebastiana') || t.includes('pedro') || t.includes('aldemir')) return 'HD';
  if (t.includes('nutri')) return 'Pessoal';
  if (t.includes('terapia')) return 'Pessoal';
  if (t.includes('samila')) return 'Pessoal';
  
  return 'Plantão';
}

function getColor(type) {
  if (type.includes('HC')) return '#ff3b30';
  if (type.includes('Zona Norte')) return '#30b0c7';
  if (type.includes('Noturno')) return '#5856d6';
  if (type.includes('Apoio')) return '#ff9500';
  if (type === 'Musculação') return '#34c759';
  if (type === 'Pilates') return '#af52de';
  if (type === 'Natação') return '#007aff';
  if (type === 'HD') return '#ff2d55';
  if (type === 'Pessoal') return '#ffcc00';
  return '#8e8e93';
}

// Inserir eventos do CSV
let imported = 0;
for (const record of records) {
  const dateStr = record.start_date.split('T')[0];
  const date = new Date(dateStr + 'T12:00:00');
  date.setDate(date.getDate() + 1); // Compensar timezone
  
  const type = getEventType(record.title, record.place);
  const color = getColor(type);
  
  const isPassed = record.place === 'Passei' || 
                   record.title.toLowerCase().includes('passei') ||
                   record.notes.toLowerCase().includes('passei');
  
  await connection.execute(
    `INSERT INTO events (userId, date, type, description, color, isPassed, passedReason, createdAt, updatedAt)
     VALUES (1, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [date, type, record.title, color, isPassed ? 1 : 0, isPassed ? record.notes || '' : '']
  );
  imported++;
}

console.log(`${imported} eventos importados do CSV`);

// Adicionar natação fixa (de 31/01/2026 até 31/12/2026)
const natacaoSchedule = [
  { day: 1, time: '20:45' }, // Segunda
  { day: 2, time: '11:40' }, // Terça
  { day: 3, time: '20:45' }, // Quarta
  { day: 5, time: '20:45' }, // Sexta
  { day: 6, time: '12:10' }  // Sábado
];

let natacaoCount = 0;
const startDate = new Date('2026-01-31T12:00:00');
const endDate = new Date('2026-12-31T12:00:00');

for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  const dayOfWeek = d.getDay();
  const schedule = natacaoSchedule.find(s => s.day === dayOfWeek);
  
  if (schedule) {
    const eventDate = new Date(d);
    eventDate.setDate(eventDate.getDate() + 1); // Compensar timezone
    
    await connection.execute(
      `INSERT INTO events (userId, date, type, description, color, isPassed, passedReason, createdAt, updatedAt)
       VALUES (1, ?, 'Natação', ?, '#007aff', 0, '', NOW(), NOW())`,
      [eventDate, `Natação ${schedule.time}`]
    );
    natacaoCount++;
  }
}

console.log(`${natacaoCount} eventos de natação adicionados`);
console.log('Importação completa!');

await connection.end();

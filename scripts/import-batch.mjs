import { getDb } from '../server/db.js';
import fs from 'fs';

const db = await getDb();

// Ler SQL
const sql = fs.readFileSync('/home/ubuntu/import-events.sql', 'utf-8');
const statements = sql.split(';\n').filter(s => s.trim());

console.log(`Executando ${statements.length} statements...`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i].trim();
  if (stmt) {
    try {
      await db.execute(stmt);
      if ((i + 1) % 50 === 0) {
        console.log(`${i + 1}/${statements.length} executados...`);
      }
    } catch (error) {
      console.error(`Erro no statement ${i + 1}:`, error.message);
    }
  }
}

console.log('Importação concluída!');
process.exit(0);

import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);

// Load environment variables
const dotenv = require('dotenv');
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Import drizzle
const { drizzle } = require('drizzle-orm/mysql2');

async function main() {
  const db = drizzle(process.env.DATABASE_URL);
  
  // Read SQL file
  const sqlContent = fs.readFileSync('/home/ubuntu/meu-organizador/scripts/import-events.sql', 'utf-8');
  const statements = sqlContent.split('\n').filter(s => s.trim());
  
  console.log(`Importing ${statements.length} events...`);
  
  // Execute each statement
  let success = 0;
  let failed = 0;
  
  for (const stmt of statements) {
    try {
      await db.execute(stmt);
      success++;
      if (success % 50 === 0) {
        console.log(`Progress: ${success}/${statements.length}`);
      }
    } catch (err) {
      console.error(`Failed: ${stmt.substring(0, 100)}...`);
      console.error(err.message);
      failed++;
    }
  }
  
  console.log(`\nImport complete!`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

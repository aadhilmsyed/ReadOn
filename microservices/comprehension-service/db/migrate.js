const fs = require('fs');
const path = require('path');

const { transaction } = require('./client');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();

  await transaction(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS comprehension_schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    for (const file of files) {
      const existing = await client.query(
        'SELECT filename FROM comprehension_schema_migrations WHERE filename = $1',
        [file],
      );

      if (existing.rowCount > 0) {
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO comprehension_schema_migrations (filename) VALUES ($1)', [file]);
    }
  });
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('comprehension migrations applied');
      process.exit(0);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runMigrations };

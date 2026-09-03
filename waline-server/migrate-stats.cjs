const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { createStatsPool } = require('./stats.cjs');

const migrate = async () => {
  const schema = await readFile(path.join(__dirname, 'stats-schema.sql'), 'utf8');
  const pool = createStatsPool();

  try {
    await pool.query(schema);
    console.log('Stats tables are ready.');
  } finally {
    await pool.end();
  }
};

migrate().catch((error) => {
  console.error('Stats migration failed', error);
  process.exitCode = 1;
});

const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

  // Parse the connection string manually
  const url = new URL(process.env.DATABASE_URL);
  console.log('Host:', url.hostname);
  console.log('Port:', url.port);
  console.log('Database:', url.pathname.slice(1));
  console.log('Username:', url.username);

  const client = new Client({
    host: url.hostname,
    port: url.port,
    database: url.pathname.slice(1),
    user: url.username,
    password: url.password,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('✅ Connected to Supabase successfully!');

    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database query successful:', result.rows[0]);

    await client.end();
    console.log('✅ Connection closed successfully');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error);
    process.exit(1);
  }
}

testConnection();

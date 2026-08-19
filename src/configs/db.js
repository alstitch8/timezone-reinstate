require("dotenv").config();

const { Pool } = require("pg");

function requireEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new Error(`Missing required database environment variable: ${name}`);
  }
  return String(value);
}

const pgHost = requireEnv("PG_HOST");
const pgUser = requireEnv("PG_USER");
const pgPassword = requireEnv("PG_PASSWORD");
const pgDatabase = requireEnv("PG_DATABASE");
const pgPort = Number(process.env.PG_PORT || 5432);

const pool = new Pool({
  host: pgHost,
  port: pgPort,
  user: pgUser,
  password: pgPassword,
  database: pgDatabase,
  ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

module.exports = pool;

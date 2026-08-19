const pool = require("../configs/db");

function health(req, res) {
  res.json({ success: true, service: "timezone-api" });
}

async function dbHealth(req, res) {
  const result = await pool.query("SELECT 1 AS ok");

  res.json({
    success: true,
    service: "timezone-api",
    database: "connected",
    check: result.rows[0],
  });
}

module.exports = {
  health,
  dbHealth,
};

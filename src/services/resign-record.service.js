const pool = require("../configs/db");

async function findEmployeeByEmpCode(empCode) {
  const query = {
    text: "SELECT id, ssn FROM personnel_employee WHERE emp_code = $1 LIMIT 1",
    values: [String(empCode)],
  };

  const result = await pool.query(query);

  if (!result.rows.length) {
    return null;
  }

  return result.rows[0];
}

async function findLatestResignIdByEmployeeDbId(employeeDbId) {
  const query = {
    text: "SELECT id FROM personnel_resign WHERE employee_id = $1 ORDER BY id DESC LIMIT 1",
    values: [String(employeeDbId)],
  };

  const result = await pool.query(query);

  if (!result.rows.length) {
    return null;
  }

  return result.rows[0].id;
}

async function clearEmployeeSsnByEmpCode(empCode) {
  const query = {
    text: "UPDATE personnel_employee SET ssn = NULL WHERE emp_code = $1",
    values: [String(empCode)],
  };

  await pool.query(query);
}

async function restoreEmployeeSsnByEmpCode(empCode, ssn) {
  const query = {
    text: "UPDATE personnel_employee SET ssn = $1 WHERE emp_code = $2",
    values: [ssn, String(empCode)],
  };

  await pool.query(query);
}

module.exports = {
  findEmployeeByEmpCode,
  findLatestResignIdByEmployeeDbId,
  clearEmployeeSsnByEmpCode,
  restoreEmployeeSsnByEmpCode,
};

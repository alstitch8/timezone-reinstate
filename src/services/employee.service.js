const timezoneService = require("./timezone.service");
const resignRecordService = require("./resign-record.service");
const { todayAsYYYYMMDD } = require("../helper/date.helper");
const ApiError = require("../untils/ApiError");

function getPool() {
  return require("../configs/db");
}

function normalizeDisableAtt(value) {
  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }

  if (value === undefined || value === null || String(value).trim() === "") {
    return "True";
  }

  return String(value);
}

function hasSsnValue(ssn) {
  return ssn !== null && ssn !== undefined && String(ssn).trim() !== "";
}

function mapEmployeeRow(row) {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    employeeid: row.employeeid,
    department: row.department,
    company: row.company,
  };
}

function compactEmployeeRow(row) {
  return Object.fromEntries(
    Object.entries(mapEmployeeRow(row)).filter(([, value]) => value !== undefined)
  );
}

async function findEmployeesByCodes(employeeIds = []) {
  const normalizedIds = employeeIds.map((employeeId) => String(employeeId));
  const pool = getPool();
  const query = {
    text: `
      SELECT
        p.id AS id,
        p.first_name,
        p.last_name,
        p.emp_code AS employeeid
      FROM personnel_employee p
      WHERE p.emp_code = ANY($1::text[])
    `,
    values: [normalizedIds],
  };

  const result = await pool.query(query);
  const employeesById = new Map(
    result.rows.map((row) => [String(row.employeeid), compactEmployeeRow(row)])
  );

  return normalizedIds.map((employeeId) => {
    const employee = employeesById.get(employeeId);

    if (!employee) {
      return {
        success: false,
        employeeId,
        message: "employee not found",
      };
    }

    return {
      success: true,
      employee,
    };
  });
}

async function findAllEmployees(filters = {}) {
  const pool = getPool();
  const values = [];
  const where = [];

  if (filters.department !== undefined) {
    values.push(String(filters.department));
    where.push(`d.dept_name = $${values.length}`);
  }

  if (filters.company !== undefined) {
    values.push(String(filters.company));
    where.push(`(e.id::text = $${values.length} OR e."name" = $${values.length})`);
  }

  const query = {
    text: `
      SELECT
        p.id AS id,
        p.first_name,
        p.last_name,
        p.emp_code AS employeeid,
        d.dept_name AS department,
        e."name" AS company
      FROM personnel_employee p
      LEFT JOIN personnel_department d ON d.id = p.department_id
      LEFT JOIN personnel_company e ON e.id = p.company_id
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY p.emp_code
    `,
    values,
  };

  const result = await pool.query(query);
  return result.rows.map(compactEmployeeRow);
}

async function findAllCompanies() {
  const pool = getPool();
  const result = await pool.query(`
    SELECT co."name", co.id
    FROM personnel_company co
  `);

  return result.rows;
}

async function findAllDepartments() {
  const pool = getPool();
  const result = await pool.query(`
    SELECT DISTINCT e.dept_name, e.company_id
    FROM personnel_department e
  `);

  return result.rows;
}

async function getEmployees(payload = {}) {
  if (payload.all === true) {
    return {
      mode: "all",
      employees: await findAllEmployees({
        department: payload.department,
        company: payload.company,
      }),
    };
  }

  const employeeIds = Array.isArray(payload.employeeIds)
    ? payload.employeeIds
    : [payload.employeeId];
  const results = await findEmployeesByCodes(employeeIds);

  if (!Array.isArray(payload.employeeIds)) {
    const result = results[0];

    if (!result.success) {
      throw new ApiError(404, "employee not found");
    }

    return {
      mode: "single",
      employee: result.employee,
    };
  }

  return {
    mode: "many",
    results,
  };
}

async function resignEmployeeWithSsnHack(employeeCode, employeeId, csrfToken, resignDetails) {
  const employeeRecord = await resignRecordService.findEmployeeByEmpCode(employeeCode);

  if (!employeeRecord) {
    throw new ApiError(404, "employee does not exist");
  }

  const resignId = await resignRecordService.findLatestResignIdByEmployeeDbId(
    employeeRecord.id
  );

  if (resignId) {
    throw new ApiError(409, "employee already resigned");
  }

  const currentSsn = employeeRecord ? employeeRecord.ssn : null;
  const shouldTemporarilyClearSsn = hasSsnValue(currentSsn);

  if (shouldTemporarilyClearSsn) {
    await resignRecordService.clearEmployeeSsnByEmpCode(employeeCode);
  }

  let resignError;
  let actionResult;

  try {
    actionResult = await timezoneService.resignEmployee(employeeId, csrfToken, resignDetails);
  } catch (error) {
    resignError = error;
    throw error;
  } finally {
    if (shouldTemporarilyClearSsn) {
      try {
        await resignRecordService.restoreEmployeeSsnByEmpCode(employeeCode, currentSsn);
      } catch (restoreError) {
        if (resignError) {
          console.error("Failed to restore SSN after resign failure:", restoreError.message);
        } else {
          throw new ApiError(500, "failed to restore employee ssn", {
            cause: restoreError.message,
          });
        }
      }
    }
  }

  return {
    actionResult,
    ssnTemporarilyCleared: shouldTemporarilyClearSsn,
  };
}

async function resignByEmployeeCode(payload = {}) {
  const {
    employeeCode,
    resignType = "1",
    disableAtt,
    resignReason = "test",
    resignDate,
    reportGenerationEndDate,
  } = payload;

  const effectiveDate = resignDate || todayAsYYYYMMDD();
  const effectiveReportDate = reportGenerationEndDate || effectiveDate;

  const csrfToken = await timezoneService.login();
  const employee = await timezoneService.findEmployee(employeeCode);

  const resignResult = await resignEmployeeWithSsnHack(employeeCode, employee.id, csrfToken, {
    resignDate: effectiveDate,
    resignType,
    reportGenerationEndDate: effectiveReportDate,
    disableAtt: normalizeDisableAtt(disableAtt),
    resignReason,
  });

  return {
    employee,
    input: {
      resignDate: effectiveDate,
      resignType,
      reportGenerationEndDate: effectiveReportDate,
      disableAtt: normalizeDisableAtt(disableAtt),
      resignReason,
    },
    ssnTemporarilyCleared: resignResult.ssnTemporarilyCleared,
    timezoneResponse: resignResult.actionResult,
  };
}

async function resignManyByEmployeeCodes(payloadList = []) {
  const csrfToken = await timezoneService.login();
  const results = [];

  for (const payload of payloadList) {
    const {
      employeeCode,
      resignType = "1",
      disableAtt,
      resignReason = "test",
      resignDate,
      reportGenerationEndDate,
    } = payload;

    const effectiveDate = resignDate || todayAsYYYYMMDD();
    const effectiveReportDate = reportGenerationEndDate || effectiveDate;

    try {
      const employee = await timezoneService.findEmployee(employeeCode);

      const resignResult = await resignEmployeeWithSsnHack(employeeCode, employee.id, csrfToken, {
        resignDate: effectiveDate,
        resignType,
        reportGenerationEndDate: effectiveReportDate,
        disableAtt: normalizeDisableAtt(disableAtt),
        resignReason,
      });

      results.push({
        success: true,
        employee: {
          employeeCode: employee.emp_code,
          id: employee.id,
        },
        input: {
          resignDate: effectiveDate,
          resignType,
          reportGenerationEndDate: effectiveReportDate,
          disableAtt: normalizeDisableAtt(disableAtt),
          resignReason,
        },
        ssnTemporarilyCleared: resignResult.ssnTemporarilyCleared,
        timezoneResponse: resignResult.actionResult,
      });
    } catch (error) {
      results.push({
        success: false,
        employeeCode: String(employeeCode),
        message: error.message,
        details: error.response ? error.response.data : undefined,
      });
    }
  }

  return results;
}

async function reinstateByEmployeeIdWithToken(employeeId, csrfToken) {
  console.log(`Reinstating employee with ID: ${employeeId}...`);

  const employeeRecord = await resignRecordService.findEmployeeByEmpCode(employeeId);

  if (!employeeRecord) {
    throw new ApiError(404, "employee does not exist");
  }

  const resignId = await resignRecordService.findLatestResignIdByEmployeeDbId(
    employeeRecord.id
  );

  if (!resignId) {
    throw new ApiError(409, "employee is active");
  }

  const currentSsn = employeeRecord.ssn;
  const hasSsn = hasSsnValue(currentSsn);

  if (hasSsn) {
    await resignRecordService.clearEmployeeSsnByEmpCode(employeeId);
  }

  let reinstateError;
  let actionResult;

  try {
    actionResult = await timezoneService.reinstateEmployee(resignId, csrfToken);
  } catch (error) {
    reinstateError = error;
    throw error;
  } finally {
    if (hasSsn) {
      try {
        await resignRecordService.restoreEmployeeSsnByEmpCode(employeeId, currentSsn);
      } catch (restoreError) {
        if (reinstateError) {
          console.error("Failed to restore SSN after reinstate failure:", restoreError.message);
        } else {
          throw new ApiError(500, "failed to restore employee ssn", {
            cause: restoreError.message,
          });
        }
      }
    }
  }

  return {
    employeeId: String(employeeId),
    resignId: String(resignId),
    ssnTemporarilyCleared: hasSsn,
    timezoneResponse: actionResult,
  };
}

async function reinstateByEmployeeId(employeeId) {
  const csrfToken = await timezoneService.login();
  return reinstateByEmployeeIdWithToken(employeeId, csrfToken);
}

async function reinstateManyByEmployeeIds(payloadList = []) {
  const csrfToken = await timezoneService.login();
  const results = [];

  for (const payload of payloadList) {
    const employeeId = payload.employeeId;

    try {
      const result = await reinstateByEmployeeIdWithToken(employeeId, csrfToken);
      results.push({
        success: true,
        employeeId: result.employeeId,
        resignId: result.resignId,
        ssnTemporarilyCleared: result.ssnTemporarilyCleared,
        timezoneResponse: result.timezoneResponse,
      });
    } catch (error) {
      results.push({
        success: false,
        employeeId: String(employeeId),
        message: error.message,
        details: error.response ? error.response.data : error.details,
      });
    }
  }

  return results;
}

module.exports = {
  getEmployees,
  findAllCompanies,
  findAllDepartments,
  resignByEmployeeCode,
  resignManyByEmployeeCodes,
  reinstateByEmployeeId,
  reinstateManyByEmployeeIds,
};

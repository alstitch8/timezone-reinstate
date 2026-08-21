const employeeService = require("../services/employee.service");

async function getEmployees(req, res) {
  const result = await employeeService.getEmployees(req.body || {});

  if (result.mode === "all") {
    return res.json({
      success: true,
      total: result.employees.length,
      employees: result.employees,
    });
  }

  if (result.mode === "many") {
    const successCount = result.results.filter((item) => item.success).length;
    const failedCount = result.results.length - successCount;

    return res.status(failedCount > 0 ? 207 : 200).json({
      success: failedCount === 0,
      total: result.results.length,
      successCount,
      failedCount,
      results: result.results,
    });
  }

  return res.json({
    success: true,
    employee: result.employee,
  });
}

async function resign(req, res) {
  const payload = req.body;

  if (Array.isArray(payload)) {
    const results = await employeeService.resignManyByEmployeeCodes(payload);
    const successCount = results.filter((item) => item.success).length;
    const failedCount = results.length - successCount;

    return res.status(failedCount > 0 ? 207 : 200).json({
      success: failedCount === 0,
      total: results.length,
      successCount,
      failedCount,
      results,
    });
  }

  const result = await employeeService.resignByEmployeeCode(payload || {});

  return res.json({
    success: true,
    employee: {
      employeeCode: result.employee.emp_code,
      id: result.employee.id,
    },
    input: result.input,
    timezoneResponse: result.timezoneResponse,
  });
}

async function reinstate(req, res) {
  const payload = req.body;

  if (Array.isArray(payload)) {
    const results = await employeeService.reinstateManyByEmployeeIds(payload);
    const successCount = results.filter((item) => item.success).length;
    const failedCount = results.length - successCount;

    return res.status(failedCount > 0 ? 207 : 200).json({
      success: failedCount === 0,
      total: results.length,
      successCount,
      failedCount,
      results,
    });
  }

  const { employeeId } = payload || {};

  const result = await employeeService.reinstateByEmployeeId(employeeId);

  return res.json({
    success: true,
    employeeId: result.employeeId,
    resignId: result.resignId,
    timezoneResponse: result.timezoneResponse,
  });
}

module.exports = {
  getEmployees,
  resign,
  reinstate,
};

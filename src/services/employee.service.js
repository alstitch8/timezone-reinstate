const timezoneService = require("./timezone.service");
const resignRecordService = require("./resign-record.service");
const { todayAsYYYYMMDD } = require("../helper/date.helper");
const ApiError = require("../untils/ApiError");

function normalizeDisableAtt(value) {
  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }

  if (value === undefined || value === null || String(value).trim() === "") {
    return "True";
  }

  return String(value);
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

  const actionResult = await timezoneService.resignEmployee(employee.id, csrfToken, {
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
    timezoneResponse: actionResult,
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

      const actionResult = await timezoneService.resignEmployee(employee.id, csrfToken, {
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
        timezoneResponse: actionResult,
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
    throw new ApiError(404, "employee does not exist");
  }

  const currentSsn = employeeRecord.ssn;
  const hasSsn = currentSsn !== null && String(currentSsn).trim() !== "";

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
  resignByEmployeeCode,
  resignManyByEmployeeCodes,
  reinstateByEmployeeId,
  reinstateManyByEmployeeIds,
};

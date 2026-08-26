const ApiError = require("../untils/ApiError");

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function isValidYYYYMMDD(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

function validateResignItem(item, indexLabel) {
  const errors = [];

  if (!item || typeof item !== "object" || Array.isArray(item)) {
    errors.push(`${indexLabel}: payload item must be an object`);
    return errors;
  }

  if (isBlank(item.employeeCode)) {
    errors.push(`${indexLabel}: employeeCode is required`);
  }

  if (item.resignDate !== undefined && !isValidYYYYMMDD(item.resignDate)) {
    errors.push(`${indexLabel}: resignDate must be in YYYY-MM-DD format`);
  }

  if (
    item.reportGenerationEndDate !== undefined &&
    !isValidYYYYMMDD(item.reportGenerationEndDate)
  ) {
    errors.push(`${indexLabel}: reportGenerationEndDate must be in YYYY-MM-DD format`);
  }

  return errors;
}

function validateResignRequest(req, res, next) {
  const body = req.body;
  const errors = [];

  if (Array.isArray(body)) {
    if (body.length === 0) {
      errors.push("payload array cannot be empty");
    }

    body.forEach((item, index) => {
      errors.push(...validateResignItem(item, `item[${index}]`));
    });
  } else {
    errors.push(...validateResignItem(body || {}, "item"));
  }

  if (errors.length > 0) {
    return next(new ApiError(400, "Validation failed", errors));
  }

  return next();
}

function validateGetEmployeesRequest(req, res, next) {
  const body = req.body || {};
  const errors = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    errors.push("item: payload must be an object");
  } else if (body.all === true) {
    if (!isBlank(body.employeeId) || body.employeeIds !== undefined) {
      errors.push("item: all cannot be combined with employeeId or employeeIds");
    }

    if (body.department !== undefined && isBlank(body.department)) {
      errors.push("item: department cannot be blank");
    }

    if (body.company !== undefined && isBlank(body.company)) {
      errors.push("item: company cannot be blank");
    }
  } else if (Array.isArray(body.employeeIds)) {
    if (body.department !== undefined || body.company !== undefined) {
      errors.push("item: department and company filters require all to be true");
    }

    if (body.employeeIds.length === 0) {
      errors.push("item: employeeIds cannot be empty");
    }

    body.employeeIds.forEach((employeeId, index) => {
      if (isBlank(employeeId)) {
        errors.push(`employeeIds[${index}]: employeeId is required`);
      }
    });
  } else if (isBlank(body.employeeId)) {
    errors.push("item: employeeId is required, or set all to true");
  } else if (body.department !== undefined || body.company !== undefined) {
    errors.push("item: department and company filters require all to be true");
  }

  if (errors.length > 0) {
    return next(new ApiError(400, "Validation failed", errors));
  }

  return next();
}

function validateReinstateRequest(req, res, next) {
  const body = req.body;
  const errors = [];

  function validateReinstateItem(item, indexLabel) {
    const itemErrors = [];

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      itemErrors.push(`${indexLabel}: payload item must be an object`);
      return itemErrors;
    }

    if (isBlank(item.employeeId)) {
      itemErrors.push(`${indexLabel}: employeeId is required`);
    }

    if (!isBlank(item.employeeId) && !/^\d+$/.test(String(item.employeeId))) {
      itemErrors.push(`${indexLabel}: employeeId must be numeric`);
    }

    return itemErrors;
  }

  if (Array.isArray(body)) {
    if (body.length === 0) {
      errors.push("payload array cannot be empty");
    }

    body.forEach((item, index) => {
      errors.push(...validateReinstateItem(item, `item[${index}]`));
    });
  } else {
    errors.push(...validateReinstateItem(body || {}, "item"));
  }

  if (errors.length > 0) {
    return next(new ApiError(400, "Validation failed", errors));
  }

  return next();
}

module.exports = {
  validateGetEmployeesRequest,
  validateResignRequest,
  validateReinstateRequest,
};

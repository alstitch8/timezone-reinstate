const ApiError = require("../untils/ApiError");

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details,
    });
  }

  if (error.response) {
    return res.status(error.response.status || 500).json({
      success: false,
      message: "TIMEZONE request failed",
      details: error.response.data,
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message || "Internal server error",
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};

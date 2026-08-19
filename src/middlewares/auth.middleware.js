const crypto = require("crypto");
const ApiError = require("../untils/ApiError");
const { API_AUTH_TOKEN } = require("../configs/env");

function safeEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuf, bBuf);
}

function readTokenFromRequest(req) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return "";
}

function requireApiAuth(req, res, next) {
  if (!API_AUTH_TOKEN) {
    return next(new ApiError(500, "API authentication is not configured"));
  }

  const providedToken = readTokenFromRequest(req);

  if (!providedToken) {
    return next(new ApiError(401, "Missing or invalid Authorization Bearer token"));
  }

  if (!safeEqual(providedToken, API_AUTH_TOKEN)) {
    return next(new ApiError(401, "Unauthorized"));
  }

  return next();
}

module.exports = {
  requireApiAuth,
};

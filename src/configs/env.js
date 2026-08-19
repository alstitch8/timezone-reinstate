require("./loadEnv");

module.exports = {
  PORT: Number(process.env.PORT || 3060),
  BASE_URL: process.env.TIMEZONE_URL,
  LOGIN_PATH: process.env.TIMEZONE_LOGIN_PATH || "/login/",
  API_AUTH_TOKEN: process.env.API_AUTH_TOKEN || process.env.API_KEY || "",
};

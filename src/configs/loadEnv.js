const path = require("path");
const dotenv = require("dotenv");

const envPath = path.resolve(__dirname, "../../.env");
const parsedEnv = dotenv.config({ path: envPath }).parsed || {};

for (const [name, value] of Object.entries(parsedEnv)) {
  const currentValue = process.env[name];

  if (currentValue === undefined || String(currentValue).trim() === "") {
    process.env[name] = value;
  }
}

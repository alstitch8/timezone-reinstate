const axios = require("axios");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");
const FormData = require("form-data");

const { BASE_URL, LOGIN_PATH } = require("../configs/env");

const ACTIONS = {
  resign: "52657369676e6174696f6e",
  reinstate: "5265696e73746174656d656e74",
};

const jar = new CookieJar();

const client = wrapper(
  axios.create({
    baseURL: BASE_URL,
    jar,
    withCredentials: true,
    maxRedirects: 5,
    validateStatus: () => true,
  })
);

async function getCookie(name) {
  const cookies = await jar.getCookies(BASE_URL);
  const cookie = cookies.find((c) => c.key === name);
  return cookie ? cookie.value : null;
}

async function login() {
  console.log("Opening TIMEZONE login page...");

  const loginPage = await client.get(LOGIN_PATH);

  if (loginPage.status !== 200) {
    throw new Error(`Unable to open login page. HTTP ${loginPage.status}`);
  }

  const csrfToken = await getCookie("csrftoken");

  if (!csrfToken) {
    throw new Error("TIMEZONE did not provide a CSRF token.");
  }

  console.log("CSRF token obtained.");
  console.log("Logging into TIMEZONE...");

  const params = new URLSearchParams();
  params.append("username", process.env.TIMEZONE_USERNAME);
  params.append("password", process.env.TIMEZONE_PASSWORD);
  params.append("csrfmiddlewaretoken", csrfToken);

  const response = await client.post(LOGIN_PATH, params.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: `${BASE_URL}${LOGIN_PATH}`,
    },
  });

  const sessionId = await getCookie("sessionid");

  if (!sessionId) {
    throw new Error(`Login failed. HTTP ${response.status}`);
  }

  const freshCsrfToken = await getCookie("csrftoken");

  console.log("TIMEZONE login successful.");

  return freshCsrfToken || csrfToken;
}

async function findEmployee(empCode) {
  console.log(`Searching for employee ${empCode}...`);

  const response = await client.get("/personnel/employee/table/", {
    params: {
      page: 1,
      limit: 50,
      _p1_emp_code__icontains: empCode,
    },
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${BASE_URL}/`,
    },
  });

  if (response.status !== 200) {
    throw new Error(`Employee search failed. HTTP ${response.status}`);
  }

  const employees =
    response.data.data || response.data.rows || response.data.results || [];

  if (!employees.length) {
    throw new Error(`Employee ${empCode} was not found.`);
  }

  const employee = employees[0];

  if (!employee.id) {
    throw new Error("Employee was found but no internal ID was returned.");
  }

  console.log(`Employee found. Internal ID: ${employee.id}`);

  return employee;
}

async function performAction(employeeId, csrfToken, action, extraFields = {}) {
  const actionName = ACTIONS[action];

  if (!actionName) {
    throw new Error(
      `Unknown action "${action}". Expected one of: ${Object.keys(ACTIONS).join(", ")}`
    );
  }

  console.log(`Performing "${action}" on employee ID ${employeeId}...`);

  const form = new FormData();
  form.append("action_name", actionName);
  form.append("id", String(employeeId));
  form.append("csrfmiddlewaretoken", csrfToken);

  for (const [key, value] of Object.entries(extraFields)) {
    form.append(key, String(value));
  }

  const response = await client.post("/personnel/employee/action/", form, {
    headers: {
      ...form.getHeaders(),
      "X-CSRFToken": csrfToken,
      "X-Requested-With": "XMLHttpRequest",
      Origin: BASE_URL,
      Referer: `${BASE_URL}/`,
    },
  });

  console.log(`"${action}" HTTP status:`, response.status);
  console.log("TIMEZONE response:", JSON.stringify(response.data, null, 2));

  if (response.status !== 200) {
    throw new Error(`TIMEZONE ${action} failed. HTTP ${response.status}`);
  }

  return response.data;
}

async function resignEmployee(employeeId, csrfToken, resignDetails = {}) {
  const {
    resignDate,
    resignType,
    reportGenerationEndDate,
    disableAtt,
    resignReason,
  } = resignDetails;

  const missing = [];
  if (!resignDate) missing.push("resignDate");
  if (!resignType) missing.push("resignType");
  if (!reportGenerationEndDate) missing.push("reportGenerationEndDate");
  if (disableAtt === undefined) missing.push("disableAtt");

  if (missing.length) {
    throw new Error(
      `resignEmployee is missing required field(s): ${missing.join(", ")}. ` +
        `The TIMEZONE resign action requires resign_date, resign_type, ` +
        `report_generation_end_date, and disable_att.`
    );
  }

  const fields = {
    resign_date: resignDate,
    resign_type: resignType,
    report_generation_end_date: reportGenerationEndDate,
    disable_att: disableAtt,
  };

  if (resignReason) {
    fields.resign_reason = resignReason;
  }

  return performAction(employeeId, csrfToken, "resign", fields);
}

async function reinstateEmployee(employeeId, csrfToken) {
  console.log(`Reinstating employee ${employeeId}...`);

  const params = new URLSearchParams();
  params.append("action_name", ACTIONS.reinstate);
  params.append("id", String(employeeId));
  params.append("csrfmiddlewaretoken", csrfToken);

  const response = await client.post(
    "/personnel/resign/action/",
    params.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFToken": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        Origin: BASE_URL,
        Referer: `${BASE_URL}/`,
      },
    }
  );

  console.log("Reinstatement HTTP status:", response.status);
  console.log("TIMEZONE response:", JSON.stringify(response.data, null, 2));

  if (response.status !== 200) {
    throw new Error(`TIMEZONE reinstate failed. HTTP ${response.status}`);
  }

  return response.data;
}

module.exports = {
  login,
  findEmployee,
  performAction,
  resignEmployee,
  reinstateEmployee,
};

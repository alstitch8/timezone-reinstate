const express = require("express");
const asyncHandler = require("../untils/asyncHandler");
const healthController = require("../controllers/health.controller");
const employeeController = require("../controllers/employee.controller");
const { requireApiAuth } = require("../middlewares/auth.middleware");
const {
	validateGetEmployeesRequest,
	validateResignRequest,
	validateReinstateRequest,
} = require("../middlewares/validation.middleware");

const router = express.Router();

router.get("/health", healthController.health);
router.get("/health/db", asyncHandler(healthController.dbHealth));
router.post(
	"/api/employees",
	requireApiAuth,
	validateGetEmployeesRequest,
	asyncHandler(employeeController.getEmployees)
);
router.get(
	"/api/companies",
	requireApiAuth,
	asyncHandler(employeeController.getCompanies)
);
router.get(
	"/api/departments",
	requireApiAuth,
	asyncHandler(employeeController.getDepartments)
);
router.post(
	"/api/resign",
	requireApiAuth,
	validateResignRequest,
	asyncHandler(employeeController.resign)
);
router.post(
	"/api/reinstate",
	requireApiAuth,
	validateReinstateRequest,
	asyncHandler(employeeController.reinstate)
);

module.exports = router;

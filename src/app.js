const express = require("express");
const employeeRoutes = require("./routes/employee.routes");
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");

const app = express();

app.use(express.json());
app.use(employeeRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

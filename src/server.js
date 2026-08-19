const app = require("./app");
const { PORT } = require("./configs/env");

app.listen(PORT, () => {
  console.log(`TIMEZONE API is running on http://localhost:${PORT}`);
});

const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

const staticRoot = path.join(__dirname, 'client', 'html-templates');

app.use(express.static(staticRoot));

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/`);
  console.log(`Login:     http://localhost:${PORT}/login.html`);
});

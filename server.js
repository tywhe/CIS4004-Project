const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

const distPath = path.join(__dirname, 'client', 'reactapp', 'dist');
const indexHtml = path.join(distPath, 'index.html');

if (!fs.existsSync(indexHtml)) {
  console.error(
    'React production build not found. From the project root run:\n' +
      '  npm run build\n' +
      'Then start again with:\n' +
      '  npm start\n' +
      '\n' +
      'For local development with hot reload, use:\n' +
      '  npm run dev',
  );
  process.exit(1);
}

app.use(express.static(distPath));

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }
  if (req.path.startsWith('/api')) {
    return next();
  }
  if (path.extname(req.path)) {
    return next();
  }
  res.sendFile(indexHtml);
});

app.listen(PORT, () => {
  console.log(`Login route: http://localhost:${PORT}/`);
  console.log(`Dashboard route: http://localhost:${PORT}/dashboard`);
});

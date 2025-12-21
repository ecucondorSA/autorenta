
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  console.log(`Petición recibida: ${req.url}`);
  if (req.url === '/logo-preview.html') {
    const filePath = path.join(__dirname, 'logo-preview.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error cargando archivo');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(8082, '127.0.0.1', () => {
  console.log('Servidor Node corriendo en http://127.0.0.1:8082');
});

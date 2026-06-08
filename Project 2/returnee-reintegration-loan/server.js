const express = require('express');
const path = require('path');
const net = require('net');
const app = express();

let PORT = parseInt(process.env.PORT) || 3000;

// Standard parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend')));

// Register API routes
require('./backend/routes')(app);

// Fallback for HTML routing (to direct all unknown static calls to index.html if necessary)
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Port finder and server launcher
function launchServer(startingPort) {
  const tester = net.createServer();
  
  tester.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${startingPort} is in use. Retrying on port ${startingPort + 1}...`);
      launchServer(startingPort + 1);
    } else {
      console.error("Port check error:", err);
    }
  });

  tester.once('listening', () => {
    tester.close(() => {
      // Port is free, boot Express binding to all IPv4 interfaces (0.0.0.0)
      app.listen(startingPort, '0.0.0.0', () => {
        console.log(`========================================================`);
        console.log(`  Returnee Reintegration Loan System Running!`);
        console.log(`  Local URL: http://localhost:${startingPort}`);
        console.log(`  Alternative: http://127.0.0.1:${startingPort}`);
        console.log(`========================================================`);
      });
    });
  });

  tester.listen(startingPort, '0.0.0.0');
}

launchServer(PORT);

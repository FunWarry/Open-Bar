/**
 * Mock ESC/POS TCP Socket Server for high-throughput load and stress testing.
 *
 * Listens on TCP port 9100 (standard raw ESC/POS port) and absorbs binary thermal
 * print streams without blocking or requiring physical POS hardware.
 */

const net = require('node:net');

const PORT = Number.parseInt(process.env.ESCPOS_PORT || '9100', 10);
const HOST = process.env.ESCPOS_HOST || '0.0.0.0';

let totalBytesReceived = 0;
let totalPrintJobs = 0;
let activeConnections = 0;

const server = net.createServer((socket) => {
  activeConnections++;
  totalPrintJobs++;
  let jobBytes = 0;

  socket.on('data', (data) => {
    jobBytes += data.length;
    totalBytesReceived += data.length;
  });

  socket.on('end', () => {
    activeConnections--;
  });

  socket.on('error', (_err) => {
    // Expected during sudden client stress disconnection; adjust active connection counter
    activeConnections = Math.max(0, activeConnections - 1);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[Mock-ESCPOS] Thermal print mock listening on ${HOST}:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

module.exports = {
  server,
  getStats: () => ({ totalBytesReceived, totalPrintJobs, activeConnections }),
  resetStats: () => {
    totalBytesReceived = 0;
    totalPrintJobs = 0;
    activeConnections = 0;
  }
};

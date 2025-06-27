// server.js
import express from 'express';          // Node ≥18 supports ES modules natively
const app  = express();
const PORT = process.env.PORT || 3000;

// Record when the server started.
const bootTime = Date.now();

/**
 * Convert elapsed milliseconds → {days, hours, minutes, seconds}
 */
function uptimeParts () {
  const totalSec = Math.floor((Date.now() - bootTime) / 1000);
  const days     = Math.floor(totalSec / 86_400);
  const hours    = Math.floor((totalSec % 86_400) / 3_600);
  const minutes  = Math.floor((totalSec % 3_600) / 60);
  const seconds  = totalSec % 60;
  return { days, hours, minutes, seconds };
}

app.get('/ping', (_req, res) => {
  const { days, hours, minutes, seconds } = uptimeParts();
  res.json({
    message: `Server is online for ${days} day(s) ${hours} hour(s) ` +
             `${minutes} minute(s) ${seconds} second(s)`
  });
});

app.listen(PORT, () =>
  console.log(`✅  Server listening on http://localhost:${PORT}/ping`)
);

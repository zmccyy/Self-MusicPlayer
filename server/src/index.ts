import { PORT } from './config.js';
import { getDb } from './db.js';
import { createApp } from './app.js';

getDb();
const app = createApp();

app.listen(PORT, () => {
  console.log(`[music-player-server] listening on http://localhost:${PORT}`);
});

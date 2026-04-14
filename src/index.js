import './utils/logger.js';
import { initDb } from './config/db.js';
import app from './app.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
};

startServer();

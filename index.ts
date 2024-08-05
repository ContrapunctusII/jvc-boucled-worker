import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import indexRoutes from './src/routes.js';
import { init } from './init.js';
import { logger } from './src/classes/Logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

init();

const app = express();

const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/', indexRoutes);

app.listen(port, () => {
    logger.info(`Server is running at http://localhost:${port}/ !`, true);
});

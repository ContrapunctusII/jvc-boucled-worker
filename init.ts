import { JSON_ACCOUNTS_PATH, JSON_LOOPS_PATH, ACCOUNTS_UPDATES_PER_DAY, DAY_MS, DELAY_BETWEEN_LOOPS_CHECK_MS } from './src/vars.js';
import { updateAllAccounts } from './src/services/update_accounts.js';
import { proceedLoopSending } from './src/services/send_loop.js';
import { logger } from './src/classes/Logger.js';
import fs from 'fs/promises';
import * as path from 'path';

/**
 * Fonction créant les fichiers JSON s'ils n'existent pas, les effaçant s'ils ne sont pas dans le format
 * JSON, ou arrêtant l'exécution si le dossier n'existe pas.
 * 
 * @async
 * @function
 * @name initJSON
 * @kind function
 * @param {Array<string>} paths
 * @returns {Promise<void>}
 */
async function initJSON(paths: Array<string>): Promise<void> {
    for (const filePath of paths) {
        try {
            const dir = path.dirname(filePath);
            const dirExists = await fs.access(dir).then(() => true).catch(() => false);
            if (!dirExists) {
                await fs.mkdir(dir);
            }
            const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
                
            if (fileExists) {
                const fileContent = await fs.readFile(filePath, 'utf-8');
                JSON.parse(fileContent);
            } else {
                logger.warn(`File ${filePath} does not exist. Creating it...`);
                await fs.writeFile(filePath, JSON.stringify([]), 'utf8');
            }
        } catch(error) {
            if (error instanceof SyntaxError) {
                await fs.writeFile(filePath, JSON.stringify([]), 'utf-8');
            }
        }
    }
}

/**
 * Initialise l'intervalle appelant la fonction de mise à jour des comptes.
 * 
 * @async
 * @function
 * @name initAccountsChecker
 * @kind function
 * @returns {Promise<void>}
 */
async function initAccountsChecker() {
    updateAllAccounts();
    setInterval(updateAllAccounts, DAY_MS/ACCOUNTS_UPDATES_PER_DAY);
}

async function init(): Promise<void> {
    await initJSON([JSON_ACCOUNTS_PATH, JSON_LOOPS_PATH]);
    logger.serverLog('info', 'démarrage du serveur', 'SUCCESS', 'Le serveur a été démarré avec succès.');

    initAccountsChecker();
    setInterval(proceedLoopSending, DELAY_BETWEEN_LOOPS_CHECK_MS);
}

export { init };
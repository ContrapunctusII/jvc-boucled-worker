import fs from 'fs';
import fsPromise from 'fs';
import chalk from 'chalk';
import { LOGS_PATH, SERVER_LOGS_PATH } from '../vars.js';
import * as path from 'path';

/**
 * Classes qui permet d'enregistrer les logs de la session dans logs.log (méthodes info, warn, error)
 * ou dans les logs du serveur (serverLog).
 * 
 * @class
 * @name Logger
 * @kind class
 */
class Logger {
    constructor() {
        const dir = path.dirname(LOGS_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        fs.writeFileSync(LOGS_PATH, '', 'utf-8');
        fs.writeFileSync(SERVER_LOGS_PATH, JSON.stringify([]), 'utf-8');
    }

    getTimeAsString() : string {
        const date: Date = new Date();
        const dateNums: Array<string> = [date.getHours(), date.getMinutes(), date.getSeconds()].map(num => (num < 10 ? '0' : '') + num);
        return dateNums.join(':');
    }

    info(message: string, printable: boolean = false) : void {
        const dateStr = this.getTimeAsString();
        const log = `${dateStr} [INFO] ${message}`;
        fs.appendFileSync(LOGS_PATH, `${log}\n`, 'utf-8');
        if (printable) {
            console.log(chalk.green(log));
        }
    }

    warn(message: string, printable: boolean = false) : void {
        const dateStr = this.getTimeAsString();
        const log = `${dateStr} [WARNING] ${message}`;
        fs.appendFileSync(LOGS_PATH, `${log}\n`, 'utf-8');
        if (printable) {
            console.log(chalk.yellow(log));
        }
    }

    error(message: string, printable: boolean = false) : void {
        const dateStr = this.getTimeAsString();
        const log = `${dateStr} [ERROR] ${message}`;
        fs.appendFileSync(LOGS_PATH, `${log}\n`, 'utf-8');
        if (printable) {
            console.log(chalk.red(log));
        }
    }

    clearLog() : void {
        fs.writeFileSync(LOGS_PATH, '', 'utf-8');
    }

    /**
     * Fonction qui ajoute un log dans server_logs.json. Ces logs seront affichés dans la page /logs du site.
     * 
     * @async
     * @method
     * @name serverLog
     * @kind method
     * @memberof Logger
     * @param {'erreur' | 'attention' | 'info'} type le type du message
     * @param {string} operation : l'opération qui était effectuée pendant le log
     * @param {string} message : le nom du message
     * @param {string} details : les détails du message
     * @returns {Promise<void>}
     */
    async serverLog(type: 'erreur' | 'attention' | 'info', operation: string, message: string, details: string) {
        try {
            const fileContent = fs.readFileSync(SERVER_LOGS_PATH, 'utf-8');
            const logs = JSON.parse(fileContent);
    
            const newLog = {
                date: new Date().toISOString(),
                type,
                message,
                operation,
                details
            };
    
            logs.push(newLog);
    
            fs.writeFileSync(SERVER_LOGS_PATH, JSON.stringify(logs, null, 2), 'utf-8');
        } catch (error) {
            logger.error(`Error while writing server log: ${error}.`, true);
        }
    }
}

const logger = new Logger();

export { logger };
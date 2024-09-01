import ServerLog from "../interfaces/ServerLog.js";
import { deleteLog, insertLog, readLogs } from "../database.js";
import { getParisDate } from "./utils.js";
import { v4 as uuidv4 } from 'uuid';
import { DELETION_FAIL, DELETION_SUCCESS, MIN_AGE_OF_OLD_LOG_IN_DAYS, D1_SUCCESS } from "../vars.js";

/**
 * Classes qui permet d'enregistrer les logs de la session dans la base de données.
 * 
 * @class
 * @name Logger
 * @kind class
 */
export class Logger {

    /**
     * Fonction retirant de la base de données les logs datant d'il y a plus d'une semaine.
     * 
     * @async
     * @method
     * @name removeOldLogs
     * @kind method
     * @memberof Logger
     * @static
     * @returns {Promise<number>}
     */
    static async removeOldLogs(): Promise<number> {
        const logs = await readLogs();
        const oneWeekAgo = getParisDate();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - MIN_AGE_OF_OLD_LOG_IN_DAYS);

        const codes = [];
        for (const log of logs) {
            if (log.date < oneWeekAgo) {
                const code = await deleteLog(log);
                codes.push(code);
            }
        }

        return codes.every(c => c === D1_SUCCESS) ? DELETION_SUCCESS : DELETION_FAIL;
    }

    /**
     * Génère un ID unique pour un log.
     * 
     * @function
     * @name generateLoopId
     * @kind function
     * @returns {number}
     */
    private generateLogId(): number {
        const uid = uuidv4();
        const lastPart = uid.split('-').pop();
        let idStr: string;

        if (lastPart) {
            idStr = (parseInt(lastPart, 16) + Math.floor(Date.now() * Math.random()))
                .toString()
                .slice(-12)
                .padStart(12, '0');
        } else {
            idStr = (Date.now() + Math.floor(Date.now() * Math.random()))
                .toString()
                .slice(-12)
                .padStart(12, '0');
        }

        const id = parseInt(idStr, 10);
        return id;
    }

    /**
     * Fonction qui ajoute un log dans la base de données. Ces logs seront affichés dans la page /logs du site.
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
    async serverLog(type: 'erreur' | 'attention' | 'info', operation: string, message: string, details: string): Promise<number> {
        const newLog: ServerLog = {
            id: this.generateLogId(),
            date: getParisDate(),
            type: type,
            operation: operation,
            message: message,
            details: details
        };
        const code = await insertLog(newLog);
        return code;
    }
}

export default new Logger();
import { Loop } from "../interfaces/Loop.js";
import { Account } from "../interfaces/Account.js";
import { Poster } from '../classes/Poster.js';
import { logger } from '../classes/Logger.js';
import { getLoops } from './utils.js';
import { getAccounts } from "./utils.js";
import { updateSomeAccounts } from "./update_accounts.js";
import { updateSomeLoops } from "./update_loops.js";
import { POST_SUCCESS, TOPIC_DELETED, POST_FAILED, ALL_ACCOUNTS_USED, NO_ACCOUNT_AVAILABLE } from '../vars.js';
import { ServerLog } from "../interfaces/ServerLog.js";

async function getLoopAccounts(loopId: number): Promise<Array<Account>> {
    logger.info(`Getting accounts associated with loop ${loopId}.`);
    const loopAccounts = await getAccounts(a => a.loops.map(l => l.id).includes(loopId));

    return loopAccounts;
}

/**
 * Fonction permettant de gérer le post d'une boucle. Après le post, les comptes à mettre à jour sont récupérés
 * pour pouvoir modifier le fichier en conséquence. Modification de l'objet Loop avec l'heure et le topic du dernier post.
 * 
 * @async
 * @function
 * @name sendLoop
 * @kind function
 * @param {Loop} loopObj
 * @returns {Promise<PosterResponse>}
 */
async function sendLoop(loopObj: Loop) {
    logger.info(`Launching loop ${JSON.stringify(loopObj)}.`);
    const accounts = await getLoopAccounts(loopObj.id);
    const poster = new Poster(loopObj, accounts);
    const code = await poster.post();
    const accountsToUpdate = poster.getAccountsToUpdate();
    await updateSomeAccounts(accountsToUpdate);
    const topicURL = poster.getTopicURL();
    if (topicURL) {
        loopObj.lastPost = { topicURL: poster.getTopicURL(), time: new Date() };
    }
    await updateSomeLoops([loopObj]);
    return code;
}

/**
 * Détermine s'il y a une boucle à lancer à partir de la mesure de l'heure actuelle.
 * 
 * @async
 * @function
 * @name whichLoopToSend
 * @kind function
 * @returns {Promise<Array<Loop>>}
 */
async function whichLoopToSend(): Promise<Array<Loop>> {
    const date = new Date();
    const parsedHour = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
    const loop = await getLoops((l: Loop) => l.times.includes(parsedHour));

    return loop;
}

/**
 * Cette fonction relie les fonctions précédentes entre elles pour lancer une boucle. Elle interprète également
 * le code renvoyé pour l'écrire dans les logs du serveur.
 * 
 * @async
 * @function
 * @name proceedLoopSending
 * @kind function
 * @returns {Promise<number>}
 */
async function proceedLoopSending(): Promise<number> {
    logger.info('Checking whether there are loops to send.');
    const loops = await whichLoopToSend();
    if (!loops || loops.length === 0 || loops[0].status !== 'active') {
        return null;
    }

    logger.info(`Loop to send: ${JSON.stringify(loops[0])}`);

    const { code, info } = await sendLoop(loops[0]);

    var logObj: ServerLog = { type: null, operation: `post de la boucle ${loops[0].name}`, message: null, details: null };

    switch (code) {
        case NO_ACCOUNT_AVAILABLE:
            logObj.type = 'erreur';
            logObj.message = 'NO_ACCOUNT_AVAILABLE';
            logObj.details = "Il n'y a plus de compte utilisable pour cette boucle. Ils sont soit bannis, soit ont dépassé leur limite journalière de messages/topics, soit inaccessibles à la connexion.";
            break;
        case ALL_ACCOUNTS_USED:
            logObj.message = 'ALL_ACCOUNTS_USED';
            if (info.done) {
                logObj.type = 'attention';
                logObj.details = `Tous les comptes ont été utilisés durant le post de la boucle, ce qui signifie que le post est incomplet. Dernier post réalisé : ${info.done}.`;
            } else {
                logObj.type = 'erreur';
                logObj.details = `Tous les comptes ont été utilisés durant le post du topic, ce qui signifie que le post n'a pas été réalisé.`;
            }
            break;
        case TOPIC_DELETED:
            logObj.type = 'attention';
            logObj.message = 'TOPIC_DELETED';
            logObj.details = 'Le topic a été supprimé par la modération avant que l\'entièreté des messages n\'ait pu être postée.';
            break;
        case POST_SUCCESS:
            logObj.type = 'info';
            logObj.message = 'POST_SUCCESS';
            logObj.details = `La boucle a été postée avec succès. Lien du topic : ${info.topicURL}.`;
            break;
        default:
            logObj.type = 'erreur';
            logObj.message = 'POST_FAILED';
            logObj.details = 'La boucle n\'a pu être postée pour une raison inconnue. Voir les logs détaillés.';
            break;
    }

    logger.serverLog(logObj.type, logObj.operation, logObj.message, logObj.details);

    return code;
}

export { proceedLoopSending };
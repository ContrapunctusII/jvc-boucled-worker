import Loop, { Answer, MiniAccount } from "../interfaces/Loop.js";
import Account from "../interfaces/Account.js";
import Poster, { PostResponseInfo } from '../classes/Poster.js';
import logger from '../classes/Logger.js';
import { updateAccounts } from "./update_accounts.js";
import { POST_SUCCESS, TOPIC_DELETED, ALL_ACCOUNTS_USED, NO_ACCOUNT_AVAILABLE, JVC_ALERT, JVC_WARNING } from '../vars.js';
import ServerLog from "../interfaces/ServerLog.js";
import { readAccounts, readLoops, updateLoop } from "../database.js";
import { getHHMM, subtractHHMMTime, addTimeToDate, areDatesEqualTillMinutes, sortDates, getParisDate } from "./utils.js";
import { sortAnswersByDelay } from "./handle_loops.js";
import Topic from "../classes/Topic.js";

/**
 * Renvoie les objets Account qui représentent un compte associé à la boucle.
 * 
 * @async
 * @function
 * @name getLoopAccounts
 * @kind function
 * @param {Loop} loop
 * @returns {Promise<Array<Account>>}
 */
async function getLoopAccounts(loop: Loop): Promise<Array<Account>> {
    console.info(`Getting accounts associated with loop ${loop.id}.`);
    const loopAccounts = await readAccounts((a: Account) => a.loops.map(l => l.id).includes(loop.id));
    const sortedLoopAccounts = loopAccounts.sort((a: Account, b: Account) => { // les comptes sont rangés par ordre de post croissant dans la boucle
        const miniA = loop.accounts.find((miniA: MiniAccount) => miniA.id === a.id);
        const miniB = loop.accounts.find((miniB: MiniAccount) => miniB.id === b.id);
        if (!miniA || !miniB) {
            return 0;
        }
        return miniA.order - miniB.order;
    });
    return sortedLoopAccounts;
}

/**
 * Fonction qui détecte s'il y a des réponses à poster et le cas échéant les poste.
 * 
 * @async
 * @function
 * @name sendLoopAnswers
 * @kind function
 * @returns {Promise<void>}
 * @exports
 */
export async function sendLoopAnswers(): Promise<void> {
    const currentDate = getParisDate();
    const loops = await readLoops((l: Loop) => l.userStatus === "active" && !l.disabled); // seules les boucles actives sont concernées

    for (const loop of loops) {
        // les indices des lastPosts qui contiennent une réponse dont la date pour le post prévu est identique à la date actuelle
        const lastPostIndexesWithAnswerDates = [];

        for (let i = 0; i < loop.lastPosts.length; i++) {
            const lastPost = loop.lastPosts[i];
            // on range les dates de réponses de manière croissante
            const sortedDates = sortDates(lastPost.nextAnswersDate);
            // l'indice où la date d'une réponse est égale à la date actuelle (jusqu'aux minutes)
            const answerDateIndex = sortedDates.findIndex((d: Date) => areDatesEqualTillMinutes(currentDate, d));

            if (answerDateIndex !== -1) { // si une telle date existe dans le tableau
                lastPostIndexesWithAnswerDates.push({ index: i, answerDateIndex });
            }
        }

        if (lastPostIndexesWithAnswerDates.length === 0) {
            console.info(`${loop.id}: no answer to send`);
        } else {
            for (const { index, answerDateIndex } of lastPostIndexesWithAnswerDates) {
                const lastPost = loop.lastPosts[index];
                // l'indice dans le lastPost peut être utilisé comme indice dans les réponses rangées par délai
                // pour la raison suivante : dans le lastPost les réponses ont été rangées par date croissante
                // or ces dates ont été créées directement à partir des délais, en ajoutant les délais à la date de post du topic
                // donc ranger lastPost.nextAnswersDate = ranger par Answer.totalDelay
                const answer = sortAnswersByDelay(loop.answers)[answerDateIndex];

                const accounts = await getLoopAccounts(loop);
                const poster = new Poster(loop, accounts);
                const topicId = Topic.urlToId(lastPost.topicURL);
                const topic = await Topic.create(topicId); // création de l'objet Topic utilisé pour le post de la réponse
                const { code, info } = await poster.postAnswer(topic, answer);

                if (code === TOPIC_DELETED) {
                    loop.lastPosts.splice(index, 1); // retrait du topic des lastPosts si topic supprimé
                }

                await logResult(loop, code, info);

                await updateLoop(loop); // mise à jour de la boucle et des comptes
                const accountsToUpdate = poster.accountsToUpdate;
                await updateAccounts(accountsToUpdate);
            }
        }
    }
}

/**
 * Fonction qui log en fonction du résultat du post.
 * 
 * @async
 * @function
 * @name logResult
 * @kind function
 * @param {Loop} loop
 * @param {number} code
 * @param {PostResponseInfo} info
 * @returns {Promise<void>}
 */
async function logResult(loop: Loop, code: number, info: PostResponseInfo): Promise<void> {
    const operationStr = info.postType === 'topic' ? `post du topic de la boucle ${loop.name}` : `post d'une réponse de la boucle ${loop.name}`;
    const errorPrefix = info.postType === 'topic' ? "Le topic n'a pu être posté" : "La réponse n'a pu être postée";
    const successPrefix = info.postType === 'topic' ? "Le topic a été posté" : "La réponse a été postée";
    var logObj: ServerLog = { id: 0, date: getParisDate(), type: 'info', operation: operationStr, message: '', details: '' };

    switch (code) {
        case NO_ACCOUNT_AVAILABLE:
            logObj.type = 'erreur';
            logObj.message = 'NO_ACCOUNT_AVAILABLE';
            logObj.details = "Il n'y a plus de compte utilisable pour cette boucle. Ils sont soit bannis, soit ont dépassé leur limite journalière de messages/topics, soit inaccessibles à la connexion.";
            break;
        case ALL_ACCOUNTS_USED:
            logObj.message = 'ALL_ACCOUNTS_USED';
            if (info.postType === 'answer') {
                logObj.type = 'attention';
                logObj.details = `Tous les comptes ont été utilisés durant le post des réponses, ce qui signifie que le post est incomplet.`;
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
            logObj.details = `${successPrefix} avec succès. Lien du ${info.postType === 'topic' ? 'topic' : 'message'} : ${info.topicURL}.`;
            break;
        case JVC_ALERT:
            logObj.type = 'erreur';
            logObj.message = 'JVC_ALERT';
            logObj.details = `${errorPrefix} car JVC a répondu avec le message d'erreur suivant : ${info.jvcErrorWarningText}`;
            break;
        case JVC_WARNING:
            logObj.type = 'erreur';
            logObj.message = 'JVC_WARNING';
            logObj.details = `${errorPrefix} car JVC a répondu avec le message d'erreur suivant : ${info.jvcErrorWarningText}`;
            break;
        default:
            logObj.type = 'erreur';
            logObj.message = 'POST_FAIL';
            logObj.details = `${errorPrefix} pour une raison inconnue.`;
            break;
    }
    await logger.serverLog(logObj.type, logObj.operation, logObj.message, logObj.details);
}

export async function sendLoopTopic(): Promise<void> {
    console.info('Checking whether there are loops to send.');

    const parsedHour = getHHMM();
    // il y a nécessité de prendre en compte l'heure de la minute précédente car il arrive
    // que Cloudflare exécute le cron trigger une minute trop tard
    const parsedHourMinusOne = subtractHHMMTime(parsedHour, '00:01');
    const hours = [parsedHour, parsedHourMinusOne];
    // la boucle à poster est celle dont les horaires incluent un heure du tableau hours et qui est active
    const loops = await readLoops((l: Loop) => l.times.some(t => hours.includes(t)) && l.userStatus === "active" && !l.disabled);

    if (!loops || loops.length === 0) {
        return;
    }
    const loop = loops[0];
    console.info(`Loop to send: ${JSON.stringify(loop)}`);

    const accounts = await getLoopAccounts(loop);
    const poster = new Poster(loop, accounts);
    const { code, info } = await poster.postTopic();
    const date = getParisDate();
    if (info.topicURL) { // si succès
        // ajout de ce post dans l'objet Loop pour une potentielle réutilisation s'il y aura une réponse à poster sur le même topic
        const nextAnswersDate = loop.answers.map((a: Answer) => addTimeToDate(date, a.totalDelay))
        loop.lastPosts.push({ topicURL: info.topicURL, time: parsedHour, date: date, nextAnswersDate: nextAnswersDate });
    }
    await updateLoop(loop); // mise à jour des comptes et de la boucle
    const accountsToUpdate = poster.accountsToUpdate;
    await updateAccounts(accountsToUpdate);

    await logResult(loop, code, info);
}
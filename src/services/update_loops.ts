import { Loop } from "../interfaces/Loop";
import { getLoops, writeAccountsToJSON, writeLoopsToJSON } from "./utils.js";
import { logger } from "../classes/Logger.js";
import { Account } from '../interfaces/Account.js';
import { getAccounts, accountToMiniAccount, loopToMiniLoop } from './utils.js';
import { checkEmptyAttributes, checkInvalidCharacter, checkLoopRedundancy, doesForumExist, LoopHandlingResult, saveLoop } from './handle_loops.js';
import { INVALID_CHAR, EMPTY_LOOP_DATA, INEXISTENT_LOOP_FORUM, SUCCESSFULL_LOOP_ADDING, FAILED_LOOP_ADDING, LOOP_NAME_REDUNDANT, LOOP_TIME_REDUNDANT } from '../vars.js';

/**
 * Modifie l'objet Loop attaché aux objets Account dans le cas d'une mise à jour. Soit ajout (si un nouveau compte est associé),
 * soit suppression (si un compte est supprimé de la boucle).
 * 
 * @async
 * @function
 * @name synchronizeLoopInAccounts
 * @kind function
 * @param {Loop} loop
 * @returns {Promise<0 | 6>}
 */
async function synchronizeLoopInAccounts(loop: Loop) {
    const loopAccountsId = loop.accounts.map(a => a.id);
    const loopMinified = loopToMiniLoop(loop);
    const accounts = await getAccounts();
    for (const account of accounts) {
        const accountLoopsId = account.loops.map(l => l.id);
        if (loopAccountsId.includes(account.id) && !accountLoopsId.includes(loop.id)) {
            account.loops.push(loopMinified);
        } else if (!loopAccountsId.includes(account.id) && accountLoopsId.includes(loop.id)) {
            account.loops = account.loops.filter(l => l.id !== loop.id);
        }
    }

    return await writeAccountsToJSON(accounts);
}

/**
 * Ne modifie dans le fichier que les objets Loop passés en entrée.
 * 
 * @async
 * @function
 * @name updateSomeLoops
 * @kind function
 * @param {Array<Loop>} loops
 * @returns {Promise<Loop[]>}
 */
async function updateSomeLoops(loops: Array<Loop>) {
    const allLoops = await getLoops();
    if (!allLoops) {
        logger.error('No loops; JSON error.');
        return [];
    }
    for (const loop of loops) {
        const index = allLoops.findIndex(l => l.id === loop.id);
        allLoops[index] = loop;
    }

    await writeLoopsToJSON(allLoops);
    return allLoops;
}

/**
 * Met à jour une boucle avec les informations données par le client à la requête PUT /boucle/:id.
 * 
 * @async
 * @function
 * @name handleLoopUpdate
 * @kind function
 * @param {Loop} loopObj
 * @returns {Promise<LoopHandlingResult>}
 */
async function handleLoopUpdate(loopObj: Loop): Promise<LoopHandlingResult> {
    logger.info(`Processing loop update with properties : ${JSON.stringify(loopObj)}.`);

    const { emptyAttr, attr } = checkEmptyAttributes(loopObj);
    var infos: {[k: string]: any} = {
        ...loopObj,
        emptyAttr: emptyAttr,
        attr: attr
    }

    if (emptyAttr) {
        logger.warn(`Processing failed due to blank argument: ${attr}.`);
        logger.serverLog('attention', `mise à jour de la boucle ${loopObj.name}`, 'BLANK_ARGUMENT', `L'argument "${attr}" est vide.`);
        return { infos: infos, code: EMPTY_LOOP_DATA };
    } 

    const { invalid, attr2 } = checkInvalidCharacter(loopObj);
    infos = {
        ...loopObj,
        invalid: invalid,
        attr2: attr2
    }

    if (invalid) {
        logger.warn(`Processing failed due to invalid character in argument ${attr2}.`)
        logger.serverLog('attention', `mise à jour boucle ${loopObj.name}`, 'INVALID_CHAR', `L'argument "${attr2}" contient un caractère invalide pour JVC.`); 
        return { infos: infos, code: INVALID_CHAR };
    }

    const { sameName, sameTime, duplicateTime, duplicateTimeLoop } = await checkLoopRedundancy(loopObj, true);
    infos = {
        ...loopObj,
        duplicateTime: duplicateTime,
        duplicateTimeLoop: duplicateTimeLoop
    }

    if (sameName === null && sameTime === null) {
        logger.error(`Processing failed because of unknown error.`, true);
        logger.serverLog('erreur', `mise à jour de la boucle ${loopObj.name}`, 'UNKNOWN_ERROR', "La modification de la boucle dans la base de données n'a pu s'effectuer pour une raison inconnue. Veuillez consulter les logs précis.");
        return { infos: infos, code: FAILED_LOOP_ADDING };
    } else if (sameName) {
        logger.warn('Processing failed because of loop name already existent.', true);
        logger.serverLog('attention', `mise à jour de la boucle ${loopObj.name}`, 'NAME_TAKEN', `Une boucle possède déjà le nom ${loopObj.name}.`);
        return { infos: infos, code: LOOP_NAME_REDUNDANT };
    } else if (sameTime) {
        logger.warn('Processing failed because of loop time already existent.', true);
        logger.serverLog('attention', `mise à jour de la boucle ${loopObj.name}`, 'TIME_TAKEN', `Une autre boucle (${duplicateTimeLoop.name}) est déjà programmée à l'heure ${duplicateTime}.`);
        return { infos: infos, code: LOOP_TIME_REDUNDANT };
    }

    const isForumExistent = await doesForumExist(loopObj.forumId);

    if (isForumExistent === null) {
        logger.error(`Processing failed because of unknown error.`, true);
        logger.serverLog('erreur', `mise à jour de la boucle ${loopObj.name}`, 'REQUEST_ERROR', 'Une erreur a été rencontrée durant une requête adressée à JVC pour savoir si le forum renseigné existait.');
        return { infos: infos, code: FAILED_LOOP_ADDING };
    } else if (!isForumExistent) {
        logger.warn('Processing failed because specified forum does not exist.', true);
        logger.serverLog('attention', `mise à jour de la boucle ${loopObj.name}`, 'INEXISTENT_FORUM', `Le forum renseigné, d'ID ${loopObj.forumId}, n'existe pas.`);
        return { infos: infos, code: INEXISTENT_LOOP_FORUM };
    }

    const loopAccountsIds = loopObj.accounts.map((a: Account) => a.id);
    const loopAccounts = await getAccounts(((a: Account) => loopAccountsIds.includes(a.id)));
    loopObj.accounts = loopAccounts.map(accountToMiniAccount);
    loopObj.lastPost = { topicURL: null, time: null };

    const updateAccountCode = await synchronizeLoopInAccounts(loopObj);
    if (updateAccountCode !== SUCCESSFULL_LOOP_ADDING) {
        logger.error('Processing failed due to JSON error.', true);
        logger.serverLog('erreur', `mise à jour de la boucle ${loopObj.name}`, 'JSON_ERROR', 'Erreur rencontrée en lisant ou parsant le fichier JSON (format JSON invalide). Veuillez analyser le contenu du fichier.');
        return { infos: infos, code: FAILED_LOOP_ADDING};
    }

    const saveCode = await saveLoop(loopObj, true);

    if (saveCode === SUCCESSFULL_LOOP_ADDING) {
        logger.info('New loop successfully added.');
        logger.serverLog('info', `mise à jour de la boucle ${loopObj.name}`, 'SUCCESS', 'La boucle a bien été modifiée dans la base de données.');

    } else {
        logger.error('Processing failed due to JSON error.', true);
        logger.serverLog('erreur', `mise à jour de la boucle ${loopObj.name}`, 'JSON_ERROR', 'Erreur rencontrée en lisant ou parsant le fichier JSON (format JSON invalide). Veuillez analyser le contenu du fichier.');
    }

    return { infos: infos, code: saveCode};
}

export { updateSomeLoops, handleLoopUpdate };
import { INVALID_CHAR, EMPTY_LOOP_DATA, INEXISTENT_LOOP_FORUM, JSON_LOOPS_PATH, SUCCESSFULL_LOOP_ADDING, FAILED_LOOP_ADDING, LOOP_NAME_REDUNDANT, LOOP_TIME_REDUNDANT } from '../vars.js';
import { Loop } from '../interfaces/Loop.js';
import { logger } from '../classes/Logger.js';
import { getAccounts, accountToMiniAccount } from './utils.js';
import { Account } from '../interfaces/Account.js';
import { checkEmptyAttributes, generateLoopId, checkInvalidCharacter, checkLoopRedundancy, doesForumExist, LoopHandlingResult, addLoopToAccounts, saveLoop } from './handle_loops.js';

/**
 * Fonction qui gère l'ajout d'une boucle à la base de données. Renvoie l'un des codes suivants :
 * FAILED_LOOP_ADDING : code générique pour un échec
 * EMPTY_LOOP_DATA : un argument obligatoire a été laissé vide
 * INVALID_CHAR : un caractère non reconnu par JVC est présent dans le titre, le message ou l'une des réponses.
 * LOOP_NAME_REDUNDANT : une boucle portant ce nom existe déjà
 * LOOP_TIME_REDUNDANT : une boucle est déjà programmée à l'une des heures spécifiées
 * INEXISTENT_LOOP_FORUM : le forum spécifié n'existe pas
 * SUCCESSFULL_LOOP_ADDING : succès
 * 
 * @async
 * @function
 * @name handleNewLoop
 * @kind function
 * @param {Loop} loopObj
 * @returns {Promise<LoopHandlingResult>}
 */
async function handleNewLoop(loopObj: Loop): Promise<LoopHandlingResult> {
    logger.info(`Processing new loop with properties : ${JSON.stringify(loopObj)}.`);
    loopObj.id = generateLoopId();

    const { emptyAttr, attr } = checkEmptyAttributes(loopObj);
    var infos: {[k: string]: any} = {
        ...loopObj,
        emptyAttr: emptyAttr,
        attr: attr
    }

    if (emptyAttr) {
        logger.warn(`Processing failed due to blank argument: ${attr}.`);
        logger.serverLog('attention', `ajout de la boucle ${loopObj.name}`, 'BLANK_ARGUMENT', `L'argument "${attr}" est vide.`);
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
        logger.serverLog('attention', `ajout de la boucle ${loopObj.name}`, 'INVALID_CHAR', `L'argument "${attr2}" contient un caractère invalide pour JVC.`); 
        return { infos: infos, code: INVALID_CHAR };
    }

    const { sameName, sameTime, duplicateTime, duplicateTimeLoop } = await checkLoopRedundancy(loopObj, false);
    infos = {
        ...loopObj,
        duplicateTime: duplicateTime,
        duplicateTimeLoop: duplicateTimeLoop
    }

    if (sameName === null && sameTime === null) {
        logger.error(`Processing failed because of unknown error.`, true);
        logger.serverLog('erreur', `ajout de la boucle ${loopObj.name}`, 'UNKNOWN_ERROR', "L'ajout de la boucle à la base de données n'a pu s'effectuer pour une raison inconnue. Veuillez consulter les logs précis.");
        return { infos: infos, code: FAILED_LOOP_ADDING };
    } else if (sameName) {
        logger.warn('Processing failed because of loop name already existent.', true);
        logger.serverLog('attention', `ajout de la boucle ${loopObj.name}`, 'NAME_TAKEN', `Une boucle possède déjà le nom ${loopObj.name}.`);
        return { infos: infos, code: LOOP_NAME_REDUNDANT };
    } else if (sameTime) {
        logger.warn('Processing failed because of loop time already existent.', true);
        logger.serverLog('attention', `ajout de la boucle ${loopObj.name}`, 'TIME_TAKEN', `Une autre boucle (${duplicateTimeLoop.name}) est déjà programmée à l'heure ${duplicateTime}.`);
        return { infos: infos, code: LOOP_TIME_REDUNDANT };
    }

    const isForumExistent = await doesForumExist(loopObj.forumId);

    if (isForumExistent === null) {
        logger.error(`Processing failed because of unknown error.`, true);
        logger.serverLog('erreur', `ajout de la boucle ${loopObj.name}`, 'REQUEST_ERROR', 'Une erreur a été rencontrée durant une requête adressée à JVC pour savoir si le forum renseigné existait.');
        return { infos: infos, code: FAILED_LOOP_ADDING };
    } else if (!isForumExistent) {
        logger.warn('Processing failed because specified forum does not exist.', true);
        logger.serverLog('attention', `ajout de la boucle ${loopObj.name}`, 'INEXISTENT_FORUM', `Le forum renseigné, d'ID ${loopObj.forumId}, n'existe pas.`);
        return { infos: infos, code: INEXISTENT_LOOP_FORUM };
    }

    const updateAccountCode = await addLoopToAccounts(loopObj);
    if (updateAccountCode !== SUCCESSFULL_LOOP_ADDING) {
        logger.error('Processing failed due to JSON error.', true);
        logger.serverLog('erreur', `ajout de la boucle ${loopObj.name}`, 'JSON_ERROR', 'Erreur rencontrée en lisant ou parsant le fichier JSON (format JSON invalide). Veuillez analyser le contenu du fichier.');
        return { infos: infos, code: FAILED_LOOP_ADDING};
    }

    const loopAccountsIds = loopObj.accounts.map((a: Account) => a.id);
    const loopAccounts = await getAccounts(((a: Account) => loopAccountsIds.includes(a.id)));
    loopObj.accounts = loopAccounts.map(accountToMiniAccount);
    loopObj.lastPost = { topicURL: null, time: null };
    const saveCode = await saveLoop(loopObj, false);

    if (saveCode === SUCCESSFULL_LOOP_ADDING) {
        logger.info('New loop successfully added.');
        logger.serverLog('info', `ajout de la boucle ${loopObj.name}`, 'SUCCESS', 'La boucle a bien été ajoutée à la base de données.');

    } else {
        logger.error('Processing failed due to JSON error.', true);
        logger.serverLog('erreur', `ajout de la boucle ${loopObj.name}`, 'JSON_ERROR', 'Erreur rencontrée en lisant ou parsant le fichier JSON (format JSON invalide). Veuillez analyser le contenu du fichier.');
    }

    return { infos: infos, code: saveCode};
}

export { handleNewLoop };
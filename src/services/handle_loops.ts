import Loop, { Answer, LastPost, MiniAccount, PreAnswer } from "../interfaces/Loop.js";
import Forum from '../classes/Forum.js';
import {
    INVALID_CHAR, EMPTY_LOOP_DATA, D1_ERROR, D1_SUCCESS, INEXISTENT_LOOP_FORUM, LOOP_NAME_REDUNDANT, LOOP_TIME_REDUNDANT, EMOJI_REGEX, VALID_JVC_CHARACTERS,
    ONLY_NON_STANDARD_CHARS_IN_TITLE, MIN_TOPIC_TITLE_LENGTH, MIN_AGE_OF_OLD_LASTPOST_IN_DAYS, DELETION_SUCCESS, DELETION_FAIL,
    ADDING_SUCCESS, UPDATE_SUCCESS
} from '../vars.js';
import { v4 as uuidv4 } from 'uuid';
import { insertLoop, readAccounts, readLoops, updateAccount, updateLoop } from "../database.js";
import Account from "../interfaces/Account.js";
import { getParisDate } from "./utils.js";

/**
 * Génère un ID unique pour une boucle en partant de uuidv4.
 * 
 * @function
 * @name generateLoopId
 * @kind function
 * @returns {number}
 */
export function generateLoopId(): number {
    const uid = uuidv4();
    const lastPart = uid.split('-').pop();
    let idStr: string;

    if (lastPart) {
        idStr = (parseInt(lastPart, 16) + Math.floor(Date.now() * Math.random()))
            .toString()
            .slice(-12)
            .padStart(12, '1');
    } else {
        idStr = (Date.now() + Math.floor(Date.now() * Math.random()))
            .toString()
            .slice(-12)
            .padStart(12, '1');
    }

    const id = parseInt(idStr, 10);
    return id;
}

interface emptyAttrCheck {
    emptyAttr: boolean; // true s'il y a un attribut vide
    attr: string; // le nom de l'attribut vide
}

interface invalidCharCheck {
    invalid: boolean; // true si un attribut contient un caractère invalide
    attr2: string; // le nom de l'attribut
    char: string; // le caractère en question
}

/**
 * Fonction qui ajoute aux objets réponses d'une boucle la propriété totalDelay, qui est le délai entre
 * le post du topic et le post de la réponse.
 * 
 * @function
 * @name addTotalDelays
 * @kind function
 * @param {Array<PreAnswer>} preAnswers
 * @returns {Array<Answer>}
 * @exports
 */
export function addTotalDelays(preAnswers: Array<PreAnswer>): Array<Answer> {
    let totalMinutes = 0;
    const answers: Array<Answer> = [];
    preAnswers.forEach((a: PreAnswer) => {
        const answer = {
            ...a,
            totalDelay: '',
            times: ['']
        }
        const [delayHours, delayMinutes] = a.delay.split(':').map(Number); // délai qui était au format HH:MM
        totalMinutes += delayHours * 60 + delayMinutes;

        const totalHours = Math.floor(totalMinutes / 60);
        const totalMinutesRemainder = totalMinutes % 60;

        answer.totalDelay = `${String(totalHours).padStart(2, '0')}:${String(totalMinutesRemainder).padStart(2, '0')}`;

        answers.push(answer)
    });

    return answers;
}


/**
 * Renvoie true s'il n'y a aucun compte ou si tous sont bannis ou inutilisables.
 * 
 * @function
 * @name areAllAccountsBanned
 * @kind function
 * @param {Array<Account> | Array<MiniAccount>} accounts
 * @returns {boolean}
 * @exports
 */
export function areAllAccountsBanned(accounts: Array<Account> | Array<MiniAccount>): boolean {
    return (accounts.length === 0 || accounts.every((a: Account | MiniAccount) => a.isBanned || a.unusable))
}

export function sortAccountsByOrder(arr: Array<MiniAccount>): Array<MiniAccount> {
    return arr.sort((a, b) => a.order - b.order);
}

/**
 * Range un tableau d'objets Answer par le délai total croissant entre le post de la réponse et le post du topic.
 * 
 * @function
 * @name sortAnswersByDelay
 * @kind function
 * @param {Array<Answer>} arr
 * @returns {Array<Answer>}
 * @exports
 */
export function sortAnswersByDelay(arr: Array<Answer>): Array<Answer> {
    return arr.sort((a, b) => {
        const [hoursA, minutesA] = a.totalDelay.split(':').map(Number);
        const [hoursB, minutesB] = b.totalDelay.split(':').map(Number);

        const totalMinutesA = hoursA * 60 + minutesA;
        const totalMinutesB = hoursB * 60 + minutesB;

        return totalMinutesA - totalMinutesB;
    });
}

/**
 * Retire les objets LastPost de l'objet Loop s'ils datent d'il y a plus de deux semaines.
 * 
 * @async
 * @function
 * @name removeOldLastPostsFromLoops
 * @kind function
 * @returns {Promise<Array<Loop>>}
 * @exports
 */
export async function removeOldLastPostsFromLoops(): Promise<number> {
    const loops = await readLoops();
    const now = getParisDate();

    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - MIN_AGE_OF_OLD_LASTPOST_IN_DAYS);

    const codes = [];
    for (const loop of loops) {
        loop.lastPosts = loop.lastPosts.filter(lastpost => lastpost.date > twoWeeksAgo);
        const code = await updateLoop(loop);
        codes.push(code);
    }

    return codes.every(c => c === D1_SUCCESS) ? DELETION_SUCCESS : DELETION_FAIL;
}

export function sortLastPostsByTime(arr: Array<LastPost>): Array<LastPost> {
    return arr.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Réindexe l'ordre dans le tableau des comptes d'une boucle au cas où un compte est supprimé.
 * 
 * @function
 * @name reMapLoopAccountsOrder
 * @kind function
 * @param {Array<MiniAccount>} accounts
 * @returns {Array<MiniAccount>}
 * @exports
 */
export function reMapLoopAccountsOrder(accounts: Array<MiniAccount>): Array<MiniAccount> {
    const sortedAccounts = sortAccountsByOrder(accounts)
    for (let i = 0; i < sortedAccounts.length; i++) {
        sortedAccounts[i].order = i;
    }

    return sortedAccounts;
}

/**
 * Renvoie le caractère invalide contenant dans la chaîne s'il y en a un.
 * 
 * @function
 * @name iterateForInvalidChar
 * @kind function
 * @param {string} str
 * @param {Array<string>} validChars
 * @returns {string}
 */
function iterateForInvalidChar(str: string, validChars: Array<string>): string {
    for (const char of str) {
        if (!validChars.includes(char)) {
            return char;
        }
    }

    return '';
}

/**
 * Renvoie true si le titre, le message principal ou l'une des réponses de la boucle contient des caractères
 * interdits par JVC.
 * 
 * @function
 * @name checkInvalidCharacter
 * @kind function
 * @param {Loop} loopObj
 * @returns {invalidCharCheck}
 */
export function checkInvalidCharacter(loopObj: Loop): invalidCharCheck {
    const charTitle = iterateForInvalidChar(loopObj.title.replace(EMOJI_REGEX, ''), VALID_JVC_CHARACTERS)
    if (charTitle !== '') {
        return { invalid: true, attr2: 'titre', char: charTitle };
    }

    const charMessage = iterateForInvalidChar(loopObj.first_message.replace(EMOJI_REGEX, ''), VALID_JVC_CHARACTERS);
    if (charMessage !== '') {
        return { invalid: true, attr2: 'message_principal', char: charMessage };
    }

    for (let i = 0; i < loopObj.answers.length; i++) {
        const answer = loopObj.answers[i];
        const answerChar = iterateForInvalidChar(answer.text.replace(EMOJI_REGEX, ''), VALID_JVC_CHARACTERS);

        if (answerChar !== '') {
            return { invalid: true, attr2: `réponse ${i + 1}`, char: answerChar };
        }
    }
    return { invalid: false, attr2: '', char: '' };
}

/**
 * Renvoie true si l'un des attributs textuels obligatoires est vide ou si le titre du topic est trop court.
 * 
 * @function
 * @name checkEmptyAttributes
 * @kind function
 * @param {Loop} loopObj
 * @returns {emptyAttrCheck}
 */
export function checkEmptyAttributes(loopObj: Loop): emptyAttrCheck {
    if (loopObj.name.trim().length === 0) {
        return { emptyAttr: true, attr: 'nom' };
    }
    if (loopObj.title.trim().length < MIN_TOPIC_TITLE_LENGTH) {
        return { emptyAttr: true, attr: 'titre' };
    }
    if (loopObj.first_message.trim().length === 0) {
        return { emptyAttr: true, attr: 'message principal' };
    }
    for (let i = 0; i < loopObj.answers.length; i++) {
        const answer = loopObj.answers[i];
        if (answer.text.trim().length === 0) {
            return { emptyAttr: true, attr: `réponse ${i + 1}` };
        }
    }
    return { emptyAttr: false, attr: '' };
}

/**
 * Renvoie true si la chaîne de caractères ne contient que des lettres standardes ou des chiffres.
 * 
 * @function
 * @name containsOnlyAccentedOrNonAlphanumeric
 * @kind function
 * @param {string} str
 * @returns {boolean}
 * @exports
 */
export function containsOnlyAccentedOrNonAlphanumeric(str: string): boolean {
    const lettersAndDigits = /[A-Za-z0-9]/;
    return !lettersAndDigits.test(str);
}

interface checkLoopRes {
    sameName: boolean | null; // true s'il y a une boucle de même nom
    sameTime: boolean | null; // true s'il y a une boucle de même horaire
    duplicateTime: string | null; // l'horaire en double
    duplicateTimeLoop: Loop | null; // la boucle déjà enregistrée
};

/**
 * Ajoute la boucle à l'attribut loops des comptes enregistrés concernés.
 * 
 * @async
 * @function
 * @name addLoopToAccounts
 * @kind function
 * @param {Loop} loopObj
 * @returns {Promise<number>}
 */
export async function addLoopToAccounts(loopObj: Loop): Promise<number> {
    console.info('Adding loop to concerned accounts...');
    const ids = loopObj.accounts.map((a: MiniAccount) => a.id);
    const accounts = await readAccounts((a: Account) => ids.includes(a.id));
    const codes = [];
    for (const account of accounts) {
        account.loops.push({ id: loopObj.id, name: loopObj.name }); // ajout du compte à l'objet Loop
        const code = await updateAccount(account);
        codes.push(code);
    }

    // si toutes les requêtes à la base de données sont un succès, alors l'appel de la fonction est un succès
    const code = codes.every(c => c === D1_SUCCESS) ? D1_SUCCESS : D1_ERROR;
    return code;
}


/**
 * Fonction permettant de savoir si le nom de la boucle est déjà pris ou si les heures renseignées sont déjà assignées
 * à une autre boucle (on ne peut poster deux boucles simultanément).
 * 
 * @async
 * @function
 * @name checkLoopRedundancy
 * @kind function
 * @param {Loop} loopObj
 * @param {boolean} isAnUpdate?
 * @returns {Promise<checkLoopRes>}
 */
export async function checkLoopRedundancy(loopObj: Loop, isAnUpdate: boolean = false): Promise<checkLoopRes> {
    console.info('Checking if loop already exists...');
    try {
        // si c'est une mise à jour on exclut la boucle à mettre à jour de la recherche
        const sameName = isAnUpdate ? await readLoops((l: Loop) => l.name === loopObj.name && l.id !== loopObj.id) : await readLoops((l: Loop) => l.name === loopObj.name);
        if (sameName.length > 0) {
            console.warn(`Loop is redundant by name.`);
            return { sameName: true, sameTime: null, duplicateTime: null, duplicateTimeLoop: null };
        }

        const loops = isAnUpdate ? await readLoops((l: Loop) => l.id !== loopObj.id) : await readLoops();
        for (const loop of loops) {
            const duplicateTime = loop.times.find(element => loopObj.times.includes(element));
            if (duplicateTime !== undefined) {
                const duplicateTimeLoop = loop;

                console.warn(`Loop is redundant by time ${duplicateTime} with ${JSON.stringify(duplicateTimeLoop)}`);
                return { sameName: false, sameTime: true, duplicateTime: duplicateTime, duplicateTimeLoop: duplicateTimeLoop };
            }
        }
        console.info(`Loop is not redundant.`);

        return { sameName: false, sameTime: false, duplicateTime: null, duplicateTimeLoop: null };
    } catch (err) {
        console.error(err);
        return { sameName: null, sameTime: null, duplicateTime: null, duplicateTimeLoop: null };
    }
}

/**
 * Renvoie true si le forum d'ID passé en entrée existe.
 * 
 * @async
 * @function
 * @name doesForumExist
 * @kind function
 * @param {number} forumId
 * @returns {Promise<boolean | null>}
 */
export async function doesForumExist(forumId: number): Promise<boolean | null> {
    console.info(`Checking if forum ${forumId} exist...`);
    try {
        const forum = await Forum.create(forumId);
        const answer = await forum.doesForumExist();
        console.info(`Does forum exist: ${answer}.`);
        return answer;
    } catch (err) {
        console.error(`Error while checking: ${err}.`);
        return null;
    }
}

/**
 * Met à jour la base de données pour ajouter ou modifier une boucle
 * 
 * @async
 * @function
 * @name saveLoop
 * @kind function
 * @param {Loop} loopObj
 * @param {boolean} isAnUpdate?
 * @returns {Promise<number>}
 */
export async function saveLoop(loopObj: Loop, isAnUpdate: boolean = false): Promise<number> {
    let code = 0;
    if (isAnUpdate) {
        code = await updateLoop(loopObj);
    } else {
        code = await insertLoop(loopObj);
    }

    return code;
}

export interface LoopHandlingResult {
    loop: Loop;
    infos: { [k: string]: any };
    code: number;
}

interface RouterLoopResult {
    resultStr: string; // la chaîne renseignant le résultat de la requête à communiquer au front
    statusCode: number; // le statut de la réponse
}

/**
 * Renvoie le code de la réponse et le message de la réponse renvoyée au client en fonction du code renvoyé par
 * le processus d'ajout de la boucle.
 * 
 * @function
 * @name handleProcessCodeForRouter
 * @kind function
 * @param {LoopHandlingResult} res
 * @returns {RouterLoopResult}
 */
export function handleLoopProcessCodeForRouter(res: LoopHandlingResult): RouterLoopResult {
    var resultStr: string = '';
    var statusCode: number = 200;

    switch (res.code) {
        case INEXISTENT_LOOP_FORUM:
            resultStr = `Échec de la requête : le forum d'ID ${res.loop.forumId} n'existe pas.`;
            statusCode = 404;
            break;
        case LOOP_NAME_REDUNDANT:
            resultStr = `Échec de la requête : une boucle du nom de ${res.loop.name} a déjà été programmée.`;
            statusCode = 409;
            break;
        case LOOP_TIME_REDUNDANT:
            resultStr = `Échec de la requête : une boucle (${res.infos.duplicateTimeLoop.name}) a déjà été programmée à l'heure ${res.infos.duplicateTime}.`;
            statusCode = 409;
            break;
        case EMPTY_LOOP_DATA:
            resultStr = res.infos.attr === 'titre' ? `Échec de la requête : le titre fait moins de 3 caractères.` : `Échec de la requête : l'attribut "${res.infos.attr}" est vide.`;
            statusCode = 400;
            break;
        case INVALID_CHAR:
            resultStr = `Échec de la requête : l'attribut "${res.infos.attr2}" contient un caractère invalide ("${res.infos.char}") que JVC n'autorise pas.`;
            statusCode = 400;
            break;
        case ONLY_NON_STANDARD_CHARS_IN_TITLE:
            resultStr = 'Échec de la requête : le titre doit comporter au moins une lettre ou un chiffre selon JVC.';
            statusCode = 400;
            break;
        case ADDING_SUCCESS:
            resultStr = `Succès de la requête : boucle ${res.loop.name} créée avec succès.`;
            statusCode = 200;
            break;
        case UPDATE_SUCCESS:
            resultStr = `Succès de la requête : boucle ${res.loop.name} modifiée avec succès.`;
            statusCode = 200;
            break;
        default:
            resultStr = 'Échec de la requête : raison inconnue.';
            statusCode = 500;
            break;
    }

    return { resultStr, statusCode };
}
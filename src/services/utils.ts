import Account, { MiniLoop } from '../interfaces/Account.js';
import Loop, { MiniAccount } from "../interfaces/Loop.js";
import ServerLog from '../interfaces/ServerLog.js';
import { DELAY_BETWEEN_LOOP_POSTS_IN_MINUTES, DELETION_SUCCESS, KV_SUCCESS, PROXY_CHECK_FAIL, UPDATE_FAIL, UPDATE_SUCCESS, VALID_PROXY } from '../vars.js';
import { kv as KV, d1 as D1 } from '../classes/Env.js';
import logger, { Logger } from '../classes/Logger.js';
import { removeOldLastPostsFromLoops } from './handle_loops.js';
import { updateAccounts } from './update_accounts.js';
import { getProxyURL, setProxyURL } from '../database.js';
import { checkProxyValidity } from './update_config.js';

/**
 * Cooldown de <ms> millisecondes.
 * 
 * @function
 * @name sleep
 * @kind function
 * @param {number} ms
 * @returns {Promise<unknown>}
 */
export function sleep(ms: number): Promise<unknown> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Renvoie un objet MiniAccount à partir d'un objet Account et l'ordre dans le post de la boucle que ce compte possède.
 * 
 * @function
 * @name accountToMiniAccount
 * @kind function
 * @param {Account} account
 * @param {number} order
 * @returns {MiniAccount}
 */
export function accountToMiniAccount(account: Account, order: number): MiniAccount {
    return {
        id: account.id,
        username: account.username,
        isBanned: account.isBanned,
        unusable: account.unusable,
        order: order
    }
}

/**
 * Renvoie un objet MiniLoop à partir d'un objet Loop.
 * 
 * @function
 * @name loopToMiniLoop
 * @kind function
 * @param {Loop} loop
 * @returns {MiniLoop}
 */
export function loopToMiniLoop(loop: Loop): MiniLoop {
    return {
        id: loop.id,
        name: loop.name
    };
}

interface AccountWithoutPassword {
    id: number;
    username: string;
    level: number;
    isBanned: boolean;
    loops: MiniLoop[];
    unusable: boolean;
}

/**
 * Enlève la propriété mot de passe d'un compte pour l'injecter sans risque dans le frontend.
 * 
 * @function
 * @name removePasswordFromAccount
 * @kind function
 * @param {Account} account
 * @returns {AccountWithoutPassword}
 * @exports
 */
export function removePasswordFromAccount(account: Account): AccountWithoutPassword {
    const { password, ...rest } = account;
    return rest;
}

/**
 * Renvoie la liste des comptes sans inclure les mots de passe.
 * 
 * @function
 * @name removePasswordsFromAccounts
 * @kind function
 * @param {Array<Account>} accounts
 * @returns {{ id: number; username: string; level: number; isBanned: boolean; loops: MiniLoop[]; unusable: boolean; }[]}
 * @exports
 */
export function removePasswordsFromAccounts(accounts: Array<Account>): Array<AccountWithoutPassword> {
    return accounts.map(account => removePasswordFromAccount(account));
}

/**
 * Renvoie la date actuelle à l'heure de Paris.
 * 
 * @function
 * @name getParisDate
 * @kind function
 * @returns {Date}
 * @exports
 */
export function getParisDate(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
}

/**
 * Renvoie l'heure de Paris actuelle au format HH:MM.
 * 
 * @function
 * @name getHHMM
 * @kind function
 * @returns {string}
 * @exports
 */
export function getHHMM(): string {
    const date = getParisDate();
    const parsedHour = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
    return parsedHour;
}

/**
 * Retrance l'heure time2 à l'heure time1. Les deux heures sont au format HH:MM et un HH:MM est renvoyé.
 * 
 * @function
 * @name subtractHHMMTime
 * @kind function
 * @param {string} time1
 * @param {string} time2
 * @returns {string}
 * @exports
 */
export function subtractHHMMTime(time1: string, time2: string): string {
    const [hours1, minutes1] = time1.split(':').map(Number);
    const [hours2, minutes2] = time2.split(':').map(Number);

    const totalMinutes1 = hours1 * 60 + minutes1;
    const totalMinutes2 = hours2 * 60 + minutes2;

    let difference = totalMinutes1 - totalMinutes2;

    if (difference < 0) {
        difference += 24 * 60;
    }

    const diffHours = Math.floor(difference / 60);
    const diffMinutes = difference % 60;

    return `${String(diffHours).padStart(2, '0')}:${String(diffMinutes).padStart(2, '0')}`;
}

/**
 * Ajoute l'heure au format HH:MM à la date spécifiée.
 * 
 * @function
 * @name addTimeToDate
 * @kind function
 * @param {Date} date
 * @param {string} time
 * @returns {Date}
 * @exports
 */
export function addTimeToDate(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);

    const newDate = new Date(date);

    newDate.setHours(newDate.getHours() + hours);
    newDate.setMinutes(newDate.getMinutes() + minutes);

    if (newDate < date) {
        newDate.setDate(newDate.getDate() + 1);
    }

    return newDate;
}

/**
 * Renvoie un tableau où les logs sont triés par ordre décroissant de date.
 * 
 * @function
 * @name sortLogsByDate
 * @kind function
 * @param {Array<ServerLog>} logs
 * @returns {Array<ServerLog>}
 * @exports
 */
export function sortLogsByDescendingDates(logs: Array<ServerLog>): Array<ServerLog> {
    return logs.sort((a: ServerLog, b: ServerLog) => b.date.getTime() - a.date.getTime());
}

/**
 * Range le tableau de dates par date croissante.
 * 
 * @function
 * @name sortDates
 * @kind function
 * @param {Array<Date>} dates
 * @returns {Array<Date>}
 * @exports
 */
export function sortDates(dates: Array<Date>): Array<Date> {
    return dates.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Renvoie true si deux dates ont les mêmes année, mois, jour, heure et minute.
 * 
 * @function
 * @name areDatesEqualTillMinutes
 * @kind function
 * @param {Date} date1
 * @param {Date} date2
 * @returns {boolean}
 * @exports
 */
export function areDatesEqualTillMinutes(date1: Date, date2: Date): boolean {
    const year1 = date1.getFullYear();
    const month1 = date1.getMonth();
    const day1 = date1.getDate();
    const hour1 = date1.getHours();
    const minute1 = date1.getMinutes();

    const year2 = date2.getFullYear();
    const month2 = date2.getMonth();
    const day2 = date2.getDate();
    const hour2 = date2.getHours();
    const minute2 = date2.getMinutes();

    return year1 === year2 &&
        month1 === month2 &&
        day1 === day2 &&
        hour1 === hour2 &&
        minute1 === minute2;
}

/**
 * Renvoie une liste d'heures au format HH:MM qui seront les horaires possibles qu'une boucle pourra posséder.
 * 
 * @function
 * @name generateTimes
 * @kind function
 * @returns {Array<string>}
 */
export function generateTimes(): Array<string> {
    var times = [];
    for (let i = 0; i < 24 * 60; i += DELAY_BETWEEN_LOOP_POSTS_IN_MINUTES) {
        const minutes = Math.floor(i / 60);
        const seconds = i % 60;
        times.push(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }
    return times.sort();
}

/**
 * Renvoie une liste d'heures au format HH:MM qui seront les délais de réponses possibles pour chaque réponse.
 * Il s'agit du délai entre la réponse précédente (ou topic si pas de réponse précédente) et la réponse cible.
 * 
 * @function
 * @name generateDelays
 * @kind function
 * @returns {Array<string>}
 */
export function generateDelays(): Array<string> {
    const delays = [];
    const minuteToDelay = (i: number) => {
        const hours = Math.floor(i / 60);
        const minutes = i % 60;
        const delay = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        return delay
    }

    for (let i = 1; i < 10; i += 1) {
        delays.push(minuteToDelay(i));
    }

    for (let i = 10; i <= 30; i += 5) {
        delays.push(minuteToDelay(i));
    }

    delays.push(minuteToDelay(45));

    for (let i = 60; i < 60 * 3; i += 30) {
        delays.push(minuteToDelay(i));
    }

    for (let i = 60 * 3; i <= 60 * 12; i += 60) {
        delays.push(minuteToDelay(i));
    }

    return delays.sort();
}

/**
 * Middleware permettant d'enregistrer à chaque requête la variable
 * donnant l'accès à la base de données D1 de l'environnement Cloudflare dans un attribut
 * de l'objet D1 pour qu'elle soit accessible depuis l'ensemble de l'architecture.
 * Même chose pour KV.
 * 
 * @function
 * @name prepareDB
 * @kind function
 * @param {Env} env
 * @returns {void}
 */
export function prepareDB(env: Env): void {
    D1.setDb(env.DB);
    KV.setKv(env.KV);
}

/**
 * Fonction appelée toutes les six heures par un cron trigger qui met à jour les données stockées dans la base de données,
 * et vérifie si le proxy ajouté est encore valide.
 * 
 * @async
 * @function
 * @name updateData
 * @kind function
 * @returns {Promise<number>}
 * @exports
 */
export async function updateData(): Promise<number> {
    const { code } = await updateAccounts(); // mise à jour des comptes
    const lastPostsRemovalCode = await removeOldLastPostsFromLoops(); // retrait des anciens posts
    const logsRemovalCode = await Logger.removeOldLogs(); // retrait des anciens logs
    const currentProxyURL = await getProxyURL() as string;
    const proxyCode = await checkProxyValidity(currentProxyURL);
    let KVCode: number = KV_SUCCESS;

    if (proxyCode !== VALID_PROXY && proxyCode !== PROXY_CHECK_FAIL) { // si proxy devenu invalide
        await logger.serverLog('attention', 'mise à jour de la base de données', 'INVALID_PROXY_URL', `L'URL "${currentProxyURL}" fournie n'est pas valide. Soit le site n'existe pas, soit il n'est pas un proxy ExpressJS hébergé sur Vercel.`);
        KVCode = await setProxyURL(''); // mise à vide du proxy pour que l'utilisateur le change à la prochaine connection
    } else if (proxyCode === PROXY_CHECK_FAIL) {
        await logger.serverLog('erreur', 'mise à jour de la base de données', 'PROXY_CHECK_FAIL', `Une erreur inconnue a été rencontrée durant la vérification du proxy suivant : "${currentProxyURL}".`);
    }

    const updateDataCode = code === UPDATE_SUCCESS && lastPostsRemovalCode === DELETION_SUCCESS && logsRemovalCode === DELETION_SUCCESS && proxyCode !== PROXY_CHECK_FAIL && KVCode === KV_SUCCESS ? UPDATE_SUCCESS : UPDATE_FAIL;

    if (updateDataCode === UPDATE_SUCCESS) {
        await logger.serverLog('info', 'mise à jour de la base de données', 'UPDATE_SUCCESS', 'La base de données a été mise à jour avec succès. Cela inclut la mise à jour des comptes, le retrait des anciens posts et des anciens logs.');
    } else {
        await logger.serverLog('erreur', 'mise à jour de la base de données', 'UPDATE_FAIL', 'La mise à jour de la base de données a échoué. Cela inclut la mise à jour des comptes, le retrait des anciens posts et des anciens logs.');
    }

    return updateDataCode;
}

/**
 * Renvoie true si le proxy actuellement stocké est vide ou n'a pas été renseigné.
 * 
 * @async
 * @function
 * @name isCurrentProxyEmpty
 * @kind function
 * @returns {Promise<boolean>}
 * @exports
 */
export async function isCurrentProxyEmpty(): Promise<boolean> {
    const proxyURL = await getProxyURL();
    return !proxyURL || proxyURL.trim() === '';
}

declare global {
    interface Array<T> {
        filterIndex(predicate: (value: T, index: number, array: T[]) => boolean): number[];
    }
}

/**
 * Ajout d'une méthode aux objets Array qui fonctionne comme Array.prototype.filter sauf qu'elle renvoie
 * un tableau d'indices au lieu d'un tableau de valeurs.
 * 
 * @var
 * @name Array
 * @type {ArrayConstructor}
 */
Array.prototype.filterIndex = function <T>(this: T[], predicate: (value: T, index: number, array: T[]) => boolean): number[] {
    return this
        .map((o, i) => [o, i] as [T, number])
        .filter(([o]) => predicate(o, this.indexOf(o), this))
        .map(([, i]) => i);
};
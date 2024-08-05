import { JSON_ACCOUNTS_PATH, JSON_LOOPS_PATH } from "../vars.js";
import { Account, MiniLoop } from '../interfaces/Account.js';
import { Loop, MiniAccount } from "../interfaces/Loop.js";
import { logger } from '../classes/Logger.js';
import { SUCCESSFULL_ACCOUNT_ADDING, FAILED_ACCOUNT_ADDING, JSON_ERROR } from "../vars.js";
import fs from 'fs/promises'; 

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function accountToMiniAccount(account: Account): MiniAccount {
    return {
        id: account.id,
        username: account.username,
        isBanned: account.isBanned,
        unusable: account.unusable
    }
}

function loopToMiniLoop(loop: Loop): MiniLoop {
    return {
        id: loop.id,
        name: loop.name
    };
}

/**
 * Renvoie tous les objets Account du fichier satisfaisant la fonction passée en entrée.
 * 
 * @async
 * @function
 * @name getAccounts
 * @kind function
 * @param {Function} filterFunc?
 * @returns {Promise<Array<Account>>}
 */
async function getAccounts(filterFunc: Function = (a: Account) => true): Promise<Array<Account>> {
    logger.info(`Reading all accounts.`);
    try {
        const fileContent = await fs.readFile(JSON_ACCOUNTS_PATH, 'utf-8');
        const accounts = JSON.parse(fileContent);
        const accountsFiltered = accounts.filter(filterFunc);

        logger.info(`Accounts: ${JSON.stringify(accountsFiltered)}`);
        return accountsFiltered;
    } catch (err) {
        logger.error(`Error reading or parsing ${JSON_ACCOUNTS_PATH}: ${err}`, true);
        return null;
    }
}

/**
 * Ajoute un ou plusieurs comptes au fichier.
 * 
 * @async
 * @function
 * @name addAccountsToJSON
 * @kind function
 * @param {Array<Account>} accounts
 * @returns {Promise<0 | 6>}
 */
async function addAccountsToJSON(accounts: Array<Account>) {
    for (const account of accounts) {
        try {
            logger.info(`Saving account ${JSON.stringify(account)} to ${JSON_ACCOUNTS_PATH}.`);
            const fileContent = await fs.readFile(JSON_ACCOUNTS_PATH, 'utf-8');
            
            let data = [];
            if (fileContent.trim()) {
                data = JSON.parse(fileContent);
            }

            data.push(account);
            await fs.writeFile(JSON_ACCOUNTS_PATH, JSON.stringify(data, null, 2), 'utf-8');
            logger.info('Account saved with success.');

            return SUCCESSFULL_ACCOUNT_ADDING;
        } catch (err) {
            logger.error(`Encountered issue while adding account to JSON file: ${err}`, true);
            return JSON_ERROR;
        }
    }
}

/**
 * Écrase la totalité du fichier par un nouveau tableau de comptes.
 * 
 * @async
 * @function
 * @name writeAccountsToJSON
 * @kind function
 * @param {Array<Account>} accounts
 * @returns {Promise<0 | 6>}
 */
async function writeAccountsToJSON(accounts: Array<Account>) {
    try {
        logger.info(`Setting accounts ${JSON.stringify(accounts)} into ${JSON_ACCOUNTS_PATH}.`);
        await fs.writeFile(JSON_ACCOUNTS_PATH, JSON.stringify(accounts, null, 2), 'utf-8');
    
        return SUCCESSFULL_ACCOUNT_ADDING;
    } catch (err) {
        logger.error(`Encountered issue while adding account to JSON file: ${err}`, true);
        return JSON_ERROR;
    }
}

/**
 * Écrase la totalité du fichier par un nouveau tableau de boucles.
 * 
 * @async
 * @function
 * @name writeLoopsToJSON
 * @kind function
 * @param {Array<Loop>} loops
 * @returns {Promise<number>}
 */
async function writeLoopsToJSON(loops: Array<Loop>): Promise<number> {
    try {
        logger.info(`Setting loops ${JSON.stringify(loops)} into ${JSON_LOOPS_PATH}.`);
        await fs.writeFile(JSON_LOOPS_PATH, JSON.stringify(loops, null, 2), 'utf-8');
    
        return SUCCESSFULL_ACCOUNT_ADDING;
    } catch (err) {
        logger.error(`Encountered issue while adding account to JSON file: ${err}`, true);
        return JSON_ERROR;
    }
}

/**
 * Renvoie toutes les boucles satisfaisant la fonction passée en entrée.
 * 
 * @async
 * @function
 * @name getLoops
 * @kind function
 * @param {Function} filterFunc?
 * @returns {Promise<Array<Loop>>}
 */
async function getLoops(filterFunc: Function = (l: Loop) => true): Promise<Array<Loop>> {
    logger.info(`Reading all loops.`);
    try {
        const fileContent = await fs.readFile(JSON_LOOPS_PATH, 'utf-8');
        const loops = JSON.parse(fileContent);
        const loopsFiltered = loops.filter(filterFunc);

        logger.info(`Loops: ${JSON.stringify(loopsFiltered)}`);
        return loopsFiltered;
    } catch (err) {
        logger.error(`Error reading or parsing ${JSON_LOOPS_PATH}: ${err}`, true);
        return null;
    }
}

export { getAccounts, loopToMiniLoop, addAccountsToJSON, writeAccountsToJSON, getLoops, writeLoopsToJSON, sleep, accountToMiniAccount };
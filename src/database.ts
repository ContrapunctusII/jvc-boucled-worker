import Account, { MiniLoop } from "./interfaces/Account.js";
import { D1_ERROR, D1_SUCCESS, KV_ERROR, KV_SUCCESS } from "./vars.js";
import ServerLog from "./interfaces/ServerLog.js";
import Loop, { Answer, LastPost, MiniAccount } from "./interfaces/Loop.js";
import { d1 as D1, kv as KV } from "./classes/Env.js";

/**
 * Fonction qui renvoie sous forme de tableau d'objets Accounts les comptes enregistrés dans la
 * base de données, filtrés avec la fonction filterFunc si renseignée.
 * 
 * @async
 * @function
 * @name readAccounts
 * @kind function
 * @param {Function} filterFunc?
 * @returns {Promise<Array<Account>>}
 * @exports
 */
export async function readAccounts(filterFunc: Function = () => true): Promise<Array<Account>> {
    const { results } = await D1.db.prepare(
        "SELECT * FROM Accounts"
    )
        .all<any>();
    const parsedResults: Array<Account> = results.map((account: any) => ({
        id: account.AccountId,
        username: account.Username,
        password: account.Password,
        level: account.Level,
        isBanned: Boolean(account.IsBanned),
        loops: JSON.parse(account.Loops as unknown as string) as MiniLoop[],
        unusable: Boolean(account.Unusable)
    }));

    return parsedResults.filter((a: Account) => filterFunc(a));
}

/**
 * Fonction qui permet l'ajout d'un compte dans la base de données.
 * 
 * @async
 * @function
 * @name insertAccount
 * @kind function
 * @param {Account} account
 * @returns {Promise<number>}
 * @exports
 */
export async function insertAccount(account: Account): Promise<number> {
    try {
        const loopsString = JSON.stringify(account.loops);
        const stmt = D1.db.prepare(
            `INSERT INTO Accounts (AccountId, Username, Password, Level, IsBanned, Loops, Unusable)
            VALUES (?, ?, ?, ?, ?, ?, ?)`
        );

        await stmt.bind(
            account.id,
            account.username,
            account.password,
            account.level,
            account.isBanned,
            loopsString,  // Loops est maintenant une chaîne
            account.unusable
        ).run();

        return D1_SUCCESS;
    } catch (err) {
        console.error(err);

        return D1_ERROR;
    }
}

/**
 * Fonction qui permet l'ajout d'un log dans la base de données.
 * 
 * @async
 * @function
 * @name insertLog
 * @kind function
 * @param {ServerLog} log
 * @returns {Promise<number>}
 * @exports
 */
export async function insertLog(log: ServerLog): Promise<number> {
    try {
        const stmt = D1.db.prepare(
            `INSERT INTO Logs (LogId, LogType, LogMessage, Operation, Details, LogDate)
            VALUES (?, ?, ?, ?, ?, ?)`
        );

        await stmt.bind(
            log.id,
            log.type,
            log.message,
            log.operation,
            log.details,
            log.date.toString(),
        ).run();

        return D1_SUCCESS;
    } catch (err) {
        console.error(err);

        return D1_ERROR;
    }
}

/**
 * Fonction supprimant le log donné en entrée de la base de données.
 * 
 * @async
 * @function
 * @name deleteLog
 * @kind function
 * @param {ServerLog} log
 * @returns {Promise<number>}
 * @exports
 */
export async function deleteLog(log: ServerLog): Promise<number> {
    try {
        const stmt = D1.db.prepare('DELETE FROM Logs WHERE LogId = ?').bind(log.id);
        await stmt.run();

        return D1_SUCCESS;
    } catch (err) {
        console.error(err);
        return D1_ERROR;
    }
}

/**
 * Remplace un compte par l'objet passé en entrée dans la base de données. Cet objet doit contenir
 * l'ID du compte à modifier.
 * 
 * @async
 * @function
 * @name updateAccount
 * @kind function
 * @param {Account} account
 * @returns {Promise<number>}
 * @exports
 */
export async function updateAccount(account: Account): Promise<number> {
    try {
        const loopsString = JSON.stringify(account.loops);

        const stmt = D1.db.prepare(
            `UPDATE Accounts
            SET Username = ?, Password = ?, Level = ?, IsBanned = ?, Loops = ?, Unusable = ?
            WHERE AccountId = ?`
        );

        await stmt.bind(
            account.username,
            account.password,
            account.level,
            account.isBanned,
            loopsString,
            account.unusable,
            account.id
        ).run();

        return D1_SUCCESS;
    } catch (err) {
        console.error(err);
        return D1_ERROR;
    }
}

/**
 * Retire le compte passé en entrée de la base de données.
 * 
 * @async
 * @function
 * @name deleteAccount
 * @kind function
 * @param {Account} account
 * @returns {Promise<number>}
 * @exports
 */
export async function deleteAccount(account: Account): Promise<number> {
    try {
        const stmt = D1.db.prepare('DELETE FROM Accounts WHERE AccountId = ?').bind(account.id);
        await stmt.run();

        return D1_SUCCESS;
    } catch (err) {
        console.error(err);

        return D1_ERROR;
    }
}

/**
 * Renvoie la liste des logs du serveur, filtrée par la fonction filterFunc si elle est renseignée.
 * 
 * @async
 * @function
 * @name readLogs
 * @kind function
 * @param {Function} filterFunc?
 * @returns {Promise<Array<ServerLog>>}
 * @exports
 */
export async function readLogs(filterFunc: Function = () => true): Promise<Array<ServerLog>> {
    const { results } = await D1.db.prepare('SELECT * FROM Logs').all<any>();
    const resultParsed: Array<ServerLog> = results.map((log: any) => ({
        id: log.LogId,
        date: new Date(log.LogDate),
        type: log.LogType,
        details: log.Details,
        operation: log.Operation,
        message: log.LogMessage
    }));
    return resultParsed.filter((l: ServerLog) => filterFunc(l));
}

/**
 * Renvoie la liste des boucles, filtrée par la fonction filterFunc si elle est renseignée.
 * 
 * @async
 * @function
 * @name readLoops
 * @kind function
 * @param {Function} filterFunc?
 * @returns {Promise<Array<Loop>>}
 * @exports
 */
export async function readLoops(filterFunc: Function = () => true): Promise<Array<Loop>> {
    const { results } = await D1.db.prepare(
        "SELECT * FROM Loops"
    )
        .all<any>();
    const parsedResults: Array<Loop> = results.map((loop: any) => ({
        id: loop.LoopId,
        name: loop.Name,
        title: loop.Title,
        forumId: loop.ForumId,
        description: loop.Description,
        first_message: loop.FirstMessage,
        answers: JSON.parse(loop.Answers as unknown as string) as Answer[],
        accounts: JSON.parse(loop.Accounts as unknown as string) as MiniAccount[],
        times: JSON.parse(loop.Times as unknown as string) as string[],
        lastPosts: JSON.parse(loop.LastPosts as unknown as string).map((lastPost: any) => ({
            ...lastPost,
            date: new Date(lastPost.date),
            nextAnswersDate: lastPost.nextAnswersDate.map((d: string) => new Date(d))
        })) as LastPost[],
        userStatus: loop.UserStatus,
        disabled: Boolean(loop.Disabled)
    }));

    return parsedResults.filter((l: Loop) => filterFunc(l));
}

/**
 * Ajoute la boucle dans la base de données.
 * 
 * @async
 * @function
 * @name insertLoop
 * @kind function
 * @param {Loop} loop
 * @returns {Promise<number>}
 * @exports
 */
export async function insertLoop(loop: Loop): Promise<number> {
    try {
        const stmt = D1.db.prepare(
            `INSERT INTO Loops (LoopId, Name, Title, ForumId, Description, FirstMessage, Answers, Times, Accounts, LastPosts, UserStatus, Disabled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );

        await stmt.bind(
            loop.id,
            loop.name,
            loop.title,
            loop.forumId,
            loop.description,
            loop.first_message,
            JSON.stringify(loop.answers),
            JSON.stringify(loop.times),
            JSON.stringify(loop.accounts),
            JSON.stringify(loop.lastPosts),
            loop.userStatus,
            loop.disabled
        ).run();

        return D1_SUCCESS;
    } catch (err) {
        console.error(err);

        return D1_ERROR;
    }
}

/**
 * Remplace une boucle dans la base de données par l'objet passé en entrée. Cet objet
 * doit contenir l'ID de la boucle à modifier.
 * 
 * @async
 * @function
 * @name updateLoop
 * @kind function
 * @param {Loop} loop
 * @returns {Promise<number>}
 * @exports
 */
export async function updateLoop(loop: Loop): Promise<number> {
    try {
        const stmt = D1.db.prepare(
            `UPDATE Loops
            SET Name = ?, Title = ?, ForumId = ?, Description = ?, FirstMessage = ?, Answers = ?, Times = ?, Accounts = ?, LastPosts = ?, UserStatus = ?, Disabled = ?
            WHERE LoopId = ?`
        );

        await stmt.bind(
            loop.name,
            loop.title,
            loop.forumId,
            loop.description,
            loop.first_message,
            JSON.stringify(loop.answers),
            JSON.stringify(loop.times),
            JSON.stringify(loop.accounts),
            JSON.stringify(loop.lastPosts),
            loop.userStatus,
            loop.disabled,
            loop.id
        ).run();

        return D1_SUCCESS;
    } catch (err) {
        console.error(err);

        return D1_ERROR;
    }
}

/**
 * Retire la boucle de la base de données.
 * 
 * @async
 * @function
 * @name deleteLoop
 * @kind function
 * @param {Loop} loop
 * @returns {Promise<number>}
 * @exports
 */
export async function deleteLoop(loop: Loop): Promise<number> {
    try {
        const stmt = D1.db.prepare('DELETE FROM Loops WHERE LoopId = ?').bind(loop.id);
        await stmt.run();

        return D1_SUCCESS;
    } catch (err) {
        console.error(err);

        return D1_ERROR;
    }
}

/**
 * Renvoie l'URL du proxy contenu dans la base de données KV.
 * 
 * @async
 * @function
 * @name getProxyURL
 * @kind function
 * @returns {Promise<string | null>}
 * @exports
 */
export async function getProxyURL(): Promise<string | null> {
    try {
        return await KV.db.get('proxyURL');
    } catch (err) {
        console.error(err);
        return null;
    }
}

/**
 * Modifie l'URL du proxy dans la base de données KV.
 * 
 * @async
 * @function
 * @name setProxyURL
 * @kind function
 * @param {string} proxyURL
 * @returns {Promise<number>}
 * @exports
 */
export async function setProxyURL(proxyURL: string): Promise<number> {
    try {
        await KV.db.put('proxyURL', proxyURL);
        return KV_SUCCESS;
    } catch (err) {
        console.error(err);
        return KV_ERROR;
    }
}
import express from 'express';
import fs from 'fs/promises';
import { handleNewAccount, handleAccountProcessCodeForRouter } from './services/add_account.js';
import { logger } from './classes/Logger.js';
import { handleNewLoop } from './services/add_loop.js';
import { SERVER_LOGS_PATH, INSUFFICIENT_LEVEL, INEXISTENT_ACCOUNT, WRONG_PASSWORD, FAILED_ACCOUNT_ADDING, ACCOUNT_ALREADY_REGISTERED, DELETION_FAILED, UPDATE_FAILED } from './vars.js';
import { getAccounts, getLoops } from './services/utils.js';
import { ServerLog } from './interfaces/ServerLog.js';
import { Loop } from './interfaces/Loop.js';
import { handleLoopProcessCodeForRouter } from './services/handle_loops.js';
import { handleLoopUpdate } from './services/update_loops.js';
import { handleAccountDeletion } from './services/remove_account.js';
import { updateAllAccounts } from './services/update_accounts.js';
import { handleLoopDeletion } from './services/remove_loop.js';

const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));
router.use((req, res, next) => {
    const logEntry = {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        body: req.body,
        params: req.params,
        query: req.query
    };
    logger.info(`Received request: ${JSON.stringify(logEntry)}`);
    next();
});

router.use((req, res, next) => {
    if (req.path.substring(-1) === '/' && req.path.length > 1) {
        const query = req.url.slice(req.path.length);
        res.redirect(301, req.path.slice(0, -1) + query);
    } else {
        next();
    }
});

router.get('/', async (req, res) => {
    res.redirect('/boucles');
});

router.get('/boucles', async (req, res) => {
    // renvoie la liste des boucles
    const loops = await getLoops();
    res.render('loops', { loops });
});

router.get('/comptes', async (req, res) => {
    // renvoie la liste des comptes
    const accounts = await getAccounts();
    res.render('accounts', { accounts });
});

router.post('/ajout-compte', async (req, res) => {
    // ajoute un compte au fichier
    const handleRes = await handleNewAccount(req.body.username, req.body.password);

    const { resultStr, statusCode } = handleAccountProcessCodeForRouter(handleRes);

    res.status(statusCode).json({
        ...handleRes.infos,
        resultStr: resultStr
    });
});

router.get('/ajout-boucle', async (req, res) => {
    // formulaire pour créer une boucle
    const accounts = await getAccounts();
    res.render('add_loop', { accounts });
});

router.get('/logs', async (req, res) => {
    // affiche les logs du serveur
    try {
        const data = await fs.readFile(SERVER_LOGS_PATH, 'utf-8');
        const logs = JSON.parse(data);
        logs.sort((a: ServerLog, b: ServerLog) => new Date(b.date).getTime() - new Date(a.date).getTime());

        res.render('logs', { logs });
    } catch (err) {
        logger.error(err, true)
        res.status(500).send(`Error reading ${SERVER_LOGS_PATH}.`);
    }
});


router.post('/ajout-boucle', async (req, res) => {
    // requête POST pour ajouter une boucle au fichier
    const handleRes = await handleNewLoop(req.body);
    const { resultStr, statusCode } = handleLoopProcessCodeForRouter(handleRes, false);

    res.status(statusCode).json({
        ...handleRes.infos,
        resultStr: resultStr
    });
});

router.get('/boucle/:id', async (req, res) => {
    // affiche les informations d'une boucle
    try {
        const loopId = parseInt(req.params.id);
        const loops = await getLoops((l: Loop) => l.id === loopId);
        const accounts = await getAccounts();
        if (loops.length > 0) {
            const loop = loops[0];
            return res.render('loop', { loop: loop, accounts: accounts });
        }
        return res.status(404).send(`La boucle d'ID ${loopId} n'existe pas.`);
    } catch (err) {
        logger.error(err, true)
        res.status(500).send(err.message);
    }
});

router.put('/boucle/:id', async (req, res) => {
    // modifie les informations d'une boucle
    const handleRes = await handleLoopUpdate(req.body);
    const { resultStr, statusCode } = handleLoopProcessCodeForRouter(handleRes, true);

    res.status(statusCode).json({
        ...handleRes.infos,
        resultStr: resultStr
    });
});

router.delete('/boucle/:id', async (req, res) => {
    // supprime une boucle
    const { code, name } = await handleLoopDeletion(parseInt(req.params.id));
    if (code === DELETION_FAILED) {
        return res.status(500).json({
            resultStr: 'Échec de la requête : erreur inconnue (probablement avec le format JSON).'
        });
    }
    return res.status(200).json({
        resultStr: `Succès de la requête : la boucle ${name} a été retirée.`
    });
});

router.delete('/compte/:id', async (req, res) => {
    // supprime un compte
    const { code, username } = await handleAccountDeletion(parseInt(req.params.id));
    if (code === DELETION_FAILED) {
        return res.status(500).json({
            resultStr: 'Échec de la requête : erreur inconnue (probablement avec le format JSON).'
        });
    }
    return res.status(200).json({
        resultStr: `Succès de la requête : le compte ${username} a été retiré.`
    });
});

router.put('/comptes/mise-a-jour', async (req, res) => {
    // met à jour l'ensemble des comptes
    const { updatedAccounts, code } = await updateAllAccounts();
    if (code === UPDATE_FAILED) {
        return res.status(500).json({
            resultStr: 'Échec de la requête : erreur inconnue.'
        });
    }
    return res.status(200).json({
        resultStr: `Succès de la requête : les comptes ont été mis à jour.`
    });
});

router.use((req, res, next) => {
    res.status(404).json({
        error: 'Page not found'
    });
});

export default router;

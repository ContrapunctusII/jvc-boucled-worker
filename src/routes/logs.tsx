import { Context, Hono } from "hono";
import ReactDOMServer from "react-dom/server";
import LogsPage from "../components/LogsPage.js";
import { readLogs } from "../database.js";
import { sortLogsByDescendingDates } from "../services/utils.js";

// Ce router contiendra les routes commençant par /logs
const router = new Hono();

// Route pour afficher les logs
router.get('/', async (c: Context): Promise<Response> => {
    try {
        const logs = await readLogs();
        const sortedLogs = sortLogsByDescendingDates(logs);
        // création de la table
        const stream = await ReactDOMServer.renderToReadableStream(<LogsPage logs={sortedLogs} />);

        return new Response(stream, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
            },
        });
    } catch (err: any) {
        console.error(err);
        return c.json({ error: `Erreur inconnue : ${err.message}` }, { status: 500 });
    }
});

export default router;
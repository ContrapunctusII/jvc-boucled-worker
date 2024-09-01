import { Hono, Context } from "hono";
import ReactDOMServer from "react-dom/server";
import PageConfig from '../components/ConfigPage.js';
import { getProxyURL } from "../database.js";
import Config from "../interfaces/Config.js";
import { handleConfigUpdate, handleConfigUpdateCodeForRouter } from "../services/update_config.js";

const router = new Hono();

router.get('/', async (c: Context): Promise<Response> => {
    try {
        const proxyURL = await getProxyURL();
        const stream = await ReactDOMServer.renderToReadableStream(<PageConfig config={{ proxyURL }} />);

        return new Response(stream, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
            },
        });
    } catch (err: any) {
        console.error(err);
        return c.json({ resultStr: `Erreur inconnue : ${err.message}` }, { status: 500 });
    }
});

router.put('/', async (c: Context): Promise<Response> => {
    try {
        const data = await c.req.json() as Config;
        const updateRes = await handleConfigUpdate(data);
        const { statusCode, resultStr } = handleConfigUpdateCodeForRouter(updateRes);

        return c.json({ resultStr }, { status: statusCode });
    } catch (err: any) {
        console.error(err);
        return c.json({ resultStr: `Erreur inconnue : ${err.message}` }, { status: 500 });
    }
})

export default router;
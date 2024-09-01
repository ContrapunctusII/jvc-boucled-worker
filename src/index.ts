import { sendLoopTopic, sendLoopAnswers } from './services/send_loop.js';
import { DELAY_BETWEEN_DATA_UPDATE_IN_HOURS, DELAY_BETWEEN_LOOP_POSTS_IN_MINUTES } from './vars.js';
import { Context, Hono } from 'hono';
import { isCurrentProxyEmpty, prepareDB, updateData } from './services/utils.js';
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers';
import boucles from './routes/boucles.js';
import boucle from './routes/boucle.js';
import logs from './routes/logs.js';
import comptes from './routes/comptes.js';
import compte from './routes/compte.js';
import config from './routes/config.js';
import { cache } from 'hono/cache'
// @ts-expect-error 
import manifest from '__STATIC_CONTENT_MANIFEST'; // délenche une erreur avec le serveur TS, vraisemblabement un bug

async function prepareDBMiddleware(c: Context, next: () => any) {
  prepareDB(c.env);
  await next();
}

async function checkForProxyMiddleware(c: Context, next: () => any) {
  // les assets et la page /config elle-même ne sont pas concernées par ce middleware
  if (c.req.path.startsWith('/config') || c.req.path.startsWith('/static')) {
    return await next();
  }

  if (await isCurrentProxyEmpty()) {
    return c.redirect('/config', 302);
  }

  return await next();
}

const app = new Hono();

app.use(
  '*',
  cors({
    origin: (origin: string, c: Context) => {
      return origin === null ? origin : undefined // aucune origine acceptée
    },
  })
);

app.use('*', prepareDBMiddleware);
app.use('*', checkForProxyMiddleware);

// mise en cache des fichiers statiques
app.get(
  '/static/*',
  cache({
    cacheName: 'jvc-boucled-worker-static',
    cacheControl: 'max-age=3600'
  })
);

app.route('/boucle', boucle);
app.route('/boucles', boucles);
app.route('/comptes', comptes);
app.route('/logs', logs);
app.route('/compte', compte);
app.route('/config', config);

app.get('/static/*', serveStatic({ root: './', manifest }))

app.get('/', async (c: Context): Promise<Response> => {
  const url = new URL(c.req.url);

  return c.redirect(`${url.origin}/boucles`, 301);
});

app.all('*', async (c: Context): Promise<Response> => c.notFound());

// await logger.serverLog('info', 'déploiement du worker', 'DEPLOYMENT_SUCCESS', 'Le worker a été déployé avec succès');

export default {
  ...app,
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    prepareDB(env);

    switch (controller.cron) {
      case `*/${DELAY_BETWEEN_LOOP_POSTS_IN_MINUTES} * * * *`:
        await sendLoopTopic(); // s'il y a des topics à poster
        break;
      case `0 */${DELAY_BETWEEN_DATA_UPDATE_IN_HOURS} * * *`:
        await updateData(); // rafraîchit la base de données
        break;
      case "* * * * *":
        await sendLoopAnswers(); // s'il y a des réponses à poster
        break;
    }
  },
} satisfies ExportedHandler<Env>;

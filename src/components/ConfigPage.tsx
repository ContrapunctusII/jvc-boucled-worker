import App from './App.js';
import Config from '../interfaces/Config.js';

const ProxyGitUrl: React.FC = (): JSX.Element => (
    <span><a href="https://github.com/ContrapunctusII/simple-express-proxy" target="_blank">proxy</a></span>
)

interface ConfigPageProps {
    config: Config;
    globalVars?: { [k: string]: any };
}

/**
 * Composant correspondant à la page /config dans laquelle est affiché l'ensemble des
 * paramètres de configuration du worker.
 * 
 * @function
 * @name LoopsPage
 * @kind variable
 * @type {React.FC<ConfigPageProps>}
 * @returns {JSX.Element}
 */
const ConfigPage: React.FC<ConfigPageProps> = ({ config, globalVars = {} }): JSX.Element => {
    const meta = {
        title: "Configuration | jvc-boucled-worker",
        stylesheets: [
            '/static/styles/style.css',
            '/static/styles/config.css'
        ],
        scripts: [
            'https://code.jquery.com/jquery-3.7.1.min.js',
            '/static/scripts/config.js'
        ]
    };

    const isThereNoProxy = !config.proxyURL || config.proxyURL === '';

    return (
        <App activePage="config" meta={meta} globalVars={globalVars}>
            <div className="page-supercontainer">
                <div className="page-container">
                    <div className={`attention-supercontainer ${isThereNoProxy ? "" : "hidden"}`} id="proxy-attention-supercontainer" style={{ marginTop: 0 }}>
                        <div id="attention-container" className="attention-container">
                            <p id="attention-msg">Vous n'avez pas encore ajouté un <ProxyGitUrl /> pour ce worker ou celui-ci n'est plus fonctionnel. Avant d'accéder aux autres pages du worker, veuillez ajouter un proxy.</p>
                        </div>
                    </div>
                    <div className="form-container">
                        <form id="form">
                            <div className="form-group" id="proxy-container">
                                <label htmlFor="proxy-url">URL du <ProxyGitUrl /><span className="tooltip-icon" data-tooltip="L'URL du serveur proxy déployé sur Vercel qui permet aux workers de ne pas envoyer des requêtes avec la même IP.">?</span></label>
                                <input disabled id="proxy-url" name="proxy-url" required maxLength={1000} type="url" defaultValue={config.proxyURL ? config.proxyURL : ''} placeholder="Ex. : https://mon-proxy.vercel.app"></input>
                            </div>
                            <div className="footer-container">
                                <div className="submit-buttons-container">
                                    <button type="button" className="submit-button" id="edit-button">Modifier la configuration</button>
                                    <button type="submit" className="submit-button hidden" id="submit-button">Enregistrer</button>
                                </div>
                                <div id="error-container" className="result-container error-container hidden">
                                    <p id="error-message"></p>
                                </div>
                                <div id="success-container" className="result-container success-container hidden">
                                    <p id="success-message"></p>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </App>
    );
};

export default ConfigPage;
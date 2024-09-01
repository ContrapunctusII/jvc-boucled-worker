import App from './App.js';
import LogsTable from './LogsTable.js';
import ServerLog from '../interfaces/ServerLog.js';

interface LogsPageProps {
    logs: Array<ServerLog>;
    globalVars?: { [k: string]: any };
}

/**
 * Composant correspondant à la page /logs qui affiche l'ensemble des logs enregistrés par le serveur
 * rangés par date décroissante (les plus récents en haut).
 * 
 * @function
 * @name LogsPage
 * @kind variable
 * @type {React.FC<LogsPageProps>}
 * @returns {JSX.Element}
 */
const LogsPage: React.FC<LogsPageProps> = ({ logs, globalVars = {} }): JSX.Element => {
    const meta = {
        title: "Logs | jvc-boucled-worker",
        stylesheets: [
            '/static/styles/style.css',
            '/static/styles/logs.css'
        ],
        scripts: [
            'https://code.jquery.com/jquery-3.7.1.min.js',
            '/static/scripts/logs.js'
        ]
    };

    return (
        <App activePage="logs" meta={meta} globalVars={globalVars}>
            <div className="page-container">
                <LogsTable logs={logs}></LogsTable>
            </div>
        </App>
    );
};

export default LogsPage;

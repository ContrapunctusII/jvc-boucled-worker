import App from './App.js';
import AccountsTable from './AccountsTable.js';
import AccountInterface from '../interfaces/Account.js';

interface AccountPageProps {
    accounts: Array<AccountInterface>;
    globalVars?: { [k: string]: any };
}

/**
 * Composant correspondant à la page /comptes dans laquelle est affiché l'ensemble des comptes JVC
 * enregistrés sous forme de table.
 * 
 * @function
 * @name AccountsPage
 * @kind variable
 * @type {React.FC<AccountPageProps>}
 * @returns {JSX.Element}
 */
const AccountsPage: React.FC<AccountPageProps> = ({ accounts, globalVars = {} }): JSX.Element => {
    const meta = {
        title: "Comptes | jvc-boucled-worker",
        stylesheets: [
            '/static/styles/style.css',
            '/static/styles/accounts.css'
        ],
        scripts: [
            'https://code.jquery.com/jquery-3.7.1.min.js',
            '/static/scripts/accounts.js'
        ]
    };
    return (
        <App activePage="comptes" meta={meta} globalVars={globalVars}>
            <div className="page-content">
                <AccountsTable accounts={accounts}></AccountsTable>
                <div className="footer-container">
                    <div className="add-account-form-container">
                        <form id="add-account-form">
                            <input type="text" id="username" name="username" placeholder="Nom d'utilisateur" maxLength={15} required />
                            <input type="password" id="password" name="password" placeholder="Mot de passe" maxLength={100} required />
                            <button type="submit" id="add-account-button">Ajouter un compte JVC</button>
                        </form>
                    </div>
                    <div id="error-container" className="result-container error-container hidden">
                        <p id="error-message"></p>
                    </div>
                    <div id="success-container" className="result-container success-container hidden">
                        <p id="success-message"></p>
                    </div>
                </div>
            </div>
        </App>
    );
};

export default AccountsPage;

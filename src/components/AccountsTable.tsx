import AccountComponent from './Account.js';
import AccountInterface from '../interfaces/Account.js';

interface AccountTableProps {
  accounts: Array<AccountInterface>;
}

/**
 * Table utilisée pour lister les comptes dans accounts.html.
 * 
 * @function
 * @name AccountsTable
 * @kind variable
 * @type {React.FC<AccountTableProps>}
 * @returns {JSX.Element}
 */
const AccountsTable: React.FC<AccountTableProps> = ({ accounts }): JSX.Element => (
  <div className="table-supercontainer">
    <div className={`table-container ${accounts.length === 0 ? 'hidden' : ''}`}>
      <table id="accounts-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom d'utilisateur</th>
            <th>Statut</th>
            <th>Niveau</th>
            <th>Utilisé dans les boucles</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="account-table-body">
          {accounts.map(account => (
            <AccountComponent key={account.id} account={account} />
          ))}
        </tbody>
      </table>
    </div>
    {/* Bouton de mise à jour globale */}
    <div className={`update-container ${accounts.length === 0 ? 'hidden' : ''}`}>
      <button id="update-all-button" className="update-all-btn">Tout mettre à jour</button> {/*Onclick : updateAccounts*/}
    </div>
    {/* Si pas de compte */}
    <div className={`attention-supercontainer ${accounts.length === 0 ? '' : 'hidden'}`}>
      <div id="attention-container" className="attention-container">
        <p id="attention-msg">Aucun compte n'a été ajouté.</p>
      </div>
    </div>
  </div>
);

export default AccountsTable;

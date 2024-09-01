import React from 'react';
import AccountInterface from '../interfaces/Account.js';
import { PROFILE_URL } from '../vars.js';

interface AccountProps {
  account: AccountInterface;
}

/**
 * Composant représentant un compte = une ligne dans la table de accounts.html.
 * 
 * @function
 * @name Account
 * @kind variable
 * @type {AccountProps}
 * @returns {JSX.Element}
 */
const Account: React.FC<AccountProps> = ({ account }): JSX.Element => (
  <tr className="account" data-id={account.id}>
    <td>{account.id}</td>
    {/* Lien vers le profil JVC */}
    <td><a href={PROFILE_URL.replace('*', account.username.toLowerCase())} target="_blank">{account.username}</a></td>
    <td className={account.isBanned || account.unusable ? 'banned' : 'available'}>
      {account.isBanned ? 'banni' : 'disponible'}
    </td>
    {/* Pas de niveau si compte banni (= niveau 0) */}
    <td>{account.level === 0 ? '' : account.level}</td>
    {/* Liste des boucles associées au compte avec lien */}
    <td>
      {(account.loops || []).map((loop, index) => (
        <React.Fragment key={loop.id}>
          <a href={`/boucle/${loop.id}`} target="_blank">{loop.name}</a>
          {index !== (account.loops || []).length - 1 && ', '}
        </React.Fragment>
      ))}
    </td>
    <td>
      <button className="delete-account-button delete-button">Supprimer</button>
    </td>
  </tr>
);

export default Account;
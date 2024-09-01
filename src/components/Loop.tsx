import React from 'react';
import LoopInterface from '../interfaces/Loop.js';
import { sortAccountsByOrder, sortLastPostsByTime } from '../services/handle_loops.js';

interface LoopProps {
  loop: LoopInterface;
}

/**
 * Ligne représentant une boucle dans la table des boucles de boucles.html.
 * 
 * @function
 * @name Loop
 * @kind variable
 * @type {React.FC<LoopProps>}
 * @returns {JSX.Element}
 */
const Loop: React.FC<LoopProps> = ({ loop }): JSX.Element => (
  <tr className="loop">
    <td><a href={`/boucle/${loop.id}`}>{loop.id}</a></td>
    <td>{loop.name}</td>
    <td>{loop.times.sort().join(', ')}</td>
    <td>
      {/* On range les comptes par leur ordre de priorité dans la boucle. */}
      {sortAccountsByOrder(loop.accounts).map((account, index) => (
        <React.Fragment key={index}>
          <span className={account.isBanned ? 'banned' : 'available'}>{account.username}</span>
          {index !== loop.accounts.length - 1 && ', '}
        </React.Fragment>
      ))}
    </td>
    <td>
      <span className={loop.userStatus === 'active' && !loop.disabled ? 'available' : 'banned'}>
        {loop.userStatus === 'active' && !loop.disabled ? 'Oui' : 'Non'}
      </span>
    </td>
    {/* On affiche le lien vers le dernier topic s'il y en a un. */}
    <td>
      {loop.lastPosts.length !== 0 && <a href={sortLastPostsByTime(loop.lastPosts)[loop.lastPosts.length - 1].topicURL} target="_blank">Voir ici</a>}
    </td>
  </tr>
);

export default Loop;
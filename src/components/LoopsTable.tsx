import LoopComponent from './Loop.js';
import LoopInterface from '../interfaces/Loop.js';

interface LoopsTableProps {
  loops: Array<LoopInterface>;
}

/**
 * Table listant les boucles dans boucles.html.
 * 
 * @function
 * @name LoopsTable
 * @kind variable
 * @type {React.FC<LoopsTableProps>}
 * @returns {JSX.Element}
 */
const LoopsTable: React.FC<LoopsTableProps> = ({ loops }): JSX.Element => (
  <div className="table-container">
    {/** Pas de table affichée si pas de boucle */}
    <table id="loops-table" className={`${loops.length === 0 ? 'hidden' : ''}`}>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nom</th>
          <th>Heures</th>
          <th>Comptes</th>
          <th>Active ?</th>
          <th>Dernier topic</th>
        </tr>
      </thead>
      <tbody id="loops-table-body">
        {loops.map(loop => (
          <LoopComponent key={loop.id} loop={loop} />
        ))}
      </tbody>
    </table>
    <div className={`attention-supercontainer ${loops.length === 0 ? '' : 'hidden'}`}>
      <div id="attention-container" className="attention-container">
        <p id="attention-msg">Aucune boucle n'a été ajoutée.</p>
      </div>
    </div>
  </div>
);

export default LoopsTable;
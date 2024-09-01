import App from './App.js';
import LoopsTable from './LoopsTable.js';
import LoopInterface from '../interfaces/Loop.js';

interface LoopsPageProps {
  loops: Array<LoopInterface>;
  globalVars?: { [k: string]: any };
}

/**
 * Composant correspondant à la page /boucles dans laquelle est affiché l'ensemble des boucles
 * enregistrées sous forme de table.
 * 
 * @function
 * @name LoopsPage
 * @kind variable
 * @type {React.FC<LoopsPageProps>}
 * @returns {JSX.Element}
 */
const LoopsPage: React.FC<LoopsPageProps> = ({ loops, globalVars = {} }): JSX.Element => {
  const meta = {
    title: "Boucles | jvc-boucled-worker",
    stylesheets: [
      '/static/styles/style.css',
      '/static/styles/loops.css'
    ],
    scripts: [
      'https://code.jquery.com/jquery-3.7.1.min.js'
    ]
  };
  return (
    <App activePage="boucles" meta={meta} globalVars={globalVars}>
      <div className="page-content-container">
        <LoopsTable loops={loops}></LoopsTable>
        <a href="/boucles/ajout-boucle">
          <button id="fixed-add-button" className="submit-button">Ajouter une boucle</button>
        </a>
      </div>
    </App>
  );
};

export default LoopsPage;
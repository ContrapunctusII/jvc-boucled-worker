import App from './App.js';
import LoopForm from './LoopForm.js';
import LoopInterface from '../interfaces/Loop.js';
import AccountInterface from '../interfaces/Account.js';

interface LoopPageProps {
  loop: LoopInterface;
  accounts: Array<AccountInterface>;
  globalVars?: { [k: string]: any };
}

/**
 * Composant correspondant à la page /boucle/:id qui affiche les informations d'une boucle enregistrée
 * sous forme de formulaire modifiable.
 * 
 * @function
 * @name LoopPage
 * @kind variable
 * @type {React.FC<LoopPageProps>}
 * @returns {JSX.Element}
 */
const LoopPage: React.FC<LoopPageProps> = ({ loop, accounts, globalVars = {} }): JSX.Element => {
  const meta = {
    title: `Boucle « ${loop.name} » | jvc-boucled-worker`,
    stylesheets: [
      '/static/styles/style.css',
      '/static/styles/loop_form.css'
    ],
    scripts: [
      'https://code.jquery.com/jquery-3.7.1.min.js',
      '/static/scripts/loop_form.js',
      '/static/scripts/loop.js'
    ]
  };

  return (
    <App activePage="boucles" meta={meta} globalVars={globalVars}>
      <div className="page-supercontainer">
        <LoopForm loop={loop} accounts={accounts}></LoopForm>
      </div>
    </App>
  );
};

export default LoopPage;

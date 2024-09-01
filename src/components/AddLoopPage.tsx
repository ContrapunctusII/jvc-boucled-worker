import App from './App.js';
import AddLoopForm from './AddLoopForm.js';
import AccountInterface from '../interfaces/Account.js';

interface AddLoopPageProps {
  accounts: Array<AccountInterface>;
  globalVars: { [k: string]: any };
}

/**
 * Formulaire d'ajout d'une nouvelle boucle disponible à la page /boucles/ajout-boucle.
 * 
 * @function
 * @name AddLoopPage
 * @kind variable
 * @type {React.FC<AddLoopPageProps>}
 * @returns {JSX.Element}
 */
const AddLoopPage: React.FC<AddLoopPageProps> = ({ accounts, globalVars }): JSX.Element => {
  const meta = {
    title: "Création d'une boucle | jvc-boucled-worker",
    stylesheets: [
      '/static/styles/style.css',
      '/static/styles/loop_form.css'
    ],
    scripts: [
      'https://code.jquery.com/jquery-3.7.1.min.js',
      '/static/scripts/loop_form.js',
      '/static/scripts/add_loop.js'
    ]
  };

  return (
    <App activePage="ajout-boucle" meta={meta} globalVars={globalVars}>
      <div className="page-supercontainer">
        <AddLoopForm accounts={accounts}></AddLoopForm>
      </div>
    </App>
  );
};

export default AddLoopPage;

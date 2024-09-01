import AccountInterface from '../interfaces/Account.js';
import { AccountFormGroup, TimeFormGroup } from './FormGroups.js';

interface AddLoopFormProps {
  accounts: Array<AccountInterface>;
}

/**
 * Formulaire de création d'une boucle utilisé dans ajout-boucle.html.
 * 
 * @function
 * @name AddLoopForm
 * @kind variable
 * @type {React.FC<AddLoopFormProps>}
 * @returns {JSX.Element}
 */
const AddLoopForm: React.FC<AddLoopFormProps> = ({ accounts }): JSX.Element => (
  <div className="page-container">
    <form>
      <div className="columns-container">
        <div className="left-column">
          <div className="form-group">
            <label htmlFor="name">Nom*<span className="tooltip-icon" data-tooltip="Nom de la boucle, qui aura pour but pour la désigner sur ce serveur.">?</span></label>
            <input type="text" name="name" id="name" maxLength={30} required placeholder="Nom de la boucle sur le worker" />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description<span className="tooltip-icon" data-tooltip="Description optionnelle de la boucle, qui ne sera utilisée que sur ce serveur.">?</span></label>
            <textarea id="description" name="description" maxLength={250} rows={4} placeholder="Champ facultatif..."></textarea>
          </div>
          <div className="form-group" style={{ display: 'flex' }}>
            <label htmlFor="active">Boucle active ?*<span className="tooltip-icon" data-tooltip="Si la case est décochée, la boucle ne sera pas postée jusqu'à ce que vous la rendiez active.">?</span></label>
            <input id="active" name="active" type="checkbox" defaultChecked />
          </div>
          <div className="form-group">
            <label htmlFor="forumId">ID du forum*<span className="tooltip-icon" data-tooltip="L'ID du forum sur lequel la boucle sera postée, trouvable dans l'URL dudit forum. Pour le 18-25, entrez 51.">?</span></label>
            <input min={1} id="forumId" name="forumId" type="number" required placeholder="Ex. : 51" />
          </div>
          <div className="form-group">
            <label htmlFor="title">Titre du topic*<span className="tooltip-icon" data-tooltip="Titre du topic à poster.">?</span></label>
            <input type="text" id="title" name="title" maxLength={100} required />
          </div>
          <div className="form-group main-message-container">
            <label htmlFor="main-message">Corps du topic*<span className="tooltip-icon" data-tooltip="Corps du topic.">?</span></label>
            <textarea id="main-message" name="main-message" required maxLength={16000} rows={10} style={{ maxHeight: '200px', overflowY: 'auto' }}></textarea>
          </div>
          <div id="answers-container">
            <button type="button" className="add-button submit-button" id="add-answer">Ajouter une réponse</button>
          </div>
        </div>
        <div className="right-column">
          <div className="section">
            <h2>Comptes<span className="tooltip-icon" data-tooltip="Listes des comptes associés à la boucle (un seul sera utilisé par post). Vert : disponible, rouge : banni. Le premier compte renseigné est celui que vous souhaitez voir poster par défaut (c'est-à-dire si non banni) : les comptes sont donc à ajouter par ordre de priorité.">?</span></h2>
            <div className="account-section-content">
              <AccountFormGroup key={0} index={0} accounts={accounts} maxIndex={0} disabled={false} />
            </div>
            <div className={`attention-supercontainer ${accounts.length === 0 ? '' : 'hidden'}`} id="account-attention-supercontainer" style={{ marginTop: 0 }}>
              <div id="attention-container" className="attention-container">
                <p id="attention-msg">Vous devez ajouter au moins un compte avant de créer une boucle.</p>
              </div>
            </div>
          </div>
          <div className="section">
            <h2>Horaires<span className="tooltip-icon" data-tooltip="La boucle sera postée quotidiennement à ces heures (format HH:MM).">?</span></h2>
            <div className="time-section-content">
              <TimeFormGroup key={0} index={0} maxIndex={0} disabled={false} />
            </div>
          </div>
        </div>
      </div>
      <div className="submit-buttons-container">
        <button type="submit" className="submit-button" id="submit-button">Ajouter la boucle</button>
      </div>
      <div id="error-container" className="result-container error-container hidden">
        <p id="error-message"></p>
      </div>
      <div id="success-container" className="result-container success-container hidden">
        <p id="success-message"></p>
      </div>
    </form>
  </div>
);

export default AddLoopForm;

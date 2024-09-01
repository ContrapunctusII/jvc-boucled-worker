import LoopInterface from '../interfaces/Loop.js';
import AccountInterface from '../interfaces/Account.js';
import { MAX_ANSWERS_PER_LOOP } from '../vars.js';
import { sortAccountsByOrder } from '../services/handle_loops.js';
import { AnswerFormGroup, AccountFormGroup, TimeFormGroup } from './FormGroups.js';

interface LoopFormProps {
  loop: LoopInterface;
  accounts: Array<AccountInterface>;
}

/**
 * Formulaire d'informations pour une boucle déjà existante, dans boucle.html.
 * 
 * @function
 * @name LoopForm
 * @kind variable
 * @type {React.FC<LoopFormProps>}
 * @returns {JSX.Element}
 */
const LoopForm: React.FC<LoopFormProps> = ({ loop, accounts }): JSX.Element => {
  const areAllAccountsBanned = loop.accounts.every(a => a.isBanned || a.unusable);
  const isThereNoAccount = loop.accounts.length === 0;

  return (
    <div className="page-container">
      <form>
        <div className="columns-container">
          <div className="left-column">
            <div className="form-group">
              <label>ID</label>
              <span id="loop-id" data-id={loop.id}>{loop.id}</span>
            </div>
            <div className="form-group">
              <label htmlFor="name">Nom*<span className="tooltip-icon" data-tooltip="Nom de la boucle, qui aura pour but pour la désigner sur ce serveur.">?</span></label>
              <input disabled type="text" name="name" id="name" maxLength={30} required placeholder="Nom de la boucle sur le worker" value={loop.name} />
            </div>
            <div className="form-group">
              <label htmlFor="description">Description<span className="tooltip-icon" data-tooltip="Description optionnelle de la boucle, qui ne sera utilisée que sur ce serveur.">?</span></label>
              <textarea disabled id="description" name="description" maxLength={250} rows={4} value={loop.description} placeholder=""></textarea>
            </div>
            <div className="form-group" style={{ display: 'flex' }}>
              <label htmlFor="active">Boucle active ?<span className="tooltip-icon" data-tooltip="Si la case est décochée, la boucle ne sera pas postée jusqu'à ce que vous la rendiez active.">?</span></label>
              <input disabled id="active" name="active" type="checkbox" checked={loop.userStatus === 'active' && !loop.disabled} />
            </div>
            <div className="form-group">
              <label htmlFor="forumId">ID du forum*<span className="tooltip-icon" data-tooltip="L'ID du forum sur lequel la boucle sera postée, trouvable dans l'URL dudit forum. Pour le 18-25, entrez 51.">?</span></label>
              <input disabled min={1} id="forumId" name="forumId" type="number" required value={loop.forumId} placeholder="Ex. : 51" />
            </div>
            <div className="form-group">
              <label htmlFor="title">Titre du topic*<span className="tooltip-icon" data-tooltip="Titre du topic à poster.">?</span></label>
              <input disabled type="text" id="title" name="title" maxLength={100} required value={loop.title} />
            </div>
            <div className="form-group main-message-container">
              <label htmlFor="main-message">Corps du topic*<span className="tooltip-icon" data-tooltip="Corps du topic.">?</span></label>
              <textarea
                disabled
                id="main-message"
                name="main-message"
                required
                maxLength={16000}
                rows={10}
                style={{ maxHeight: '200px', overflowY: 'auto' }}
                value={loop.first_message}
              ></textarea>
            </div>
            <div id="answers-container">
              {loop.answers.map((answer, index) => (
                <AnswerFormGroup key={index} index={index} text={answer.text} delay={answer.delay} disabled={true} />
              ))}
              <button type="button" disabled className={`add-button submit-button ${loop.answers.length < MAX_ANSWERS_PER_LOOP - 1 ? '' : 'hidden'}`} id="add-answer">Ajouter une réponse</button>
            </div>
          </div>
          <div className="right-column">
            <div className="section">
              <h2>Comptes<span className="tooltip-icon" data-tooltip="Listes des comptes associés à la boucle (un seul sera utilisé par post). Vert : disponible, rouge : banni. Le premier compte renseigné est celui que vous souhaitez voir poster par défaut (c'est-à-dire si non banni) : les comptes sont donc à ajouter par ordre de priorité.">?</span></h2>
              <div className="account-section-content">
                {/** Pour tous les comptes on crée un select */}
                {sortAccountsByOrder(loop.accounts).map((account, index) => (
                  <AccountFormGroup key={index} index={index} accountSelected={account} accounts={accounts} maxIndex={loop.accounts.length - 1} disabled={true} />
                ))}
                {isThereNoAccount && <AccountFormGroup key={0} index={0} accounts={accounts} maxIndex={0} disabled={true} />}
              </div>
              <div className={`attention-supercontainer ${isThereNoAccount || areAllAccountsBanned ? '' : 'hidden'}`} id="account-attention-supercontainer" style={{ marginTop: 0 }}>
                <div id="attention-container" className="attention-container">
                  <p id="attention-msg">{isThereNoAccount ? "Aucun compte n'a été associé à la boucle. Elle est donc inactive." : "Attention : tous les comptes sélectionnés sont bannis, ce qui signifie que la boucle ne sera pas active."}</p>
                </div>
              </div>
            </div>
            <div className="section">
              <h2>Horaires<span className="tooltip-icon" data-tooltip="La boucle est postée quotidiennement à ces heures (format HH:MM).">?</span></h2>
              <div className="time-section-content">
                {/** Pour toutes les heures on crée un select */}
                {loop.times.sort().map((time, index) => (
                  <TimeFormGroup key={index} index={index} time={time} maxIndex={loop.times.length - 1} disabled={true} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="submit-buttons-container">
          <button type="button" className="submit-button" id="edit-button">Modifier la boucle</button>
          <button type="button" className="delete-button" id="delete-button">Supprimer la boucle</button> {/** onclick = deleteLoop **/}
          <button type="submit" className="submit-button hidden" id="submit-button">Enregistrer</button>
          <button type="button" className="delete-button hidden" id="cancel-button">Annuler</button>
        </div>
        <div className={`attention-supercontainer hidden`} id="edit-attention-supercontainer" style={{ marginTop: 0 }}>
          <div id="edit-attention-container" className="attention-container">
            <p id="edit-attention-msg">Attention : modifier la boucle annulera tous les posts de réponse prévus.</p>
          </div>
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
}

export default LoopForm;
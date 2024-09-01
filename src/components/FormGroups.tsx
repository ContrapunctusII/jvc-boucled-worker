import { generateDelays, generateTimes } from '../services/utils.js';
import { MAX_ACCOUNTS_PER_LOOP, MAX_TIMES_PER_LOOP } from '../vars.js';
import AccountInterface from '../interfaces/Account.js';
import { MiniAccount } from '../interfaces/Loop.js';

interface AnswerFormGroupProps {
  index: number;
  text: string;
  delay: string;
  disabled: boolean;
}

/**
 * Formulaire contenant une réponse.
 * 
 * @function
 * @name AnswerFormGroup
 * @kind variable
 * @type {React.FC<AnswerFormGroupProps>}
 * @returns {JSX.Element}
 */
export const AnswerFormGroup: React.FC<AnswerFormGroupProps> = ({ index, text, delay, disabled }): JSX.Element => {
  const delays = generateDelays(); // délais utilisés dans le select au format HH:MM

  return (
    <div className="answer">
      <div className="form-group">
        <label>Réponse {index + 1}*<span className="tooltip-icon" data-tooltip="Réponse au topic qui sera postée par le boucleur.">?</span></label>
        <textarea
          disabled={disabled}
          maxLength={8000}
          name={`answer-${index + 1}`}
          required
          rows={4}
          style={{ maxHeight: '200px', overflowY: 'auto' }}
          value={text}
          placeholder="Fonctionne comme un « up »"
        ></textarea>
      </div>
      <div className="answer-buttons">
        <div className="answer-delay-container">
          <label className="delay-label">Délai (HH:MM)*<span className="tooltip-icon" data-tooltip="Délai entre la dernière réponse et celle-ci au format heures:minutes.">?</span></label>
          <select disabled={disabled} className="delay-input" required name={`answer-delay-${index + 1}`} value={delay}>
            {delays.map(generatedDelay => (
              <option key={generatedDelay} value={generatedDelay}>{generatedDelay}</option>
            ))}
          </select>
        </div>
        <button disabled={disabled} type="button" className="delete-button delete-answer-button">Supprimer la réponse</button>
      </div>
    </div>
  )
};

interface AccountFormGroupProps {
  index: number;
  accountSelected?: MiniAccount;
  accounts: Array<AccountInterface>;
  maxIndex: number;
  disabled: boolean;
}

/**
 * Formulaire contenant un select pour un compte.
 * 
 * @function
 * @name AccountFormGroup
 * @kind variable
 * @type {React.FC<AccountFormGroupProps>}
 * @returns {JSX.Element}
 */
export const AccountFormGroup: React.FC<AccountFormGroupProps> = ({ index, accountSelected, accounts, maxIndex, disabled }): JSX.Element => (
  <div className="form-group">
    <label htmlFor={`account-${index + 1}`}>Compte {index + 1}*</label>
    <select
      disabled={disabled}
      className={`account-select ${accountSelected && accountSelected.isBanned ? 'banned' : 'available'}`}
      required
      name={`account-${index + 1}`}
      id={`account-${index + 1}`}
      defaultValue={accountSelected ? accountSelected.id : ''}
    >
      <option key='' value='' disabled>--------------</option>
      {accounts.map(account => (
        <option key={account.id} className={account.isBanned ? 'banned' : 'available'} value={account.id}>
          {account.username}
        </option>))}
    </select>
    <div className="buttons-container">
      {/** Si ce n'est pas le premier compte on peut le supprimer */}
      {index !== 0 && <button disabled={disabled} type="button" className="delete-button">Supprimer le compte</button>}
      {/** Si c'est le dernier compte et qu'il y a moins de comptes associés à la boucle que le nombre de comptes autorisés on peut en ajouter */}
      {index === maxIndex && maxIndex < Math.min(accounts.length - 1, MAX_ACCOUNTS_PER_LOOP - 1) && <button disabled={disabled} type="button" className="add-button submit-button" id="add-account">Ajouter un compte</button>}
    </div>
  </div>
);

interface TimeFormGroupProps {
  index: number;
  time?: string;
  maxIndex: number;
  disabled: boolean;
}

/**
 * Formulaire contenant un select pour une heure de post au format HH:MM.
 * 
 * @function
 * @name TimeFormGroup
 * @kind variable
 * @type {React.FC<TimeFormGroupProps>}
 * @returns {JSX.Element}
 */
export const TimeFormGroup: React.FC<TimeFormGroupProps> = ({ index, time, maxIndex, disabled }): JSX.Element => {
  const times = generateTimes();
  return (
    <div className="form-group">
      <label htmlFor={`time-${index + 1}`}>Horaire {index + 1}*</label>
      <select
        disabled={disabled}
        className="time-select"
        required
        name={`time-${index + 1}`}
        id={`time-${index + 1}`}
        defaultValue={time ? time : ''}
      >
        <option key='' value='' disabled>--------------</option>
        {times.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <div className="buttons-container">
        {/** Si ce n'est pas la première heure on peut la supprimer */}
        {index !== 0 && <button disabled={disabled} type="button" className="delete-button">Supprimer l'horaire</button>}
        {/** Si c'est la dernière heure et qu'il y a moins d'heures associées à la boucle que le nombre d'heures autorisées on peut en ajouter */}
        {index === maxIndex && maxIndex < MAX_TIMES_PER_LOOP - 1 && <button disabled={disabled} type="button" className="add-button submit-button" id="add-time">Ajouter un horaire</button>}
      </div>
    </div>
  )
};

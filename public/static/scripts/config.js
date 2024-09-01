const editButton = document.querySelector('#edit-button');
const submitButton = document.querySelector('#submit-button');
const errorDiv = document.querySelector('#error-container');
const errorMsg = errorDiv.querySelector('p');
const successDiv = document.querySelector('#success-container');
const successMsg = successDiv.querySelector('p');
const form = document.querySelector('form');

/**
 * Fonction qui permet de se téléporter tout en bas de la page, pour voir le message d'erreur ou de succès d'une requête par exemple.
 * 
 * @function
 * @name scrollTowardsBottom
 * @kind variable
 * @memberof <function>
 * @returns {void}
 */
const scrollTowardsBottom = () => {
    window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'auto'
    });
}

/**
 * Cette fonction, appelée lorsque le bouton submit est cliqué, envoie une requête au backend
 * pour modifier la configuration du worker.
 * 
 * @function
 * @name sendUpdateConfigRequest
 * @kind variable
 * @param {SubmitEvent} event
 * @returns {void}
 */
const sendUpdateConfigRequest = (event) => {
    event.preventDefault();

    if (!isFormValid(form)) {
        return;
    }

    document.querySelectorAll('input,button').forEach(el => el.disabled = true);

    const data = getFormData(form);
    const request = $.ajax({
        url: '/config',
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        dataType: "json",
        data: JSON.stringify(data)
    });

    request.done(data => {
        onRequestSuccess(data);
    }).fail(data => {
        onRequestFail(data);
    });
}

/**
 * Fonction appelée lorsqu'une requête au serveur échoue.
 * 
 * @function
 * @name onRequestFail
 * @kind variable
 * @memberof <function>
 * @param {any} data
 * @returns {void}
 */
const onRequestFail = (data) => {
    successDiv.classList.add('hidden');
    successMsg.textContent = '';

    errorMsg.textContent = data.responseJSON.resultStr; // message d'erreur
    errorDiv.classList.remove('hidden');

    document.querySelectorAll('input,button').forEach(el => el.disabled = false);
    scrollTowardsBottom();
}

/**
 * Fonction appelée lorsqu'une requête au serveur est un succès.
 * 
 * @function
 * @name onRequestSuccess
 * @kind variable
 * @memberof <function>
 * @param {'add' | 'update' | 'delete'} reqType
 * @param {any} data
 * @returns {void}
 */
const onRequestSuccess = (data) => {
    errorDiv.classList.add('hidden');
    errorMsg.textContent = '';

    successMsg.textContent = data.resultStr;
    successDiv.classList.remove('hidden');

    scrollTowardsBottom();

    setTimeout(() => window.location.reload(), 1000); // reload de la page
}

/**
 * Fonction appelée lorsque le bouton pour modifier les informations a été cliqué.
 * 
 * @function
 * @name prepareEdit
 * @kind variable
 * @returns {void}
 */
const prepareEdit = () => {
    document.querySelectorAll('input').forEach(el => el.disabled = false); // les inputs redeviennent interactibles

    editButton.classList.add('hidden');
    submitButton.classList.remove('hidden');
}

const getFormData = (form) => {
    const proxyURL = form.querySelector('#proxy-url').value;
    return { proxyURL };
}

const isFormValid = (form) => {
    if (form.checkValidity() === false) { // si formulaire non conforme
        form.reportValidity();
        return false;
    }
    return true;
}

editButton.addEventListener('click', prepareEdit);
form.addEventListener('submit', async (event) => {
    sendUpdateConfigRequest(event);
});

document.querySelectorAll('input').forEach(el => el.disabled = true); // on s'assure que tous les inputs sont bien inaccessibles
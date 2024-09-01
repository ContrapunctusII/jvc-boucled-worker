(function () {
    const tableBody = document.querySelector('#account-table-body');
    const addFormInputs = document.querySelectorAll('#add-account-form input');

    const successMsg = document.querySelector('#success-message');
    const successDiv = successMsg.parentNode; // div contenant le message de succès de la requête
    const errorMsg = document.querySelector('#error-message');
    const errorDiv = errorMsg.parentNode; // div contenant le message d'erreur de la requête
    const DELAY_BEFORE_TRANSITION = 2000; // temps que dure une transition
    const tableContainer = document.querySelector('.table-container');
    const attentionContainer = document.querySelector('.attention-supercontainer'); // div contenant le message d'attention si pas de compte
    const updateContainer = document.querySelector('.update-container'); // div contenant le bouton de mise à jour

    /**
     * Fonction qui change le DOM avant une requête.
     * 
     * @function
     * @name prepareRequest
     * @kind variable
     * @memberof <function>
     * @returns {void}
     */
    const prepareRequest = () => {
        document.querySelectorAll('button').forEach(el => el.disabled = true);
        successDiv.classList.remove('smooth-display'); // on enlève la classe pour supprimer les transitions en cours
        successDiv.classList.add('hidden');
        successDiv.style.opacity = 1; // remise à 0 du style
    }

    /**
     * Fonction appelée lorsqu'une requête au worker a échoué. Affiche la div d'erreur
     * qui contiendra le message d'erreur renvoyé par le worker.
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

        errorMsg.textContent = data.responseJSON.resultStr; // affichage de la div d'erreur
        errorDiv.classList.remove('hidden');
        document.querySelectorAll('button').forEach(el => el.disabled = false);
    }

    /**
     * Fonction appelée lorsqu'une requête au worker a réussi. Affiche la div de succès qui contiendra
     * le message de validation renvoyé par le worker.
     * 
     * @function
     * @name onRequestSuccess
     * @kind variable
     * @memberof <function>
     * @param {'add' | 'update' | 'delete'} reqType
     * @param {any} data
     * @returns {void}
     */
    const onRequestSuccess = (reqType, data) => {
        errorDiv.classList.add('hidden');
        errorMsg.textContent = '';

        if (reqType === 'add') { // on s'assure que les éléments qui auraient pu être désactivés pour absence de compte soient réactivés lors d'un ajout
            tableContainer.classList.remove('hidden');
            attentionContainer.classList.add('hidden');
            updateContainer.classList.remove('hidden');
        }

        successMsg.textContent = data.resultStr; // texte de succès
        successDiv.style.opacity = 1; // préparation de la transition
        successDiv.classList.remove('hidden');
        successDiv.classList.add('smooth-display');

        addFormInputs.forEach(input => input.value = '');

        if (document.querySelectorAll('.account').length === 0) { // s'il ne reste plus aucun compte
            attentionContainer.classList.remove('hidden');
            tableContainer.classList.add('hidden');
            updateContainer.classList.add('hidden');
        }

        if (reqType !== 'update') {
            setTimeout(() => {
                successDiv.style.opacity = 0;
            }, DELAY_BEFORE_TRANSITION); // appliquer la transition

            successDiv.addEventListener('transitionend', () => { // masquer l'élément
                successDiv.classList.add('hidden');
                successDiv.classList.remove('smooth-display');
                successDiv.style.opacity = 1;
            });
        } else {
            setTimeout(() => {
                window.location.reload(); // on recharge la page s'il s'agissait d'une mise à jour
            }, 1000);
        }

        document.querySelectorAll('button').forEach(el => el.disabled = false);
    }

    /**
     * Fonction envoyant une requête au worker pour supprimer un compte.
     * 
     * @function
     * @name removeAccount
     * @kind variable
     * @memberof <function>
     * @param {HTMLButtonElement} button
     * @param {number} id
     * @returns {void}
     */
    const removeAccount = (button, id) => {
        try {
            prepareRequest();
            const request = $.ajax({
                url: `compte/${id}`,
                method: "DELETE",
                headers: {
                    'Content-Type': 'application/Json'
                },
                dataType: "json",
            });

            request.done(data => {
                button.parentNode.parentNode.remove(); // suppression de la ligne du tableau qui affichait les infos du compte
                onRequestSuccess('delete', data);
            }).fail(data => {
                onRequestFail(data);
            });
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while adding the account. See console.');
        }
    }

    /**
     * Fonction envoyant une requête au worker pour mettre à jour tous les comptes.
     * 
     * @function
     * @name updateAllAccounts
     * @kind variable
     * @memberof <function>
     * @returns {void}
     */
    const updateAllAccounts = () => {
        try {
            prepareRequest();
            const request = $.ajax({
                url: `comptes/mise-a-jour`,
                method: "PUT",
                headers: {
                    'Content-Type': 'application/Json'
                },
                dataType: "json",
            });

            request.done(data => {
                onRequestSuccess('update', data);
            }).fail(data => {
                onRequestFail(data);
            });
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while adding the account. See console.');
        }
    }

    /**
     * Fonction envoyant une requête au worker pour ajouter un compte dont les pseudo et mot de passe
     * ont été renseignés par l'utilisateur.
     * 
     * @function
     * @name addAccount
     * @kind variable
     * @memberof <function>
     * @param {Event} event
     * @returns {void}
     */
    const addAccount = (event) => {
        event.preventDefault();
        prepareRequest();
        const formData = new FormData(event.target); // récupération des données passées dans le formulaire
        const data = Object.fromEntries(formData.entries());

        try {
            const request = $.ajax({
                url: `comptes/ajout-compte`,
                method: "POST",
                headers: {
                    'Content-Type': 'application/Json'
                },
                dataType: "json",
                data: JSON.stringify(data)
            });

            request.done(data => {
                tableBody.insertAdjacentHTML('beforeend', data.html);
                const deleteAccountBtn = document.querySelector(`tr[data-id="${data.account.id}"] .delete-button`);
                if (deleteAccountBtn) {
                    deleteAccountBtn.addEventListener('click', (event) => {
                        removeAccount(event.target, data.account.id);
                    });
                }

                onRequestSuccess('add', data);
            }).fail(data => {
                onRequestFail(data);
            });
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while adding the account. See console.');
        }
    }

    const deleteButtons = document.querySelectorAll('.delete-account-button');
    deleteButtons.forEach(btn => {
        // ajout des listeners aux boutons de suppression
        const id = parseInt(btn.parentNode.parentNode.getAttribute('data-id'));
        btn.addEventListener('click', (event) => removeAccount(event.target, id));
    });

    const updateButton = document.querySelector('.update-all-btn');
    updateButton.addEventListener('click', updateAllAccounts);

    const form = document.querySelector('form');
    form.addEventListener('submit', (event) => {
        addAccount(event);
    });
})();
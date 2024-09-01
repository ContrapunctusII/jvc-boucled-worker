(function () {
    const editButton = document.querySelector('#edit-button');
    const deleteLoopButton = document.querySelector('#delete-button');
    const form = document.querySelector('form');
    const isThereNoAccount = window.__GLOBAL_VARS__.loop.accounts.length === 0;
    const editAttentionContainer = document.querySelector('#edit-attention-supercontainer');
    const activeCheckbox = document.querySelector('#active');
    const descriptionInput = document.querySelector('textarea#description');
    const submitButton = document.querySelector('#submit-button');
    const cancelButton = document.querySelector('#cancel-button');

    /**
     * Fonction appelée lorsque le bouton Modifier est cliqué.
     * 
     * @function
     * @name prepareEdit
     * @kind variable
     * @memberof <function>
     * @param {Event} event
     * @returns {void}
     */
    const prepareEdit = (event) => {
        const toDisable = document.querySelectorAll('input, textarea, select, button');
        toDisable.forEach(el => el.disabled = false);

        if (isThereNoAccount) {
            activeCheckbox.disabled = true;
        }

        event.target.classList.add('hidden'); // retrait du bouton Modifier et du bouton Supprimer
        deleteLoopButton.classList.add('hidden');

        submitButton.classList.remove('hidden');
        cancelButton.classList.remove('hidden');

        editAttentionContainer.classList.remove('hidden');

        descriptionInput.setAttribute('placeholder', 'Champ facultatif...');
    }

    const updateLoop = (event) => { // pour modifier la boucle
        event.preventDefault();

        if (!window.isFormValid(form)) {
            return;
        }

        const loop = window.getFormData(form);
        window.sendRequest('update', loop);
    }

    const deleteLoop = () => { // pour supprimer la boucle
        const loop = window.getFormData(form);
        window.sendRequest('delete', loop);
    }

    form.addEventListener('submit', (event) => {
        editAttentionContainer.classList.add('hidden');
        updateLoop(event);
    });
    deleteLoopButton.addEventListener('click', deleteLoop);
    editButton.addEventListener('click', (event) => {
        prepareEdit(event);
    });
    cancelButton.addEventListener('click', () => window.location.reload());

    const toDisable = document.querySelectorAll('input, textarea, select, button'); // au cas où tous n'aient pas été disabled (pour des raisons de cache ?)
    toDisable.forEach(el => el.disabled = true);

    deleteLoopButton.disabled = false; // ces deux boutons doivent être cliquables
    editButton.disabled = false;
})();
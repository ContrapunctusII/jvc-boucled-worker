(function () {
    let answerCount = document.querySelectorAll('.answer').length; // contiendra le nombre actuel de réponses
    const maxAnswers = window.__GLOBAL_VARS__.maxCount['answer'];
    const maxCount = window.__GLOBAL_VARS__.maxCount;
    // contient le nombre actuel de comptes et d'horaires
    const selectsCount = { 'account': document.querySelectorAll('.account-section-content .form-group').length, 'time': document.querySelectorAll('.time-section-content .form-group').length };

    const accountAttentionDiv = document.querySelector('#account-attention-supercontainer'); // div contenant le message d'attention
    const accountAttentionMsg = accountAttentionDiv.querySelector('p');
    const activeCheckbox = document.querySelector('#active');

    const errorMsg = document.querySelector('#error-message'); // div d'erreur de requête
    const errorDiv = errorMsg.parentNode;

    const successMsg = document.querySelector('#success-message'); // div de succès de requête
    const successDiv = successMsg.parentNode;
    const addAnswerButton = document.querySelector('#add-answer');

    const defaultOptionValue = '--------------';

    /**
     * Fonction appelée à chaque fois que la valeur des inputs time et accounts change.
     * Cette fonction vérifie si tous les comptes sont bannis en plus d'empêcher les doublons.
     * Enfin elle permet de changer la classe du select en fonction du statut du compte choisi.
     * @function
     * @name onSelectChange
     * @kind variable
     * @memberof <function>
     * @param {HTMLElement} select
     * @param {"account" | "time"} entity
     * @returns {void}
     */
    const onSelectChange = (select, entity) => {
        preventDupesOnChange(entity);

        if (entity === 'account') { // ajout de la couleur au select en fonction du statut du compte
            const chosenAccount = window.__GLOBAL_VARS__.accounts.filter(account => account.id == select.value)[0];
            if (chosenAccount) {
                select.className = 'account-select'; // remise à 0 des classes
                select.classList.add(chosenAccount.isBanned ? 'banned' : 'available'); // classe ajoutée selon le statut du compte
            }
            areAllAccountsBanned();
        }
    }

    /**
     * Fonction qui lorsque appelée, crée un element select (compte ou horaire).
     * 
     * @function
     * @name createSelect
     * @kind variable
     * @memberof <function>
     * @param {'time' | 'account'} entity
     * @param {boolean} disabled?
     * @returns {HTMLDivElement}
     */
    const createSelect = (entity, disabled = false) => { // ajoute un élément select à chaque clic sur le bouton Ajouter
        const div = document.createElement('div');
        const label = document.createElement('label');
        const select = document.createElement('select');
        const buttonsContainer = document.createElement('div');

        selectsCount[entity] += 1;
        const selectId = `${entity}-${selectsCount[entity]}`; // l'ID contient l'entité et le numéro du sélect créé

        div.classList.add('form-group');
        select.classList.add(`${entity}-select`);
        select.required = true;
        select.name = selectId;
        select.disabled = disabled;
        label.setAttribute('for', selectId);
        label.textContent = entity === 'account' ? `Compte ${selectsCount[entity]}*` : `Horaire ${selectsCount[entity]}*`;

        select.id = selectId;
        buttonsContainer.classList.add('buttons-container');

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = defaultOptionValue; // valeur par défaut avant le choix d'une option
        defaultOption.disabled = true;
        defaultOption.selected = true; // l'option doit impérativement être sélectionnée même si elle ne sera plus sélectionnable par la suite
        select.appendChild(defaultOption);

        if (entity === 'account') {
            window.__GLOBAL_VARS__.accounts.forEach(account => { // ajout des options
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = account.username;
                option.classList.add(account.isBanned ? 'banned' : 'available'); // classe de l'option en fonction du statut
                select.appendChild(option);
            });
        } else {
            window.__GLOBAL_VARS__.times.forEach(time => {
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                select.appendChild(option);
            });
        }

        select.addEventListener('change', () => {
            onSelectChange(select, entity);
        });

        div.appendChild(label);
        div.appendChild(select);
        div.appendChild(buttonsContainer);
        if (selectsCount[entity] > 1) {
            createDeleteButton(entity, div); // s'il y a déjà un autre select, celui-ci peut être supprimé d'où la création du bouton
        }

        if (selectsCount[entity] < maxCount[entity]) {
            moveAddButton(entity, buttonsContainer, true, disabled); // on peut encore ajouter un select donc bouton existant à déplacer
        } else {
            moveAddButton(entity, buttonsContainer, false, disabled); // on ne peut plus ajouter de select donc on enlève le bouton
        }

        const container = document.querySelector(`.right-column .${entity}-section-content`);
        container.appendChild(div);

        preventDupesOnChange(entity); // empêche de sélectionner des options déjà sélectionnées immédiatement après la création

        return div;
    }

    /**
     * Fonction qui renvoie le select de délai d'une réponse avec toutes ses options possibles
     * 
     * @function
     * @name createDelaysSelect
     * @kind variable
     * @memberof <function>
     * @param {number} index
     * @returns {HTMLSelectElement}
     */
    const createDelaysSelect = (index) => {
        const select = document.createElement('select');
        select.classList.add('delay-input');
        select.required = true;
        select.setAttribute('name', `answer-delay-${index}`);

        for (const delay of window.__GLOBAL_VARS__.delays) {
            const option = document.createElement('option');
            option.value = delay;
            option.textContent = delay;
            select.appendChild(option);
        }

        return select;
    }

    /**
     * Fonction appelée lors de la suppression d'une réponse.
     * 
     * @function
     * @name onDeleteAnswer
     * @kind variable
     * @memberof <function>
     * @param {HTMLElement} formGroup
     * @param {HTMLElement} addAnswerButton
     * @returns {void}
     */
    const onDeleteAnswer = (formGroup, addAnswerButton) => {
        formGroup.remove(); // suppression de la div contenant la réponse
        answerCount--;
        updateAnswerIndices(addAnswerButton.parentNode); // réindexation des réponses
        if (answerCount < maxAnswers) {
            addAnswerButton.classList.remove('hidden'); // le bouton d'ajout redevient visible si la limite du nombre de réponses n'est plus atteinte
        }
    }

    /**
     * Ajoute une div de réponse au formulaire
     * 
     * @function
     * @name createAnswerElement
     * @kind variable
     * @memberof <function>
     * @param {number} index
     * @returns {HTMLDivElement}
     */
    const createAnswerElement = (index) => {
        const div = document.createElement('div');
        div.classList.add('answer');
        div.innerHTML = `
                <div class="form-group">
                    <label>Réponse ${index}*<span class="tooltip-icon" data-tooltip="Réponse au topic qui sera postée par le boucleur.">?</span></label>
                    <textarea maxlength="8000" name="answer-${index}" placeholder="Fonctionne comme un « up »" required rows="4" style="max-height: 200px; overflow-y: auto;"></textarea>
                </div>
                <div class="answer-buttons">
                    <div class="answer-delay-container">
                        <label class="delay-label">Délai (HH:MM)*<span class="tooltip-icon" data-tooltip="Délai entre la dernière réponse et celle-ci au format heures:minutes.">?</span></label>
                    </div>
                    <button class="delete-button delete-answer-button">Supprimer la réponse</button>
                </div>
            `;
        const timeSelect = createDelaysSelect(index); // initialise le select des délais
        const answerDelayDiv = div.querySelector('.answer-delay-container');
        const answerButtonsDiv = div.querySelector('.answer-buttons');
        answerDelayDiv.appendChild(timeSelect);

        const deleteButton = div.querySelector('.delete-button');
        deleteButton.addEventListener('click', () => onDeleteAnswer(div, addAnswerButton));

        answerButtonsDiv.appendChild(deleteButton);

        return div;
    }

    /**
     * Réindexe les indices des réponses après la suppression de l'une d'entre elles pour combler
     * les "trous"
     * 
     * @function
     * @name updateAnswerIndices
     * @kind variable
     * @memberof <function>
     * @param {any} answersContainer
     * @returns {void}
     */
    const updateAnswerIndices = (answersContainer) => {
        const answers = answersContainer.querySelectorAll('.answer');
        answers.forEach((answer, index) => {
            const label = answer.querySelector('label');
            label.innerHTML = `Réponse ${index + 1}*<span class="tooltip-icon" data-tooltip="Réponse au topic qui sera postée par le boucleur.">?</span>`;
        });
    }

    /**
     * Fonction ajoutant un élément réponse au formulaire
     * 
     * @function
     * @name addAnswer
     * @kind variable
     * @memberof <function>
     * @param {Event} event
     * @returns {void}
     */
    const addAnswer = (event) => {
        const answersContainer = event.target.parentNode;
        if (answerCount < maxAnswers) {
            answerCount++;
            const answerElement = createAnswerElement(answerCount);
            answersContainer.insertBefore(answerElement, event.target);
            if (answerCount >= maxAnswers) {
                event.target.classList.add('hidden');
            }
        }
    }

    /**
     * Fait en sorte que deux mêmes valeurs ne peuvent être choisis en même temps
     * dans des selects différents
     * 
     * @function
     * @name preventDupesOnChange
     * @kind variable
     * @memberof <function>
     * @param {any} entity
     * @returns {void}
     */
    const preventDupesOnChange = (entity) => {
        const selects = Array.from(document.querySelectorAll(`select.${entity}-select`));
        const selectedValues = selects.map(select => select.value).filter(value => value !== ''); // liste des valeurs actuellement choisies
        selects.forEach(select => {
            Array.from(select.options).forEach(option => {
                if (option.value === '') { // valeur par défaut
                    option.disabled = true;
                } else {
                    option.disabled = selectedValues.includes(option.value) && select.value !== option.value; // disabled si valeur déjà choisie mais pas par le select actuel
                }
            });
        });
    }

    /**
     * Ajoute un select au formulaire
     * 
     * @function
     * @name addSelect
     * @kind variable
     * @memberof <function>
     * @param {Event} event
     * @param {'account' | 'time'} entity
     * @returns {void}
     */
    const addSelect = (event, entity) => {
        if (selectsCount[entity] < maxCount[entity]) { // si le nombre max d'éléments n'est pas atteint
            const newElement = createSelect(entity);
            const container = document.querySelector(`.right-column .${entity}-section-content`);
            container.appendChild(newElement);
            preventDupesOnChange(entity);
            if (selectsCount[entity] >= maxCount[entity]) {
                event.target.classList.add('hidden');
            }
        }
    }

    /**
     * Recrée le bouton pour l'ajouter au dernier select.
     * 
     * @function
     * @name moveAddButton
     * @kind variable
     * @memberof <function>
     * @param {'time' | 'account'} entity
     * @param {HTMLElement} element? si spécifié, le bouton sera directement ajouté à cet élément 
     * @param {boolean} recreate? si false, le bouton sera seulement retiré
     * @param {boolean} disabled? si true, le bouton sera disabled
     * @returns {HTMLButtonElement | undefined}
     */
    const moveAddButton = (entity, element = null, recreate = true, disabled = false) => {
        const previousButton = document.querySelector(`#add-${entity}`);
        if (previousButton) {
            previousButton.remove();
        }

        if (!recreate) {
            return;
        }

        if (!element) { // si pas d'élément on cherche le select avec l'indice le plus grand
            const els = document.querySelectorAll(`.${entity}-select`);
            let maxIndex = -1;
            let maxIndexElement = null;
            els.forEach(el => {
                const index = parseInt(el.id.split('-')[1]);
                if (index > maxIndex) {
                    maxIndex = index;
                    maxIndexElement = el;
                }
            });
            element = maxIndexElement.parentNode.querySelector(`.buttons-container`); // div destinée à contenir les boutons
        }
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.classList.add('add-button');
        addButton.classList.add('submit-button');
        addButton.id = `add-${entity}`;
        addButton.disabled = disabled;
        addButton.textContent = entity === 'account' ? 'Ajouter un compte' : 'Ajouter un horaire';
        addButton.addEventListener('click', (event) => addSelect(event, entity));

        element.appendChild(addButton);
        return addButton;
    }

    /**
     * Fonction appelée lorsqu'un select account ou time doit être retiré.
     * 
     * @function
     * @name onDeleteSelect
     * @kind variable
     * @memberof <function>
     * @param {'account' | 'time'} entity
     * @param {HTMLElement} formGroup
     * @returns {void}
     */
    const onDeleteSelect = (entity, formGroup) => {
        formGroup.remove();
        selectsCount[entity] -= 1;
        updateIndices(entity);
        moveAddButton(entity);
        preventDupesOnChange(entity);

        if (entity === 'account') {
            areAllAccountsBanned();
        }
    }

    /**
     * Ajoute le bouton Supprimer à un form-group
     * 
     * @function
     * @name createDeleteButton
     * @kind variable
     * @memberof <function>
     * @param {'account' | 'time'} entity
     * @param {HTMLElement} div
     * @returns {HTMLButtonElement}
     */
    const createDeleteButton = (entity, div) => {
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = entity === 'account' ? 'Supprimer le compte' : 'Supprimer l\'horaire';
        div.querySelector(`.buttons-container`).appendChild(deleteButton);

        deleteButton.addEventListener('click', () => onDeleteSelect(entity, div));

        return deleteButton;
    }

    /**
     * Mets à jour les indices lors d'une suppression d'un compte ou d'un horaire
     * 
     * @function
     * @name updateIndices
     * @kind variable
     * @memberof <function>
     * @param {'account' | 'time'} entity
     * @returns {void}
     */
    const updateIndices = (entity) => {
        const entities = document.querySelectorAll(`.right-column .${entity}-section-content .form-group`);
        entities.forEach((ent, index) => {
            const label = ent.querySelector('label');
            label.textContent = entity === 'account' ? `Compte ${index + 1}*` : `Horaire ${index + 1}*`;
            const select = ent.querySelector('select');
            select.id = `${entity}-${index + 1}`;
        });
    }

    // si on est sur la modification d'une boucle, le checkbox d'activité possède la valeur déjà assignée au userStatus de la boucle
    // cette variable permet de toujours stocker en mémoire ce que l'utilisateur avait choisi, choix qui aurait pu être perdu lors
    // du décochement automatique de la case si tous les comptes étaient bannis
    let userCheckboxState = window.__GLOBAL_VARS__.loop ? window.__GLOBAL_VARS__.loop.userStatus === 'active' : activeCheckbox.checked;

    const areAllAccountsBanned = () => {
        const selects = Array.from(document.querySelectorAll('.account-select'));
        const values = selects.map(select => select.value).filter(val => val !== '');
        const valuesObj = values.map(val => window.__GLOBAL_VARS__.accounts.filter(account => account.id == val)[0]); // récupération des comptes associés aux options choisies
        if (valuesObj.length === 0) {
            return;
        }

        if (valuesObj.every(account => account.isBanned)) { // si tous comptes bannis
            accountAttentionDiv.classList.remove('hidden') // faire apparaître la div attention lorsque tous les comptes sont bannis
            accountAttentionMsg.textContent = 'Attention : tous les comptes sélectionnés sont bannis, ce qui signifie que la boucle ne sera pas active.';
            activeCheckbox.checked = false;
            activeCheckbox.disabled = true; // modification du checkbox
            return true;
        }
        accountAttentionDiv.classList.add('hidden');
        activeCheckbox.checked = userCheckboxState; // retour au dernier choix de l'utilisateur
        activeCheckbox.disabled = false;
        return false;
    }

    activeCheckbox.addEventListener('change', () => {
        userCheckboxState = activeCheckbox.checked;
        userInteracted = true;
    });

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

    const addAccountButton = document.querySelector('#add-account');
    const addTimeButton = document.querySelector('#add-time');

    addAnswerButton.addEventListener('click', event => {
        addAnswer(event);
    });

    if (addAccountButton) {
        addAccountButton.addEventListener('click', event => {
            createSelect('account');
        });
    }

    if (addTimeButton) {
        addTimeButton.addEventListener('click', event => {
            createSelect('time');
        });
    }

    const isFormValid = (form) => {
        if (form.checkValidity() === false) { // si formulaire non conforme
            form.reportValidity();
            return false;
        }
        return true;
    }

    /**
     * Fonction qui permet d'obtenir toutes les informations renseignées par l'utilisateur dans le formulaire sous forme d'objet PreLoop.
     * 
     * @function
     * @name getFormData
     * @kind variable
     * @memberof <function>
     * @param {HTMLFormElement} form
     * @param {boolean} isItAnAdding?
     * @returns {{ id?: number; name: string; description: string; forumId: number; title: string; first_message: string; answers: any[]; times: any[]; accounts: any[]; userStatus: string; }}
     */
    const getFormData = (form, isItAnAdding = false) => {
        let id = 0;
        if (!isItAnAdding) { // si c'est une modification
            id = parseInt(form.querySelector('#loop-id').getAttribute('data-id')); // on ajoute l'attribut ID valide
        }
        const name = form.querySelector('#name').value.trim();
        const description = form.querySelector('#description').value.trim();
        const title = form.querySelector('#title').value.trim();
        const first_message = form.querySelector('#main-message').value.trim();
        const forumId = parseInt(form.querySelector('#forumId').value.trim());
        const userStatus = userCheckboxState ? 'active' : 'inactive';

        const answers = [];
        const answerElements = form.querySelectorAll('#answers-container .answer');
        answerElements.forEach(answer => {
            const answerText = answer.querySelector('textarea').value.trim();
            const answerDelay = answer.querySelector('.delay-input').value;
            answers.push({ // pour chaque réponse on ajoute le texte et le délai
                text: answerText,
                delay: answerDelay
            });
        });

        const timesForm = [];
        const timeSelects = form.querySelectorAll('.time-section-content .time-select');
        timeSelects.forEach((select) => {
            timesForm.push(select.value);
        });

        const accountsForm = [];
        const accountSelects = form.querySelectorAll('.account-section-content .account-select');
        accountSelects.forEach((select) => {
            if (select.value) { // pour chaque compte on ajoute l'ordre de sélection et l'ID
                const index = parseInt(select.id.split('-').at(-1)) - 1;
                const accountObj = window.__GLOBAL_VARS__.accounts.filter(account => account.id === parseInt(select.value))[0];
                accountsForm.push({ id: accountObj.id, order: index });
            }
        });

        const loop = {
            name: name,
            description: description,
            forumId: forumId,
            title: title,
            first_message: first_message,
            answers: answers,
            times: timesForm,
            accounts: accountsForm,
            userStatus: userStatus,
            ...(!isItAnAdding && { id })
        };

        return loop;
    }

    /**
     * Fonction appelée lorsqu'une requête au serveur a échoué.
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

        scrollTowardsBottom();
    }

    /**
     * Fonction appelée 
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

        successMsg.textContent = data.resultStr;
        successDiv.classList.remove('hidden');

        scrollTowardsBottom();

        if (reqType === 'update') {
            setTimeout(() => window.location.reload(), 1000); // reload de la page si mise à jour
        } else {
            setTimeout(() => window.location.href = '/boucles', 1000);
        }
    }

    /**
     * Fonction qui envoie une requête au worker pour l'opération passée en paramètre.
     * 
     * @function
     * @name sendRequest
     * @kind variable
     * @memberof <function>
     * @param {'update' | 'add' | 'delete'} reqType
     * @param {any} loopData
     * @returns {void}
     */
    const sendRequest = (reqType, loopData) => {
        const toDisable = document.querySelectorAll('input:not(:disabled), textarea, select, button');
        toDisable.forEach(el => el.disabled = true);

        let url = '';
        let method = '';
        if (reqType === 'add') {
            url = `/boucles/ajout-boucle`;
            method = 'POST';
        } else if (reqType === 'update') {
            url = `/boucle/${loopData.id}`;
            method = 'PUT';
        } else {
            url = `/boucle/${loopData.id}`;
            method = 'DELETE';
        }

        const request = $.ajax({
            url: url,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            dataType: "json",
            ...(reqType !== 'delete' && { data: JSON.stringify(loopData) })
        });

        request.done(data => {
            onRequestSuccess(reqType, data);
        }).fail(data => {
            onRequestFail(data);
            toDisable.forEach(el => el.disabled = false);
        });
    }

    /**
     * Pour chaque select, ajout des écouteurs d'événements sur les boutons ou le select lui-même.
     * 
     * @function
     * @name prepareSelects
     * @kind variable
     * @memberof <function>
     * @returns {void}
     */
    const prepareSelects = () => {
        const accountSelects = document.querySelectorAll('.account-select');
        const timeSelects = document.querySelectorAll('.time-select');
        const answerDivs = document.querySelectorAll('.answer');

        accountSelects.forEach(accountSelect => {
            const deleteButton = accountSelect.parentNode.querySelector('.delete-button');
            if (deleteButton) {
                deleteButton.addEventListener('click', () => {
                    onDeleteSelect('account', accountSelect.parentNode);
                });
            }
            accountSelect.addEventListener('change', () => onSelectChange(accountSelect, 'account'));
            preventDupesOnChange('account'); // rend disabled les options déjà choisies
        });

        timeSelects.forEach(timeSelect => {
            const deleteButton = timeSelect.parentNode.querySelector('.delete-button');
            if (deleteButton) {
                deleteButton.addEventListener('click', () => {
                    onDeleteSelect('time', timeSelect.parentNode);
                });
            }
            timeSelect.addEventListener('change', () => onSelectChange(timeSelect, 'time'));
            preventDupesOnChange('time');
        });

        answerDivs.forEach(answerDiv => {
            answerDiv.querySelector('.delete-button').addEventListener('click', () => {
                onDeleteAnswer(answerDiv, addAnswerButton);
            });
        });
    }

    prepareSelects();

    // passage de deux fonctions en global pour qu'elles puissent être utilisées dans loop.js et add_loop.js
    window.isFormValid = isFormValid;
    window.getFormData = getFormData;
    window.sendRequest = sendRequest;
    window.scrollTowardsBottom = scrollTowardsBottom;
})();
document.addEventListener('DOMContentLoaded', function() {
    const responsesContainer = document.getElementById('responses-container');
    const addResponseButton = document.getElementById('add-response');
    let responseCount = 0;
    const maxResponses = 10;

    function createTimeOptions(index) { // crée les réponses pour l'input delay
        const select = document.createElement('select');
        select.classList.add('time-input');
        select.required = true;
        select.setAttribute('name', `answer-delay${index}`);

        for (let i = 30; i <= 600; i += 30) {
            const minutes = Math.floor(i / 60);
            const seconds = i % 60;
            const option = document.createElement('option');
            option.value = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            option.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            select.appendChild(option);
        }

        return select;
    }

    function createResponseElement(index) { // ajoute une réponse
        const div = document.createElement('div');
        div.classList.add('response');
        div.innerHTML = `
            <div class="form-group">
                <label>Réponse ${index}*<span class="tooltip-icon" data-tooltip="Réponse au topic qui sera postée par le boucleur.">?</span></label>
                <textarea maxlength="2000" name="answer-${index}" max="16000" required rows="4" style="max-height: 200px; overflow-y: auto;"></textarea>
            </div>
            <div class="response-buttons">
                <label>Délai (mm:ss)*<span class="tooltip-icon" data-tooltip="Délai entre la dernière réponse et celle-ci.">?</span></label>
            </div>
        `;
        const timeSelect = createTimeOptions(index);
        div.querySelector('.response-buttons').appendChild(timeSelect);

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = 'Supprimer la réponse';
        deleteButton.addEventListener('click', function() {
            div.remove();
            responseCount--;
            updateResponseIndices();
            if (responseCount < maxResponses) {
                addResponseButton.classList.remove('hidden');
            }
        });
        div.querySelector('.response-buttons').appendChild(deleteButton);

        return div;
    }

    function updateResponseIndices() { // met à jour les indices lors de la suppression d'une réponse
        const responses = responsesContainer.querySelectorAll('.response');
        responses.forEach((response, index) => {
            const label = response.querySelector('label');
            label.textContent = `Réponse ${index + 1}*`;
        });
    }

    addResponseButton.addEventListener('click', function() {
        if (responseCount < maxResponses) {
            responseCount++;
            const responseElement = createResponseElement(responseCount);
            responsesContainer.insertBefore(responseElement, addResponseButton);
            if (responseCount === maxResponses) {
                addResponseButton.classList.add('hidden');
            }
        }
    });

    const accountsContainer = document.querySelector('.right-column .account-section-content');
    const timesContainer = document.querySelector('.right-column .time-section-content');
    const accounts = JSON.parse(window.serverAccounts);
    const activeCheckbox = document.querySelector('#active');

    const maxCount = {'account' : Math.min(accounts.length, 50), 'time' : 10}; // nombre max d'entités renseignables
    const count = {'account' : 1, 'time' : 1}; // nom actuel d'entités renseignées

    const defaultOptionValue = '--------------'; // placeholder par défaut des inputs
    const attentionDiv = document.querySelector('.attention-supercontainer'); // div contenant le message d'attention

    if (accounts.length === 0) {
        attentionDiv.querySelector('p').textContent = "Vous devez ajouter au moins un compte avant de créer une boucle.";
        attentionDiv.style.display = "flex";
    }

    function generateTimes() { // génération des heures
        var times = [];
        for (let i = 0; i < 1440; i += 15) {
            const minutes = Math.floor(i / 60);
            const seconds = i % 60;
            times.push(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        }
        return times;
    }

    const times = generateTimes();

    // entity = account | time

    function preventDupesOnChange(entity) { // fait en sorte que deux éléments ne peuvent être choisis en même temps
        const selects = Array.from(document.querySelectorAll(`select.${entity}-select`));
        const selectedValues = selects.map(select => select.value).filter(value => value !== '');
        
        selects.forEach(select => {
            Array.from(select.options).forEach(option => {
                if (option.value === '') {
                    option.disabled = true;
                } else {
                    option.disabled = selectedValues.includes(option.value) && select.value !== option.value;
                }
            });
        });
    }

    function moveAddButton(entity, element = null, recreate = true) { // déplace ou crée le bouton Ajouter au dernier form-group
        const previousButton = document.querySelector(`#add-${entity}`);
        if (previousButton) {
            previousButton.remove();
        }

        if (!recreate) {
            return;
        }

        if (!element) {
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
            element = maxIndexElement.parentNode.querySelector(`.buttons-container`);
        }
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.classList.add('add-button');
        addButton.id = `add-${entity}`;
        addButton.textContent = entity === 'account' ? 'Ajouter un compte' : 'Ajouter une heure';
        addButton.addEventListener('click', function() {
            if (count[entity] < maxCount[entity]) {
                count[entity]++;
                const newElement = createSelect(entity);
                const container = entity === 'account' ? accountsContainer : timesContainer;
                container.appendChild(newElement);
                preventDupesOnChange(entity);
                if (count[entity] === maxCount[entity]) {
                    addButton.classList.add('hidden');
                }
            }
        });

        element.appendChild(addButton);
        return addButton;
    }

    function createDeleteButton(entity, div) { // ajoute le bouton Supprimer à un form-group
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = entity === 'account' ? 'Supprimer le compte' : 'Supprimer l\'heure';
        div.querySelector(`.buttons-container`).appendChild(deleteButton);

        deleteButton.addEventListener('click', function() {
            div.remove();
            count[entity] -= 1;
            updateIndices(entity);
            moveAddButton(entity);
            preventDupesOnChange(entity);

            if (entity === 'account') {
                areAllAccountsBanned();
            }
        });

        return deleteButton;
    }

    function updateIndices(entity) { // Mets à jour les indices pour les deux entités lors d'une suppression
        const entities = entity === 'account' ? accountsContainer.querySelectorAll('.form-group') : timesContainer.querySelectorAll('.form-group');
        entities.forEach((ent, index) => {
            const label = ent.querySelector('label');
            label.textContent = entity === 'account' ? `Compte ${index + 1}*` : `Heure ${index + 1}*`;
            const select = ent.querySelector('select');
            select.id = `${entity}-${index + 1}`;
        });
    }

    let initialCheckboxState = null;
    let userInteracted = false;

    function areAllAccountsBanned() {
        const selects = Array.from(document.querySelectorAll('.account-select'));
        const values = selects.map(select => select.value).filter(val => val !== '');
        const valuesObj = values.map(val => accounts.filter(account => account.id == val)[0]);
        if (valuesObj.length === 0) {
            return;
        }
        if (initialCheckboxState === null) {
            initialCheckboxState = activeCheckbox.checked;
        }
        if (valuesObj.every(account => account.isBanned)) {
            attentionDiv.style.display = 'flex'; // faire apparaître la div attention lorsque tous les comptes sont bannis
            activeCheckbox.checked = false;
            activeCheckbox.disabled = true;
            return true;
        }
        attentionDiv.style.display = 'none';
        if (userInteracted) {
            activeCheckbox.checked = initialCheckboxState;
        }
        activeCheckbox.disabled = false;
        return false;
    }

    activeCheckbox.addEventListener('change', function() {
        initialCheckboxState = activeCheckbox.checked;
        userInteracted = true;
    });

    function createSelect(entity) { // ajoute un élément select à chaque clic sur le bouton Ajouter
        const div = document.createElement('div');
        const label = document.createElement('label');
        const select = document.createElement('select');
        const buttonsContainer = document.createElement('div');

        const selectId = `${entity}-${count[entity]}`;
        div.classList.add('form-group');
        select.classList.add(`${entity}-select`);
        select.required = true;
        select.name = selectId;
        label.setAttribute('for', selectId);
        label.textContent = entity === 'account' ? `Compte ${count[entity]}*` : `Heure ${count[entity]}*`;

        select.id = selectId;
        buttonsContainer.classList.add('buttons-container');

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = defaultOptionValue;
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);

        if (entity === 'account') {
            accounts.forEach(account => { // ajout des options
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = account.username;
                option.classList.add(account.isBanned ? 'account-banned' : 'account-available');
                select.appendChild(option);
            });
        } else {
            times.forEach(time => {
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                select.appendChild(option);
            });
        }

        select.addEventListener('change', () => {
            preventDupesOnChange(entity);

            if (entity === 'account') { // ajout de la couleur au select en fonction du statut du compte
                const chosenAccount = accounts.filter(account => account.id == select.value)[0];
                if (chosenAccount) {
                    select.className = 'account-select';
                    select.classList.add(chosenAccount.isBanned ? 'account-banned' : 'account-available');
                }
                areAllAccountsBanned();
            }
        });

        div.appendChild(label);
        div.appendChild(select);
        div.appendChild(buttonsContainer);
        if (count[entity] > 1) {
            createDeleteButton(entity, div);
        }

        if (count[entity] < maxCount[entity]) {
            moveAddButton(entity, buttonsContainer, true);
        } else {
            moveAddButton(entity, buttonsContainer, false)
        }

        if (entity === 'account') {
            accountsContainer.appendChild(div);
        } else {
            timesContainer.appendChild(div);
        }
        
        return div;
    }

    createSelect('account');
    createSelect('time');

    const errorMsg = document.querySelector('#error-message');
    const errorDiv = errorMsg.parentNode; // div contenant le message d'erreur
    const successMsg = document.querySelector('#success-message');
    const successDiv = successMsg.parentNode; // div contenant le message de succès

    document.querySelector('form').addEventListener('submit', function(event) { // submit du formulaire
        event.preventDefault();
        document.querySelectorAll('button').forEach(btn => btn.disabled = true);
        const form = event.target;

        if (form.checkValidity() === false) { // si formulaire non conforme
            form.reportValidity();
            return;
        }

        const name = document.getElementById('name').value;
        const description = document.getElementById('description').value;
        const title = document.getElementById('title').value;
        const first_message = document.getElementById('main-message').value;
        const forumId = parseInt(document.querySelector('#forumId').value);
        const status = activeCheckbox.checked ? 'active' : 'inactive';
    
        const responses = [];
        const responseElements = document.querySelectorAll('#responses-container .response');
        responseElements.forEach(function(response) {
            const responseText = response.querySelector('textarea').value;
            const responseDelay = response.querySelector('.time-input').value;
            responses.push({
                text: responseText,
                delay: responseDelay
            });
        });
    
        const timesForm = [];
        const timeSelects = document.querySelectorAll('.time-section-content .time-select');
        timeSelects.forEach(function(select) {
            timesForm.push(select.value);
        });
    
        const accountsForm = [];
        const accountSelects = document.querySelectorAll('.account-section-content .account-select');
        accountSelects.forEach(function(select) {
            if (select.value) {
                const accountObj = accounts.filter(account => account.id === parseInt(select.value))[0];
                accountsForm.push({ id: accountObj.id, username: accountObj.username });
            }
        });
    
        const loop = {
            name: name,
            description: description,
            forumId: forumId,
            title: title,
            first_message: first_message,
            answers: responses,
            times: timesForm,
            accounts: accountsForm,
            status: status
        };

        var request = $.ajax({
            url: "/ajout-boucle",
            method: "POST",
            headers: {
                'Content-Type':'application/json'
            },
            dataType: "json",
            data: JSON.stringify(loop)
        });
        request.done(data => { 
            errorDiv.style.display = 'none';
            errorMsg.textContent = '';

            successMsg.textContent = data.resultStr;
            successDiv.style.display = 'block';

            document.querySelectorAll('button').forEach(btn => btn.disabled = false);
         }).fail(data => {
            successDiv.style.display = 'none';
            successMsg.textContent = '';

            errorMsg.textContent = data.responseJSON.resultStr;
            errorDiv.style.display = 'block';

            document.querySelectorAll('button').forEach(btn => btn.disabled = false);
        });
    });
    
});
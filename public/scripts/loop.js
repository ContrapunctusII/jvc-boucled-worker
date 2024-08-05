document.addEventListener('DOMContentLoaded', function() {
    const responsesContainer = document.getElementById('responses-container');
    const addResponseButton = document.getElementById('add-response');
    let responseCount = responsesContainer.querySelectorAll('.response').length;
    const maxResponses = 10;

    function generateDelays() {
        const delays = [];

        for (let i = 30; i <= 600; i += 30) {
            const minutes = Math.floor(i / 60);
            const seconds = i % 60;
            const delay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            delays.push(delay);
        }

        return delays;
    }

    function createTimeOptions(index) {
        const select = document.createElement('select');
        select.classList.add('time-input');
        select.required = true;
        select.setAttribute('name', `answer-delay${index}`);
        const delays = generateDelays();

        for (const delay of delays) {
            const option = document.createElement('option');
            option.value = delay;
            option.textContent = delay;
            select.appendChild(option);
        }

        return select;
    }

    function onDeleteResponse(formGroup) {
        formGroup.remove();
        responseCount--;
        updateResponseIndices();
        if (responseCount < maxResponses) {
            addResponseButton.classList.remove('hidden');
        }
    }

    function createResponseElement(index) {
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
        deleteButton.addEventListener('click', () => {
            onDeleteResponse(div);
        });
        div.querySelector('.response-buttons').appendChild(deleteButton);

        return div;
    }

    function updateResponseIndices() {
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
    const submitContainer = document.querySelector('.submit-container');

    const maxCount = {'account' : Math.min(accounts.length, 50), 'time' : 10};
    const count = {'account' : Math.max(accountsContainer.querySelectorAll('.form-group').length, 1), 'time' : timesContainer.querySelectorAll('.form-group').length};

    const defaultOptionValue = '--------------';
    const attentionDiv = document.querySelector('.attention-supercontainer');
    const attentionMsg = attentionDiv.querySelector('p');
    const editButton = document.querySelector('#edit-button');

    if (accounts.length === 0) {
        attentionMsg.textContent = "Vous devez ajouter au moins un compte avant de modifier la boucle.";
        attentionDiv.style.display = "flex";
        editButton.disabled = true;
    } else if (accountsContainer.querySelectorAll('.form-group').length === 0) {
        attentionMsg.textConten = "Aucun compte n'a été associé à la boucle. Elle est donc inactive.";
        attentionDiv.style.display = "flex";
    }

    function generateTimes() {
        var times = [];
        for (let i = 0; i < 1440; i += 15) {
            const minutes = Math.floor(i / 60);
            const seconds = i % 60;
            times.push(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        }
        return times;
    }

    const times = generateTimes();

    function preventDupesOnChange(entity) {
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

    function moveAddButton(entity, element = null, recreate = true) {
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

    function onDelete(entity, formGroup) {
        formGroup.remove();
        count[entity] -= 1;
        updateIndices(entity);
        moveAddButton(entity);
        preventDupesOnChange(entity);

        if (entity === 'account') {
            areAllAccountsBanned();
        }
    }

    function createDeleteButton(entity, div) {
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = entity === 'account' ? 'Supprimer le compte' : 'Supprimer l\'heure';
        div.querySelector(`.buttons-container`).appendChild(deleteButton);

        deleteButton.addEventListener('click', () => onDelete(entity, div));

        return deleteButton;
    }

    function updateIndices(entity) {
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
            attentionDiv.style.display = 'flex';
            attentionMsg.textContent = 'Attention : tous les comptes sélectionnés sont bannis, ce qui signifie que la boucle ne sera pas active.';
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

    function onSelectChange(entity) {
        preventDupesOnChange(entity);

        if (entity === 'account') {
            const chosenAccount = accounts.filter(account => account.id == this.value)[0];
            console.log(chosenAccount);
            if (chosenAccount) {
                this.className = 'account-select';
                this.classList.add(chosenAccount.isBanned ? 'account-banned' : 'account-available');
            }
            areAllAccountsBanned();
        }
    }

    activeCheckbox.addEventListener('change', function() {
        initialCheckboxState = activeCheckbox.checked;
        userInteracted = true;
    });

    function createSelect(entity, disabled = false) {
        const div = document.createElement('div');
        const label = document.createElement('label');
        const select = document.createElement('select');
        const buttonsContainer = document.createElement('div');

        const selectId = `${entity}-${count[entity]}`;
        div.classList.add('form-group');
        select.classList.add(`${entity}-select`);
        select.required = true;
        select.name = selectId;
        select.disabled = disabled;
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
            accounts.forEach(account => {
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
            onSelectChange.call(select, entity);
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

    const errorMsg = document.querySelector('#error-message');
    const errorDiv = errorMsg.parentNode;
    const successMsg = document.querySelector('#success-message');
    const successDiv = successMsg.parentNode;

    editButton.addEventListener('click', (event) => {
        document.querySelectorAll('input, textarea, select, button').forEach(i => i.disabled = false);
        areAllAccountsBanned();
        event.target.remove();
        document.querySelector('#delete-button').remove();
        
        const submitButton = document.createElement('button');
        submitButton.classList.add('submit-button');
        submitButton.id = 'submit-button';
        submitButton.setAttribute('type', 'submit');
        submitButton.textContent = 'Enregistrer';
        
        const cancelButton = document.createElement('button');
        cancelButton.classList.add('delete-button');
        cancelButton.setAttribute('type', 'button');
        cancelButton.id = 'cancel-button';
        cancelButton.textContent = 'Annuler';

        cancelButton.addEventListener('click', (event) => {
            window.location.reload();
        });

        submitContainer.appendChild(submitButton);
        submitContainer.appendChild(cancelButton);
    });

    const accountSelects = document.querySelectorAll('.account-select');
    const timeSelects = document.querySelectorAll('.time-select');
    const answerDivs = document.querySelectorAll('.response');

    if (accountSelects.length === 0) {
        createSelect('account', true);
    }
    accountSelects.forEach(accountSelect => {
        accounts.forEach(a => {
            if (a.id == accountSelect.value) { return; }
            const option = document.createElement('option');
            option.value = a.id;
            option.textContent = a.username;
            option.classList.add(a.isBanned ? 'account-banned' : 'account-available');
            accountSelect.appendChild(option);
        });
        const deleteButton = accountSelect.parentNode.querySelector('.delete-button');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                onDelete('account', accountSelect.parentNode);
            });
        }
        accountSelect.addEventListener('change', () => onSelectChange.call(accountSelect, 'account'));
        preventDupesOnChange('account');
    });

    timeSelects.forEach(timeSelect => {
        const selectedTime = timeSelect.value;
        const timesBefore = [];
        const timesAfter = [];
        
        times.forEach(t => {
            if (t < selectedTime) {
                timesBefore.push(t);
            } else if (t > selectedTime) {
                timesAfter.push(t);
            } else {
                timesBefore.push(selectedTime);
            }
        });
        
        while (timeSelect.firstChild) {
            timeSelect.removeChild(timeSelect.firstChild);
        }
    
        const orderedTimes = timesBefore.concat(timesAfter);
        
        orderedTimes.forEach(t => {
            const option = document.createElement('option');
            if (t == selectedTime) option.selected = true;
            option.value = t;
            option.textContent = t;
            timeSelect.appendChild(option);
        });
        const deleteButton = timeSelect.parentNode.querySelector('.delete-button');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                onDelete('time', timeSelect.parentNode);
            });
        }
        timeSelect.addEventListener('change', () => onSelectChange.call(timeSelect, 'time'));
        preventDupesOnChange('time');
    });

    answerDivs.forEach(answerDiv => {
        const delays = generateDelays();
        const select = answerDiv.querySelector('.time-input');
        const selectedDelay = select.value;
        const delaysBefore = [];
        const delaysAfter = [];

        delays.forEach(d => {
            if (d < selectedDelay) {
                delaysBefore.push(d);
            } else if (d > selectedDelay) {
                delaysAfter.push(d);
            } else {
                delaysBefore.push(selectedDelay);
            }
        });

        while (select.firstChild) {
            select.removeChild(select.firstChild);
        }

        const orderedDelays = delaysBefore.concat(delaysAfter);

        orderedDelays.forEach(t => {
            const option = document.createElement('option');
            if (t == selectedDelay) option.selected = true;
            option.value = t;
            option.textContent = t;
            select.appendChild(option);
        });

        answerDiv.querySelector('.delete-button').addEventListener('click', () => {
            onDeleteResponse(answerDiv);
        });
    });

    const addAccountButton = moveAddButton('account');
    const addTimeButton = moveAddButton('time');
    addAccountButton.disabled = true;
    addTimeButton.disabled = true;

    document.querySelector('form').addEventListener('submit', function(event) {
        event.preventDefault();
        document.querySelectorAll('button').forEach(btn => btn.disabled = true);
        const form = event.target;

        if (form.checkValidity() === false) {
            form.reportValidity();
            return;
        }

        const id = parseInt(document.querySelector('#loop-id').textContent.trim());
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
            id: id,
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
            url: `/boucle/${id}`,
            method: "PUT",
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

            document.querySelectorAll('button, input, select, textarea').forEach(e => e.disabled = true);
            setTimeout(() => window.location.reload(), 1000);
         }).fail(data => {
            successDiv.style.display = 'none';
            successMsg.textContent = '';

            errorMsg.textContent = data.responseJSON.resultStr;
            errorDiv.style.display = 'block';

            document.querySelectorAll('button').forEach(btn => btn.disabled = false);
        });
    });

    window.deleteLoop = () => {
        document.querySelectorAll('button, input, select, textarea').forEach(e => e.disabled = true);
        const id = parseInt(document.querySelector('#loop-id').textContent.trim());
        var request = $.ajax({
            url: `/boucle/${id}`,
            method: "DELETE",
            headers: {
                'Content-Type':'application/json'
            },
            dataType: "json"
        });
        request.done(data => { 
            errorDiv.style.display = 'none';
            errorMsg.textContent = '';

            successMsg.textContent = data.resultStr;
            successDiv.style.display = 'block';

            setTimeout(() => window.location.href = '/boucles', 1000);
         }).fail(data => {
            successDiv.style.display = 'none';
            successMsg.textContent = '';

            errorMsg.textContent = data.responseJSON.resultStr;
            errorDiv.style.display = 'block';

            document.querySelectorAll('button').forEach(btn => btn.disabled = false);
        });
    }
});
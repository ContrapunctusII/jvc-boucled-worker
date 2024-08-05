document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.querySelector('#account-table-body');
    const submitAddButton = document.querySelector('#add-account-form button');
    const addFormInputs = document.querySelectorAll('#add-account-form input');

    const successMsg = document.querySelector('#success-message');
    const successDiv = successMsg.parentNode; // div contenant le message de succès de la requête
    const errorMsg = document.querySelector('#error-message');
    const errorDiv = errorMsg.parentNode; // div contenant le message d'erreur de la requête
    const DELAY_BEFORE_TRANSITION = 2000; // temps que dure une transition
    const tableContainer = document.querySelector('.table-container');
    const attentionContainer = document.querySelector('.attention-supercontainer'); // div contenant le message d'attention si pas de compte
    const updateContainer = document.querySelector('.update-container'); // div contenant le bouton de mise à jour

    window.removeAccount = (button, id) => {
        try {
            successDiv.classList.remove('smooth-display'); // enlève les transitions en cours
            successDiv.style.display = 'none';
            successDiv.style.opacity = 1;
            button.disabled = true;
            const request = $.ajax({
                url: `/compte/${id}`,
                method: "DELETE",
                headers: {
                    'Content-Type':'application/Json'
                },
                dataType: "json",
            });

            request.done(data => {
                button.parentNode.parentNode.remove();
                errorDiv.style.display = 'none'; // gestion du message d'erreur
                errorMsg.textContent = '';

                successMsg.textContent = data.resultStr;
                successDiv.style.opacity = 1;
                successDiv.style.display = 'block';
                successDiv.classList.add('smooth-display');
                button.disabled = false;

                if (document.querySelectorAll('.account').length === 0) { // s'il ne reste plus aucun compte
                    attentionContainer.style.display = 'flex';
                    tableContainer.style.display = 'none';
                    updateContainer.style.display = 'none';
                }

                setTimeout(() => {
                    successDiv.style.opacity = 0;
                }, DELAY_BEFORE_TRANSITION); // appliquer la transition
                
                successDiv.addEventListener('transitionend', () => { // masquer l'élément
                    successDiv.style.display = 'none';
                    successDiv.classList.remove('smooth-display');
                    successDiv.style.opacity = 1;
                });

            }).fail(data => {
                successDiv.style.display = 'none';
                successMsg.textContent = '';

                errorMsg.textContent = data.responseJSON.resultStr;
                errorDiv.style.display = 'block';
                button.disabled = false;
            });
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while adding the account. See console.');
        }
    }

    window.updateAllAccounts = (button) => {
        try {
            button.disabled = true;
            successDiv.classList.remove('smooth-display');
            successDiv.style.display = 'none';
            successDiv.style.opacity = 1;
            const request = $.ajax({
                url: `/comptes/mise-a-jour`,
                method: "PUT",
                headers: {
                    'Content-Type':'application/Json'
                },
                dataType: "json",
            });

            request.done(data => {
                errorDiv.style.display = 'none';
                errorMsg.textContent = '';

                successMsg.textContent = data.resultStr;
                successDiv.style.opacity = 1;
                successDiv.style.display = 'block';

                setTimeout(() => {
                    window.location.reload();
                }, 1000);

            }).fail(data => {
                successDiv.style.display = 'none';
                successMsg.textContent = '';

                errorMsg.textContent = data.responseJSON.resultStr;
                errorDiv.style.display = 'block';
                button.disabled = false;
            });
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while adding the account. See console.');
        }
    }

    document.getElementById('add-account-form').addEventListener('submit', async function(event) {
        event.preventDefault();
        submitAddButton.disabled = true;
        const formData = new FormData(this); // récupération des données passées dans le formulaire
        const data = Object.fromEntries(formData.entries());

        try {
            successDiv.classList.remove('smooth-display');
            successDiv.style.display = 'none';
            successDiv.style.opacity = 1;
            const request = $.ajax({
                url: "/ajout-compte",
                method: "POST",
                headers: {
                    'Content-Type':'application/Json'
                },
                dataType: "json",
                data: JSON.stringify(data)
            });

            request.done(data => {
                const newAccountHTML = `
                    <tr class="account">
                        <td>${data.id}</td>
                        <td>${data.username}</td>
                        <td class="${data.isBanned ? 'banned' : 'available'}">
                            ${data.isBanned ? 'banni' : 'disponible'}
                        </td>
                        <td>${(data.level) ? data.level : ''}</td>
                        <td>${data.loops.join(', ')}</td>
                        <td>
                            <button class="delete-btn" onclick="removeAccount(this, ${data.id})">Supprimer</button>
                        </td>
                    </tr> 
                `;
                tableBody.insertAdjacentHTML('beforeend', newAccountHTML);
                
                errorDiv.style.display = 'none';
                errorMsg.textContent = '';

                tableContainer.style.display = 'flex';
                attentionContainer.style.display = 'none';
                updateContainer.style.display = 'block';

                successMsg.textContent = data.resultStr;
                successDiv.style.display = 'block';

                addFormInputs.forEach(input => input.disabled = false);
                addFormInputs.forEach(input => input.value = '');
                
                submitAddButton.disabled = false;

                successDiv.classList.add('smooth-display');
                setTimeout(() => {
                    successDiv.style.opacity = 0;
                }, DELAY_BEFORE_TRANSITION);
                
                successDiv.addEventListener('transitionend', () => {
                    successDiv.style.display = 'none';
                });
            }).fail(data => {
                successDiv.style.display = 'none';
                successMsg.textContent = '';

                errorMsg.textContent = data.responseJSON.resultStr;
                errorDiv.style.display = 'block';
                submitAddButton.disabled = false;
            });
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while adding the account. See console.');
        }
    });
});
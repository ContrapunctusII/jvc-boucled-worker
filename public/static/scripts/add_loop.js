(function () {
    const form = document.querySelector('form');

    const onSubmit = (event) => {
        event.preventDefault();

        if (!window.isFormValid(form)) {
            return;
        }

        const loop = window.getFormData(form, true);
        window.sendRequest('add', loop);
    }

    form.addEventListener('submit', (event) => {
        onSubmit(event);
    });
})();
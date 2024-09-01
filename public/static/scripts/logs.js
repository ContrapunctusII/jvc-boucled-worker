(function () {
    /**
     * Fonction qui déroule la div du log pour afficher les détails.
     * 
     * @function
     * @name toggleDetails
     * @kind variable
     * @memberof <function>
     * @param {any} logEntry
     * @returns {void}
     */
    const toggleDetails = (logEntry) => {
        const details = logEntry.querySelector('.log-details');
        details.classList.toggle('hidden');
    }

    const logs = document.querySelectorAll('.log-entry');
    logs.forEach(log => log.addEventListener('click', () => toggleDetails(log)));
})();
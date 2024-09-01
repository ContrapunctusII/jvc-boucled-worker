import ServerLog from '../interfaces/ServerLog.js';

interface LogTableProps {
  logs: Array<ServerLog>;
}

/**
 * Table listant les logs dans logs.html.
 * 
 * @function
 * @name LogsTable
 * @kind variable
 * @type {React.FC<LogTableProps>}
 * @returns {JSX.Element}
 */
const LogsTable: React.FC<LogTableProps> = ({ logs }): JSX.Element => (
  <div className="logs-table">
    {logs.map((log, index) => (
      <div key={index} className={`log-entry ${log.type}`}> {/** onclick : toggle details **/}
        <div className="log-header">
          <span className="log-timestamp">{new Date(log.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span> {/* Reformatage de la date en JJ/MM/AAAA HH:MM:SS */}
          <span className="log-operation">Opération : {log.operation.charAt(0).toLowerCase() + log.operation.slice(1)}</span>
          <span className="log-message">{log.type.charAt(0).toUpperCase() + log.type.slice(1)} : {log.message}</span>
        </div>
        <div id={`log-details-${index}`} className="log-details hidden">
          <p>{log.details}</p>
        </div>
      </div>
    ))}
  </div>
);

export default LogsTable;
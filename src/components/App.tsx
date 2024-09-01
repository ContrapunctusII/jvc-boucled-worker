import React, { ReactNode } from 'react';

interface MetaProps {
  title: string; // titre de la page
  stylesheets: string[]; // chemins relatifs vers les feuilles de style de la page
  scripts: string[]; // chemins relatifs vers les scripts de la page
}

interface AppProps {
  children: ReactNode; // contenu à afficher qui dépend de la page sur laquelle on se trouve
  activePage: "comptes" | "boucles" | "ajout-boucle" | "logs" | "config" | ""; // nom de l'endpoint qui permet de déterminer quel élément sera surligné dans la NavBar
  meta: MetaProps; // informations meta de la page
  globalVars?: { [k: string]: any } // variables à injecter en front dans window.__GLOBAL_VARS__
}

interface NavBarProps {
  activePage: "comptes" | "boucles" | "ajout-boucle" | "logs" | "config" | "";
}

/**
 * Barre de navigation contenu dans le header des pages.
 * 
 * @function
 * @name Navbar
 * @kind variable
 * @type {React.FC<NavBarProps>}
 * @returns {JSX.Element}
 */
const Navbar: React.FC<NavBarProps> = ({ activePage }): JSX.Element => {
  return (
    <nav className="navbar">
      <ul>
        <li><a href="/comptes" className={`nav-link ${activePage === 'comptes' ? 'active' : ''}`}>Comptes</a></li>
        <li><a href="/boucles" className={`nav-link ${activePage === 'boucles' ? 'active' : ''}`}>Boucles</a></li>
        <li><a href="/boucles/ajout-boucle" className={`nav-link ${activePage === 'ajout-boucle' ? 'active' : ''}`}>Créer une boucle</a></li>
        <li><a href="/logs" className={`nav-link ${activePage === 'logs' ? 'active' : ''}`}>Logs</a></li>
        <li><a href="/config" className={`nav-link ${activePage === 'config' ? 'active' : ''}`}>Configuration</a></li>
      </ul>
    </nav>
  );
};

/**
 * Composant commun à toutes les pages.
 * 
 * @constant
 * @name App
 * @kind variable
 * @type {React.FC<AppProps>}
 */
const App: React.FC<AppProps> = ({ children, activePage, meta, globalVars = {} }): JSX.Element => {
  return (
    <html lang="fr">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{meta.title}</title>
        {meta.stylesheets.map((href, index) => (
          <link key={index} rel="stylesheet" href={href} />
        ))}
        <link rel="icon" type="image/x-icon" href="/static/favicon.png"></link>
      </head>
      <body>
        <header>
          <Navbar activePage={activePage} />
        </header>
        <div id="root">
          {children}
        </div>
      </body>
      <script async
        dangerouslySetInnerHTML={{
          __html: `
          window.__GLOBAL_VARS__ = ${JSON.stringify(globalVars)};
        `,
        }}
      />
      {meta.scripts.map((src, index) => (
        <script key={index} src={src} async></script>
      ))}
    </html>
  );
};

export default App;

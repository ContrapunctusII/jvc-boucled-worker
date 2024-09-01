# JVC-BOUCLED-WORKER

## Un _worker_ Cloudflare pour gérer et poster des boucles sur les forums de www.jeuxvideo.com.

## Introduction

_**Jvc-boucled-worker**_ est un _worker_ Cloudflare destiné à automatiser le
post des boucles sur [www.jeuxvideo.com](https://www.jeuxvideo.com/forums). Cet
utilitaire **entièrement gratuit** vous permet d'intégrer vos comptes JVC, de
créer des boucles et d'en planifier le post automatique.

## Comment cela fonctionne-t-il ?

[_Cloudflare Workers_](https://workers.cloudflare.com/) est un environnement
d'exécution sans serveur qui permet de déployer sur le réseau mondial de
Cloudflare une application Web exécutant du code JavaScript.

Le _worker_ possède une interface utilisateur qui vous permet d'ajouter vos
comptes JVC et boucles dans une base de données D1 (= SQL). À chaque heure
potentielle de post, le _worker_ vérifie si vous avez programmé une boucle à
cette heure. Le cas échéant, il se connecte à l'un des comptes assignés à votre
boucle et envoie des requêtes aux forums de JVC pour poster le topic et
éventuellement les réponses de celle-ci.

Le _worker_ envoie plusieurs fois par jour des requêtes à JVC pour mettre à jour
le statut et le niveau des comptes que vous avez associés.

## Processus de déploiement

### Prérequis

Vous aurez besoin d'un compte [Cloudflare](https://www.cloudflare.com/) pour
déployer le _worker_. L'inscription est gratuite et ne prend qu'une minute.\
Assurez-vous d'avoir installé [Node.js](https://nodejs.org/fr) et son
gestionnaire de paquets [npm](https://www.npmjs.com/) (qui est normalement
inclus dans l'installation de Node).\
Enfin vous aurez besoin de [Git](https://github.com/git-guides/install-git) pour
cloner le dépôt ainsi que d'un compte Github.

### Déploiement du proxy

Comme tous les _workers_ Cloudflare effectuent des requêtes avec la même IP, il
nous faut utiliser un proxy à IP dynamique pour que JVC ne puisse pas bloquer
les requêtes des workers et que plusieurs workers puissent poster en même temps.

Nous allons déployer ce proxy sur [Vercel](https://vercel.com/). J'ai déjà créé
un dépôt avec le code du proxy et les instructions concernant le déploiement :
[simple-express-proxy](https://github.com/ContrapunctusII/simple-express-proxy).
Veuillez vous y référer avant de continuer, car l'utilisation d'un proxy est
**obligatoire** pour faire fonctionner le _worker_. Le domaine généré par Vercel
après le déploiement du proxy sera à renseigner dans l'interface du _worker_
(voir plus bas).

### Préparation

Ouvrez un terminal à l'emplacement de votre choix puis cloner le dépôt avec
`git` :

```
git clone https://github.com/ContrapunctusII/jvc-boucled-worker.git
cd jvc-boucled-worker
```

Le terminal est désormais situé à la racine du dépôt. Exécutez la commande
suivante :

```
npm install
```

Cette commande va installer, entre autres,
[`wrangler`](https://developers.cloudflare.com/workers/wrangler/) qui vous
permettra de gérer le déploiement du _worker_.\
Exécutez la commande suivante et suivez les instructions pour vous connecter à
votre compte Cloudflare depuis `wrangler` :

```
npx wrangler login
```

Lancez le script shell `setup_db.sh` qui créera les bases de données nécessaires
pour le _worker_ et les ajoutera dans le fichier `wrangler.toml` :

- Sur **Windows** (avec **Git installé** — assurez-vous d'utiliser le CMD et non
  pas PowerShell) :

```
set PATH=%PATH%;c:\Program Files\Git\bin
sh setup_db.sh
```

- Sur **Linux**/**MacOS** :

```
chmod +x setup_db.sh
./setup_db.sh
```

### Déploiement

Tout est prêt pour déployer le _worker_ sur le réseau Cloudflare :

```
npx wrangler deploy
```

**S'il s'agit de la première fois que vous déployez une application
Cloudflare**, `wrangler` vous demandera de choisir un nom de domaine. Vous
pouvez entrez ce que bon vous semble. Si le déploiement s'est bien déroulé,
`wrangler` affichera l'URL de votre nouveau _worker_ à la fin de l'exécution.

Vous devriez pouvoir accéder au _worker_ sur votre navigateur en quelques
minutes. **Cependant**, notamment sur Windows, il est possible et même probable
que passé ce délai, vous rencontriez toujours l'erreur « Ce site est
inaccessible » en tentant de vous y rendre sur votre navigateur. Cela est dû au
cache DNS de votre ordinateur qui n'a pas été mis à jour et considère toujours
le domaine comme inexistant. Essayez de
[vider le cache DNS](https://www.commentcamarche.net/maison/box-connexion-internet/1743-flush-dns-vider-cache-dns/).
Si cela ne fonctionne toujours pas,
[videz le cache DNS de votre navigateur](https://help.adk-media.com/comment-vider-le-cache-dns-de-mon-navigateur.html).
Enfin, en dernier recours, ajoutez temporairement un DNS tiers à votre
navigateur, comme [celui de Cloudflare](https://one.one.one.one/).

## Post-déploiement

### Proxy

Tant que vous ne saississez pas l'URL complète du proxy déployé sur Vercel dans
la page `/config`, vous ne pourrez pas accéder aux autres pages du site.

### Et après ?

Si vous modifiez le code du _worker_ et que vous souhaitez déployez les
changements, il vous suffit d'exécuter `npx wrangler deploy` comme précédémment.

Si vous souhaitez observer les sorties de `console.log`, utilisez
`npx wrangler tail`.

Enfin, pour réinitialiser la base de données D1, exécutez `npm run setup-d1`.

## Fonctionnement du site

![Formulaire de modification de boucle](https://i.imgur.com/yiw0Qa2.png)
![Liste des boucles](https://i.imgur.com/y6fIPew.png)
![Liste des comptes](https://i.imgur.com/7I7qvOH.png)

Le site est divisé en six _endpoints_ publics :

- `/comptes` : page affichant l'ensemble des comptes ajoutés, avec pseudo,
  statut (banni ou non), boucles associées, niveau (si non banni), et permettant
  d'en ajouter, d'en supprimer et de tous les mettre à jour.
- `/boucles` : page affichant l'ensemble des boucles créées, avec nom, heures de
  posts, comptes associés, statut (actif ou non), et dernier topic en date.
- `/boucles/ajout-boucle` : formulaire vous permettant d'ajouter une boucle.
  Chaque champ à remplir est accompagné d'une infobulle expliquant ce qu'il doit
  contenir.
- `boucle/:id` : affiche les informations de la boucle d'ID `id` avec
  possibilité de modifier celles-ci.
- `/logs` : page faisant état des logs du serveur, indiquant si des erreurs ont
  été rencontrées durant une opération interne (post de boucle, mise à jour de
  compte, etc.). Si vous rencontrez une erreur persistante, ou que vous
  soupçonnez le code de comporter un bug, n'hésitez pas à exécuter la commande
  `npx wrangler tail` qui affichera par la console le détail des opérations en
  cours.
- `/config` : page permettant de modifier les paramètres du _worker_, se
  résumant pour l'instant à l'URL du proxy que vous avez déployé.

## TODO

### Fonctionnalités

- Pouvoir planifier des posts de boucle non seulement sur une journée mais aussi
  sur une semaine. Par exemple, tous les mardis et jeudis à 18 h.
- _Mode schizo_ : pouvoir changer de compte entre les réponses pour simuler un
  dialogue.
- Ajouter la possibilité de rendre un topic « résolu ».
- Pouvoir importer des comptes et des boucles existants sur un _worker_, à
  partir d'un fichier JSON ?

### Architecture

- Se débarasser des fichiers statiques et générer le frontend entièrement avec
  React (pas possible pour l'instant). ~~Utilisation du _framework_ Flareact ?~~

## F.A.Q.

### Pourquoi faut-il déployer soi-même son _worker_ ? pourquoi ne pas avoir publié un site Web ?

- Pour des raisons financières, car la réservation d'un domaine et l'entretien
  d'un serveur impliquent des besoins financiers disproportionnés par rapport à
  l'usage qui en sera fait.
- Pour des raisons techniques, car un site Web, doté d'une seule IP, ne pourrait
  poster plusieurs boucles en même temps (JVC empêcherait les requêtes
  d'aboutir).
- Pour des raisons de sécurité, car il est normal que chaque utilisateur ne
  puisse accéder qu'à ses comptes et n'organiser que les posts de ses comptes.
  De plus, bien que cela soit peu probable, le code n'est pas à l'abri d'une
  faille de sécurité.

### Pourquoi avoir besoin d'un proxy supplémentaire ?

Par défaut, tous les _workers_ Cloudflare effectuent des requêtes avec la même
IP (`2a06:98c0:3600::103`). Ainsi, si deux _workers_ postent une boucle en même
temps, l'un des deux sera ralenti par JVC. C'est pourquoi l'utilisation d'un
proxy est nécessaire pour « masquer » l'IP du client d'origine.

### Les boucles que j'ai créées n'apparaissent pas sur JVC, pourquoi ?

Une boucle ne sera pas postée si aucun compte ne lui est associé ou si tous les
comptes associés sont bannis, n'existent plus ou possèdent un nouveau mot de
passe. Vérifiez donc d'abord si la liste des comptes est valide. Sinon, vérifiez
dans les logs (à la page `/logs`) si des erreurs ont été rencontrées. Veillez à
ce que les messages à poster ne soient pas trop longs pour éviter l'erreur
_Message invalide_ de JVC qui sera de toute manière enregistrée dans les logs.

### Je pense avoir trouvé un bug, que faire ?

Vous pouvez ouvrir une _issue_ sur ce dépôt pour m'en informer.

### Pourquoi avoir passé autant de temps à coder un outil destiné à polluer un forum de puceaux, qui ne te rapportera jamais rien et qui ne sera utilisé par personne au monde ?

Parce que je n'ai pas de vie. :)

## Développé par le forumeur Satisfaction/PneuTueur
# JVC-BOUCLED-WORKER
## Un serveur ExpressJS pour gérer et poster des boucles sur les forums de jeuxvideo.com.

## Introduction
***Jvc-boucled-worker*** est un serveur Web destiné à automatiser le post des boucles sur [jeuxvideo.com](https://www.jeuxvideo.com/forums). Cet utilitaire vous permet d'intégrer vos comptes JVC, de créer des boucles et de poster quotidiennement des topics.

## Installation
Assurez-vous d'avoir installé [Node.js](https://nodejs.org/fr) avant de continuer.

Après avoir clôné le dépôt dans vos dossiers personnels, ouvrez un terminal à l'emplacement du dépôt et exécutez les commandes suivantes dans l'ordre :

```
npm install
npm run build
```

Le serveur peut maintenant être lancé avec la commande suivante :
```
npm start
```

Pour relancer le serveur plus tard, vous n'aurez qu'à exécuter cette commande.

## Fonctionnement du site
![Formulaire d'ajout de boucle](https://i.imgur.com/KC4ySa0.png)
![Liste des boucles](https://i.imgur.com/WStIG9F.png)
![Liste des comptes](https://i.imgur.com/oetE5Rc.png)

Le site est divisé en cinq *endpoints* :
* */comptes* : page affichant l'ensemble des comptes ajoutés, avec pseudo, statut (*banni* ou non), boucles associées, niveau (si non banni), et permettant d'en ajouter, d'en supprimer et de tous les mettre à jour.
* */boucles* : page affichant l'ensemble des boucles crées, avec nom, heures de posts, comptes associés, statut (*active* ou non), et dernier topic en date.
* */ajout-boucle* : formulaire vous permettant d'ajouter une boucle. Chaque champ à remplir est accompagné d'une infobulle expliquant ce qu'il doit contenir.
* *boucle/```:id```* : affiche les informations de la boucle ```id``` avec possibilité de modifier celles-ci.
* */logs* : page affichant les logs du serveur, indiquant si des erreurs ont été rencontrées durant une opération interne (post de boucle, mise à jour de compte, etc.). Tous les logs ne seront pas affichés ici, les logs détaillés sont à retrouver dans le fichier ```logs/logs.log```.

Le serveur envoie plusieurs fois par jour des requêtes à JVC pour mettre à jour le statut et le niveau des comptes que vous avez associés.

## F.A.Q.

### Les boucles que j'ai créées n'apparaissent pas sur JVC, pourquoi ?
Une boucle ne sera pas postée si aucun compte ne lui est associé ou si tous les comptes associés sont bannis, n'existent plus ou possèdent un nouveau mot de passe. Vérifiez donc d'abord si la liste des comptes est valide. Sinon, regardez dans les logs du site ou dans les logs détaillés disponibles dans le fichier ```logs/logs.log```. Veillez à ce que les messages à poster ne soient pas trop longs pour éviter l'erreur *Message invalide* de JVC.

### Il n'est pas possible de poster une boucle à une fréquence non journalière, hebdomadaire par exemple ?
Non, ce n'est pas possible et je ne pense pas l'implémenter pour l'instant.

### Comment faire pour déployer ce serveur ?
Il existe de multiples plateformes d'hébergement de serveurs ExpressJS en ligne, comme [Heroku](https://www.heroku.com/), [Railway](https://railway.app/) ou [Render](https://render.com/). Les services de ces plateformes sont cependant payants.

### Pourquoi avoir passé autant de temps à coder un serveur destiné à polluer un forum de puceaux, qui ne te rapportera jamais rien et qui ne sera utilisé par personne au monde ?
Parce que je n'ai aucune vie. :)

## Développé par le forumeur Satisfaction/PneuTueur
#!/bin/bash

wrangler_file="wrangler.toml"
current_file="./setup.sh"

# Fonction pour ajouter les bindings au fichier wrangler.toml
append_to_toml() {
  local info="$1"

  echo "" >>"$wrangler_file"
  echo "" >>"$wrangler_file"
  echo "$info" >>"$wrangler_file"

  echo "$current_file : Les informations suivantes ont été ajoutées à $wrangler_file :"
  echo "$info"
}

if [[ ! -f "$wrangler_file" ]]; then
  echo "$current_file : Le fichier $wrangler_file n'existe pas. Fin du programme."
  exit 1
fi

if grep -q '^\[\[d1_databases\]\]' "$wrangler_file" || grep -q '^\[\[kv_namespaces\]\]' "$wrangler_file"; then
  echo "$current_file : Les sections [[d1_databases]] ou [[kv_namespaces]] existent déjà dans $wrangler_file. Veuillez retirer ces bases de données. Fin du programme."
  exit 1
fi

# Création de D1
echo "$current_file : Création de la base de données D1..."
d1_create_info=$(npm run create-d1 2>&1)
# Vérifie si la commande a échoué
if echo "$d1_create_info" | grep -q 'ERROR'; then
  echo "$d1_create_info"
  echo -e "\n$current_file : échec de la création de la base de données D1 (voir message ci-dessus). Fin du programme."
  exit 1
fi
echo "$current_file : Succès. Ajout des informations à $wrangler_file..."
d1_bindings=$(echo "$d1_create_info" | tail -n 4)
append_to_toml "$d1_bindings"

# Ajout des tables dans D1
echo -e "\n$current_file : Écriture dans la base de données D1..."
d1_setup_info=$(npm run setup-d1 2>&1)
# Vérifie si la commande a échoué
if echo "$d1_setup_info" | grep -q 'ERROR'; then
  echo "$d1_setup_info"
  echo -e "\n$current_file : échec de l'écriture (voir message ci-dessus). Fin du programme."
  exit 1
fi
echo "$current_file : Succès."

# Création de KV
echo -e "\n$current_file : Création de la base de données KV..."
kv_info=$(npm run create-kv 2>&1)
# Vérifie si la commande a échoué
if echo "$kv_info" | grep -q 'ERROR'; then
  echo "$kv_info"
  echo -e "\n$current_file : échec de la création de la base de données KV (voir message ci-dessus). Fin du programme."
  exit 1
fi
echo "$current_file : Succès. Ajout des informations à $wrangler_file..."
kv_bindings=$(echo "$kv_info" | tail -n 3)
append_to_toml "$kv_bindings"

echo -e "\n$current_file : Toutes les opérations ont été terminées avec succès. Fin du programme."
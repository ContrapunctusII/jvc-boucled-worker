// Codes renvoyés après une opération invoquant la base de données D1
export const D1_SUCCESS = 0;
export const D1_ERROR = 1;

// Codes renvoyés après une requête
export const REQUEST_SUCCESS = 10;
export const REQUEST_FAIL = 11;

// Codes renvoyés après suppression d'une entité de la base de données
export const DELETION_SUCCESS = 20;
export const DELETION_FAIL = 21;

// Codes renvoyés après mise à jour d'une entité dans la base de données
export const UPDATE_SUCCESS = 30;
export const UPDATE_FAIL = 31;

// Codes renvoyés après une tentative de connexion
export const LOGIN_SUCCESS = 40;
export const LOGIN_FAIL = 41;

// Codes renvoyés après une mise à jour des paramètres du worker
export const VALID_PROXY = 50; // proxy valide
export const INVALID_PROXY_URL = 51; // URL du proxy invalide : mal formatée ou site qui n'est pas un proxy ou site inaccessible
export const NOT_VERCEL_PROXY = 52; // site pas hebergé sur vercel
export const PROXY_CHECK_FAIL = 53; // échec de la vérification du proxy

// Codes renvoyés après une opération invoquant la base de données KV
export const KV_SUCCESS = 60;
export const KV_ERROR = 61;

// Codes renvoyés après ajout d'une entité dans la base de données
export const ADDING_SUCCESS = 70;
export const ADDING_FAIL = 71;

// Codes renvoyés après un ajout de compte
export const INEXISTENT_ACCOUNT = 102; // le compte JVC n'existe pas
export const WRONG_PASSWORD = 103; // le mot de passe fourni est incorrect
export const ACCOUNT_ALREADY_REGISTERED = 104; // le compte est déjà présent dans la base de données
export const JVC_COOLDOWN = 105; // JVC a exigé un cooldown lors de la connexion

// Codes renvoyés après un ajout de boucle
export const LOOP_NAME_REDUNDANT = 202; // une boucle portant ce nom existe déjà
export const LOOP_TIME_REDUNDANT = 203; // une boucle a déjà été programmée à cet horaire
export const INEXISTENT_LOOP_FORUM = 204; // le forum d'ID renseigné n'existe pas
export const EMPTY_LOOP_DATA = 205; // la boucle contient des informations vides ou un titre de moins de trois caractères
export const INVALID_CHAR = 206; // les champs titre, message principal ou réponse contiennent un caractère invalide pour JVC
export const ONLY_NON_STANDARD_CHARS_IN_TITLE = 207; // le titre ne contient aucun caractère alphanumérique

// Codes renvoyés après un post de topic ou de réponse
export const POST_SUCCESS = 300; // succès
export const POST_FAIL = 301; // erreur inconnue
export const NO_ACCOUNT_AVAILABLE = 302; // il n'y a pas de compte non-banni ou existant parmi les comptes de la boucle
export const TOPIC_DELETED = 303; // le topic de la boucle a été supprimé
export const ACCOUNT_BANNED = 304; // le compte utilisé pour le post a été banni
export const NOT_CONNECTED = 305; // le compte n'est pas connecté pour une raison inconnue (ce qui n'arrive jamais dans les faits)
export const RESOURCE_UNAVAILABLE = 306; // si le forum associé à la boucle n'existe pas (ce qui ne peut arriver qu'après une intervention manuelle dans la base de données)
export const INSUFFICIENT_LEVEL = 307; // le compte a atteint sa limite de messages/topics quotidiens
export const POSTER_TOO_FAST = 308; // le compte a déjà posté il y a peu
export const ALL_ACCOUNTS_USED = 309; // tous les comptes de la boucle ont été bannis ou sont devenus indisponibles durant le post de la boucle
export const TOO_MANY_RETRIES = 310; // trop de réessais pour un même compte
export const JVC_ALERT = 312; // JVC a renvoyé une alerte (comme message invalide)
export const JVC_WARNING = 313; // JVC a renvoyé un avertissement
export const JVC_CAPTCHA = 314; // JVC exige de remplir un captcha : cooldown

// URLs diverses
export const PROFILE_URL = 'https://www.jeuxvideo.com/profil/*?mode=infos'; // Lien menant vers profil JVC : remplacer * par le pseudo en lettres minuscules
export const TEST_URL_FORUM = 'https://www.jeuxvideo.com/forums/0-5100-0-1-0-1-0-micromachines-turbo-tournament-96.htm'; // forum test pour voir si un compte a un niveau suffisant pour poster un topic
export const TEST_URL_TOPIC = 'https://www.jeuxvideo.com/forums/42-5100-74631456-1-0-1-0-je-poste-depuis-javascript.htm'; // topic test pour voir si un compte a un niveau suffisant pour poster un message
export const DEFAULT_FORUM_URL = 'https://www.jeuxvideo.com/forums.htm'; // Lien vers lequel est dirigée toute requête GET vers un forum inexistant

// Sélecteurs CSS
export const ALERT_DIV_SELECTOR = 'div.alert-danger'; // div contenant un message d'erreur après une requête POST à JVC
export const WARNING_DIV_SELECTOR = 'div.alert-warning'; // div contennat un message d'avertissement après une requête à JVC (typiquement : niveau insuffisant)
export const TOPIC_FORM_SELECTOR = 'form.js-form-post-topic'; // formulaire contenant les inputs cachés utilisées lors d'un post de topic
export const MSG_FORM_SELECTOR = 'form.js-form-post-message'; // formulaire contenant les inputs cachés utilisées lors d'un post de message
export const LEVEL_SELECTOR = '.user-level .ladder-link'; // span contenant le niveau JVC sur une page de profil

// Constantes concernant une boucle
export const MIN_TOPIC_TITLE_LENGTH = 3; // nombre minimal de caractères que doit inclure un titre de topic
export const MAX_TIMES_PER_LOOP = 12; // nombre maximal d'horaires quotidiens que l'on peut ajouter à une boucle
export const MAX_ACCOUNTS_PER_LOOP = 50; // nombre maximal de comptes que l'on peut ajouter à une boucle
export const MAX_ANSWERS_PER_LOOP = 10; // nombre maximal de réponses que l'on peut ajouter à une boucle
export const DELAY_BETWEEN_LOOP_POSTS_IN_MINUTES = 30; // délai minimal séparant deux horaires de post pour chaque boucle. Si vous modifiez cette valeur, n'oubliez pas de changer le cron associé dans wrangler.toml

// Constantes concernant le post d'une boucle
export const POST_RETRY_TIMEOUT = 25000; // délai de timeout avant le réessai d'un post (il y a réessai quand une erreur ne nécessitant pas le changement de compte est rencontrée, comme POSTER_TOO_FAST) 
export const POST_MAX_RETRIES_NUMBER = 2; // nombre maximal de réessai par compte

// Constantes diverses
export const UPDATE_DELAY_BETWEEN_REQUESTS_MS = 40; // délai d'attente entre chaque requête visant à obtenir les dernières informations sur un compte JVC pour éviter d'être ralenti par JVC
// regex visant à retirer les emojis avant de chercher pour de potentiels caractères invalides dans les champs JVC des boucles, car les emojis sont acceptés par JVC
export const EMOJI_REGEX = /©|®|‼|⁉|™|ℹ|[↔-↙]|↩|↪|⌚|⌛|⌨|⏏|[⏩-⏳]|[⏸-⏺]|Ⓜ|▪|▫|▶|◀|[◻-◾]|[☀-☄]|☎|☑|☔|☕|☘|☝|☠|☢|☣|☦|☪|☮|☯|[☸-☺]|♀|♂|[♈-♓]|♟|♠|♣|♥|♦|♨|♻|♾|♿|[⚒-⚔]|⚕|⚖|⚗|⚙|⚛|⚜|⚠|⚡|⚪|⚫|⚰|⚱|⚽|⚾|⛄|⛅|⛈|⛎|⛏|⛑|⛓|⛔|⛩|⛪|[⛰-⛵]|[⛷-⛺]|⛽|✂|✅|[✈-✍]|✏|✒|✔|✖|✝|✡|✨|✳|✴|❄|❇|❌|❎|[❓-❕]|❗|❣|❤|[➕-➗]|➡|➰|➿|⤴|⤵|[⬅-⬇]|⬛|⬜|⭐|⭕|〰|〽|㊗|㊙|\u{1F004}|\u{1F0CF}|\u{1F170}|\u{1F171}|\u{1F17E}|\u{1F17F}|\u{1F18E}|[\u{1F191}-\u{1F19A}]|[\u{1F1E6}-\u{1F1FF}]|\u{1F201}|\u{1F202}|\u{1F21A}|\u{1F22F}|[\u{1F232}-\u{1F23A}]|\u{1F250}|\u{1F251}|[\u{1F300}-\u{1F321}]|[\u{1F324}-\u{1F393}]|\u{1F396}|\u{1F397}|[\u{1F399}-\u{1F39B}]|[\u{1F39E}-\u{1F3F0}]|[\u{1F3F3}-\u{1F3F5}]|[\u{1F3F7}-\u{1F4FD}]|[\u{1F4FF}-\u{1F53D}]|[\u{1F549}-\u{1F54E}]|[\u{1F550}-\u{1F567}]|\u{1F56F}|\u{1F570}|[\u{1F573}-\u{1F579}]|\u{1F57A}|\u{1F587}|[\u{1F58A}-\u{1F58D}]|\u{1F590}|\u{1F595}|\u{1F596}|\u{1F5A4}|\u{1F5A5}|\u{1F5A8}|\u{1F5B1}|\u{1F5B2}|\u{1F5BC}|[\u{1F5C2}-\u{1F5C4}]|[\u{1F5D1}-\u{1F5D3}]|[\u{1F5DC}-\u{1F5DE}]|\u{1F5E1}|\u{1F5E3}|\u{1F5E8}|\u{1F5EF}|\u{1F5F3}|[\u{1F5FA}-\u{1F64F}]|[\u{1F680}-\u{1F6C5}]|[\u{1F6CB}-\u{1F6D0}]|\u{1F6D1}|\u{1F6D2}|\u{1F6D5}|[\u{1F6E0}-\u{1F6E5}]|\u{1F6E9}|\u{1F6EB}|\u{1F6EC}|\u{1F6F0}|\u{1F6F3}|[\u{1F6F4}-\u{1F6F6}]|\u{1F6F7}|\u{1F6F8}|\u{1F6F9}|\u{1F6FA}|[\u{1F7E0}-\u{1F7EB}]|[\u{1F90D}-\u{1F90F}]|[\u{1F910}-\u{1F918}]|[\u{1F919}-\u{1F91E}]|\u{1F91F}|[\u{1F920}-\u{1F927}]|[\u{1F928}-\u{1F92F}]|\u{1F930}|\u{1F931}|\u{1F932}|[\u{1F933}-\u{1F93A}]|[\u{1F93C}-\u{1F93E}]|\u{1F93F}|[\u{1F940}-\u{1F945}]|[\u{1F947}-\u{1F94B}]|\u{1F94C}|[\u{1F94D}-\u{1F94F}]|[\u{1F950}-\u{1F95E}]|[\u{1F95F}-\u{1F96B}]|[\u{1F96C}-\u{1F970}]|\u{1F971}|[\u{1F973}-\u{1F976}]|\u{1F97A}|\u{1F97B}|[\u{1F97C}-\u{1F97F}]|[\u{1F980}-\u{1F984}]|[\u{1F985}-\u{1F991}]|[\u{1F992}-\u{1F997}]|[\u{1F998}-\u{1F9A2}]|[\u{1F9A5}-\u{1F9AA}]|\u{1F9AE}|\u{1F9AF}|[\u{1F9B0}-\u{1F9B9}]|[\u{1F9BA}-\u{1F9BF}]|\u{1F9C0}|\u{1F9C1}|\u{1F9C2}|[\u{1F9C3}-\u{1F9CA}]|[\u{1F9CD}-\u{1F9CF}]|[\u{1F9D0}-\u{1F9E6}]|[\u{1F9E7}-\u{1F9FF}]|[\u{1FA70}-\u{1FA73}]|[\u{1FA78}-\u{1FA7A}]|[\u{1FA80}-\u{1FA82}]|[\u{1FA90}-\u{1FA95}]|⌚|⌛|[⏩-⏬]|⏰|⏳|◽|◾|☔|☕|[♈-♓]|♿|⚓|⚡|⚪|⚫|⚽|⚾|⛄|⛅|⛎|⛔|⛪|⛲|⛳|⛵|⛺|⛽|✅|✊|✋|✨|❌|❎|[❓-❕]|❗|[➕-➗]|➰|➿|⬛|⬜|⭐|⭕|\u{1F004}|\u{1F0CF}|\u{1F18E}|[\u{1F191}-\u{1F19A}]|[\u{1F1E6}-\u{1F1FF}]|\u{1F201}|\u{1F21A}|\u{1F22F}|[\u{1F232}-\u{1F236}]|[\u{1F238}-\u{1F23A}]|\u{1F250}|\u{1F251}|[\u{1F300}-\u{1F320}]|[\u{1F32D}-\u{1F335}]|[\u{1F337}-\u{1F37C}]|[\u{1F37E}-\u{1F393}]|[\u{1F3A0}-\u{1F3CA}]|[\u{1F3CF}-\u{1F3D3}]|[\u{1F3E0}-\u{1F3F0}]|\u{1F3F4}|[\u{1F3F8}-\u{1F43E}]|\u{1F440}|[\u{1F442}-\u{1F4FC}]|[\u{1F4FF}-\u{1F53D}]|[\u{1F54B}-\u{1F54E}]|[\u{1F550}-\u{1F567}]|\u{1F57A}|\u{1F595}|\u{1F596}|\u{1F5A4}|[\u{1F5FB}-\u{1F64F}]|[\u{1F680}-\u{1F6C5}]|\u{1F6CC}|\u{1F6D0}|\u{1F6D1}|\u{1F6D2}|\u{1F6D5}|\u{1F6EB}|\u{1F6EC}|[\u{1F6F4}-\u{1F6F6}]|\u{1F6F7}|\u{1F6F8}|\u{1F6F9}|\u{1F6FA}|[\u{1F7E0}-\u{1F7EB}]|[\u{1F90D}-\u{1F90F}]|[\u{1F910}-\u{1F918}]|[\u{1F919}-\u{1F91E}]|\u{1F91F}|[\u{1F920}-\u{1F927}]|[\u{1F928}-\u{1F92F}]|\u{1F930}|\u{1F931}|\u{1F932}|[\u{1F933}-\u{1F93A}]|[\u{1F93C}-\u{1F93E}]|\u{1F93F}|[\u{1F940}-\u{1F945}]|[\u{1F947}-\u{1F94B}]|\u{1F94C}|[\u{1F94D}-\u{1F94F}]|[\u{1F950}-\u{1F95E}]|[\u{1F95F}-\u{1F96B}]|[\u{1F96C}-\u{1F970}]|\u{1F971}|[\u{1F973}-\u{1F976}]|\u{1F97A}|\u{1F97B}|[\u{1F97C}-\u{1F97F}]|[\u{1F980}-\u{1F984}]|[\u{1F985}-\u{1F991}]|[\u{1F992}-\u{1F997}]|[\u{1F998}-\u{1F9A2}]|[\u{1F9A5}-\u{1F9AA}]|\u{1F9AE}|\u{1F9AF}|[\u{1F9B0}-\u{1F9B9}]|[\u{1F9BA}-\u{1F9BF}]|\u{1F9C0}|\u{1F9C1}|\u{1F9C2}|[\u{1F9C3}-\u{1F9CA}]|[\u{1F9CD}-\u{1F9CF}]|[\u{1F9D0}-\u{1F9E6}]|[\u{1F9E7}-\u{1F9FF}]|[\u{1FA70}-\u{1FA73}]|[\u{1FA78}-\u{1FA7A}]|[\u{1FA80}-\u{1FA82}]|[\u{1FA90}-\u{1FA95}]|[\u{1F3FB}-\u{1F3FF}]|☝|⛹|[✊-✍]|\u{1F385}|[\u{1F3C2}-\u{1F3C4}]|\u{1F3C7}|[\u{1F3CA}-\u{1F3CC}]|\u{1F442}|\u{1F443}|[\u{1F446}-\u{1F450}]|[\u{1F466}-\u{1F478}]|\u{1F47C}|[\u{1F481}-\u{1F483}]|[\u{1F485}-\u{1F487}]|\u{1F48F}|\u{1F491}|\u{1F4AA}|\u{1F574}|\u{1F575}|\u{1F57A}|\u{1F590}|\u{1F595}|\u{1F596}|[\u{1F645}-\u{1F647}]|[\u{1F64B}-\u{1F64F}]|\u{1F6A3}|[\u{1F6B4}-\u{1F6B6}]|\u{1F6C0}|\u{1F6CC}|\u{1F90F}|\u{1F918}|[\u{1F919}-\u{1F91E}]|\u{1F91F}|\u{1F926}|\u{1F930}|\u{1F931}|\u{1F932}|[\u{1F933}-\u{1F939}]|[\u{1F93C}-\u{1F93E}]|\u{1F9B5}|\u{1F9B6}|\u{1F9B8}|\u{1F9B9}|\u{1F9BB}|[\u{1F9CD}-\u{1F9CF}]|[\u{1F9D1}-\u{1F9DD}]|‍|⃣|\uFE0F|[\u{1F1E6}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|[\u{1F9B0}-\u{1F9B3}]|[\u{E0020}-\u{E007F}]|©|®|‼|⁉|™|ℹ|[↔-↙]|↩|↪|⌚|⌛|⌨|⎈|⏏|[⏩-⏳]|[⏸-⏺]|Ⓜ|▪|▫|▶|◀|[◻-◾]|[☀-☄]|★|[☇-☍]|☎|☏|☐|☑|☒|☔|☕|☖|☗|☘|[☙-☜]|☝|☞|☟|☠|☡|☢|☣|☤|☥|☦|[☧-☩]|☪|[☫-☭]|☮|☯|[☰-☷]|[☸-☺]|[☻-☿]|♀|♁|♂|[♃-♇]|[♈-♓]|[♔-♞]|♟|♠|♡|♢|♣|♤|♥|♦|♧|♨|[♩-♺]|♻|♼|♽|♾|♿|[⚀-⚅]|⚐|⚑|[⚒-⚔]|⚕|⚖|⚗|⚘|⚙|⚚|⚛|⚜|[⚝-⚟]|⚠|⚡|[⚢-⚩]|⚪|⚫|[⚬-⚯]|⚰|⚱|[⚲-⚼]|⚽|⚾|[⚿-⛃]|⛄|⛅|⛆|⛇|⛈|[⛉-⛍]|⛎|⛏|⛐|⛑|⛒|⛓|⛔|[⛕-⛨]|⛩|⛪|[⛫-⛯]|[⛰-⛵]|⛶|[⛷-⛺]|⛻|⛼|⛽|[⛾-✁]|✂|✃|✄|✅|[✈-✍]|✎|✏|✐|✑|✒|✔|✖|✝|✡|✨|✳|✴|❄|❇|❌|❎|[❓-❕]|❗|❣|❤|[❥-❧]|[➕-➗]|➡|➰|➿|⤴|⤵|[⬅-⬇]|⬛|⬜|⭐|⭕|〰|〽|㊗|㊙|[\u{1F000}-\u{1F003}]|\u{1F004}|[\u{1F005}-\u{1F0CE}]|\u{1F0CF}|[\u{1F0D0}-\u{1F0FF}]|[\u{1F10D}-\u{1F10F}]|\u{1F12F}|[\u{1F16C}-\u{1F16F}]|\u{1F170}|\u{1F171}|\u{1F17E}|\u{1F17F}|\u{1F18E}|[\u{1F191}-\u{1F19A}]|[\u{1F1AD}-\u{1F1E5}]|\u{1F201}|\u{1F202}|[\u{1F203}-\u{1F20F}]|\u{1F21A}|\u{1F22F}|[\u{1F232}-\u{1F23A}]|[\u{1F23C}-\u{1F23F}]|[\u{1F249}-\u{1F24F}]|\u{1F250}|\u{1F251}|[\u{1F252}-\u{1F2FF}]|[\u{1F300}-\u{1F321}]|\u{1F322}|\u{1F323}|[\u{1F324}-\u{1F393}]|\u{1F394}|\u{1F395}|\u{1F396}|\u{1F397}|\u{1F398}|[\u{1F399}-\u{1F39B}]|\u{1F39C}|\u{1F39D}|[\u{1F39E}-\u{1F3F0}]|\u{1F3F1}|\u{1F3F2}|[\u{1F3F3}-\u{1F3F5}]|\u{1F3F6}|[\u{1F3F7}-\u{1F3FA}]|[\u{1F400}-\u{1F4FD}]|\u{1F4FE}|[\u{1F4FF}-\u{1F53D}]|[\u{1F546}-\u{1F548}]|[\u{1F549}-\u{1F54E}]|\u{1F54F}|[\u{1F550}-\u{1F567}]|[\u{1F568}-\u{1F56E}]|\u{1F56F}|\u{1F570}|\u{1F571}|\u{1F572}|[\u{1F573}-\u{1F579}]|\u{1F57A}|[\u{1F57B}-\u{1F586}]|\u{1F587}|\u{1F588}|\u{1F589}|[\u{1F58A}-\u{1F58D}]|\u{1F58E}|\u{1F58F}|\u{1F590}|[\u{1F591}-\u{1F594}]|\u{1F595}|\u{1F596}|[\u{1F597}-\u{1F5A3}]|\u{1F5A4}|\u{1F5A5}|\u{1F5A6}|\u{1F5A7}|\u{1F5A8}|[\u{1F5A9}-\u{1F5B0}]|\u{1F5B1}|\u{1F5B2}|[\u{1F5B3}-\u{1F5BB}]|\u{1F5BC}|[\u{1F5BD}-\u{1F5C1}]|[\u{1F5C2}-\u{1F5C4}]|[\u{1F5C5}-\u{1F5D0}]|[\u{1F5D1}-\u{1F5D3}]|[\u{1F5D4}-\u{1F5DB}]|[\u{1F5DC}-\u{1F5DE}]|\u{1F5DF}|\u{1F5E0}|\u{1F5E1}|\u{1F5E2}|\u{1F5E3}|[\u{1F5E4}-\u{1F5E7}]|\u{1F5E8}|[\u{1F5E9}-\u{1F5EE}]|\u{1F5EF}|[\u{1F5F0}-\u{1F5F2}]|\u{1F5F3}|[\u{1F5F4}-\u{1F5F9}]|[\u{1F5FA}-\u{1F64F}]|[\u{1F680}-\u{1F6C5}]|[\u{1F6C6}-\u{1F6CA}]|[\u{1F6CB}-\u{1F6D0}]|\u{1F6D1}|\u{1F6D2}|\u{1F6D3}|\u{1F6D4}|\u{1F6D5}|[\u{1F6D6}-\u{1F6DF}]|[\u{1F6E0}-\u{1F6E5}]|[\u{1F6E6}-\u{1F6E8}]|\u{1F6E9}|\u{1F6EA}|\u{1F6EB}|\u{1F6EC}|[\u{1F6ED}-\u{1F6EF}]|\u{1F6F0}|\u{1F6F1}|\u{1F6F2}|\u{1F6F3}|[\u{1F6F4}-\u{1F6F6}]|\u{1F6F7}|\u{1F6F8}|\u{1F6F9}|\u{1F6FA}|[\u{1F6FB}-\u{1F6FF}]|[\u{1F774}-\u{1F77F}]|[\u{1F7D5}-\u{1F7DF}]|[\u{1F7E0}-\u{1F7EB}]|[\u{1F7EC}-\u{1F7FF}]|[\u{1F80C}-\u{1F80F}]|[\u{1F848}-\u{1F84F}]|[\u{1F85A}-\u{1F85F}]|[\u{1F888}-\u{1F88F}]|[\u{1F8AE}-\u{1F8FF}]|\u{1F90C}|[\u{1F90D}-\u{1F90F}]|[\u{1F910}-\u{1F918}]|[\u{1F919}-\u{1F91E}]|\u{1F91F}|[\u{1F920}-\u{1F927}]|[\u{1F928}-\u{1F92F}]|\u{1F930}|\u{1F931}|\u{1F932}|[\u{1F933}-\u{1F93A}]|[\u{1F93C}-\u{1F93E}]|\u{1F93F}|[\u{1F940}-\u{1F945}]|[\u{1F947}-\u{1F94B}]|\u{1F94C}|[\u{1F94D}-\u{1F94F}]|[\u{1F950}-\u{1F95E}]|[\u{1F95F}-\u{1F96B}]|[\u{1F96C}-\u{1F970}]|\u{1F971}|\u{1F972}|[\u{1F973}-\u{1F976}]|[\u{1F977}-\u{1F979}]|\u{1F97A}|\u{1F97B}|[\u{1F97C}-\u{1F97F}]|[\u{1F980}-\u{1F984}]|[\u{1F985}-\u{1F991}]|[\u{1F992}-\u{1F997}]|[\u{1F998}-\u{1F9A2}]|\u{1F9A3}|\u{1F9A4}|[\u{1F9A5}-\u{1F9AA}]|[\u{1F9AB}-\u{1F9AD}]|\u{1F9AE}|\u{1F9AF}|[\u{1F9B0}-\u{1F9B9}]|[\u{1F9BA}-\u{1F9BF}]|\u{1F9C0}|\u{1F9C1}|\u{1F9C2}|[\u{1F9C3}-\u{1F9CA}]|\u{1F9CB}|\u{1F9CC}|[\u{1F9CD}-\u{1F9CF}]|[\u{1F9D0}-\u{1F9E6}]|[\u{1F9E7}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FA73}]|[\u{1FA74}-\u{1FA77}]|[\u{1FA78}-\u{1FA7A}]|[\u{1FA7B}-\u{1FA7F}]|[\u{1FA80}-\u{1FA82}]|[\u{1FA83}-\u{1FA8F}]|[\u{1FA90}-\u{1FA95}]|[\u{1FA96}-\u{1FFFD}]/gu;
// liste des caractères acceptés par JVC
export const VALID_JVC_CHARACTERS = [" ", "!", "\"", "\n", "\r", "#", "$", "%", "&", "'", "‘", "’", "(", ")", "*", "+", ",", "-", ".", "/", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ":", ";", "<", "=", ">", "?", "@", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "[", "\\\\", "]", "^", "_", "`", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "{", "|", "}", "~", " ", "£", "¥", "§", "©", "«", "®", "°", "±", "²", "³", "´", "µ", "¶", "·", "»", "À", "Á", "Â", "Ã", "Ä", "Å", "Æ", "Ç", "È", "É", "Ê", "Ë", "Ì", "Í", "Î", "Ï", "Ð", "Ñ", "Ò", "Ó", "Ô", "Õ", "Ö", "×", "Ø", "Ù", "Ú", "Û", "Ü", "Ý", "Þ", "ß", "à", "á", "â", "ã", "ä", "å", "æ", "ç", "è", "é", "ê", "ë", "ì", "í", "î", "ï", "ð", "ñ", "ò", "ó", "ô", "õ", "ö", "÷", "ø", "ù", "ú", "û", "ü", "ý", "þ", "ÿ", "Œ", "œ", "‍", "‘", "’", "‚", "‛", "“", "”", "„", "‟", "•", "‣", "…", "‧", "‼", "⁉", "™", "ℹ"];
export const MIN_LEVEL = 2; // niveau minimum que doit posséder un compte pour être ajouté à la base de données, sachant qu'un compte de niveau 1 est sujet à des captchas JVC
export const DELAY_BETWEEN_DATA_UPDATE_IN_HOURS = 6; // durée entre chaque mise à jour de la base de données (mises à jour des comptes, retrait des anciens lastPost et logs). Si vous modifiez cette valeur, n'oubliez pas de changer le cron associé dans wrangler.toml
export const MIN_AGE_OF_OLD_LOG_IN_DAYS = 7; // durée en jours à partir de laquelle un log est considéré comme vieux et doit être retiré de la base de données
export const MIN_AGE_OF_OLD_LASTPOST_IN_DAYS = 14; // durée en jours à partir de laquelle un objet LastPost appartenant à un objet Loop est considéré comme vieux et doit être retiré de la base de données
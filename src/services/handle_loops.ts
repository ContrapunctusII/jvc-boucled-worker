import { logger } from "../classes/Logger.js";
import { Loop, MiniAccount } from "../interfaces/Loop.js";
import { getAccounts, writeAccountsToJSON, getLoops, writeLoopsToJSON } from './utils.js';
import { Forum } from '../classes/Forum.js';
import { INVALID_CHAR, EMPTY_LOOP_DATA, INEXISTENT_LOOP_FORUM, JSON_LOOPS_PATH, FAILED_LOOP_ADDING, LOOP_NAME_REDUNDANT, LOOP_TIME_REDUNDANT } from '../vars.js';
import { v4 as uuidv4 } from 'uuid';


/**
 * Génère une ID unique pour la boucle.
 * 
 * @function
 * @name generateLoopId
 * @kind function
 * @returns {number}
 */
function generateLoopId(): number {
    logger.info('Generating loop id...');
    const uid = uuidv4();
    const id = (parseInt(uid.split('-').slice(-1), 16) + Math.floor(Date.now() * Math.random())).toString().slice(-12).padStart(12, '0');;
    
    logger.info(`Generated id: ${id}`);
    return parseInt(id);
}

interface emptyAttrCheck {
    emptyAttr: boolean;
    attr: string | null;
}

interface invalidCharCheck {
    invalid: boolean;
    attr2: string | null;
}

/**
 * Renvoie true si le titre, le message principal ou l'une des réponses de la boucle contient des caractères
 * interdits par JVC.
 * 
 * @function
 * @name checkInvalidCharacter
 * @kind function
 * @param {Loop} loopObj
 * @returns {invalidCharCheck}
 */
function checkInvalidCharacter(loopObj: Loop): invalidCharCheck {
    const emojiRegex = /©|®|‼|⁉|™|ℹ|[↔-↙]|↩|↪|⌚|⌛|⌨|⏏|[⏩-⏳]|[⏸-⏺]|Ⓜ|▪|▫|▶|◀|[◻-◾]|[☀-☄]|☎|☑|☔|☕|☘|☝|☠|☢|☣|☦|☪|☮|☯|[☸-☺]|♀|♂|[♈-♓]|♟|♠|♣|♥|♦|♨|♻|♾|♿|[⚒-⚔]|⚕|⚖|⚗|⚙|⚛|⚜|⚠|⚡|⚪|⚫|⚰|⚱|⚽|⚾|⛄|⛅|⛈|⛎|⛏|⛑|⛓|⛔|⛩|⛪|[⛰-⛵]|[⛷-⛺]|⛽|✂|✅|[✈-✍]|✏|✒|✔|✖|✝|✡|✨|✳|✴|❄|❇|❌|❎|[❓-❕]|❗|❣|❤|[➕-➗]|➡|➰|➿|⤴|⤵|[⬅-⬇]|⬛|⬜|⭐|⭕|〰|〽|㊗|㊙|\u{1F004}|\u{1F0CF}|\u{1F170}|\u{1F171}|\u{1F17E}|\u{1F17F}|\u{1F18E}|[\u{1F191}-\u{1F19A}]|[\u{1F1E6}-\u{1F1FF}]|\u{1F201}|\u{1F202}|\u{1F21A}|\u{1F22F}|[\u{1F232}-\u{1F23A}]|\u{1F250}|\u{1F251}|[\u{1F300}-\u{1F321}]|[\u{1F324}-\u{1F393}]|\u{1F396}|\u{1F397}|[\u{1F399}-\u{1F39B}]|[\u{1F39E}-\u{1F3F0}]|[\u{1F3F3}-\u{1F3F5}]|[\u{1F3F7}-\u{1F4FD}]|[\u{1F4FF}-\u{1F53D}]|[\u{1F549}-\u{1F54E}]|[\u{1F550}-\u{1F567}]|\u{1F56F}|\u{1F570}|[\u{1F573}-\u{1F579}]|\u{1F57A}|\u{1F587}|[\u{1F58A}-\u{1F58D}]|\u{1F590}|\u{1F595}|\u{1F596}|\u{1F5A4}|\u{1F5A5}|\u{1F5A8}|\u{1F5B1}|\u{1F5B2}|\u{1F5BC}|[\u{1F5C2}-\u{1F5C4}]|[\u{1F5D1}-\u{1F5D3}]|[\u{1F5DC}-\u{1F5DE}]|\u{1F5E1}|\u{1F5E3}|\u{1F5E8}|\u{1F5EF}|\u{1F5F3}|[\u{1F5FA}-\u{1F64F}]|[\u{1F680}-\u{1F6C5}]|[\u{1F6CB}-\u{1F6D0}]|\u{1F6D1}|\u{1F6D2}|\u{1F6D5}|[\u{1F6E0}-\u{1F6E5}]|\u{1F6E9}|\u{1F6EB}|\u{1F6EC}|\u{1F6F0}|\u{1F6F3}|[\u{1F6F4}-\u{1F6F6}]|\u{1F6F7}|\u{1F6F8}|\u{1F6F9}|\u{1F6FA}|[\u{1F7E0}-\u{1F7EB}]|[\u{1F90D}-\u{1F90F}]|[\u{1F910}-\u{1F918}]|[\u{1F919}-\u{1F91E}]|\u{1F91F}|[\u{1F920}-\u{1F927}]|[\u{1F928}-\u{1F92F}]|\u{1F930}|\u{1F931}|\u{1F932}|[\u{1F933}-\u{1F93A}]|[\u{1F93C}-\u{1F93E}]|\u{1F93F}|[\u{1F940}-\u{1F945}]|[\u{1F947}-\u{1F94B}]|\u{1F94C}|[\u{1F94D}-\u{1F94F}]|[\u{1F950}-\u{1F95E}]|[\u{1F95F}-\u{1F96B}]|[\u{1F96C}-\u{1F970}]|\u{1F971}|[\u{1F973}-\u{1F976}]|\u{1F97A}|\u{1F97B}|[\u{1F97C}-\u{1F97F}]|[\u{1F980}-\u{1F984}]|[\u{1F985}-\u{1F991}]|[\u{1F992}-\u{1F997}]|[\u{1F998}-\u{1F9A2}]|[\u{1F9A5}-\u{1F9AA}]|\u{1F9AE}|\u{1F9AF}|[\u{1F9B0}-\u{1F9B9}]|[\u{1F9BA}-\u{1F9BF}]|\u{1F9C0}|\u{1F9C1}|\u{1F9C2}|[\u{1F9C3}-\u{1F9CA}]|[\u{1F9CD}-\u{1F9CF}]|[\u{1F9D0}-\u{1F9E6}]|[\u{1F9E7}-\u{1F9FF}]|[\u{1FA70}-\u{1FA73}]|[\u{1FA78}-\u{1FA7A}]|[\u{1FA80}-\u{1FA82}]|[\u{1FA90}-\u{1FA95}]|⌚|⌛|[⏩-⏬]|⏰|⏳|◽|◾|☔|☕|[♈-♓]|♿|⚓|⚡|⚪|⚫|⚽|⚾|⛄|⛅|⛎|⛔|⛪|⛲|⛳|⛵|⛺|⛽|✅|✊|✋|✨|❌|❎|[❓-❕]|❗|[➕-➗]|➰|➿|⬛|⬜|⭐|⭕|\u{1F004}|\u{1F0CF}|\u{1F18E}|[\u{1F191}-\u{1F19A}]|[\u{1F1E6}-\u{1F1FF}]|\u{1F201}|\u{1F21A}|\u{1F22F}|[\u{1F232}-\u{1F236}]|[\u{1F238}-\u{1F23A}]|\u{1F250}|\u{1F251}|[\u{1F300}-\u{1F320}]|[\u{1F32D}-\u{1F335}]|[\u{1F337}-\u{1F37C}]|[\u{1F37E}-\u{1F393}]|[\u{1F3A0}-\u{1F3CA}]|[\u{1F3CF}-\u{1F3D3}]|[\u{1F3E0}-\u{1F3F0}]|\u{1F3F4}|[\u{1F3F8}-\u{1F43E}]|\u{1F440}|[\u{1F442}-\u{1F4FC}]|[\u{1F4FF}-\u{1F53D}]|[\u{1F54B}-\u{1F54E}]|[\u{1F550}-\u{1F567}]|\u{1F57A}|\u{1F595}|\u{1F596}|\u{1F5A4}|[\u{1F5FB}-\u{1F64F}]|[\u{1F680}-\u{1F6C5}]|\u{1F6CC}|\u{1F6D0}|\u{1F6D1}|\u{1F6D2}|\u{1F6D5}|\u{1F6EB}|\u{1F6EC}|[\u{1F6F4}-\u{1F6F6}]|\u{1F6F7}|\u{1F6F8}|\u{1F6F9}|\u{1F6FA}|[\u{1F7E0}-\u{1F7EB}]|[\u{1F90D}-\u{1F90F}]|[\u{1F910}-\u{1F918}]|[\u{1F919}-\u{1F91E}]|\u{1F91F}|[\u{1F920}-\u{1F927}]|[\u{1F928}-\u{1F92F}]|\u{1F930}|\u{1F931}|\u{1F932}|[\u{1F933}-\u{1F93A}]|[\u{1F93C}-\u{1F93E}]|\u{1F93F}|[\u{1F940}-\u{1F945}]|[\u{1F947}-\u{1F94B}]|\u{1F94C}|[\u{1F94D}-\u{1F94F}]|[\u{1F950}-\u{1F95E}]|[\u{1F95F}-\u{1F96B}]|[\u{1F96C}-\u{1F970}]|\u{1F971}|[\u{1F973}-\u{1F976}]|\u{1F97A}|\u{1F97B}|[\u{1F97C}-\u{1F97F}]|[\u{1F980}-\u{1F984}]|[\u{1F985}-\u{1F991}]|[\u{1F992}-\u{1F997}]|[\u{1F998}-\u{1F9A2}]|[\u{1F9A5}-\u{1F9AA}]|\u{1F9AE}|\u{1F9AF}|[\u{1F9B0}-\u{1F9B9}]|[\u{1F9BA}-\u{1F9BF}]|\u{1F9C0}|\u{1F9C1}|\u{1F9C2}|[\u{1F9C3}-\u{1F9CA}]|[\u{1F9CD}-\u{1F9CF}]|[\u{1F9D0}-\u{1F9E6}]|[\u{1F9E7}-\u{1F9FF}]|[\u{1FA70}-\u{1FA73}]|[\u{1FA78}-\u{1FA7A}]|[\u{1FA80}-\u{1FA82}]|[\u{1FA90}-\u{1FA95}]|[\u{1F3FB}-\u{1F3FF}]|☝|⛹|[✊-✍]|\u{1F385}|[\u{1F3C2}-\u{1F3C4}]|\u{1F3C7}|[\u{1F3CA}-\u{1F3CC}]|\u{1F442}|\u{1F443}|[\u{1F446}-\u{1F450}]|[\u{1F466}-\u{1F478}]|\u{1F47C}|[\u{1F481}-\u{1F483}]|[\u{1F485}-\u{1F487}]|\u{1F48F}|\u{1F491}|\u{1F4AA}|\u{1F574}|\u{1F575}|\u{1F57A}|\u{1F590}|\u{1F595}|\u{1F596}|[\u{1F645}-\u{1F647}]|[\u{1F64B}-\u{1F64F}]|\u{1F6A3}|[\u{1F6B4}-\u{1F6B6}]|\u{1F6C0}|\u{1F6CC}|\u{1F90F}|\u{1F918}|[\u{1F919}-\u{1F91E}]|\u{1F91F}|\u{1F926}|\u{1F930}|\u{1F931}|\u{1F932}|[\u{1F933}-\u{1F939}]|[\u{1F93C}-\u{1F93E}]|\u{1F9B5}|\u{1F9B6}|\u{1F9B8}|\u{1F9B9}|\u{1F9BB}|[\u{1F9CD}-\u{1F9CF}]|[\u{1F9D1}-\u{1F9DD}]|‍|⃣|\uFE0F|[\u{1F1E6}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|[\u{1F9B0}-\u{1F9B3}]|[\u{E0020}-\u{E007F}]|©|®|‼|⁉|™|ℹ|[↔-↙]|↩|↪|⌚|⌛|⌨|⎈|⏏|[⏩-⏳]|[⏸-⏺]|Ⓜ|▪|▫|▶|◀|[◻-◾]|[☀-☄]|★|[☇-☍]|☎|☏|☐|☑|☒|☔|☕|☖|☗|☘|[☙-☜]|☝|☞|☟|☠|☡|☢|☣|☤|☥|☦|[☧-☩]|☪|[☫-☭]|☮|☯|[☰-☷]|[☸-☺]|[☻-☿]|♀|♁|♂|[♃-♇]|[♈-♓]|[♔-♞]|♟|♠|♡|♢|♣|♤|♥|♦|♧|♨|[♩-♺]|♻|♼|♽|♾|♿|[⚀-⚅]|⚐|⚑|[⚒-⚔]|⚕|⚖|⚗|⚘|⚙|⚚|⚛|⚜|[⚝-⚟]|⚠|⚡|[⚢-⚩]|⚪|⚫|[⚬-⚯]|⚰|⚱|[⚲-⚼]|⚽|⚾|[⚿-⛃]|⛄|⛅|⛆|⛇|⛈|[⛉-⛍]|⛎|⛏|⛐|⛑|⛒|⛓|⛔|[⛕-⛨]|⛩|⛪|[⛫-⛯]|[⛰-⛵]|⛶|[⛷-⛺]|⛻|⛼|⛽|[⛾-✁]|✂|✃|✄|✅|[✈-✍]|✎|✏|✐|✑|✒|✔|✖|✝|✡|✨|✳|✴|❄|❇|❌|❎|[❓-❕]|❗|❣|❤|[❥-❧]|[➕-➗]|➡|➰|➿|⤴|⤵|[⬅-⬇]|⬛|⬜|⭐|⭕|〰|〽|㊗|㊙|[\u{1F000}-\u{1F003}]|\u{1F004}|[\u{1F005}-\u{1F0CE}]|\u{1F0CF}|[\u{1F0D0}-\u{1F0FF}]|[\u{1F10D}-\u{1F10F}]|\u{1F12F}|[\u{1F16C}-\u{1F16F}]|\u{1F170}|\u{1F171}|\u{1F17E}|\u{1F17F}|\u{1F18E}|[\u{1F191}-\u{1F19A}]|[\u{1F1AD}-\u{1F1E5}]|\u{1F201}|\u{1F202}|[\u{1F203}-\u{1F20F}]|\u{1F21A}|\u{1F22F}|[\u{1F232}-\u{1F23A}]|[\u{1F23C}-\u{1F23F}]|[\u{1F249}-\u{1F24F}]|\u{1F250}|\u{1F251}|[\u{1F252}-\u{1F2FF}]|[\u{1F300}-\u{1F321}]|\u{1F322}|\u{1F323}|[\u{1F324}-\u{1F393}]|\u{1F394}|\u{1F395}|\u{1F396}|\u{1F397}|\u{1F398}|[\u{1F399}-\u{1F39B}]|\u{1F39C}|\u{1F39D}|[\u{1F39E}-\u{1F3F0}]|\u{1F3F1}|\u{1F3F2}|[\u{1F3F3}-\u{1F3F5}]|\u{1F3F6}|[\u{1F3F7}-\u{1F3FA}]|[\u{1F400}-\u{1F4FD}]|\u{1F4FE}|[\u{1F4FF}-\u{1F53D}]|[\u{1F546}-\u{1F548}]|[\u{1F549}-\u{1F54E}]|\u{1F54F}|[\u{1F550}-\u{1F567}]|[\u{1F568}-\u{1F56E}]|\u{1F56F}|\u{1F570}|\u{1F571}|\u{1F572}|[\u{1F573}-\u{1F579}]|\u{1F57A}|[\u{1F57B}-\u{1F586}]|\u{1F587}|\u{1F588}|\u{1F589}|[\u{1F58A}-\u{1F58D}]|\u{1F58E}|\u{1F58F}|\u{1F590}|[\u{1F591}-\u{1F594}]|\u{1F595}|\u{1F596}|[\u{1F597}-\u{1F5A3}]|\u{1F5A4}|\u{1F5A5}|\u{1F5A6}|\u{1F5A7}|\u{1F5A8}|[\u{1F5A9}-\u{1F5B0}]|\u{1F5B1}|\u{1F5B2}|[\u{1F5B3}-\u{1F5BB}]|\u{1F5BC}|[\u{1F5BD}-\u{1F5C1}]|[\u{1F5C2}-\u{1F5C4}]|[\u{1F5C5}-\u{1F5D0}]|[\u{1F5D1}-\u{1F5D3}]|[\u{1F5D4}-\u{1F5DB}]|[\u{1F5DC}-\u{1F5DE}]|\u{1F5DF}|\u{1F5E0}|\u{1F5E1}|\u{1F5E2}|\u{1F5E3}|[\u{1F5E4}-\u{1F5E7}]|\u{1F5E8}|[\u{1F5E9}-\u{1F5EE}]|\u{1F5EF}|[\u{1F5F0}-\u{1F5F2}]|\u{1F5F3}|[\u{1F5F4}-\u{1F5F9}]|[\u{1F5FA}-\u{1F64F}]|[\u{1F680}-\u{1F6C5}]|[\u{1F6C6}-\u{1F6CA}]|[\u{1F6CB}-\u{1F6D0}]|\u{1F6D1}|\u{1F6D2}|\u{1F6D3}|\u{1F6D4}|\u{1F6D5}|[\u{1F6D6}-\u{1F6DF}]|[\u{1F6E0}-\u{1F6E5}]|[\u{1F6E6}-\u{1F6E8}]|\u{1F6E9}|\u{1F6EA}|\u{1F6EB}|\u{1F6EC}|[\u{1F6ED}-\u{1F6EF}]|\u{1F6F0}|\u{1F6F1}|\u{1F6F2}|\u{1F6F3}|[\u{1F6F4}-\u{1F6F6}]|\u{1F6F7}|\u{1F6F8}|\u{1F6F9}|\u{1F6FA}|[\u{1F6FB}-\u{1F6FF}]|[\u{1F774}-\u{1F77F}]|[\u{1F7D5}-\u{1F7DF}]|[\u{1F7E0}-\u{1F7EB}]|[\u{1F7EC}-\u{1F7FF}]|[\u{1F80C}-\u{1F80F}]|[\u{1F848}-\u{1F84F}]|[\u{1F85A}-\u{1F85F}]|[\u{1F888}-\u{1F88F}]|[\u{1F8AE}-\u{1F8FF}]|\u{1F90C}|[\u{1F90D}-\u{1F90F}]|[\u{1F910}-\u{1F918}]|[\u{1F919}-\u{1F91E}]|\u{1F91F}|[\u{1F920}-\u{1F927}]|[\u{1F928}-\u{1F92F}]|\u{1F930}|\u{1F931}|\u{1F932}|[\u{1F933}-\u{1F93A}]|[\u{1F93C}-\u{1F93E}]|\u{1F93F}|[\u{1F940}-\u{1F945}]|[\u{1F947}-\u{1F94B}]|\u{1F94C}|[\u{1F94D}-\u{1F94F}]|[\u{1F950}-\u{1F95E}]|[\u{1F95F}-\u{1F96B}]|[\u{1F96C}-\u{1F970}]|\u{1F971}|\u{1F972}|[\u{1F973}-\u{1F976}]|[\u{1F977}-\u{1F979}]|\u{1F97A}|\u{1F97B}|[\u{1F97C}-\u{1F97F}]|[\u{1F980}-\u{1F984}]|[\u{1F985}-\u{1F991}]|[\u{1F992}-\u{1F997}]|[\u{1F998}-\u{1F9A2}]|\u{1F9A3}|\u{1F9A4}|[\u{1F9A5}-\u{1F9AA}]|[\u{1F9AB}-\u{1F9AD}]|\u{1F9AE}|\u{1F9AF}|[\u{1F9B0}-\u{1F9B9}]|[\u{1F9BA}-\u{1F9BF}]|\u{1F9C0}|\u{1F9C1}|\u{1F9C2}|[\u{1F9C3}-\u{1F9CA}]|\u{1F9CB}|\u{1F9CC}|[\u{1F9CD}-\u{1F9CF}]|[\u{1F9D0}-\u{1F9E6}]|[\u{1F9E7}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FA73}]|[\u{1FA74}-\u{1FA77}]|[\u{1FA78}-\u{1FA7A}]|[\u{1FA7B}-\u{1FA7F}]|[\u{1FA80}-\u{1FA82}]|[\u{1FA83}-\u{1FA8F}]|[\u{1FA90}-\u{1FA95}]|[\u{1FA96}-\u{1FFFD}]/gu; // regex pour enlever les emojis avant d'analyser les chaînes de caractères
    const allowedPattern = /^[\x00-\x7F\u00C0-\u00FF\u0152\u0153\u0178\u20AC\u00A3\u00A5\u0024\u0026]*$/;

    if (!allowedPattern.test(loopObj.title.replace(emojiRegex, ''))) {
        return { invalid: true, attr2: 'titre'};
    }
    if (!allowedPattern.test(loopObj.first_message.replace(emojiRegex, ''))) {
        return { invalid: true, attr2: 'message principal'};
    }
    for (let i = 0; i < loopObj.answers.length; i++) {
        const answer = loopObj.answers[i];
        if (!allowedPattern.test(answer.text.replace(emojiRegex, ''))) {
            return { invalid: true, attr2: `réponse ${i + 1}` };
        }
    }
    return { invalid: false, attr2: null };
}

/**
 * Renvoie true si l'un des attributs textuels obligatoires est vide.
 * 
 * @function
 * @name checkEmptyAttributes
 * @kind function
 * @param {Loop} loopObj
 * @returns {emptyAttrCheck}
 */
function checkEmptyAttributes(loopObj: Loop): emptyAttrCheck {
    if (loopObj.name.trim() === '') {
        return { emptyAttr: true, attr: 'nom' };
    }
    if (loopObj.title.trim() === '') {
        return { emptyAttr: true, attr: 'titre'};
    }
    if (loopObj.first_message.trim() === '') {
        return { emptyAttr: true, attr: 'message principal'};
    }
    for (let i = 0; i < loopObj.answers.length; i++) {
        const answer = loopObj.answers[i];
        if (answer.text.trim() === '') {
            return { emptyAttr: true, attr: `réponse ${i + 1}` };
        }
    }
    return { emptyAttr: false, attr: null };
}

interface checkLoopRes {
    sameName: boolean,
    sameTime: boolean,
    duplicateTime: string | null,
    duplicateTimeLoop: Loop | null
};

/**
 * Ajoute la boucle à l'attribut loops des comptes enregistrés concernés.
 * 
 * @async
 * @function
 * @name addLoopToAccounts
 * @kind function
 * @param {Loop} loopObj
 * @returns {Promise<number>}
 */
async function addLoopToAccounts(loopObj: Loop): Promise<number> {
    logger.info('Adding loop to concerned accounts...');
    const accounts = await getAccounts();
    const ids = loopObj.accounts.map((a: MiniAccount) => a.id);
    for (const account of accounts) {
        if (ids.includes(account.id)) {
            account.loops.push({ id: loopObj.id, name: loopObj.name });
        }
    }

    const code = await writeAccountsToJSON(accounts);
    return code;
}

/**
 * Fonction permettant de savoir si le nom de la boucle est déjà pris ou si les heures renseignées sont déjà assignées
 * à une autre boucle (on ne peut poster deux boucles simultanément).
 * 
 * @async
 * @function
 * @name checkLoopRedundancy
 * @kind function
 * @param {Loop} loopObj
 * @param {boolean} isAnUpdate?
 * @returns {Promise<checkLoopRes>}
 */
async function checkLoopRedundancy(loopObj: Loop, isAnUpdate: boolean = false): Promise<checkLoopRes> {
    logger.info('Checking if loop already exists...');
    try {
        const sameName = isAnUpdate ? await getLoops(l => l.name === loopObj.name && l.id !== loopObj.id) : await getLoops(l => l.name === loopObj.name);
        if (sameName.length > 0) {
            logger.warn(`Loop is redundant by name.`);
            return { sameName: true, sameTime: null, duplicateTime: null, duplicateTimeLoop: null};
        }

        const loops = isAnUpdate ? await getLoops(l => l.id !== loopObj.id) : await getLoops();
        for (const loop of loops) {
            const duplicateTime = loop.times.find(element => loopObj.times.includes(element));
            if (duplicateTime !== undefined) {
                const duplicateTimeLoop = loop;

                logger.warn(`Loop is redundant by time ${duplicateTime} with ${JSON.stringify(duplicateTimeLoop)}`);
                return { sameName: false, sameTime: true, duplicateTime: duplicateTime, duplicateTimeLoop: duplicateTimeLoop };
            }
        }
        logger.info(`Loop is not redundant.`);

        return { sameName: false, sameTime: false, duplicateTime: null, duplicateTimeLoop: null } ;
    } catch (err) {
        logger.error(`Error reading or parsing ${JSON_LOOPS_PATH}: ${err}`, true);
        return { sameName: null, sameTime: null, duplicateTime: null, duplicateTimeLoop: null } ;
    }
}

async function doesForumExist(forumId: number): Promise<boolean | null> {
    logger.info(`Checking if forum ${forumId} exist...`);
    try {
        const forum = await Forum.create(forumId);
        const answer = await forum.doesForumExist();
        logger.info(`Does forum exist: ${answer}.`);
        return answer;
    } catch (err) {
        logger.error(`Error while checking: ${err}.`, true);
        return null;
    }
}

/**
 * Mets à jour le fichier loops.json pour ajouter ou modifier une boucle
 * 
 * @async
 * @function
 * @name saveLoop
 * @kind function
 * @param {Loop} loopObj
 * @param {boolean} isAnUpdate? : si true, l'objet est modifié dans le fichier et non pas ajouté
 * @returns {Promise<number>}
 */
async function saveLoop(loopObj: Loop, isAnUpdate: boolean = false): Promise<number> {
    logger.info(`Saving loop ${JSON.stringify(loopObj)} to ${JSON_LOOPS_PATH}.`);
    const loops = await getLoops();
    if (isAnUpdate) {
        const index = loops.findIndex(l => l.id === loopObj.id);
        loops[index] = loopObj;
    } else {
        loops.push(loopObj);
    }

    const code = await writeLoopsToJSON(loops);
    return code;
}

interface LoopHandlingResult {
    infos: {[k: string]: any},
    code: number
}

interface RouterLoopResult {
    resultStr: string,
    statusCode: number
}

/**
 * Renvoie le code de la réponse et le message de la réponse renvoyée au client en fonction du code renvoyé par
 * le processus d'ajout de la boucle.
 * 
 * @function
 * @name handleProcessCodeForRouter
 * @kind function
 * @param {LoopHandlingResult} res
 * @param {boolean} wasAnUpdate?
 * @returns {RouterLoopResult}
 */
function handleLoopProcessCodeForRouter(res: LoopHandlingResult, wasAnUpdate = false): RouterLoopResult {
    var resultStr: string;
    var statusCode: number;

    switch (res.code) {
        case INEXISTENT_LOOP_FORUM:
            resultStr = `Échec de la requête : le forum d'ID ${res.infos.forumId} n'existe pas.`;
            statusCode = 404;
            break;
        case LOOP_NAME_REDUNDANT:
            resultStr = `Échec de la requête : une boucle du nom de ${res.infos.name} a déjà été programmée.`;
            statusCode = 409;
            break;
        case LOOP_TIME_REDUNDANT:
            resultStr = `Échec de la requête : une boucle (${res.infos.duplicateTimeLoop.name}) a déjà été programmée à l'heure ${res.infos.duplicateTime}.`;
            statusCode = 409;
            break;
        case EMPTY_LOOP_DATA:
            resultStr = `Échec de la requête : attribut "${res.infos.attr}" vide.`;
            statusCode = 409;
            break;
        case INVALID_CHAR:
            resultStr = `Échec de la requête : l'attribut "${res.infos.attr2}" contient un caractère invalide que JVC n'autorise pas.`;
            statusCode = 409;
            break;
        case FAILED_LOOP_ADDING:
            resultStr = 'Échec de la requête : raison inconnue (voir les logs).';
            statusCode = 500;
            break;
        default:
            resultStr = wasAnUpdate ? `Succès de la requête : boucle ${res.infos.name} mise à jour avec succès.` : `Succès de la requête : boucle ${res.infos.name} créée avec succès.`;
            statusCode = 200;
            break;
        }

    return { resultStr: resultStr, statusCode: statusCode };
}

export { LoopHandlingResult, doesForumExist, saveLoop, checkEmptyAttributes, checkInvalidCharacter,
    checkLoopRedundancy, generateLoopId, addLoopToAccounts, handleLoopProcessCodeForRouter };
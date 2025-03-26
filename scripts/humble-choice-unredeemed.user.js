// ==UserScript==
// @name        Humble Choice - Unredeemed Games to Markdown
// @namespace   github.com/Decicus
// @match       https://www.humblebundle.com/subscription/*-*
// @match       https://www.humblebundle.com/membership/*-*
// @grant       GM_setClipboard
// @grant       GM_openInTab
// @grant       GM_addStyle
// @grant       unsafeWindow
// @version     1.6.0
// @downloadURL https://raw.githubusercontent.com/Decicus/userstuff/master/scripts/humble-choice-unredeemed.user.js
// @updateURL   https://raw.githubusercontent.com/Decicus/userstuff/master/scripts/humble-choice-unredeemed.user.js
// @author      Decicus
// @description Grabs a list of the _unredeemed_ Humble Choice games with DRM (e.g. Steam), game title and month/bundle. This does NOT request a key or gift link.
// ==/UserScript==

/**
 * We make a GET request to the same page we're currently visiting.
 * The reason for this is simply to fetch the JSON object that's embedded into the DOM.
 * Usually this JSON object is removed from the DOM too quickly for us to grab it by the time the script runs,
 * so this code works around that problem.
 */
async function getProductData()
{
    const response = await fetch(window.location.href);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const productDataElement = doc.querySelector('#webpack-monthly-product-data');
    let productData = null;
    if (productDataElement) {
        productData = JSON.parse(productDataElement.textContent.trim());
        console.log(productData);
    }

    return productData;
}

const choicesStorageKey = 'storedChoices';
function getChoicesStore()
{
    const choices = unsafeWindow.localStorage.getItem(choicesStorageKey);

    if (!choices) {
        return {};
    }

    return JSON.parse(choices);
}

function setChoicesStore(choices)
{
    unsafeWindow.localStorage.setItem(choicesStorageKey, JSON.stringify(choices));

    console.log('Stored choices:', choices);
    return choices;
}

function refreshChoiceData()
{
    let interval = null;
    const slugs = Object.keys(getChoicesStore());

    let lastIdx = -1;
    interval = setInterval(() => {
        lastIdx++;
        if (!slugs[lastIdx]) {
            clearInterval(interval);
            return;
        }

        const slug = slugs[lastIdx];
        const url = `https://www.humblebundle.com/membership/${slug}`;

        const choiceTab = GM_openInTab(url, {active: false});

        setTimeout(() => {
            if (choiceTab) {
                choiceTab.close();
            }
        }, 3500);
    }, 7500);
}

// Special key that's handled by games.alex.lol
const extendedDataKey = 'meta_extended_data';
async function extractChoices()
{
    const productData = await getProductData();
    if (!productData) {
        console.error('Unable to find productData dump in DOM');
        return;
    }

    const data = productData.contentChoiceOptions;

    /**
     * User does not have access to choices
     * Usually for months that have been skipped/cancelled.
     */
    if (!data.unlockedContentEvents || data.unlockedContentEvents.length === 0) {
        console.log('Not unlocked');
        return;
    }

    /**
     * If `extractChoices()` is re-called after the initial load
     * We make sure to remove the buttons and then re-add them to the DOM.
     *
     * It's an easy fix to prevent duplicating buttons.
     */
    const buttonIds = ['copyGamesHtml', 'copyMonthJson', 'copyGamesJson'];
    for (const buttonId of buttonIds) {
        const btn = document.querySelector(`#${buttonId}`);

        if (!btn) {
            continue;
        }

        btn.remove();
    }

    const choices = data.contentChoiceData;

    const initialKey = 'initial';
    const initial = choices.initial || choices.game_data || choices['initial-get-all-games'];

    if (!initial) {
        console.error('Could not find initial data via choices:', choices);
        return;
    }

    const order = choices.display_order || initial.display_order;
    const extras = choices.extras || initial.extras;
    const games = initial.content_choices || initial;
    const redeemedChoices = data.contentChoicesMade;
    const monthTitle = data.title;
    const monthSlug = data.productUrlPath;

    let redeemedGames = [];
    if (redeemedChoices && redeemedChoices[initialKey] && redeemedChoices[initialKey].choices_made) {
        redeemedGames = redeemedChoices[initialKey].choices_made;
    }

    /**
     * We don't want random HTML tags to screw up the output.
     */
    const removeTags = /<\/?(html|head|body|summary|details)>/gi;
    const allGamesData = {};

    let html = `<div id="${monthSlug}">\n<h2><i class="fas fa-calendar-alt fa-fw fa-1x"></i> ${monthTitle}</h2>\n`;
    let titleListHtml = `<!-- ${monthTitle} -->\n`;

    for (const gameId of order) {
        // Ignore redeemed games
        if (redeemedGames.includes(gameId)) {
            continue;
        }

        const game = games[gameId];
        let { title, description } = game;
        title = title.trim();
        description = description.replace(removeTags, '').trim();
        description = description.replaceAll(' style="width: 628px; height: 183px;"', '');

        const fullSlug = `${monthSlug}-${gameId}`;
        titleListHtml += `<li><a href="#${fullSlug}">${title}</a></li>\n`;
        html += `<hr />\n<h3 id="${fullSlug}">${title}</h3>\n`;

        const gameData = {
            htmlDescription: description,
            title,
            slug: fullSlug,
        };

        /**
         * `tpkds` is not the same format as `nested_choice_tpkds`
         * So we need to check if it's an array or not.
         *
         * What a painful life to live.
         */
        let tpkds = game.tpkds || null;
        let providers = {};
        if (tpkds) {
            /**
             * Add Steam store link
             */
            const steam = tpkds.find(tpk => tpk.key_type === 'steam');
            if (steam) {
                const steamAppId = steam.steam_app_id;
                html += `<p><a href="https://store.steampowered.com/app/${steamAppId}/"><i class="fab fa-steam fa-1x fa-fw"></i> Steam Store</a></p>\n`;

                const expires = steam['expiration_date|datetime'];

                providers.steam = {
                    appId: steamAppId,
                    expiry: {
                        expiresDatetime: expires,
                        currentDate: Date.now(),
                        expiresInDay: steam.num_days_until_expired,
                        isExpired: steam.is_expired,
                    },
                    countries: {
                        exclusive: steam.exclusive_countries || [],
                        disallowed: steam.disallowed_countries || [],
                    },
                    displayName: steam.human_name || '',
                    customInstructionsHtml: steam.custom_instructions_html || '',
                };
            }

            // GOG.com
            const gog = tpkds.find(tpk => tpk.key_type === 'gog');
            if (gog) {
                html += `<p>GOG</p>\n`;

                providers.gog = {
                    hasKey: true,
                    raw: gog,
                };
            }

            const origin = tpkds.find(tpk => tpk.key_type === 'origin');
            if (origin) {
                const expires = origin['expiration_date|datetime'];

                providers.origin = {
                    expiry: {
                        expiresDatetime: expires,
                        currentDate: Date.now(),
                        expiresInDay: origin.num_days_until_expired,
                        isExpired: origin.is_expired,
                    },
                    countries: {
                        exclusive: origin.exclusive_countries || [],
                        disallowed: origin.disallowed_countries || [],
                    },
                    displayName: origin.human_name || '',
                    customInstructionsHtml: origin.custom_instructions_html || '',
                };
            }
        }

        /**
         * Janky format used when there are multiple redeem options (usually Steam + EGS)
         */
        const nestedTpkds = game.nested_choice_tpkds || null;
        if (nestedTpkds) {
            for (const providerSlug of Object.keys(nestedTpkds)) {
                const provider = nestedTpkds[providerSlug];

                /**
                 * Add Steam store link
                 */
                const steam = provider.find(tpk => tpk.key_type === 'steam');
                if (steam) {
                    const steamAppId = steam.steam_app_id;
                    html += `<p><a href="https://store.steampowered.com/app/${steamAppId}/"><i class="fab fa-steam fa-1x fa-fw"></i> Steam Store</a></p>\n`;

                    providers.steam = {
                        appId: steamAppId,
                    };

                    continue;
                }

                const epicGames = provider.find(tpk => tpk.key_type.includes('epic'));
                if (epicGames) {
                    html += `<p>🇪 Epic Games</p>\n`;

                    providers.epicGames = {
                        hasKey: true,
                        countries: {
                            exclusive: epicGames.exclusive_countries || [],
                            disallowed: epicGames.disallowed_countries || [],
                        },
                        displayName: epicGames.human_name || '',
                        customInstructionsHtml: epicGames.custom_instructions_html || '',
                    };

                    continue;
                }

                const gog = provider.find(tpk => tpk.key_type.includes('gog'));
                if (gog) {
                    html += `<p>GOG</p>\n`;

                    providers.gog = {
                        hasKey: true,
                    };

                    continue;
                }
            }
        }

        gameData.providers = providers;
        gameData.platforms = game.platforms || [];

        allGamesData[fullSlug] = gameData;

        html += `<details class="gameDetails"><summary>Game description</summary>\n${description}\n</details>\n\n\n`;
    }

    html += '\n</div>';

    if (extras) {
        const extraData = {};

        for (const extra of extras) {
            const { human_name, icon_path, machine_name } = extra;

            extraData[machine_name] = {
                human_name,
                icon_path,
            };
        }

        allGamesData[extendedDataKey] = {
            extras: extraData,
        };
    }

    /**
     * Save to localStorage
     */
    const storedChoices = getChoicesStore();
    storedChoices[monthSlug] = allGamesData;
    setChoicesStore(storedChoices);

    const buttonLocation = document.querySelector('.button-v2');
    // Button for copying the JSON of all months, with titles, descriptions etc.
    const buttonHtml = `<a id="copyGamesHtml" class="button-v2 return-button owns-content" href="#"><div class="button-icon-container"><i class="hb hb-clipboard button-icon"></i></div><div class="button-text">Copy full JSON</div></a>`;

    // Button for copying just the current month JSON
    const monthHtml = `<a id="copyMonthJson" class="button-v2 return-button owns-content" href="#"><div class="button-icon-container"><i class="hb hb-clipboard button-icon"></i></div><div class="button-text">Copy current month JSON</div></a>`;

    buttonLocation.insertAdjacentHTML('beforebegin', monthHtml);
    buttonLocation.insertAdjacentHTML('beforebegin', buttonHtml);

    // Handle button click for copying full HTML
    const button = document.querySelector('#copyGamesHtml');
    button.addEventListener('click', () => {
        // GM_setClipboard(html);
        GM_setClipboard(JSON.stringify(getChoicesStore()));

        const btnText = button.querySelector('.button-text');
        const oldText = btnText.textContent;
        btnText.textContent = 'Copied!';

        button.setAttribute('disabled', '1');

        setTimeout(() => {
            btnText.textContent = oldText;
            button.removeAttribute('disabled');
        }, 2000);
    });

    // Handle button click for copying the JSON data for the month
    // Prefixed with the correct key so that I can easily paste into the existing data.json.
    const monthBtn = document.querySelector('#copyMonthJson');
    monthBtn.addEventListener('click', () => {
        const choices = getChoicesStore();

        let result = null;
        if (choices[monthSlug]) {
            result = choices[monthSlug];
        }

        const clipboardOutput = `,\n"${monthSlug}": ${JSON.stringify(result)}`;
        GM_setClipboard(clipboardOutput);

        const btnText = monthBtn.querySelector('.button-text');
        btnText.textContent = 'Copied!';

        monthBtn.setAttribute('disabled', '1');

        setTimeout(() => {
            btnText.textContent = 'Copy current month JSON';
            monthBtn.removeAttribute('disabled');
        }, 2000);
    });
}

function expandGameGrid()
{
    GM_addStyle(`.monthly-product-page { max-width: 125em; }`);
}

extractChoices();
expandGameGrid();
unsafeWindow.refreshAllChoiceData = refreshChoiceData;
unsafeWindow.getProductData = getProductData;

console.log('[Userscript] Available methods: refreshChoiceData, getProductData');

// ==UserScript==
// @name        Humble Choice - Unredeemed Games to Markdown
// @namespace   github.com/Decicus
// @match       https://www.humblebundle.com/subscription/*-*
// @grant       GM_setClipboard
// @grant       unsafeWindow
// @version     1.2.0
// @downloadURL https://raw.githubusercontent.com/Decicus/userstuff/master/scripts/humble-choice-unredeemed.user.js
// @updateURL   https://raw.githubusercontent.com/Decicus/userstuff/master/scripts/humble-choice-unredeemed.user.js
// @author      Decicus
// @description Grabs a list of the _unredeemed_ Humble Choice games with DRM (e.g. Steam), game title and month/bundle. This does NOT request a key or gift link.
// ==/UserScript==

/**
 * This is eventually removed from the DOM, so we have to extract it as early as possible.
 */
const productDataElement = document.querySelector('#webpack-monthly-product-data');
let productData = null;
if (productDataElement) {
    productData = JSON.parse(productDataElement.textContent.trim());
    console.log(productData);
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

    return choices;
}

function extractChoices()
{
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
    const buttonIds = ['copyGamesHtml', 'copyTitleList', 'copyGamesJson'];
    for (const buttonId of buttonIds) {
        const btn = document.querySelector(`#${buttonId}`);

        if (!btn) {
            continue;
        }

        btn.remove();
    }

    const choices = data.contentChoiceData;

    let initialKey = 'initial';
    if (!choices.initial) {
        initialKey = 'initial-get-all-games';
    }

    const initial = choices[initialKey];

    if (!initial) {
        console.error('Could not find initial data via choices:', choices);
        return;
    }

    const order = initial.display_order;
    const games = initial.content_choices;
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

                providers.steam = {
                    appId: steamAppId,
                };
            }

            // GOG.com
            const gog = tpkds.find(tpk => tpk.key_type === 'gog');
            if (gog) {
                html += `<p>GOG</p>\n`;

                providers.gog = {
                    hasKey: true,
                };
            }
        }

        /**
         * TODO:
         * Handle this janky ass alternative package format.
         */
        // const nestedTpkds = game.nested_choice_tpkds || null;
        // if (nestedTpkds) {
        //     for (const providerSlug in nestedTpkds) {
        //         const provider = nestedTpkds[providerSlug];

        //         /**
        //          * Add Steam store link
        //          */
        //         const steam = providerSlug.includes('_steam');
        //         if (steam) {
        //             const steamAppId = provider.steam_app_id;
        //             html += `<p><a href="https://store.steampowered.com/app/${steamAppId}/"><i class="fab fa-steam fa-1x fa-fw"></i> Steam Store</a></p>\n`;

        //             providers.steam = {
        //                 appId: steamAppId,
        //             };

        //             continue;
        //         }

        //         // Epic Games
        //         const ;
        //         if (gog) {
        //             html += `<p>GOG</p>\n`;

        //             providers.gog = {
        //                 hasKey: true,
        //             };

        //             continue;
        //         }
        //     }
        // }

        gameData.providers = providers;
        gameData.platforms = game.platforms || [];

        allGamesData[fullSlug] = gameData;

        html += `<details class="gameDetails"><summary>Game description</summary>\n${description}\n</details>\n\n\n`;
    }

    html += '\n</div>';

    /**
     * Save to localStorage
     */
    const storedChoices = getChoicesStore();
    storedChoices[monthSlug] = allGamesData;
    setChoicesStore(storedChoices);

    const buttonLocation = document.querySelector('.button-v2');
    // Button for copying the full HTML of titles, descriptions etc.
    const buttonHtml = `<a id="copyGamesHtml" class="button-v2 return-button owns-content" href="#"><div class="button-icon-container"><i class="hb hb-clipboard button-icon"></i></div><div class="button-text">Copy local storage JSON</div></a>`;

    // Button for copying the HTML list (`li`) of titles
    const listHtml = `<a id="copyTitleList" class="button-v2 return-button owns-content" href="#"><div class="button-icon-container"><i class="hb hb-clipboard button-icon"></i></div><div class="button-text">Copy Title List</div></a>`;

    buttonLocation.insertAdjacentHTML('beforebegin', listHtml);
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

    // Handle button click for copying HTML title list
    const listBtn = document.querySelector('#copyTitleList');
    listBtn.addEventListener('click', () => {
        GM_setClipboard(titleListHtml);

        const btnText = listBtn.querySelector('.button-text');
        btnText.textContent = 'Copied!';

        listBtn.setAttribute('disabled', '1');

        setTimeout(() => {
            btnText.textContent = 'Copy Title List';
            listBtn.removeAttribute('disabled');
        }, 2000);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    extractChoices();
});

// ==UserScript==
// @name        Humble Choice - Unredeemed Games to Markdown
// @namespace   github.com/Decicus
// @match       https://www.humblebundle.com/subscription/*-*
// @grant       GM_setClipboard
// @version     1.0.0
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

    const choices = data.contentChoiceData;
    const initial = choices.initial || choices['initial-get-all-games'];

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
    if (redeemedChoices && redeemedChoices.initial && redeemedChoices.initial.choices_made) {
        redeemedGames = redeemedChoices.initial.choices_made;
    }

    /**
     * We don't want random HTML tags to screw up the output.
     */
    const removeTags = /<\/?(html|head|body|summary|details)>/gi;
    let html = `<h2><i class="fas fa-calendar-alt fa-fw fa-1x"></i> ${monthTitle}</h2>\n`;
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

        
        titleListHtml += `<li><a href="#${monthSlug}-${gameId}">${title}</a></li>\n`;
        html += `<hr />\n<h3 id="${monthSlug}-${gameId}">${title}</h3>\n`;
        
        let tpkds = game.tpkds || null;
        if (tpkds) {
            /**
             * Add Steam store link
             */
            const steam = tpkds.find(tpk => tpk.key_type === 'steam');
            if (steam) {
                const steamAppId = steam.steam_app_id;
                html += `<p><a href="https://store.steampowered.com/app/${steamAppId}/"><i class="fab fa-steam fa-1x fa-fw"></i> Steam Store</a></p>\n`;
            }
        }

        html += `<details class="gameDetails"><summary>Game description</summary>\n${description}\n</details>\n\n\n`;
    }

    const buttonLocation = document.querySelector('.button-v2');
    // Button for copying the full HTML of titles, descriptions etc.
    const buttonHtml = `<a id="copyGamesHtml" class="button-v2 return-button owns-content" href="#"><div class="button-icon-container"><i class="hb hb-clipboard button-icon"></i></div><div class="button-text">Copy HTML</div></a>`;

    // Button for copying the HTML list (`li`) of titles
    const listHtml = `<a id="copyTitleList" class="button-v2 return-button owns-content" href="#"><div class="button-icon-container"><i class="hb hb-clipboard button-icon"></i></div><div class="button-text">Copy Title List</div></a>`;

    buttonLocation.insertAdjacentHTML('beforebegin', listHtml);
    buttonLocation.insertAdjacentHTML('beforebegin', buttonHtml);

    // Handle button click for copying full HTML
    const button = document.querySelector('#copyGamesHtml');
    button.addEventListener('click', () => {
        GM_setClipboard(html);
        
        const btnText = button.querySelector('.button-text');
        btnText.textContent = 'Copied!';
        
        button.setAttribute('disabled', '1');
        
        setTimeout(() => {
            btnText.textContent = 'Copy HTML';
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
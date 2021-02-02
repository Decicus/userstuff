// ==UserScript==
// @name        LowEndForums - Blacklist Users
// @namespace   github.com/Decicus
// @match       https://www.lowendtalk.com/discussion/*
// @match       https://talk.lowendspirit.com/discussion/*
// @grant       GM_getValue
// @version     1.2.0
// @author      Decicus
// @description Hides comments (by default) from specified users on LET.
// @downloadURL https://raw.githubusercontent.com/Decicus/userstuff/master/scripts/lowendforums-blacklist-users.user.js
// @updateURL   https://raw.githubusercontent.com/Decicus/userstuff/master/scripts/lowendforums-blacklist-users.user.js
// ==/UserScript==

/**
 * Developed for the userscript manager Violentmonkey, but should work for others too.
 * Make sure to go to the 'values' tab after installing the script and set your list of blacklisted users.
 * It should look like this: https://i.alex.lol/2021-02-02_4UVIPt.png
 *
 * Forum usernames are case sensitive; 'decicus' won't match 'Decicus' and vice versa.
 */
const users = GM_getValue('blacklistedUsers', []);

let commentsHidden = false;
const hiddenElements = {};
let hiddenCount = 0;

let toggleButtonAction = null;

function toggleElements()
{
    /**
     * Flip the status.
     */
    commentsHidden = !commentsHidden;
    
    /**
     * Tweak text based on the *new* hide status
     */
    const hideText = commentsHidden ? 'Hiding' : 'Showing';
    toggleButtonAction.textContent = commentsHidden ? 'Show' : 'Hide';
    
    for (const user of users)
    {
        for (const element of hiddenElements[user])
        {
            console.log(`[LowEndTalk - Blacklist Users] ${hideText} comment from ${user}:`, element);

            if (commentsHidden) {
                element.classList.add('hidden');
                continue;
            }

            element.classList.remove('hidden');
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    for (const user of users)
    {
        /**
         * Find all comments by user
         */
        const elements = Array.from(document.querySelectorAll(`.Author > .PhotoWrap[title="${user}"]`));
        
        hiddenElements[user] = [];
        hiddenCount += elements.length;
        
        for (const element of elements)
        {
            /**
             * We want to hide one of the parent elements... 5 levels up.
             * I'm not ashamed, fuck you.
             */
            const commentElement = element
                // .Author
                .parentElement
                // .AuthorWrap
                .parentElement
                // .Item-Header.CommentHeader
                .parentElement
                // .Comment
                .parentElement
                // .Item.ItemComment.Role_Member
                .parentElement;
            
            hiddenElements[user].push(commentElement);
        }
    }
    
    /**
     * If there are no comments to hide, we skip the rest.
     */
    if (hiddenCount === 0) {
        console.log('[LowEndTalk - Blacklist Users] No comments from blacklist users found');
        return;
    }
    
    /**
     * document.createElement() is far too convoluted for this shit.
     * Just handcraft it.
     */
    const toggleButtonHtml = `
        <div class="Buttons" style="text-align: right;">
            <button class="Button Primary" id="toggleHiddenComments"><span class="action">Show</span> ${hiddenCount} comment${hiddenCount === 1 ? '' : 's'} from blacklisted users</button>
        </div>
    `;

    /**
     * Add the button to the page
     */
    const commentsHeading = document.querySelector('.CommentHeading');
    commentsHeading.insertAdjacentHTML('afterend', toggleButtonHtml);

    /**
     * Add event handler for the button, so it actually works
     */
    const toggleButton = document.querySelector('#toggleHiddenComments');
    toggleButton.addEventListener('click', toggleElements);

    /**
     * Used to allow toggleElements() to set the 'action' on the button.
     * I'll admit that doing it this way is kind of ghetto, but I don't care.
     */
    toggleButtonAction = toggleButton.querySelector('.action');
    
    /**
     * Trigger the function that actually hides the comments
     */
    toggleElements();
});
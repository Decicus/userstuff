// ==UserScript==
// @name        LowEndForums - Blacklist Users
// @namespace   github.com/Decicus
// @match       https://www.lowendtalk.com/*
// @match       https://talk.lowendspirit.com/*
// @grant       GM_getValue
// @grant       GM_setValue
// @version     1.3.0
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
let users = GM_getValue('blacklistedUsers', {
    comments: [],
    threads: [],
});

let settings = GM_getValue('settings', null);

if (!settings) {
    const defaultSettings = {
        hideComments: true,
        hideThreads: false,
    };

    GM_setValue('settings', defaultSettings);
    settings = defaultSettings;
}

/**
 * Convert from old users array to new users _object_
 */
if (Array.isArray(users)) {
    users = {
        comments: users,
        threads: [],
    };

    GM_setValue('blacklistedUsers', users);
}

let commentsHidden = false;
const hiddenComments = {};
let hiddenCommentCount = 0;

let threadsHidden = false;
const hiddenThreads = {};
let hiddenThreadCount = 0;

let toggleCommentsBtnAction = null;
let toggleThreadsBtnAction = null;

function toggleCommentElements()
{
    /**
     * Flip the status.
     */
    commentsHidden = !commentsHidden;
    
    /**
     * Tweak text based on the *new* hide status
     */
    const hideText = commentsHidden ? 'Hiding' : 'Showing';
    toggleCommentsBtnAction.textContent = commentsHidden ? 'Show' : 'Hide';
    
    for (const user of users.comments)
    {
        for (const element of hiddenComments[user])
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

function hideComments()
{
    if (!settings.hideComments) {
        return;
    }

    for (const user of users.comments)
    {
        /**
         * Find all comments by user
         */
        const elements = document.querySelectorAll(`.Author > .PhotoWrap[title="${user}"]`);
        
        hiddenComments[user] = [];
        hiddenCommentCount += elements.length;
        
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
            
            hiddenComments[user].push(commentElement);
        }
    }
    
    /**
     * If there are no comments to hide, we skip the rest.
     */
    if (hiddenCommentCount === 0) {
        console.log('[LowEndTalk - Blacklist Users] No comments from blacklist users found');
        return;
    }
    
    /**
     * document.createElement() is far too convoluted for this shit.
     * Just handcraft it.
     */
    const toggleButtonHtml = `<a href="#" class="Button Secondary Action BigButton" id="toggleHiddenComments"><span class="action">Show</span> ${hiddenCommentCount} comment${hiddenCommentCount === 1 ? '' : 's'} from blacklisted users</a>`;

    /**
     * Add the button to the page
     */
    const commentsHeading = document.querySelector('.CommentHeading');
    commentsHeading.insertAdjacentHTML('afterend', toggleButtonHtml);

    /**
     * Add event handler for the button, so it actually works
     */
    const toggleButton = document.querySelector('#toggleHiddenComments');
    toggleButton.addEventListener('click', toggleCommentElements);

    /**
     * Used to allow toggleCommentElements() to set the 'action' on the button.
     * I'll admit that doing it this way is kind of ghetto, but I don't care.
     */
    toggleCommentsBtnAction = toggleButton.querySelector('.action');
    
    /**
     * Trigger the function that actually hides the comments
     */
    toggleCommentElements();
}

/**
 * Thread handling.
 * Lots of duplicate code from the 'hide comments' handling, but whatever.
 */
function toggleThreadElements()
{
    /**
     * Flip the status.
     */
    threadsHidden = !threadsHidden;
    
    /**
     * Tweak text based on the *new* hide status
     */
    const hideText = threadsHidden ? 'Hiding' : 'Showing';
    toggleThreadsBtnAction.textContent = threadsHidden ? 'Show' : 'Hide';
    
    for (const user of users.threads)
    {
        for (const element of hiddenThreads[user])
        {
            console.log(`[LowEndTalk - Blacklist Users] ${hideText} thread from ${user}:`, element);

            if (threadsHidden) {
                element.classList.add('hidden');
                continue;
            }

            element.classList.remove('hidden');
        }
    }
}

function hideThreads()
{
    if (!settings.hideThreads) {
        return;
    }

    for (const user of users.threads) {
        const elements = document.querySelectorAll(`.ItemDiscussion-withPhoto > .PhotoWrap[title="${user}"]`);

        hiddenThreads[user] = [];
        hiddenThreadCount += elements.length;

        for (const element of elements) {
            const threadElement = element.parentElement;

            hiddenThreads[user].push(threadElement);
        }

        if (hiddenThreadCount === 0) {
            console.log('[LowEndTalk - Blacklist Users] No threads from blacklist users found');
            return;
        }

        const toggleButtonHtml = `<a href="#" class="Button Secondary Action BigButton" id="toggleHiddenThreads"><span class="action">Show</span> ${hiddenThreadCount} thread${hiddenThreadCount === 1 ? '' : 's'} from blacklisted authors</a>`;

        const buttonLocation = document.querySelector('ul.Discussions');
        buttonLocation.insertAdjacentHTML('beforebegin', toggleButtonHtml);

        const toggleButton = document.querySelector('#toggleHiddenThreads');
        toggleButton.addEventListener('click', toggleThreadElements);

        toggleThreadsBtnAction = toggleButton.querySelector('.action');
        toggleThreadElements();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    hideComments();
    hideThreads();
});
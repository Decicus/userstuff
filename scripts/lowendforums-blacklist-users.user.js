// ==UserScript==
// @name        LowEndForums - Blacklist Users
// @namespace   github.com/Decicus
// @match       https://lowendtalk.com/*
// @match       https://lowendspirit.com/*
// @grant       GM_getValue
// @grant       GM_setValue
// @version     1.6.1
// @author      Decicus
// @description Hides comments (by default) from specified users on LET/LES.
// @downloadURL https://raw.githubusercontent.com/Decicus/userstuff/master/scripts/lowendforums-blacklist-users.user.js
// @updateURL   https://raw.githubusercontent.com/Decicus/userstuff/master/scripts/lowendforums-blacklist-users.user.js
// ==/UserScript==

/**
 * Developed for the userscript manager Violentmonkey, but should work for others too.
 * After installing the script, visit LowEndTalk or LowEndSpirit, which will automatically fill in the "Values" tab with default settings.
 * These are JSON. Maybe eventually I'll integrate into the userscript manager's context menu, but for now it's all manual (sorry!).
 *
 * You can use this to automatically hide comments and threads from certain users.
 * These are controlled independently (e.g. you can hide comments from certain users, but still show threads that they've created).
 * You can also choose to toggle hiding comments/threads overall, while keeping your existing lists, if you need that in some cases.
 *
 * The general "settings", will by default hide comments and show threads (even if the list of users is filled): https://i.d0.no/73C94cwaUe4CZzro.png
 *
 * The "blacklistedUsers" value would look something like this: https://i.d0.no/lo44SPnp1VhzaJ69.png
 *
 * ===================================================================
 *
 * Custom "roles" are also supported. They will only show up for you, but you could use that to "tag" people (maybe for fun screenshots, idk).
 * Example of the JSON format in "Values" is: {"Decicus":["I Created This Userscript 😎","Here's a second role just to showcase multiple"]}
 * Which looks like this: https://i.d0.no/oq4qZ1oFErM6QVjU.png
 *
 * By default the custom roles value is filled with just an example for a user that doesn't exist.
 *
 * ===================================================================
 *
 * Forum usernames are CASE SENSITIVE. 'decicus' won't match 'Decicus', for example. I could fix this, but I'm way too lazy.
 */
let users = GM_getValue('blacklistedUsers', null);
let settings = GM_getValue('settings', null);
let customRoles = GM_getValue('customRoles', null);

if (!settings) {
    const defaultSettings = {
        hideComments: true,
        hideThreads: false,
    };

    GM_setValue('settings', defaultSettings);
    settings = defaultSettings;
}

if (!customRoles) {
    customRoles = {
        "ThisIsAnExampleUsernameHopefully": ["Cool person", "🐐"],
    };

    GM_setValue('customRoles', customRoles);
}

/**
 * Convert from old users array to new users _object_
 */
if (!users || Array.isArray(users)) {
    users = {
        comments: users || [],
        threads: [],
    };

    GM_setValue('blacklistedUsers', users);
}

let commentsHidden = false;
const hiddenComments = {};
const hiddenQuotes = {};
let hiddenCommentCount = 0;
let hiddenQuotesCount = 0;

let threadsHidden = false;
const hiddenThreads = {};
let hiddenThreadCount = 0;

let toggleCommentsBtnAction = null;
let toggleThreadsBtnAction = null;

const hash = window.location.hash.replace('#', '');
const isDirectComment = hash.startsWith('Comment_');

function toggleCommentElements(ev)
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
            console.log(`[LowEndForums - Blacklist Users] ${hideText} comment from ${user}:`, element);

            if (commentsHidden) {
                element.classList.add('hidden');
                continue;
            }

            element.classList.remove('hidden');
        }

        for (const quote of hiddenQuotes[user])
        {
            console.log(`[LowEndForums - Blacklist Users] ${hideText} quote from ${user}:`, quote);

            if (commentsHidden) {
                quote.parentElement.classList.add('hidden');

                const commentUrl = quote.querySelector('a[href*="/discussion"]');

                if (commentUrl) {
                    const clonedUrl = commentUrl.cloneNode(true);
                    const cloneParent = document.createElement('p');
                    cloneParent.setAttribute('data-quote-clone', '1');
                    cloneParent.appendChild(clonedUrl);

                    quote.insertAdjacentElement('afterend', cloneParent);
                }

                continue;
            }

            quote.parentElement.classList.remove('hidden');

            const clonedUrl = quote.parentElement.querySelector('p[data-quote-clone="1"]');
            if (clonedUrl) {
                clonedUrl.remove();
            }
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

            if (isDirectComment) {
                const commentId = commentElement.getAttribute('id');
                console.log(commentId);
                if (commentId === hash) {
                    console.log('[LowEndForums - Blacklist Users] Intentionally displaying comment as its directly linked to', commentElement);
                    continue;
                }
            }

            hiddenComments[user].push(commentElement);
        }

        const quotes = document.querySelectorAll('.UserQuote > .QuoteText > p');
        const byAuthor = Array.from(quotes).filter(quote => { return quote.textContent.toLowerCase().includes(`@${user.toLowerCase()} said`); });

        hiddenQuotes[user] = [];
        for (const quote of byAuthor)
        {
            hiddenQuotes[user].push(quote);
            hiddenQuotesCount += 1;

            console.log(`[LowEndForums - Blacklist Users] Hiding quote from ${user}:`, quote);
            quote.classList.add('hidden');
        }
    }

    /**
     * If there are no comments to hide, we skip the rest.
     */
    if (hiddenCommentCount === 0 && hiddenQuotesCount === 0) {
        console.log('[LowEndForums - Blacklist Users] No comments or quotes from blacklist users found');
        return;
    }

    /**
     * document.createElement() is far too convoluted for this shit.
     * Just handcraft it.
     */
    const toggleButtonHtml = `<a class="Button Secondary Action BigButton" id="toggleHiddenComments"><span class="action">Show</span> ${hiddenCommentCount} comment${hiddenCommentCount === 1 ? '' : 's'} / ${hiddenQuotesCount} quote${hiddenQuotesCount === 1 ? '' : 's'} from blacklisted users</a>`;

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
            console.log(`[LowEndForums - Blacklist Users] ${hideText} thread from ${user}:`, element);

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
    }

    if (hiddenThreadCount === 0) {
        console.log('[LowEndForums - Blacklist Users] No threads from blacklist users found');
        return;
    }

    const toggleButtonHtml = `<a class="Button Secondary Action BigButton" id="toggleHiddenThreads"><span class="action">Show</span> ${hiddenThreadCount} thread${hiddenThreadCount === 1 ? '' : 's'} from blacklisted authors</a>`;

    const buttonLocation = document.querySelector('ul.Discussions');
    buttonLocation.insertAdjacentHTML('beforebegin', toggleButtonHtml);

    const toggleButton = document.querySelector('#toggleHiddenThreads');
    toggleButton.addEventListener('click', toggleThreadElements);

    toggleThreadsBtnAction = toggleButton.querySelector('.action');
    toggleThreadElements();
}

function applyCustomRoles()
{
    for (const user in customRoles)
    {
        const elements = document.querySelectorAll(`.Author > .PhotoWrap[title="${user}"]`);
        for (const avatar of elements)
        {
            const wrapper = avatar.parentElement.parentElement;
            const roleTitle = wrapper.querySelector('.RoleTitle');

            if (!roleTitle) {
                continue;
            }

            let currentRoles = roleTitle.textContent.split(', ');
            currentRoles = [... currentRoles, ... customRoles[user]];

            roleTitle.textContent = currentRoles.join(', ');
        }
    }
}

hideComments();
hideThreads();
applyCustomRoles();

document.addEventListener('keydown', (ev) => {
    if (!ev.altKey) {
        return;
    }

    // Toggle hiding comments / quotes
    if (ev.code === 'KeyX') {
        ev.preventDefault();

        if (hiddenCommentCount === 0 && hiddenQuotesCount === 0) {
            console.warn('[LowEndForums - Blacklist Users] No comments or quotes from blacklist users found, cannot toggle visibility');
            return;
        }

        toggleCommentElements();
    }

    // Toggle hiding threads
    if (ev.code === 'KeyZ') {
        ev.preventDefault();

        if (hiddenThreadCount === 0) {
            console.warn('[LowEndForums - Blacklist Users] No threads from blacklist users found, cannot toggle visibility');
            return;
        }

        toggleThreadElements();
    }
});

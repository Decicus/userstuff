// ==UserScript==
// @name        TubeArchivist - Link to YouTube
// @namespace   github.com/Decicus
// @match       https://tubearchivist.example.com/*
// @grant       GM_getValue
// @version     1.0.0
// @downloadURL https://github.com/Decicus/userstuff/raw/refs/heads/master/scripts/tubearchivist-link-to-youtube.user.js
// @updateURL   https://github.com/Decicus/userstuff/raw/refs/heads/master/scripts/tubearchivist-link-to-youtube.user.js
// @author      Decicus
// @description Adds a link to the respective YouTube.com page for playlists & channels
// ==/UserScript==

/**
 * Notes:
 * - You **need** to set the "match" URL by yourself in your userscript settings. Changing this at the top of script will stop working whenever the script is updated - assuming auto-updates are enabled in your userscript manager.
 * - I believe playlists should normally have a link to the YouTube page, but it seems that a lot of my playlists are just "Deactivated". Even if they're currently active on YouTube.
 * - Videos have the same field as playlists, but from my experience they are not deactivated. If you click on "Active", it opens the YouTube page.
 * - Channels don't seem to have this kind of link at all (unless there's a setting I'm missing). So this script is useful for that.
 */

/**
 * If you want to use a different base URL, via the "Values" tab in your userscript manager,
 * The key for the value should be "baseUrl" and the value should be the URL you want to use.
 *
 * Useful if you want to open it up in a different service, like Invidious.
 */
const baseUrl = GM_getValue('baseUrl', 'https://www.youtube.com');

const validPages = [
    'playlist',
    'channel',
];

function init()
{
    const url = new URL(window.location.href);
    const segments = url.pathname.split('/').filter(x => x && x.length > 0);

    const page = segments[0];
    if (!validPages.includes(page) || segments.length < 2) {
        console.error('Invalid page or missing ID!');
        return;
    }

    const id = segments[segments.length - 1];
    const openUrl = new URL(baseUrl);
    let parent = '.child-page-nav';
    let placement = 'beforeend';
    let wrapperTag = 'h3';

    if (page === 'channel') {
        openUrl.pathname = `/channel/${id}`;
    }

    if (page === 'playlist') {
        openUrl.pathname = `/playlist`;
        openUrl.searchParams.set('list', id);

        placement = 'beforebegin';
        parent = '#delete-item';
        wrapperTag = 'p';
    }

    const nav = document.querySelector(parent);
    if (!nav) {
        console.error('Could not find element:', parent);
        return;
    }

    let hostname = openUrl.hostname.replace('www.', '');
    if (hostname === 'youtube.com') {
        hostname = 'YouTube.com';
    }

    const wrapper = document.createElement(wrapperTag);
    const link = document.createElement('a');
    link.setAttribute('rel', 'noopener noreferrer');
    link.setAttribute('target', '_blank');
    link.setAttribute('href',  openUrl.href);
    link.innerText = hostname;

    wrapper.insertAdjacentElement('afterbegin', link);
    nav.insertAdjacentElement(placement, wrapper);
}

init();

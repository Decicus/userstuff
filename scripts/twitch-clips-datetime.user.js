// ==UserScript==
// @name         Twitch Clips - Show date & time
// @version      0.2
// @description  Displays the actual date & time of when a clip was created, instead of the useless "xxx days/months/weeks ago"
// @author       Decicus
// @match        https://clips.twitch.tv/*
// ==/UserScript==

(async function() {
    'use strict';

    const slug = window.location.href.match(/https\:\/\/clips\.twitch\.tv\/([A-z0-9]+)/m)[1];
    
    if (!slug) {
        return;
    }

    const response = await fetch(`https://api.twitch.tv/kraken/clips/${slug}`, {
        headers: {
            Accept: 'application/vnd.twitchtv.v5+json',
            'Client-ID': 'zs377ogpzz01ogfx26pvbddx9jodg1',
        },
    });

    const data = await response.json();

    if (!data.created_at) {
        return;
    }

    const created = new Date(data.created_at);
    const dateAndTime = created.toLocaleString();

    const box = document.getElementsByClassName('clips-chat-info tw-align-items-start tw-flex tw-flex-column tw-flex-grow-1 tw-flex-shrink-1 tw-justify-content-center tw-lg-mg-y-2 tw-mg-t-1');
    const element = document.createElement('div');
    element.innerHTML = `<span class="tw-font-size-5 tw-strong">Clip created:</span><br /><span>${dateAndTime}</span>`;

    box[0].appendChild(element);
})();
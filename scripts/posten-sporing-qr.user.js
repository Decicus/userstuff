// ==UserScript==
// @name        Posten Sporing - QR Kode
// @namespace   github.com/Decicus
// @description My garbage method of adding a QR code for easy scanning into my Posten.no tracking app.
// @version     1.2.1
// @match       https://sporing.posten.no/sporing/*
// @grant       none
// @downloadURL https://gist.githubusercontent.com/Decicus/0bfe36921a5dd92e679c4eb8ba67264d/raw/PostenSporing.user.js
// @updateURL   https://gist.githubusercontent.com/Decicus/0bfe36921a5dd92e679c4eb8ba67264d/raw/PostenSporing.user.js
// ==/UserScript==

const delay = 100;

let current = 0;
const max = 30000; // 30 seconds
const interval = setInterval(() => {
    /**
     * Clear the interval prematurely if it lasts more than `max`
     */
    current += delay;
    if (current > max) {
        clearInterval(interval);
        console.error('Cleared interval early because parent does not exist.');
        return;
    }
    
    /**
     * Can't find the parent element,
     * so we let the interval continue until it does.
     */
    const parent = document.querySelector('div.hw-grid:nth-child(3) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1)');
    if (!parent) {
        return;
    }
    
    const url = new URL(window.location.href);
    const sporingsnummer = url.pathname.replace('/sporing/', '');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=75x75&data=${sporingsnummer}`;

    const html = `<img src="${qrUrl}" style="text-align: center;" alt="QR Code">`;
    parent.insertAdjacentHTML('beforeend', html);
    
    /**
     * We've done what we came here to do, bye.
     */
    console.log('Added QR code and cleared interval, cheers!');
    clearInterval(interval);
}, delay);
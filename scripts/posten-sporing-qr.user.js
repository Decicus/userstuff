// ==UserScript==
// @name        Posten/Bring Sporing - QR Kode
// @namespace   github.com/Decicus
// @version     1.4.2
// @match       https://sporing.posten.no/sporing/*
// @match       https://sporing.bring.no/sporing/*
// @grant       none
// @downloadURL https://gist.githubusercontent.com/Decicus/0bfe36921a5dd92e679c4eb8ba67264d/raw/PostenSporing.user.js
// @updateURL   https://gist.githubusercontent.com/Decicus/0bfe36921a5dd92e679c4eb8ba67264d/raw/PostenSporing.user.js
// ==/UserScript==
function handleMutationsList(list, observer) {
    const target = document.querySelector('.hw-wysiwyg > div > div');
    if (!target) {
        return;
    }

    observer.disconnect();
    const url = new URL(window.location.href);
    const sporingsnummer = url.pathname.replace('/sporing/', '');
    const resolution = 125;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${resolution}x${resolution}&data=${sporingsnummer}`;

    const html = `<div><small><b>QR Code</b></small><div class="hw-block hw-block--pb-smallest"><img src="${qrUrl}" style="text-align: center;" alt="QR Code"></div></div>`;
    target.insertAdjacentHTML('beforeend', html);

    console.log('Added QR code');
}

const observer = new MutationObserver(handleMutationsList);
observer.observe(document.querySelector('main'), {
    subtree: true,
    childList: true,
});

// ==UserScript==
// @name        Posten/Bring Sporing - QR Kode
// @namespace   github.com/Decicus
// @version     1.6.0
// @match       https://sporing.posten.no/sporing/*
// @match       https://sporing.bring.no/sporing/*
// @grant       none
// @downloadURL https://gist.githubusercontent.com/Decicus/0bfe36921a5dd92e679c4eb8ba67264d/raw/PostenSporing.user.js
// @updateURL   https://gist.githubusercontent.com/Decicus/0bfe36921a5dd92e679c4eb8ba67264d/raw/PostenSporing.user.js
// ==/UserScript==
function getQrUrl()
{
    const url = new URL(window.location.href);
    const sporingsnummer = url.pathname.replace('/sporing/', '');
    const resolution = 125;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${resolution}x${resolution}&data=${sporingsnummer}`;
    return qrUrl;
}

const elementId = 'userscript-qr-code';
function handleMutationsList(list, observer) {
    const qrCodeElement = document.getElementById(elementId);
    if (qrCodeElement) {
        qrCodeElement.remove();
    }

    let isNewPage = false;
    let target = document.querySelector('*[data-testid="trackingnumber-main-header"]');

    if (observer) {
        observer.disconnect();
    }

    target = target.parentElement.parentElement;
    const elementLocation = 'afterend';
    const html = `<div id="${elementId}" class="empty:hidden has-[h2:last-child]:hidden [&>*:not(:first-child)]:mt-20 large:[&>*:not(:first-child)]:mt-24"><h2>QR Code</h2><img src="${getQrUrl()}" title="Scan with the Posten app" alt="QR Code"></div>`;

    target.insertAdjacentHTML(elementLocation, html);
    console.log('Added QR code');
}

const observer = new MutationObserver(handleMutationsList);
observer.observe(document.querySelector('main'), {
    subtree: true,
    childList: true,
});

setTimeout(() => {
    handleMutationsList();
}, 1000);

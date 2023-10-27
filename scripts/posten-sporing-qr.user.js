// ==UserScript==
// @name        Posten/Bring Sporing - QR Kode
// @namespace   github.com/Decicus
// @version     1.5.2
// @match       https://sporing.posten.no/sporing/*
// @match       https://sporing.bring.no/sporing/*
// @match       https://beta.sporing.posten.no/sporing/*
// @match       https://beta.sporing.bring.no/sporing/*
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
    let target = document.querySelector('.hw-wysiwyg > div > div');
    if (!target) {
        target = document.querySelector('div[data-testid="parcel-history-accordion"]');
        if (!target) {
            return;
        }

        isNewPage = true;
    }

    if (observer) {
        observer.disconnect();
    }

    let elementLocation = 'beforeend';
    let html = `<div id="${elementId}"><small><b>QR Code</b></small><div class="hw-block hw-block--pb-smallest"><img src="${getQrUrl()}" title="Scan with the Posten app" alt="QR Code"></div></div>`;

    if (isNewPage) {
        elementLocation = 'beforebegin';
        html = `<div id="${elementId}" class="hw-grid__item hw-large--one-half mt-medium-4 large:mt-large-1"><h2>QR Code</h2><div class="mt-small-2 large:mt-small-3"><img src="${getQrUrl()}" title="Scan with the Posten app" alt="QR Code"></div></div>`;
        // Padding between QR code and "Pakkehistorikk"
        html += '<div class="hw-grid__item"></div>';
        target = target.parentElement;
    }

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

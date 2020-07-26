// ==UserScript==
// @name        Posten Sporing - QR Kode
// @namespace   github.com/Decicus
// @version     1.1.0
// @match       https://sporing.posten.no/sporing/*
// @grant       none
// @downloadURL https://gist.githubusercontent.com/Decicus/0bfe36921a5dd92e679c4eb8ba67264d/raw/PostenSporing.user.js
// @updateURL   https://gist.githubusercontent.com/Decicus/0bfe36921a5dd92e679c4eb8ba67264d/raw/PostenSporing.user.js
// ==/UserScript==

setTimeout(() => {
    const url = new URL(window.location.href);
    const sporingsnummer = url.pathname.replace('/sporing/', '');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${sporingsnummer}`;

    let html = '<div class="tf-card-detail">';
    html += '<h5 class="tf-card-detail--heading"><span>Sendingsnummer (QR Kode):</span></h5>';
    html += `<div class="tf-card-detail--value hw-text-small"><div class="hw-text-light"><img src="${qrUrl}"></div></div>`;
    html += '</div>';

    const tfCard = document.querySelector('.hw-grid__item.hw-large--one-third > .tf-card');
    tfCard.insertAdjacentHTML('beforeend', html);
}, 3000);
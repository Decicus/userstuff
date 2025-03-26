// ==UserScript==
// @name        NRK TV - Print metadata
// @namespace   github.com/Decicus
// @match       https://tv.nrk.no/serie/*
// @grant       none
// @version     1.0.0
// @downloadURL https://github.com/Decicus/userstuff/raw/refs/heads/master/scripts/nrktv-print-metadata.user.js
// @updateURL   https://github.com/Decicus/userstuff/raw/refs/heads/master/scripts/nrktv-print-metadata.user.js
// @author      Decicus
// @description Output metadata from NRK TV series to browser console
// ==/UserScript==

/**
 * Pad a number with leading zeros
 *
 * @param {Number} number
 * @param {Number} length Minimum number of digits the result should have, default is 2.
 * @returns {String} The padded number
 */
function padNumber(number, length = 2)
{
    return number.toString().padStart(length, '0');
}

async function init()
{
    const url = new URL(window.location.href);
    const pathSegments = url.pathname.split('/');
    const prefixIndex = pathSegments.indexOf('serie');
    const seriesSlug = pathSegments[prefixIndex + 1];

    const response = await fetch(`https://psapi.nrk.no/tv/catalog/series/${seriesSlug}`);
    const data = await response.json();
    const divider = '------------------------------------';

    const seasons = data._embedded.seasons;

    let output = [];

    for (const season of seasons)
    {
        const seasonNumber = padNumber(season.sequenceNumber || 0);
        const { episodes } = season._embedded;

        for (const episode of episodes)
        {
            let { titles, duration, sequenceNumber, image, releaseDateOnDemand } = episode;
            const episodeName = titles.title.replace(/^\d{1,3}\. /, '');
            const description = titles.subtitle;
            const episodeNumber = padNumber(sequenceNumber || 0);
            const releaseDate = releaseDateOnDemand.split('T')[0];

            /**
             * Example format: PT1H29S (aka ISO 8601 duration)
             * - Lowercase
             * - Remove the PT prefix
             * - Add spaces between numbers and letters, and each unit
             * - Trim the string
             */
            duration = duration.toLowerCase();
            duration = duration.replace('pt', '');
            duration = duration.replace(/([a-z])([0-9])/g, '$1 $2');
            duration = duration.replace(/([0-9])([a-z])/g, '$1 $2');
            duration = duration.trim();

            let thumbnail = '';
            if (image && image.length > 0) {
                image = image.sort((a, b) => b.width - a.width);
                thumbnail = image[0].url;
            }

            const episodeDetails = {
                Episode: `S${seasonNumber}E${episodeNumber}`,
                Title: episodeName,
                Description: description,
                Duration: duration,
                ReleaseDate: releaseDate,
                Thumbnail: thumbnail
            };

            output.push(episodeDetails);
        }
    }

    if (output.length > 0)
    {
        console.log(divider);
        console.table(output);
        console.log(divider);
    }
}

init();

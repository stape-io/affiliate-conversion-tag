const sendHttpRequest = require('sendHttpRequest');
const getEventData = require('getEventData');
const makeTableMap = require('makeTableMap');
const JSON = require('JSON');
const setCookie = require('setCookie');
const parseUrl = require('parseUrl');
const encodeUriComponent = require('encodeUriComponent');


if (data.type === 'page_view') {
    const parsedUrl = parseUrl(data.urlSource === 'page_location_default' ? getEventData('page_location') : data.urlSource);
    const urlParametersToStore = data.urlParameters && data.urlParameters.length ? data.urlParameters : [];

    urlParametersToStore.forEach(urlParameterToStore => {
        const name = urlParameterToStore.name;
        const value = parsedUrl && parsedUrl.searchParams ? parsedUrl.searchParams[urlParameterToStore.name] : '';

        if (value) {
            const options = {
                domain: 'auto',
                path: '/',
                secure: true,
                httpOnly: false
            };

            if (urlParameterToStore.expiration > 0) options['max-age'] = urlParameterToStore.expiration;

            setCookie('affiliate_'+name, value, options, false);
        }
    });

    data.gtmOnSuccess();
} else {
    let url = data.url;
    let postBodyData = '';
    let requestHeaders;

    if (data.requestMethod === 'GET') {
        let urlParams = '';
        requestHeaders = {method: 'GET'};

        for (let key in data.urlData) {
            urlParams = urlParams ? urlParams + '&' + enc(data.urlData[key].key) + '=' + enc(data.urlData[key].value) : enc(data.urlData[key].key) + '=' + enc(data.urlData[key].value);
        }

        if (urlParams) {
            url = url.indexOf('?') !== -1 ? url + '&' + urlParams : url + '?' + urlParams;
        }
    } else {
        requestHeaders = {headers: {'Content-Type': 'application/json'}, method: 'POST'};
        postBodyData = data.bodyData ? makeTableMap(data.bodyData, 'key', 'value') : {};

        if (data.insideArray) {
            postBodyData = [postBodyData];
        }
    }

    sendHttpRequest(url, (statusCode, headers, body) => {
        if (statusCode >= 200 && statusCode < 300) {
            data.gtmOnSuccess();
        } else {
            data.gtmOnFailure();
        }
    }, requestHeaders, JSON.stringify(postBodyData));
}

function enc(data) {
    data = data || '';
    return encodeUriComponent(data);
}


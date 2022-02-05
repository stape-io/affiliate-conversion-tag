const sendHttpRequest = require('sendHttpRequest');
const getEventData = require('getEventData');
const makeTableMap = require('makeTableMap');
const JSON = require('JSON');
const setCookie = require('setCookie');
const parseUrl = require('parseUrl');
const encodeUriComponent = require('encodeUriComponent');
const getRequestHeader = require('getRequestHeader');

const logToConsole = require('logToConsole');
const getContainerVersion = require('getContainerVersion');
const containerVersion = getContainerVersion();
const isDebug = containerVersion.debugMode;
const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = getRequestHeader('trace-id');


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

    if (data.clearCookies && data.cookiesToClear) {
        for (let key in data.cookiesToClear) {
            setCookie('affiliate_' + data.cookiesToClear[key].name, '', {
                domain: 'auto',
                path: '/',
                secure: true,
                httpOnly: false,
                'max-age': 10
            }, false);
        }
    }

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

    if (isLoggingEnabled) {
        logToConsole(JSON.stringify({
            'Name': 'Affiliate',
            'Type': 'Request',
            'TraceId': traceId,
            'EventName': 'Conversion',
            'RequestMethod': data.requestMethod,
            'RequestUrl': url,
            'RequestBody': postBodyData,
        }));
    }

    sendHttpRequest(url, (statusCode, headers, body) => {
        if (isLoggingEnabled) {
            logToConsole(JSON.stringify({
                'Name': 'Affiliate',
                'Type': 'Response',
                'TraceId': traceId,
                'EventName': 'Conversion',
                'ResponseStatusCode': statusCode,
                'ResponseHeaders': headers,
                'ResponseBody': body,
            }));
        }

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

function determinateIsLoggingEnabled() {
    if (!data.logType) {
        return isDebug;
    }

    if (data.logType === 'no') {
        return false;
    }

    if (data.logType === 'debug') {
        return isDebug;
    }

    return data.logType === 'always';
}

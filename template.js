const getAllEventData = require('getAllEventData');
const getEventData = require('getEventData');
const encodeUriComponent = require('encodeUriComponent');
const getType = require('getType');
const makeString = require('makeString');
const JSON = require('JSON');
const makeTableMap = require('makeTableMap');
const parseUrl = require('parseUrl');
const sendHttpRequest = require('sendHttpRequest');
const setCookie = require('setCookie');

/*==============================================================================
==============================================================================*/

const eventData = getAllEventData();

if (!isConsentGivenOrNotRequired(data, eventData)) {
  return data.gtmOnSuccess();
}

if (data.type === 'page_view') {
  const parsedUrl = parseUrl(
    data.urlSource === 'page_location_default' ? getEventData('page_location') : data.urlSource
  );
  const urlParametersToStore =
    data.urlParameters && data.urlParameters.length ? data.urlParameters : [];

  urlParametersToStore.forEach((urlParameterToStore) => {
    const name = urlParameterToStore.name;
    const value =
      parsedUrl && parsedUrl.searchParams ? parsedUrl.searchParams[urlParameterToStore.name] : '';

    if (value) {
      const options = {
        domain: 'auto',
        path: '/',
        secure: true,
        httpOnly: false
      };

      if (urlParameterToStore.expiration > 0) options['max-age'] = urlParameterToStore.expiration;

      setCookie('affiliate_' + name, value, options, false);
    }
  });

  data.gtmOnSuccess();
} else {
  let url = data.url;
  let postBodyData = '';
  let requestHeaders;

  if (data.clearCookies && data.cookiesToClear) {
    for (let key in data.cookiesToClear) {
      setCookie(
        'affiliate_' + data.cookiesToClear[key].name,
        '',
        {
          domain: 'auto',
          path: '/',
          secure: true,
          httpOnly: false,
          'max-age': 10
        },
        false
      );
    }
  }

  if (data.requestMethod === 'GET') {
    let urlParams = '';
    requestHeaders = { method: 'GET' };

    for (let key in data.urlData) {
      urlParams = urlParams
        ? urlParams + '&' + enc(data.urlData[key].key) + '=' + enc(data.urlData[key].value)
        : enc(data.urlData[key].key) + '=' + enc(data.urlData[key].value);
    }

    if (urlParams) {
      url = url.indexOf('?') !== -1 ? url + '&' + urlParams : url + '?' + urlParams;
    }
  } else {
    requestHeaders = { headers: { 'Content-Type': 'application/json' }, method: 'POST' };
    postBodyData = data.bodyData ? makeTableMap(data.bodyData, 'key', 'value') : {};

    if (data.insideArray) {
      postBodyData = [postBodyData];
    }
  }

  sendHttpRequest(
    url,
    (statusCode, headers, body) => {
      if (statusCode >= 200 && statusCode < 300) {
        data.gtmOnSuccess();
      } else {
        data.gtmOnFailure();
      }
    },
    requestHeaders,
    JSON.stringify(postBodyData)
  );
}

/*==============================================================================
Helpers
==============================================================================*/

function isConsentGivenOrNotRequired(data, eventData) {
  if (data.adStorageConsent !== 'required') return true;
  if (eventData.consent_state) return !!eventData.consent_state.ad_storage;
  const xGaGcs = eventData['x-ga-gcs'] || ''; // x-ga-gcs is a string like "G110"
  return xGaGcs[2] === '1';
}

function enc(data) {
  if (['null', 'undefined'].indexOf(getType(data)) !== -1) data = '';
  return encodeUriComponent(makeString(data));
}

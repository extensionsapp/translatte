const querystring = require('querystring');
const languages = require('./languages');
const tunnel = require('tunnel-agent');
const token = require('./token');
const got = require('got');

const translatte = async (text, opts) => {
    opts = opts || {};

    let result = {
        text: '',
        raw: '',
        from: {
            language: {
                didYouMean: false,
                iso: ''
            },
            text: {
                autoCorrected: false,
                value: '',
                didYouMean: false
            }
        }
    };

    let errors = [
        'The language «[lang]» is not supported',
        'Text must not exceed 2900 characters',
        'The server returned an empty response',
        'Could not get token from google',
        'Text translation request failed'
    ];

    if (opts.from && !languages.isSupported(opts.from)) {
        return Promise.reject(errors[0].replace('[lang]', opts.from));
    }

    if (opts.to && !languages.isSupported(opts.to)) {
        return Promise.reject(errors[0].replace('[lang]', opts.to));
    }

    opts.client = opts.client || 't';
    opts.tld = opts.tld || 'com';
    opts.from = languages.getCode(opts.from || 'auto');
    opts.to = languages.getCode(opts.to || 'en');

    opts.priority = opts.services
        ? Object.keys(opts.services) // google_free, google_v3, microsoft_v3, yandex_v1, yandex_v2
        : ['google_free'];

    if (opts.priority.length > 1) {
        return opts.priority.reduce((p, priority) => {
            return p.then(prev => {
                return new Promise(resolve => {
                    if (prev) return resolve(prev);
                    translatte(text, {...opts, priority}).then(t => {
                        if (!t || !t.text) return resolve();
                        return resolve(t);
                    }).catch(() => resolve());
                });
            });
        }, Promise.resolve());
    }

    if (text.length > 2900) {
        let texts = [];
        ['\\.\\s', ',\\s', '\\s'].forEach(t => {
            texts = text.match(new RegExp('[^]{1,2900}(' + t + '|$)', 'ig'))
        });
        if (!texts) return Promise.reject(errors[1]);
        return texts.reduce((p, item) => {
            return p.then(prev => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        translatte(item, opts).then(t => {
                            if (!t || !t.text) return reject(errors[2]);
                            t.text = prev && prev.text ? prev.text + ' ' + t.text : t.text;
                            return resolve(t);
                        }).catch(e => reject(e));
                    }, 500);
                });
            });
        }, Promise.resolve());
    }

    if (opts.priority.indexOf('google_v3') + 1) {
        if (!opts['google_v3']) return Promise.resolve(result);
        let url = 'https://translation.googleapis.com/v3beta1/projects/' +
            opts.services['google_v3']['project-id'] + '/locations/global:translateText';
        try {
            const {body} = await got(url, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + opts.services['google_v3']['token'],
                    'Content-type': 'application/json'
                },
                body: {
                    source_language_code: opts.from,
                    target_language_code: opts.to,
                    contents: [text]
                },
                json: true
            });
            for (const translation of body.translations) {
                result.text += result.text
                    ? ' ' + translation.translations.translatedText
                    : translation.translations.translatedText;
            }
        } catch (e) {
            console.error(e);
        }
        return Promise.resolve(result);
    }

    if (opts.priority.indexOf('microsoft_v3') + 1) {
        if (!opts.services['microsoft_v3']) return Promise.resolve(result);
        let url = 'https://api.cognitive.microsofttranslator.com/translate?' +
            querystring.stringify({
                'api-version': '3.0',
                from: opts.from,
                to: opts.to
            });
        try {
            const {body} = await got(url, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': opts.services['microsoft_v3']['key'],
                    'Content-type': 'application/json',
                    'X-ClientTraceId': ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))
                },
                body: {
                    text: [text]
                },
                json: true
            });
            for (const translation of body) {
                result.text += result.text
                    ? ' ' + translation.translations[0].text
                    : translation.translations[0].text;
            }
        } catch (e) {
            console.error(e);
        }
        return Promise.resolve(result);
    }

    if (opts.priority.indexOf('yandex_v1') + 1) {
        if (!opts.services['yandex_v1']) return Promise.resolve(result);
        let url = 'https://translate.yandex.net/api/v1.5/tr.json/translate?' +
            querystring.stringify({
                key: opts.services['yandex_v1']['key'],
                lang: opts.from && opts.from !== 'auto'
                    ? opts.from + '-' + opts.to
                    : opts.to,
                text: text
            });
        try {
            const {body} = await got(url, {json: true});
            for (const translation of body.text) {
                result.text += result.text
                    ? ' ' + translation
                    : translation;
            }
        } catch (e) {
            console.error(e);
        }
        return Promise.resolve(result);
    }

    if (opts.priority.indexOf('yandex_v2') + 1) {
        if (!opts.services['yandex_v2']) return Promise.resolve(result);
        let url = 'https://translate.api.cloud.yandex.net/translate/v2/translate';
        try {
            const {body} = await got(url, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + opts.services['yandex_v2']['token'],
                    'Content-type': 'application/json'
                },
                body: {
                    sourceLanguageCode: opts.from,
                    targetLanguageCode: opts.to,
                    texts: [text]
                },
                json: true
            });
            for (const translation of body.translations) {
                result.text += result.text
                    ? ' ' + translation.text
                    : translation.text;
            }
        } catch (e) {
            console.error(e);
        }
        return Promise.resolve(result);
    }

    let proxy = {};
    let translate = {};

    opts.agents = opts.agents
        ? typeof opts.agents === 'string'
            ? opts.agents.split(',').map(p => p.trim())
            : opts.agents
        : [];
    opts.proxies = opts.proxies
        ? typeof opts.proxies === 'string'
            ? opts.proxies.split(',').map(p => p.trim())
            : opts.proxies
        : [];

    if (opts.agents.length) {
        let a = opts.agents[Math.floor(Math.random() * opts.agents.length)];
        proxy.headers = {
            'User-Agent': a
        };
    }
    if (opts.proxies.length) {
        let p = opts.proxies[Math.floor(Math.random() * opts.proxies.length)];
        if (p.indexOf('@') + 1) {
            proxy.proxyAuth = p.split('@')[0];
            proxy.host = (p.split('@')[1]).split(':')[0];
            proxy.port = (p.split('@')[1]).split(':')[1];
        } else {
            proxy.host = p.split(':')[0];
            proxy.port = p.split(':')[1];
        }
    }

    opts.proxy = (proxy.host || proxy.headers)
        ? {agent: tunnel.httpsOverHttp({proxy})}
        : {};

    let t = await token.get(text, opts);

    if (!t) return Promise.reject(errors[3]);

    let url = 'https://translate.google.' + opts.tld + '/translate_a/single?' +
        querystring.stringify({
            [t.name]: t.value,
            client: opts.client,
            sl: opts.from,
            tl: opts.to,
            hl: opts.to,
            dt: ['at', 'bd', 'ex', 'ld', 'md', 'qca', 'rw', 'rm', 'ss', 't'],
            ie: 'UTF-8',
            oe: 'UTF-8',
            otf: 1,
            ssel: 0,
            tsel: 0,
            kc: 7,
            q: text
        });

    try {
        translate = await got(url, {...opts.proxy, json: true});
    } catch (e) {
        return Promise.reject(errors[4]);
    }

    result.raw = opts.raw
        ? JSON.stringify(translate.body)
        : '';

    let body = translate.body;

    body[0].forEach(obj => {
        if (obj[0]) {
            result.text += obj[0];
        }
    });

    if (body[2] === body[8][0][0]) {
        result.from.language.iso = body[2];
    } else {
        result.from.language.didYouMean = true;
        result.from.language.iso = body[8][0][0];
    }

    if (body[7] && body[7][0]) {
        let str = body[7][0];

        str = str.replace(/<b><i>/g, '[');
        str = str.replace(/<\/i><\/b>/g, ']');

        result.from.text.value = str;

        if (body[7][5] === true) {
            result.from.text.autoCorrected = true;
        } else {
            result.from.text.didYouMean = true;
        }
    }

    return Promise.resolve(result);
};

module.exports = translatte;
module.exports.languages = languages;
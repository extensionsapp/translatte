# A free and unlimited translate for NodeJS.

<p align="center"><img src="https://raw.githubusercontent.com/extensionsapp/translatte/master/translatte_md.png" alt="TRANSLATTE, npm package translate for NodeJS" title="TRANSLATTE, npm package translate for NodeJS"></p>

### Installation
```
npm i translatte
```

### Usage

Translate string to German:

```javascript
const translatte = require('translatte');

translatte('Do you speak Russian?', {to: 'de'}).then(res => {
    console.log(res.text);
}).catch(err => {
    console.error(err);
});
// Ihr sprecht auf Russisch?
```

Translate string to English using proxy:

```javascript
const translatte = require('translatte');

translatte('Вы говорите по-русски?', {
    from: 'ru',
    to: 'en',
    agents: [
        'Mozilla/5.0 (Windows NT 10.0; ...',
        'Mozilla/4.0 (Windows NT 10.0; ...',
        'Mozilla/5.0 (Windows NT 10.0; ...'
    ],
    proxies: [
        'LOGIN:PASSWORD@192.0.2.100:12345',
        'LOGIN:PASSWORD@192.0.2.200:54321'
    ]
}).then(res => {
    console.log(res);
}).catch(err => {
    console.error(err);
});
// { text: 'Do you speak Russian?', 
//   from: { 
//     language: { 
//       didYouMean: false, 
//       iso: 'ru' 
//     }, 
//     text: { 
//       autoCorrected: false, 
//       value: '', 
//       didYouMean: false 
//     } 
//   },
//   raw: '' }
```

## API

### translatte(text, options)

#### text

Type: `string`

The text to be translated.

#### options

Type: `object`

##### from

Type: `string` Default: `auto`

The `text` language. Must be `auto` or one of the codes/names (not case sensitive) contained in [languages.js](https://github.com/extensionsapp/translatte/blob/master/languages.js).

##### to

Type: `string` Default: `en`

The language in which the text should be translated. Must be one of the codes/names (not case sensitive) contained in [languages.js](https://github.com/extensionsapp/translatte/blob/master/languages.js).

##### raw

Type: `boolean` Default: `false`

If `true`, the returned object will have a `raw` property with the raw response (`string`) from Google Translate.

##### agents

Type: `array` Default: `[]`

An `array` of strings specifying the user-agent `['Mozilla/5.0 ...', 'Mozilla/4.0 ...']`. One random result will be selected.

##### proxies

Type: `array` Default: `[]`

An `array` of strings `LOGIN:PASSWORD@IP:PORT` specifying the proxies `['LOGIN:PASSWORD@192.0.2.100:12345', 'LOGIN:PASSWORD@192.0.2.200:54321']`. One random result will be selected.

### Returns an `object`:

- `text` *(string)* – The translated text.
- `from` *(object)*
  - `language` *(object)*
    - `didYouMean` *(boolean)* - `true` if the API suggest a correction in the source language
    - `iso` *(string)* - The [code of the language](https://github.com/extensionsapp/translatte/blob/master/languages.js) that the API has recognized in the `text`
  - `text` *(object)*
    - `autoCorrected` *(boolean)* – `true` if the API has auto corrected the `text`
    - `value` *(string)* – The auto corrected `text` or the `text` with suggested corrections
    - `didYouMean` *(booelan)* – `true` if the API has suggested corrections to the `text`
- `raw` *(string)* - If `options.raw` is true, the raw response from Google Translate servers. Otherwise, `''`.

Note that `res.from.text` will only be returned if `from.text.autoCorrected` or `from.text.didYouMean` equals to `true`. In this case, it will have the corrections delimited with brackets (`[ ]`):

``` js
translate('I spea Dutch').then(res => {
    console.log(res.from.text.value);
    //=> I [speak] Dutch
}).catch(err => {
    console.error(err);
});
```
Otherwise, it will be an empty `string` (`''`).

###### Original package: https://github.com/matheuss/google-translate-api

© 2018 ExtensionsApp
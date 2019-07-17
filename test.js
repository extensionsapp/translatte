const translatte = require('./');

translatte('Do you speak Russian?', {to: 'de', services: {
        "google_free": true,
        "google_v3": {
            "project-id": "XXX",
            "token": "YYY"
        },
        "yandex_v1": {
            "key": "XXX"
        },
        "microsoft_v3": {
            "key": "XXX"
        }
    }}).then(res => {
    console.log(res.text);
}).catch(err => {
    console.error(err);
});
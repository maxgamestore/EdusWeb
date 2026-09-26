// ============================================================
//  config.js — Configurare API EdusWeb
// ============================================================
//  Rezolvă 2 probleme:
//  1. CORS pe ngrok — adaugă header ngrok-skip-browser-warning
//  2. Detectare automată local vs GitHub Pages
// ============================================================

(function () {
    'use strict';

    var host = window.location.hostname;
    var protocol = window.location.protocol;

    var isLocal = (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host === '' ||
        protocol === 'file:'
    );

    window.EDUSWEB_API = isLocal
        ? 'http://localhost:9000'
        : 'https://karma-prelaunch-obscure.ngrok-free.dev';

    // Suprascrie fetch global: adaugă header ngrok
    var originalFetch = window.fetch;

    window.fetch = function (url, options) {
        options = options || {};
        options.headers = options.headers || {};

        var urlString = '';
        if (typeof url === 'string') {
            urlString = url;
        } else if (url && url.url) {
            urlString = url.url;
        }

        // Adaugă header doar pentru ngrok
        if (urlString.indexOf('ngrok') !== -1) {
            if (options.headers instanceof Headers) {
                options.headers.set('ngrok-skip-browser-warning', '1');
            } else {
                options.headers['ngrok-skip-browser-warning'] = '1';
            }
        }

        return originalFetch.call(window, url, options);
    };

    console.log('[EdusWeb] Host:', host);
    console.log('[EdusWeb] API:', window.EDUSWEB_API);

})();
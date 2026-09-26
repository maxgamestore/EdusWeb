window.EDUSWEB_API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:9000'
    : 'https://karma-prelaunch-obscure.ngrok-free.dev';

console.log('[EdusWeb] API =', window.EDUSWEB_API);
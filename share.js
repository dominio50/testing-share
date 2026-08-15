/* Share + Add to Home Screen test harness.
 *
 * Nothing here is app logic — it exists to answer three questions on a real
 * device: does the share sheet open, does the browser offer an install prompt,
 * and did the Home Screen icon actually launch the page standalone.
 */
(function () {
  'use strict';

  var logEl = document.getElementById('log');
  var shareBtn = document.getElementById('share-btn');
  var shareFileBtn = document.getElementById('share-file-btn');
  var copyBtn = document.getElementById('copy-btn');
  var installBtn = document.getElementById('install-btn');
  var installNote = document.getElementById('install-note');
  var shareNote = document.getElementById('share-note');
  var iosHelp = document.getElementById('ios-help');

  function log(message, kind) {
    var stamp = new Date().toLocaleTimeString();
    var line = document.createElement('div');
    line.className = 'log-line' + (kind ? ' log-' + kind : '');
    line.textContent = '[' + stamp + '] ' + message;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  document.getElementById('clear-log-btn').addEventListener('click', function () {
    logEl.textContent = '';
  });

  /* ---------------------------------------------------------------- environment */

  var ua = navigator.userAgent;
  // iPadOS 13+ reports a desktop UA, so the touch-point check catches it.
  var isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Every iOS browser is WebKit underneath; only the real Safari shell offers
  // Add to Home Screen, and only it lacks these vendor tokens.
  var isIOSSafari = isIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    document.getElementById('standalone-banner').hidden = false;
  }

  function diagnostics() {
    return [
      ['Secure context (HTTPS)', window.isSecureContext],
      ['navigator.share', typeof navigator.share === 'function'],
      ['navigator.canShare', typeof navigator.canShare === 'function'],
      ['File sharing', canShareFiles()],
      ['Clipboard API', !!(navigator.clipboard && navigator.clipboard.writeText)],
      ['Service worker support', 'serviceWorker' in navigator],
      ['beforeinstallprompt fired', !!deferredPrompt],
      ['Running standalone', isStandalone],
      ['iOS', isIOS],
      ['iOS Safari', isIOSSafari],
      ['Origin', location.origin]
    ];
  }

  function renderDiagnostics() {
    var dl = document.getElementById('diagnostics');
    dl.textContent = '';
    diagnostics().forEach(function (pair) {
      var dt = document.createElement('dt');
      dt.textContent = pair[0];
      var dd = document.createElement('dd');
      if (typeof pair[1] === 'boolean') {
        dd.textContent = pair[1] ? 'yes' : 'no';
        dd.className = pair[1] ? 'ok' : 'bad';
      } else {
        dd.textContent = String(pair[1]);
      }
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
  }

  function canShareFiles() {
    if (typeof navigator.canShare !== 'function' || typeof File !== 'function') return false;
    try {
      var probe = new File(['probe'], 'probe.txt', { type: 'text/plain' });
      return navigator.canShare({ files: [probe] });
    } catch (err) {
      return false;
    }
  }

  /* --------------------------------------------------------------- share button */

  if (typeof navigator.share !== 'function') {
    shareBtn.disabled = true;
    shareNote.textContent = window.isSecureContext
      ? 'This browser has no Web Share API — use “Copy link” instead. (Desktop Firefox and Chrome on Linux are the usual culprits.)'
      : 'The Web Share API needs HTTPS or localhost. This page is on ' + location.protocol + ' so the button is disabled.';
  } else if (isIOS) {
    shareNote.textContent = 'On iOS, “Add to Home Screen” is normally offered from Safari’s own Share button rather than a page-triggered sheet. If you don’t see it below, use the manual steps in section 2.';
  }

  shareBtn.addEventListener('click', function () {
    var payload = {
      title: document.title,
      text: 'Testing the Web Share API',
      url: location.href
    };
    log('navigator.share(' + JSON.stringify(payload) + ')');
    navigator.share(payload).then(function () {
      log('share() resolved — the sheet was dismissed with a target chosen.', 'ok');
    }, function (err) {
      // A cancelled sheet rejects with AbortError; that is a pass, not a failure.
      if (err && err.name === 'AbortError') {
        log('share() aborted — you dismissed the sheet. The sheet still opened, so the API works.', 'warn');
      } else {
        log('share() failed: ' + (err && err.name) + ': ' + (err && err.message), 'bad');
      }
    });
  });

  if (!canShareFiles()) {
    shareFileBtn.disabled = true;
  }

  shareFileBtn.addEventListener('click', function () {
    var file = new File(
      ['Shared from the share test page at ' + new Date().toISOString() + '\n'],
      'share-test.txt',
      { type: 'text/plain' }
    );
    // Sharing files and a url together is rejected on some platforms, so send files alone.
    var payload = { files: [file], title: 'share-test.txt' };
    if (!navigator.canShare(payload)) {
      log('canShare() says this platform will not accept that file payload.', 'bad');
      return;
    }
    log('navigator.share({ files: [share-test.txt] })');
    navigator.share(payload).then(function () {
      log('file share resolved.', 'ok');
    }, function (err) {
      if (err && err.name === 'AbortError') {
        log('file share aborted by user.', 'warn');
      } else {
        log('file share failed: ' + (err && err.name) + ': ' + (err && err.message), 'bad');
      }
    });
  });

  copyBtn.addEventListener('click', function () {
    var url = location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        log('copied to clipboard: ' + url, 'ok');
      }, function (err) {
        log('clipboard write failed: ' + err, 'bad');
      });
    } else {
      log('no clipboard API; the URL is ' + url, 'warn');
    }
  });

  /* ------------------------------------------------------------ install prompt */

  var deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function (event) {
    // Chromium fires this when the page passes the installability checks.
    // Preventing the default lets us show the prompt on our own button instead.
    event.preventDefault();
    deferredPrompt = event;
    installBtn.disabled = false;
    installNote.textContent = 'The browser offered an install prompt. Tap “Install app”.';
    log('beforeinstallprompt fired — the page is installable.', 'ok');
    renderDiagnostics();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    installBtn.disabled = true;
    installNote.textContent = 'Installed. Look for the icon on your Home Screen or app drawer.';
    log('appinstalled fired — the icon has been added.', 'ok');
  });

  installBtn.addEventListener('click', function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (choice) {
      log('install prompt outcome: ' + choice.outcome, choice.outcome === 'accepted' ? 'ok' : 'warn');
      // The event is single-use; a dismissed prompt cannot be replayed.
      deferredPrompt = null;
      installBtn.disabled = true;
      if (choice.outcome === 'dismissed') {
        installNote.textContent = 'Prompt dismissed. Reload the page to get another one.';
      }
      renderDiagnostics();
    });
  });

  if (isStandalone) {
    installBtn.disabled = true;
    installNote.textContent = 'Already running as an installed app.';
  } else if (isIOS) {
    installBtn.disabled = true;
    installNote.textContent = isIOSSafari
      ? 'iOS has no install prompt API — follow the manual steps below.'
      : 'Only Safari can add to the iOS Home Screen. Open this page in Safari.';
    iosHelp.open = true;
  } else {
    // Chromium won't re-fire beforeinstallprompt if the app is already installed.
    setTimeout(function () {
      if (!deferredPrompt) {
        installNote.textContent = 'No install prompt yet. Either this browser does not support it, ' +
          'the app is already installed, or the installability criteria are not met (needs HTTPS, ' +
          'a manifest with icons, and a service worker).';
      }
    }, 3000);
  }

  /* ----------------------------------------------------------- service worker */

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(new URL('sw.js', location.href)).then(function (reg) {
        log('service worker registered, scope ' + reg.scope, 'ok');
        renderDiagnostics();
      }, function (err) {
        log('service worker registration failed: ' + err, 'bad');
      });
    });
  } else {
    log('service worker skipped (needs HTTPS or localhost).', 'warn');
  }

  renderDiagnostics();
  log('ready. url = ' + location.href);
})();

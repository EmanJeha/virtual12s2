/* Connects to your Firebase Realtime Database (if config.js is filled in).
   Data layout:
     sessions/<game>/state                         { status: waiting | live | ended, round, startedAt }
     sessions/<game>/rounds/<round>/players/<id>    one record per pair: name, score, q, correct, answers, done ... */
window.LIVE = (function () {
  const cfg = window.FIREBASE_CONFIG || {};
  const filled = cfg.apiKey && cfg.databaseURL && !/PASTE/.test(cfg.apiKey + cfg.databaseURL);
  let db = null, error = '';
  if (filled && window.firebase) {
    try { if (!firebase.apps.length) firebase.initializeApp(cfg); db = firebase.database(); }
    catch (e) { error = e.message; }
  } else if (filled) error = 'The Firebase library did not load. Check the internet connection.';
  // Each lesson keeps its own scores, so these games never mix with older ones in the same database.
  const P = window.SESSION_KEY ? window.SESSION_KEY + '-' : '';
  return {
    on: !!db, error, filled: !!filled,
    stateRef: (g) => db.ref('sessions/' + P + g + '/state'),
    playersRef: (g, round) => db.ref('sessions/' + P + g + '/rounds/' + round + '/players'),
    playerRef: (g, round, id) => db.ref('sessions/' + P + g + '/rounds/' + round + '/players/' + id),
    now: () => firebase.database.ServerValue.TIMESTAMP,
  };
})();

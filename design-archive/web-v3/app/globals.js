/* Expose React hooks as globals so every Babel script can use them
   without re-declaring (Babel scripts don't share lexical scope). */
(function () {
  var R = window.React;
  window.useState = R.useState;
  window.useEffect = R.useEffect;
  window.useRef = R.useRef;
  window.useMemo = R.useMemo;
  window.useCallback = R.useCallback;
  window.useContext = R.useContext;
  window.useLayoutEffect = R.useLayoutEffect;
})();

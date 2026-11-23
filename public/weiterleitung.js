// SPA redirect handshake with 404.html — restores the path the user asked for.
(function () {
  var q = window.location.search;
  if (q && q.indexOf("p=") !== -1) {
    var params = new URLSearchParams(q);
    var p = params.get("p") || "";
    var qq = params.get("q") || "";
    window.history.replaceState(
      null,
      "",
      window.location.pathname.replace(/\/$/, "") +
        p.replace(/~and~/g, "&") +
        (qq ? "?" + qq.replace(/~and~/g, "&") : "") +
        window.location.hash
    );
  }
})();

// Vorschaukarten liegen als Ordner mit index.html (scripts/karten.mjs), der
// Server haengt deshalb einen Schraegstrich an: /erkunden/. Die App kennt ihre
// Adressen ohne; mit ihm erkennt etwa der Reiter "Geldfluss" seine Seite nicht.
// Die Wurzel behaelt ihren.
(function () {
  var basis = new URL(document.currentScript.src).pathname.replace(/[^/]*$/, "");
  var l = window.location;
  if (l.pathname.length > basis.length && /\/$/.test(l.pathname)) {
    window.history.replaceState(null, "", l.pathname.replace(/\/+$/, "") + l.search + l.hash);
  }
})();

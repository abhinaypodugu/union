// Preview helper for cards & UI kits: resolves the Commons component library.
// Uses the compiled _ds_bundle.js when present; otherwise compiles components/*.jsx in-browser with Babel.
(function () {
  var here = document.currentScript.src;
  var root = here.replace(/guidelines\/ds-loader\.js.*$/, '');
  var FILES = ["core/Icon","core/Button","core/IconButton","core/Badge","core/Tag","core/Avatar","core/Card","forms/Field","forms/Input","forms/Select","forms/Checkbox","forms/Switch","navigation/Tabs","navigation/TabBar","navigation/SideNav","feedback/Dialog","feedback/Toast","feedback/Tooltip","feedback/Notice","domain/issues/StatusBadge","domain/feed/AudienceLabel","domain/org/CommitteeBadge","domain/issues/IssueCard","domain/feed/PostCard","domain/issues/EscalationTimeline","domain/org/OrgTree","domain/activity/NotificationItem","domain/activity/MetricTile","domain/feed/AudienceSummary"];
  function findNS() {
    if (window.Commons && window.Commons.IssueCard) return window.Commons;
    var keys = Object.keys(window);
    for (var i = 0; i < keys.length; i++) {
      try { var v = window[keys[i]]; if (v && typeof v === 'object' && v.IssueCard && v.Button && v.OrgTree) return v; } catch (e) {}
    }
    return null;
  }
  function compile() {
    return Promise.all(FILES.map(function (f) { return fetch(root + 'components/' + f + '.jsx').then(function (r) { return r.text(); }); }))
      .then(function (srcs) {
        var seen = [];
        var code = srcs.map(function (s) {
          var mine = [];
          s = s.replace(/^import[^;]*;\s*$/gm, '');
          s = s.replace(/export\s+(function|const)\s+([A-Za-z0-9_]+)/g, function (_, k, n) { mine.push(n); return k + ' ' + n; });
          var pre = seen.length ? 'const {' + seen.join(',') + '} = __x;\n' : '';
          seen = seen.concat(mine);
          return '(function(){\n' + pre + s + '\nObject.assign(__x, {' + mine.join(',') + '});\n})();';
        }).join('\n');
        var out = Babel.transform(code, { presets: ['react'] }).code;
        var x = {};
        new Function('React', '__x', out)(React, x);
        return x;
      });
  }
  window.DS = {
    root: root,
    ready: new Promise(function (resolve) {
      var ns = findNS();
      if (ns) return resolve(ns);
      var s = document.createElement('script');
      s.src = root + '_ds_bundle.js';
      s.onload = function () { var n = findNS(); n ? resolve(window.Commons = n) : compile().then(function (c) { resolve(window.Commons = c); }); };
      s.onerror = function () { compile().then(function (c) { resolve(window.Commons = c); }); };
      document.head.appendChild(s);
    })
  };
})();

'use strict';
const url = require('url');
exports.validateUrl = function (plan, src) {
  const base = plan.baseUrl;
  // not relative or absolute?
  if (/^(?:\/|\.\.?(?:\/|$))/.test(src) !== true) {
    const target = url.parse(src);
    // remove protocol
    if (target.protocol) {
      target.protocol = null;
      return exports.validateUrl(plan, url.format(target));
    }
    else return `./${src}`;
  }
  // protocol relative
  if (typeof base === 'string' && src.indexOf(`//${base}`) === 0) {
    return `/${src.slice(2 + base.length)}`;
  }
  // bare
  return null;
}
// used to block an operation until it completes, and all child
// operations complete
exports.refSpace = function (onDone, dbg) {
  let todo = 0;
  let closed = false;
  let done = false;
  function check() {
    if (done) return;
    if (closed && todo === 0) {
      done = true;
      onDone();
    }
  }
  return {
    ref() {
      if (closed) throw TypeError('Already closed');
      let used = false;
      todo++;
      return () => {
        if (used) return;
        todo--;
        used = true;
        check();
      }
    },
    close() {
      closed = true;
      check();
    }
  }
}

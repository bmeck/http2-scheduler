'use strict';
const url = require('url');
exports.validateUrl = function (plan, src) {
  if (src.slice(0,2) === '//') return null;
  // not relative or absolute?
  if (/^(?:\/|\.\.?(?:\/|$))/.test(src) !== true) {
    const target = url.parse(src);
    // skip remote calls
    if (target.protocol) return null; 
    else return `./${src}`;
  }
  // bare
  return src;
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
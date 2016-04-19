'use strict';
// note: circular deps are dropped
const mississippi = require('mississippi');
const parserlib = require('parserlib');
const validateUrl = require('../util.js').validateUrl;
const refSpace = require('../util.js').refSpace;

module.exports = function planCSS(plan, supplier) { 
  const ret = mississippi.through.obj();
  const concat = mississippi.concat((body) => {
    const refs = refSpace(() => {
      ret.end(plan);
    });
    if (!body || body.length === 0) {
      refs.close();
      return;
    }
    const bodystr = body.toString();
    const parser = new parserlib.css.Parser();
    let index = 0;
    let line = 1;
    let col = 1;
    // line & col are 1 based
    function writeUntil(to_line, to_col) {
      const start = index;
      while (line < to_line) {
        index++;
        if (index > body.length) throw RangeError();
        if (body[index] === '\n'.charCodeAt(0)) {
          line++;
          col = 1;
        }
      }
      while (col < to_col) {
        index++;
        col++;
      }
      plan.write(body.slice(start, index));
    }
    parser.addListener('import', (evt) => {
      const url = validateUrl(plan, evt.uri);
      if (url !== null) {
        // guh, no simple way to figure out length of import string,
        // just write til start of it
        writeUntil(evt.line, evt.col);
        const importPlan = plan.fork(url);
        if (importPlan === null) {
          return;
        }
        const cssPlanner = planCSS(importPlan, supplier);
        const cssUnref = refs.ref();
        cssPlanner.on('end', cssUnref);
        cssPlanner.resume();
        supplier.createReadStream(importPlan).pipe(cssPlanner);
      }
    });
    parser.parse(bodystr);
    refs.close();
    plan.write(body.slice(index));
  });
  return mississippi.duplex.obj(concat, ret); 
}

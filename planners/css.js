'use strict';
const mississippi = require('mississippi');
const parserlib = require('parserlib');

module.exports = function planCSS(plan, supplier) { 
  const ret = mississippi.through.obj();
  const concat = mississippi.concat((body) => {
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
      plan.write(body.slice(start, index).toString());
    }
    parser.addListener('import', (evt) => {
      //console.log('interleave', evt.uri)
      //writeUntil(evt.line, evt.col);
    });
    parser.parse(body.toString());
    plan.write(body.slice(index));
    ret.end();
  });
  return mississippi.duplex.obj(concat, ret); 
}

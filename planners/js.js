"use strict";
// note: circular deps are dropped
const mississippi = require('mississippi');
const detect = require('detect-import-require');
const refSpace = require('../util.js').refSpace;

module.exports = function planJS(plan, supplier) {
  const ret = mississippi.through.obj();
  const concat = mississippi.concat((body) => {
    body = body.toString();
    const refs = refSpace(()=> {
      ret.end(plan);
    });
    const items = detect.find(body, {
      requires: false,
      imports: true
    });
    let index = 0;
    function writeUntil(offset) {
      plan.write(body.slice(index, offset));
      index = offset;
    }
    for (let i = 0; i < items.strings.length; i++) {
      writeUntil(items.nodes[i].end);
      const url = items.strings[i];
      const importPlan = plan.fork(url);
      if (importPlan === null) {
        //circular
        continue;
      }
      const jsPlanner = planJS(importPlan, supplier);
      const jsUnref = refs.ref();
      jsPlanner.on('end', jsUnref);
      jsPlanner.resume();
      const s = supplier.createReadStream(importPlan);
      s.pipe(jsPlanner);
    }
    writeUntil(body.length);
    refs.close();
  });
  return mississippi.duplex.obj(concat, ret);
}

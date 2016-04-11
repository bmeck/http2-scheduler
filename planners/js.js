"use strict";
const mississippi = require('mississippi');
const detect = require('detect-import-require');

module.exports = function planJS(plan, supplier) {
  const ret = mississippi.through.obj();
  const concat = mississippi.concat((body) => {
    plan.write(detect(body.toString()));
    ret.end(plan); 
  });
  return mississippi.duplex.obj(concat, ret);
}

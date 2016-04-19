"use strict";
const mississippi = require('mississippi');
const url = require('url');
const parse5 = require('parse5');
const planJS = require('./js.js');
const planCSS = require('./css.js');
const validateUrl = require('../util.js').validateUrl;
const refSpace = require('../util.js').refSpace;
//
// css:
//   interleaves immediately - https://jakearchibald.com/2016/link-in-body/
//   circular deps are not re-entrant
// js:
//   src - interleaves immediately
//   defer src - interleaves at end of body
//   defer async src - interleaves after `defer src`
//   async src - interleaves after `defer async src`
//   circular deps are not re-entrant
//
// todo:
//   hooks for: iframe, img

module.exports = function planHTML(originalPlan, supplier) {
  const ret = mississippi.through.obj();
  let plan = originalPlan;
  let scriptPlan = null;
  let scriptPrevPlan = null;
  let lastBody = null;
  let lastHTML = null;
  let trailer_defer = originalPlan.split();
  let trailer_defer_async = originalPlan.split();
  let trailer_async = originalPlan.split();
  const concat = mississippi.concat((body) => {
    const parser = new parse5.SAXParser({
      locationInfo: true
    });
    
    let index = 0;
    let refs = refSpace(() => {
      writeUntil(body.length);
      ;(lastBody || lastHTML || originalPlan)
        .join(trailer_defer)
        .join(trailer_defer_async)
        .join(trailer_async);
      ret.end(originalPlan);
    })
    const parserUnref = refs.ref(parser);
    
    function writeUntil(offset) {
      plan.write(body.slice(index, offset));
      index = offset;
    }
    parser.on('startTag', (tag, attrs, selfClosing, location) => {
      if (tag === 'script') {
        if (selfClosing) {
          throw Error(`Self closing <script/> has strange behavior, aborting`);
        }
        let defer = false;
        let async = false;
        let src = null;
        attrs.forEach(function (attrs) {
          if (attrs.name === 'defer') defer = true;
          if (attrs.name === 'async') async = true;
          if (attrs.name === 'src') src = attrs.value;
        });
        scriptPrevPlan = plan;
        if (typeof src === 'string') {
          let basePlan = plan;
          if (src.length === 0) {
            throw Error(`Cannot handle an empty src attribute, aborting`);
          }
          if (defer) {
            if (async) basePlan = trailer_defer_async;
            else basePlan = trailer_defer;
          }
          else if (async) basePlan = trailer_async;
          writeUntil(location.startOffset);
          plan = basePlan;
          writeUntil(location.endOffset);
          const url = validateUrl(plan, src);
          if (url !== null) {
            scriptPlan = basePlan.fork(url);
            if (scriptPlan) {
              const jsPlanner = planJS(scriptPlan, supplier);
              const jsUnref = refs.ref();
              jsPlanner.on('end', jsUnref);
              jsPlanner.resume();
              supplier.createReadStream(scriptPlan).pipe(jsPlanner);
            }
          }
        }
        else {
          scriptPlan = plan;
        }
      }
      if (tag === 'link') {
        let rel = null;
        let href = null;
        attrs.forEach(function (attrs) {
          if (attrs.name === 'rel') rel = attrs.value;
          if (attrs.name === 'href') href = attrs.value;
        });
        if (rel === 'stylesheet') {
          writeUntil(location.endOffset);
          const linkPlan = plan.fork(href);
          if (linkPlan) {
            const cssPlanner = planCSS(linkPlan, supplier);
            const cssUnref = refs.ref();
            cssPlanner.on('end', cssUnref);
            cssPlanner.resume();
            supplier.createReadStream(linkPlan).pipe(cssPlanner);
          }
        }
      }
    });
    parser.on('endTag', (tag, location) => {
      if (tag === 'html') {
        writeUntil(location.startOffset);
        lastHTML = plan.fork();
      }
      if (tag === 'body') {
        writeUntil(location.startOffset);
        lastBody = plan.fork();
      }
      if (tag === 'script') {
        writeUntil(location.endOffset + 1);
        plan = scriptPrevPlan;
        scriptPlan = null;
      }
    });
    parser.on('end', () => {
      parserUnref();
      refs.close();
    });
    parser.end(body);
  });
  return mississippi.duplex.obj(concat, ret);
}

"use strict";
const mississippi = require('mississippi');
const url = require('url');
const parse5 = require('parse5');
const planJS = require('./js.js');
const planCSS = require('./css.js');

// html -> directive[]
module.exports = function planHTML(originalPlan, supplier) {
  const ret = mississippi.through.obj();
  let plan = originalPlan;
  let scriptPlan = null;
  let scriptPrevPlan = null;
  let lastBody = null;
  let lastHTML = null;
  let trailer = originalPlan.split();
  const concat = mississippi.concat((body) => {
    const parser = new parse5.SAXParser({
      locationInfo: true
    });
    
    let index = 0;
    let refs = 0;
    function ref(stream, msg) {
      refs++;
      stream.once('end', () => {
        refs--;
        if (refs === 0) {
          writeUntil(body.length);
          ;(lastBody || lastHTML || originalPlan).join(trailer);
          ret.end(originalPlan);
        }
      });
      return stream;
    }
    ref(parser);
    
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
          if (defer) {
            if (async) basePlan = trailer.defer().async();
            else basePlan = trailer.defer();
          }
          else if (async) basePlan = trailer.async();
          writeUntil(location.startOffset);
          plan = basePlan;
          writeUntil(location.endOffset);
          let skipInterleave = false;
          if (src.slice(0,2) === '//') skipInterleave = true;
          if (/^(?:\/|\.\.?(?:\/|$))/.test(src) !== true) {
            const target = url.parse(src);
            // skip remote calls
            if (target.protocol) skipInterleave = true;
            else src = (/\/$/.test(plan.currentUrl) ? './' : '../') + src;
          }
          if (!skipInterleave) {
            scriptPlan = basePlan.fork(src);
            //scriptPlan.write(`\n\nINTERLEAVE ${src}\n\n`);
            const jsPlanner = ref(planJS(scriptPlan, supplier)).resume();
            supplier.createReadStream(scriptPlan).pipe(jsPlanner);
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
          //linkPlan.write(`\n\nINTERLEAVE ${href}\n\n`);
          const cssPlanner = ref(planCSS(linkPlan, supplier)).resume();
          supplier.createReadStream(linkPlan).pipe(cssPlanner);
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
    parser.end(body);
  });
  return mississippi.duplex.obj(concat, ret);
}
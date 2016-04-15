"use strict";
const path = require('path').posix;
exports.Plan = class Plan {
  constructor(
    parent,
    baseUrl,
    currentUrl
  ) {
    this.parent = parent || null;
    this.baseUrl = baseUrl;
    this.currentUrl = currentUrl;
    
    this.steps = [];
  }
  split() {
    const plan = new Plan(this, this.baseUrl, this.currentUrl);
    return plan;
  }
  join(other) {
    this.steps.push({
      type: 'Fork',
      plan: other 
    });
    return this;
  }
  // returns null if this would cause circular dep
  fork(newUrl) {
    let url;
    if (newUrl === undefined) {
      url = this.currentUrl;
    }
    else {
      const dir = this.currentUrl.slice(-1) === '/' ?
        this.currentUrl :
        path.dirname(this.currentUrl);
      url = path.resolve(this.baseUrl, dir, newUrl);
    }
    let needle = this;
    while (needle !== null) {
      if (needle.currentUrl === url) {
        return null;
      }
      needle = needle.parent;
    }
    const plan = new Plan(this, this.baseUrl, url);
    this.steps.push({
      type: 'Fork',
      plan: plan 
    });
    return plan;
  } // generates a new Plan, with this as the parent
  write(buffer) {
    this.steps.push({
      type: 'Write',
      body: buffer
    });
  }
  inspect() {
    return {
      steps: this.steps.map(s => s.type === 'Write' ? s.body : s)
    }
  }
  toString() {
    let ret = ``;
    for (const step of this.linearize()) {
      const url = step.url;
      const lines = String(step.write).split(/\r?\n/g).join(`\r\n${url}:: `);
      ret += `${url}:: ${lines}\r\n`;
    }
    return ret;
  }
  
  *linearize() {
    let wrote = false;
    for (const step of this.steps) {
      if (step.type === 'Write') {
        if (step.body.length === 0) continue;
        wrote = true;
        yield {
          url: this.currentUrl,
          write: step.body
        };
      }
      else if (step.type === 'Fork') {
        yield* step.plan.linearize();
      }
    }
    if (!wrote) {
      yield {
        url: this.currentUrl,
        write: new Buffer(0)
      };
    }
  }
}

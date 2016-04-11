"use strict";
const path = require('path');
exports.Plan = class Plan {
  constructor(
    parent,
    baseUrl,
    currentUrl
  ) {
    this.parent = parent;
    this.baseUrl = baseUrl;
    this.currentUrl = currentUrl;
    
    this.steps = [];
    this._defer = null;
    this._async = null;
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
  }
  fork(newUrl) {
    const url = newUrl === undefined ?
      this.currentUrl :
      path.resolve(this.baseUrl, path.join('./', path.resolve(this.currentUrl, newUrl)));
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
  // written after writes are done for this Plan
  defer() {
    if (this._defer === null) {
      this._defer = new Plan(this, this.baseUrl, this.currentUrl);
    }
    return this._defer.fork();
  }
  // written after *all* defers are done
  async() {
    if (this._async === null) {
      this._async = new Plan(this, this.baseUrl, this.currentUrl);
    }
    return this._async.fork();
  }
  
  inspect() {
    return {
      steps: this.steps.map(s => s.type === 'Write' ? s.body : s),
      defer: this._defer,
      async: this._async
    }
  }
  toString() {
    let ret = '';
    let tag = `${this.currentUrl}: `;
    for (const step of this.steps) {
      if (step.type === 'Write') {
        ret += tag + step.body.toString().split(/\n/g).join(`\n${tag}`) + '\n';
      }
      else if (step.type === 'Fork') {
        ret += step.plan.toString();
      }
    }
    if (this._defer !== null) ret += this._defer.toString();
    if (this._async !== null) ret += this._async.toString();
    return ret;
  }
}

"use strict";
const fs = require('fs');
const path = require('path');

exports.Supplier = class Supplier {
  constructor(dir) {
    this.dir = dir;
  }
  createReadStream(plan) {
    const file = path.resolve(this.dir, path.join('./', plan.currentUrl));
    return fs.createReadStream(file);
  }
}
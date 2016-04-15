"use strict";
// usage: node index.js /path/to/index.html

const target = process.argv[2];
const path = require('path').posix;
const htmlPlanner = require('./planners/html.js');
const Plan = require('./Plan.js').Plan;
const Supplier = require('./Supplier.js').Supplier;
const sup = new Supplier(path.dirname(target));
const root = new Plan(null,'/',path.resolve('/',path.basename(target)));
const plan = htmlPlanner(
  root,
  sup
);
sup.createReadStream(root).pipe(plan);
plan.on('data', plan => console.log(plan+''));


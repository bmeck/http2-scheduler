"use strict";

const htmlPlanner = require('./planners/html.js');
const Plan = require('./Plan.js').Plan;
const Supplier = require('./Supplier.js').Supplier;
const sup = new Supplier(__dirname);
const root = new Plan(null,'/','/test/fixture/single-script.html');
const plan = htmlPlanner(
  root,
  sup
);
sup.createReadStream(root).pipe(plan);
plan.on('data', plan => console.log(plan+''));

return;
// https://jakearchibald.com/2016/link-in-body/

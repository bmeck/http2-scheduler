#!/usr/bin/env node
"use strict";
// usage: node index.js /path/to/index.html

const argv = require('yargs')
  .help('help')
  .alias('h', 'help')
  .option('base', {
    type: 'string',
    alias: 'b',
    default: ''
  })
  .choices('output', ['tar','debug'])
  .string()
  .demand(1)
  .argv;

const base = `${argv.base}${argv.base.slice(-1)==='/'?'':'/'}`;
const target = argv._[0];
const path = require('path').posix;
const htmlPlanner = require('../planners/html.js');
const Plan = require('../Plan.js').Plan;
const Supplier = require('../Supplier.js').Supplier;
const sup = new Supplier(path.dirname(target));
const root = new Plan(null,base,path.resolve('/',path.basename(target)));
const plan = htmlPlanner(
  root,
  sup
);
sup.createReadStream(root).pipe(plan);
plan.on('data', plan => console.log(plan+''));


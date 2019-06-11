"use strict";

const util = require("util");

const timers = {};
const stack = [{ n: "main", t: process.hrtime.bigint(), c: 0n }];

const t_start = name => {
  stack.push({ n: name, t: process.hrtime.bigint(), c: 0n });
};

const t_end = name => {
  let o = stack[stack.length - 1];
  if (o.n !== name) {
    console.log(
      new Error(
        "missing end for " + name + " got " + o.n + " " + util.inspect(stack)
      )
    );
    process.exit(1);
  }
  stack.pop();
  const t = process.hrtime.bigint() - o.t;

  if (o.c) o.self = t - o.c;
  else o.self = t;

  if (!timers[name]) {
    timers[name] = { count: 0, self: 0n, total: 0n };
  }

  timers[name].count++;
  timers[name].self += o.self;
  timers[name].total += t;
  stack[stack.length - 1].c += t;
};

const timings = () => {
  let o = [];
  let total = process.hrtime.bigint();

  Object.keys(timers).forEach(k => {
    const s = Number(timers[k].self) * 1e-6;
    const p = (s / (Number(total - stack[0].t) * 1e-6)) * 100;
    o.push({
      name: k,
      count: timers[k].count,
      self: +(Number(timers[k].self) * 1e-6).toPrecision(5),
      total: +(Number(timers[k].total) * 1e-6).toPrecision(5),
      pcent: +(Number(p)).toPrecision(3)
    });
  });

  o.sort((o1, o2) => (o1.self < o2.self ? 1 : -1));
  return o;
};

const timerifyFn = (fn, name) => {
  // console.log("Timerifying:", name, fn);
  return function() {
    // console.log(name, fn, arguments);
    let ret;
    t_start(name);
    try {
      ret = fn.apply(this, arguments);
    } finally {
      t_end(name);
    }
    return ret;
  };
};

const timerifyModule = (mod, name = null) => {
  if (!mod) return;
  Object.keys(mod).forEach(key => {
    if (typeof mod[key] === "function" && !(key === mod.name)) {
      mod[key] = timerifyFn(mod[key], `${name ? name : mod.name}.${key}`);
    }
  });
};

module.exports = {
  timers,
  t_start,
  t_end,
  timings,
  timerifyFn,
  timerifyModule
};

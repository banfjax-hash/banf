#!/usr/bin/env node
// Extract EC member info from all Financial Summary + EC-related PPTX files
var Z = require('adm-zip');
var path = require('path');
var fs = require('fs');

var base = 'banf1-wix/banf-data_ingest/data/';
var outDir = 'banf1-wix/banf-data_ingest/output/';

// All interesting PPTX files
var files = [];
try {
  fs.readdirSync(base).filter(function(f) { return f.endsWith('.pptx'); }).forEach(function(f) {
    files.push({ path: base + f, name: f });
  });
} catch(e) {}
try {
  fs.readdirSync(outDir).filter(function(f) { return f.endsWith('.pptx') && (f.includes('EC') || f.includes('Transition') || f.includes('GBM')); }).forEach(function(f) {
    files.push({ path: outDir + f, name: f });
  });
} catch(e) {}

// Also check root
fs.readdirSync('.').filter(function(f) { return f.endsWith('.pptx'); }).forEach(function(f) {
  files.push({ path: f, name: f });
});

console.log('Scanning', files.length, 'PPTX files\n');

files.forEach(function(file) {
  try {
    var z = new Z(file.path);
    var slides = z.getEntries().filter(function(e) {
      return /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName);
    }).sort(function(a, b) {
      return parseInt(a.entryName.match(/\d+/)) - parseInt(b.entryName.match(/\d+/));
    });

    var anyEC = false;
    var slideTexts = [];

    slides.forEach(function(e) {
      var xml = e.getData().toString('utf8');
      var mm = xml.match(/<a:t>[^<]+<\/a:t>/g) || [];
      var t = mm.map(function(v) { return v.replace(/<\/?a:t>/g, ''); }).join(' | ');
      slideTexts.push({ num: e.entryName.match(/slide(\d+)/)[1], text: t });
      if (/president|vice president|treasurer|secretary|coordinator|EC\s*(team|member)/i.test(t)) {
        anyEC = true;
      }
    });

    if (anyEC) {
      console.log('\n╔══ ' + file.name + ' (' + slides.length + ' slides) ══╗');
      slideTexts.forEach(function(s) {
        if (/president|vice president|treasurer|secretary|coordinator|EC\s*(team|member)|elected|transition/i.test(s.text)) {
          console.log('  Slide ' + s.num + ': ' + s.text.substring(0, 400));
          console.log('');
        }
      });
    }
  } catch(err) {
    // skip
  }
});

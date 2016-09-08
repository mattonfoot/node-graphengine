var fs = require('fs');
var glob = require('glob');
var path = require('path');
var N3StreamParser = require('n3').StreamParser;

var SourceParser = require('./lib/SourceParser');
var Distributer = require('./lib/Distributer');
var RuleFactory = require('./lib/ontology/RuleFactory');
var GraphFactory = require('./lib/graphs/GraphFactory');
var N3GraphWriter = require('./lib/graphs/N3GraphWriter');
var JsonldGraphWriter = require('./lib/graphs/./JsonldGraphWriter');
var HtmlGraphWriter = require('./lib/graphs/./HtmlGraphWriter');

var config = require('./config.json');

var distributer = new Distributer();

var ruleFactory = new RuleFactory(distributer, config.store);
distributer.withRuleFactory(ruleFactory);

var graphFactory = new GraphFactory(config.dest, config.vocab);
graphFactory.withGraphWriter(N3GraphWriter);
graphFactory.withGraphWriter(JsonldGraphWriter);
graphFactory.withGraphWriter(HtmlGraphWriter);
distributer.withGraphFactory(graphFactory);

glob(config.src, function (err, paths) {
  if (err) {
    console.error('Failed to read source %s', config.src);
    console.error(err);
    console.error(err.stack);

    return;
  }

  paths.push(config.ontology);

  loadFiles(paths);
});

function loadFiles(paths) {
  if (!paths.length) return;

  var srcfile = paths.pop();

  var parser = new SourceParser(srcfile).end(() => loadFiles(paths));
  parser.pipe(distributer);
}

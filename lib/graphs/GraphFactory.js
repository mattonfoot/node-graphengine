var N3Util = require('n3').Util;
var iri = require('iri');

var DynamicGraph = require('./DynamicGraph');

function GraphFactory(dest, vocab) {
  this.entities = {};
  this.rules = {};
  this.bNodes = {};
  this.bNodeBuffer = {};
  this.dest = dest;
  this.vocab = vocab;
  this.context = {};
  this.graphWriters = [];

  this.context[''] = this.context[''] || this.vocab;
  this.context.base = this.context.base || this.vocab;
}

GraphFactory.prototype.addTriple = function (triple) {
  var s = triple.subject;

  if (N3Util.isBlank(s)) return handleBlankNode.call(this, triple);
  if (N3Util.isIRI(s)) return handleIriNode.call(this, triple);

  console.log('unhandled subject', s);

  return this;
};

GraphFactory.prototype.addPrefix = function (prefix, iri) {
  if (prefix in this.context) return this;

  this.context[prefix] = iri;

  for (var s in this.entities) this.entities[s].setContext(this.context);

  return this;
};

GraphFactory.prototype.withGraphWriter = function (writer) {
  this.graphWriters.push(writer);

  return this;
};

// private methods

function isFromVocab(vocab) {
  return (x) => x.indexOf(vocab) === 0;
}

function isFromOntology(x) {
  var test = isFromVocab({ owl: 'http://www.w3.org/2002/07/owl#' });
  return test(x.subject) || test(x.predicate);
}

function handleBlankNode(triple) {
  var s = triple.subject;

  if (this.bNodes[s]) return this.entities[this.bNodes[s]].addTriple(triple);

  (this.bNodeBuffer[s] = this.bNodeBuffer[s] || []).push(triple);

  return this;
}

function handleIriNode(triple) {
  var s = triple.subject;

  if (isFromVocab(this.vocab)(s)) {
    return handleEntityNode.call(this, this.dest, triple);
  }

  if (isFromOntology(triple)) return;

  var tmp = '.temp/' + new iri.IRI(s).host() + '/';

  return handleEntityNode.call(this, tmp, triple);
}

function handleEntityNode(dest, triple) {
  var s = new iri.IRI(triple.subject).toAbsolute().toIRIString();

  this.entities[s] = this.entities[s] ||
      new DynamicGraph(this.graphWriters.map((x) => new x(dest, s)), this.context);

  if (N3Util.isBlank(triple.object) && !this.bNodes[triple.object]) this.bNodes[triple.object] = s;

  this.entities[s].addTriple(triple);
  drainBlankNodeBuffer.call(this, s, triple.object);

  return this;
}

function drainBlankNodeBuffer(s, o) {
  if (!this.bNodeBuffer[o]) return;

  this.bNodeBuffer[o].forEach((t) => {
    this.entities[s].addTriple(t);

    drainBlankNodeBuffer.call(this, s, t.object);
  });

  delete this.bNodeBuffer[o];

  return this;
}

module.exports = GraphFactory;

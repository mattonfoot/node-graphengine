var N3Util = require('n3').Util;
var iri = require('iri');

var InverseOfRule = require('./InverseOfRule');
var SameAsRule = require('./SameAsRule');
var SubClassOfRule = require('./SubClassOfRule');

function RuleFactory(distributer, store) {
  this.rules = {};
  this.hasRules = false;

  this.store = store;
  this.distributer = distributer;

  this.prefixes = {
    rdf:  'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    xsd:  'http://www.w3.org/2001/XMLSchema#',
    owl:  'http://www.w3.org/2002/07/owl#',
  };
}

RuleFactory.prototype.addTriple = function (triple) {
  var s = triple.subject;

  if (N3Util.isBlank(s)) return;
  if (N3Util.isIRI(s)) return handleIriNode.call(this, triple);

  console.log('unhandled subject', s);

  return this;
};

// private methods

function getOwlRule(distributer, store, triple) {
  var p = triple.predicate;

  switch (p) {
    case 'http://www.w3.org/2002/07/owl#inverseOf':
      return new InverseOfRule(distributer, store, triple);
    case 'http://www.w3.org/2002/07/owl#sameAs':
      return new SameAsRule(distributer, store, triple);
    case 'http://www.w3.org/2000/01/rdf-schema#subClassOf':
      return new SubClassOfRule(distributer, store, triple);
    default:
      return;
  }
}

function handleIriNode(triple) {
  var p = [triple.predicate, triple.subject, triple.object].join('+');

  if (this.rules[p]) return;

  var rule = getOwlRule(this.distributer, this.store, triple);
  if (rule) {
    this.rules[p] = rule;
    this.hasRules = true;
    return;
  }

  if (this.hasRules) processRules(this.rules, triple);
}

function processRules(rules, triple) {
  function p(x) {
    return () => rules[x].process(triple);
  }

  for (var rule in rules) {
    process.nextTick(p(rule));
  }
}

module.exports = RuleFactory;

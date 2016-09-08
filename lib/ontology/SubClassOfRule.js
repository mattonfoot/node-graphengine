const reasonerId = 'SubClassOf';
const rdfType = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

function SubClassOfRule(distributer, store, triple) {
  this.distributer = distributer;
  this.store = store;

  this.subclass = triple.subject;
  this.superclass = triple.object;
}

SubClassOfRule.prototype.process = function (triple) {
  if (triple.reasoner === reasonerId || triple.predicate !== rdfType || triple.object !== this.subclass) return;

  var reasonedTriple = {
    subject: triple.subject,
    predicate: rdfType,
    object: this.superclass,
    graph: triple.graph,
    reasoner: reasonerId,
  };

  this.distributer.addTriple(reasonedTriple);

  return this;
};

module.exports = SubClassOfRule;

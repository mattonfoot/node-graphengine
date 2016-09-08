const reasonerId = 'InverseOf';

function InverseOfRule(distributer, store, triple) {
  this.distributer = distributer;
  this.store = store;

  this.predicates = {};
  this.predicates[triple.subject] = triple.object;
  this.predicates[triple.object] = triple.subject;
}

InverseOfRule.prototype.process = function (triple) {
  if (triple.reasoner === reasonerId) return;

  var i = this.predicates[triple.predicate];
  if (!i) return this;

  var reasonedTriple = {
    subject: triple.object,
    predicate: i,
    object: triple.subject,
    graph: triple.graph,
    reasoner: reasonerId,
  };

  this.distributer.addTriple(reasonedTriple);

  return this;
};

module.exports = InverseOfRule;

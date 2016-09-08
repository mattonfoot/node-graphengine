const reasonerId = 'SameAs';

function SameAsRule(distributer, store, triple) {
  this.distributer = distributer;
  this.store = store;

  this.predicates = {};
  this.predicates[triple.subject] = triple.object;
  this.predicates[triple.object] = triple.subject;
}

SameAsRule.prototype.process = function (triple) {
  if (triple.reasoner === reasonerId) return;

  var i = this.predicates[triple.predicate];
  if (!i) return this;

  var reasonedTriple = {
    subject: triple.subject,
    predicate: i,
    object: triple.object,
    graph: triple.graph,
    reasoner: reasonerId,
  };

  this.distributer.addTriple(reasonedTriple);

  return this;
};

module.exports = SameAsRule;


function DynamicGraph(writers, ctx) {
  this.graph = [];
  this.context = ctx || {};
  this.vocab = ctx.base;

  this.graphWriters = writers || [];
}

DynamicGraph.prototype.addTriple = function (triple) {
  this.graph.push(triple);

  this.graphWriters.forEach((x) => x.push(this.graph, this.context));

  return this;
};

DynamicGraph.prototype.setContext = function (ctx) {
  this.context = ctx;

  return this;
};

module.exports = DynamicGraph;

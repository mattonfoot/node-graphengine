var Stream = require('stream');

function Distributer() {
}

Distributer.prototype.getStream = function () {
  var stream = new Stream.Writable({ objectMode: true });

  const _write = (chunk, encoding, done) => {
    this.addTriple(chunk);

    done();
  };

  stream._write = function (chunk, encoding, done) {
    _write(chunk, encoding, done);
  };

  return stream;
};

Distributer.prototype.addTriple = function (triple) {
  if (this.ruleFactory) this.ruleFactory.addTriple(triple);
  if (this.graphFactory) this.graphFactory.addTriple(triple);
};

Distributer.prototype.addPrefix = function (p) {
  if (this.graphFactory) this.graphFactory.addPrefix(p.prefix, p.iri);
};

Distributer.prototype.withRuleFactory = function (ruleFactory) {
  this.ruleFactory = ruleFactory;
};

Distributer.prototype.withGraphFactory = function (graphFactory) {
  this.graphFactory = graphFactory;
};

module.exports = Distributer;

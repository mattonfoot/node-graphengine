var fs = require('fs');
var path = require('path');
var iri = require('iri');
var N3Writer = require('n3').Writer;
var mkdirp = require('mkdirp');

const AUTOEND_WINDOW_MS = 10;

const asPath = (x) => {
  var p = new iri.IRI(x).path();
  return p !== '/' ? p : 'index';
};

const asFilePath = (dir) => (x) => path.join(dir, asPath(x));

function N3GraphWriter(dir, iri, ctx) {
  this.filepath = asFilePath(dir)(iri) + '.ttl';
  this.writeScheduled = false;

  this.N3Options = { format: 'application/turtle' };
  this.fsOptions = { flags: 'w' };
}

N3GraphWriter.prototype.getWriter = function (filepath, ctx, cb) {
  mkdirp(path.dirname(filepath), (err) => {
    if (err) throw err;

    var ws = fs.createWriteStream(filepath, this.fsOptions);
    var writer = new N3Writer(ws, this.N3Options);

    if (ctx && !(/triple|quad/i).test(this.N3Options.format)) writer.addPrefixes(ctx);

    process.nextTick(() => cb(writer));
  });
};

N3GraphWriter.prototype.push = function (g, ctx) {
  if (!this.writeScheduled) {
    this.getWriter(this.filepath, ctx, (writer) => {
      g.forEach((t) => {
        writer.addTriple(t);
      });

      writer.end(function (err, result) {
        if (err) {
          console.error('Failed to end N3Writer %s', this.filepath);
          console.error(err);
          console.error(err.stack);

          return;
        }
      });

      this.writeScheduled = false;
    });

    this.writeScheduled = true;
  }

  return this;
};

module.exports = N3GraphWriter;

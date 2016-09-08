var fs = require('fs');
var path = require('path');
var N3Util = require('n3').Util;
var iri = require('iri');
var jsonld = require('jsonld');
var mkdirp = require('mkdirp');

const AUTOEND_WINDOW_MS = 10;

const asPath = (x) => {
  var p = new iri.IRI(x).path();
  return p !== '/' ? p : 'index';
};

const asFilePath = (dir) => (x) => path.join(dir, asPath(x));

const fixVocab = (c) => {
  var ctx = {};
  for (var p in c) {
    ctx[p] = c[p];
  }

  if (ctx && ctx['']) {
    if (!ctx['@vocab']) ctx['@vocab'] = ctx[''];
    delete ctx[''];
  }

  if (ctx && ctx.base) {
    if (!ctx['@vocab']) ctx['@vocab'] = ctx.base;
    delete ctx.base;
  }

  return ctx;
};

const asIRI = (x) => ({
  type: 'IRI',
  value: x,
});

const asLiteral = (x) => ({
  type: 'literal',
  value: N3Util.getLiteralValue(x),
  datatype: N3Util.getLiteralType(x),
});

const toRDF = (t) => {
  var x = {};
  x.subject = asIRI(t.subject);
  x.predicate = asIRI(t.predicate);
  x.object = N3Util.isLiteral(t.object) ? asLiteral(t.object) : asIRI(t.object);

  return x;
};

function JsonldGraphWriter(dir, iri, c) {
  var ctx = fixVocab(c);

  this.filepath = asFilePath(dir)(iri) + '.json';
  this.writeScheduled = false;
  var o = this.JsonldOptions = { frame: {
      '@id': iri,
      '@context': ctx || {},
    },
  };
}

JsonldGraphWriter.prototype.getWriter = function (filepath, c, cb) {
  var ctx = fixVocab(c);

  mkdirp(path.dirname(filepath), (err) => {
    if (err) throw err;

    var frame = {
      '@id': this.JsonldOptions.frame['@id'],
      '@context': ctx || this.JsonldOptions.frame['@context'] || {},
    };
    var filepath = this.filepath;
    var writer = {
      addGraph: function (x) {
        (this.graph = this.graph || []).push(x);
      },

      end: function (cb) {
        var onFrame = (err, rdf) => {
          if (err) cb(err);

          fs.writeFile(filepath, JSON.stringify(rdf, null, '  '), cb);
        };

        jsonld.fromRDF({ '@default': this.graph }, (err, rdf) => {
          if (err) cb(err);

          jsonld.frame({ '@context': ctx, '@graph': rdf }, frame, onFrame);
        });
      },
    };

    process.nextTick(() => cb(writer));
  });
};

JsonldGraphWriter.prototype.push = function (g, c) {
  var ctx = fixVocab(c);

  if (!this.writeScheduled) {
    this.getWriter(this.filepath, ctx, (writer) => {
      g.forEach((t) => {
        writer.addGraph(toRDF(t));
      });

      writer.end(function (err, result) {
        if (err) {
          console.error('Failed to end JsonldWriter %s', this.filepath);
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

module.exports = JsonldGraphWriter;

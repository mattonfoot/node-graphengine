var fs = require('fs');
var path = require('path');
var url = require('url');
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

const formatedObjectValue = (id, t) => {
  var v = t.object.value;

  if (t.object.type !== 'IRI') {
    return v;
  }

  var relUri = path.relative(path.dirname(id.pathname + '.html'), path.dirname(url.parse(v).pathname + '.html'));
  var uri = path.join(relUri, path.basename(url.parse(v).pathname + '.html'));

  return '<a rel="' + t.predicate.value + '" href="' + uri + '">' + v + '</a>';
};

function HtmlGraphWriter(dir, iri, c) {
  var ctx = fixVocab(c);

  this.filepath = asFilePath(dir)(iri) + '.html';
  this.writeScheduled = false;
  var o = this.JsonldOptions = { frame: {
      '@id': iri,
      '@context': ctx || {},
    },
  };
}

HtmlGraphWriter.prototype.getWriter = function (filepath, c, cb) {
  var ctx = fixVocab(c);

  mkdirp(path.dirname(filepath), (err) => {
    if (err) throw err;

    var frame = {
      '@id': this.JsonldOptions.frame['@id'],
      '@context': ctx || this.JsonldOptions.frame['@context'] || {},
    };
    var filepath = this.filepath;
    var view = this.view;
    var writer = {
      addGraph: function (x) {
        (this.graph = this.graph || []).push(x);
      },

      end: function (cb) {
        var id = url.parse(this.graph[0].subject.value);

        var html = [
          '<table cellspacing="0" cellpadding="5" border="1" style="margin:0 auto;width:960px">',
            '\t<tr>',
              '\t\t<th><a href="' + path.relative(id.pathname + '.html', id.pathname + '.html') + '">' + this.graph[0].subject.value + '</a></th>',
              '\t\t<td colspan="2">&nbsp;</td>',
            '\t</tr>',
        ];

        this.graph.map((t) => {
          html = html.concat([
            '\t<tr>',
              '\t\t<td>&nbsp;</td>',
              '\t\t<td>' + t.predicate.value + '</td>',
              '\t\t<td>' + formatedObjectValue(id, t) + '</td>',
            '\t</tr>',
          ]);
        });

        html.push('</table>');

        fs.writeFile(filepath, html.join('\r\n'), cb);
      },
    };

    process.nextTick(() => cb(writer));
  });
};

HtmlGraphWriter.prototype.push = function (g, c) {
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

module.exports = HtmlGraphWriter;

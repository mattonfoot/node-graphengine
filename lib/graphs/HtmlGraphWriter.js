var fs = require('fs');
var path = require('path');
var url = require('url');
var util = require('util');
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

const formatedObjectValue = (s, o, p) => {
  if (!N3Util.isIRI(o)) {
    return o;
  }

  var u = url.parse(o);

  var relUri = path.relative(path.dirname(s.pathname + '.html'), path.dirname(u.pathname + '.html'));
  var uri = path.join(relUri, path.basename(u.pathname + '.html'));

  return '<a rel="' + p + '" href="' + uri + '">' + o + '</a>';
};


const render = (g) => {
  if (!g['@graph'] || g['@graph'].length !== 1) {
    return;
  }

  g = g['@graph'][0] || g;

  var model = {};

  for (var prop in g) {
    switch (prop.split(':')[0]) {
      case 'rdf':
      case 'rdfs':
        (model = model || {})[prop.split(':')[1]] = g[prop];
        break;
      case 'owl':
        (model.owl = model.owl || {})[prop.split(':')[1]] = g[prop];
        break;
      default:
        if (prop.indexOf('@') === 0) {
          model[prop.replace('@', '')] = g[prop];
          break;
        }
        (model.doc = model.doc || {})[prop] = g[prop];
        break;
    }
  }

  var html = [];

  if (!model.id) {
    console.log(model);
  }

  var id = url.parse(model.id);
  var currentPredictate = '';

  html = html.concat([
    '<h1><a href="' + path.relative(id.pathname + '.html', id.pathname + '.html') + '">' + model.label + '</a></h1>',
    '<p>' + model.type + '</p>',
  ]);

  html.push('<table cellspacing="0" cellpadding="5" border="1">');

  for (var p in model.owl) {
    if (p === 'label') {
      continue;
    }

    html = html.concat([
      '\t<tr>',
        '\t\t<th valign="top">' + (p === currentPredictate ? '&nbsp;' : p) + '</th>',
        '\t\t<td valign="top">' + formatedObjectValue(id, model.owl[p]['@id'], p) + '</td>',
      '\t</tr>',
    ]);

    if (p !== currentPredictate) {
      currentPredictate = p;
    }
  }

  html.push('</table>');
  html.push('<h3>Other properties</h3>');
  html.push('<table cellspacing="0" cellpadding="5" border="1">');

  for (p in model.doc) {
    var  v = !util.isArray(model.doc[p]) ? formatedObjectValue(id, model.doc[p]['@id'], p) : model.doc[p].map((x) => formatedObjectValue(id, x['@id'], p)).join('</br>');

    html = html.concat([
      '\t<tr>',
        '\t\t<th valign="top">' + (p === currentPredictate ? '&nbsp;' : p) + '</th>',
        '\t\t<td valign="top">' + v + '</td>',
      '\t</tr>',
    ]);

    if (p !== currentPredictate) {
      currentPredictate = p;
    }
  }

  html.push('</table>');

  return html.join('\r\n');

  //return JSON.stringify(model, null, '  ');
};

function HtmlGraphWriter(dir, iri, c) {
  var ctx = fixVocab(c);

  this.filepath = asFilePath(dir)(iri) + '.html';
  this.writeScheduled = false;
  var o = this.JsonldOptions = { frame: {
      '@context': ctx || {},
      '@id': iri,
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
        jsonld.fromRDF({ '@default': this.graph }, (err, rdf) => {
          if (err) cb(err);

          jsonld.frame(rdf, frame, (err, x) => {
            if (err) cb(err);

            fs.writeFile(filepath, render(x), cb);
          });
        });
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

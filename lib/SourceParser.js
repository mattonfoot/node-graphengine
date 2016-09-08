var fs = require('fs');
var N3StreamParser = require('n3').StreamParser;

function SourceParser(filepath) {
  var rs = fs.createReadStream(filepath);
  rs.on('end', () => process.nextTick(() => this._end()));

  this.streams = [];

  this._parser = N3StreamParser();
  this._parser.on('prefix', (prefix, iri) => {
    var p = { prefix: prefix, iri: iri };

    this.streams.forEach((s) => s.addPrefix(p));
  });

  rs.pipe(this._parser);
}

SourceParser.prototype.pipe = function (stream) {
  this._parser.pipe(stream.getStream());

  this.streams.push(stream);

  return this;
};

SourceParser.prototype.end = function (cb) {
  this._end = cb;

  return this;
};

module.exports = SourceParser;

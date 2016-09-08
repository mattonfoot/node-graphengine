A distributable graph engine written in NodeJS
===

Getting started
---

To run as a command line tool and output to a folder use the following example;

```Shell
> npm start -output ./data ./source.ttl
```

To run as a command line tool and push to a remote instance use the following example;

```Shell
> npm start --output http://remotehost:3000 ./source.ttl
```

To start a node on a server

```Shell
> npm start --vocab http://ns.example.com/
```

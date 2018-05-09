'use strict';

var DHT = require('bittorrent-dht');

var ANNOUNCE_INTERVAL = 60000; // 1 minute

var dhtConnector = function dhtConnector(_ref) {
  var _ref$host = _ref.host,
      host = _ref$host === undefined ? '' : _ref$host,
      _ref$bootstrap = _ref.bootstrap,
      bootstrap = _ref$bootstrap === undefined ? [] : _ref$bootstrap;

  var dht = new DHT({
    host: host,
    bootstrap: bootstrap
  });

  var keywordsKnown = [];
  var timer = null;
  var isPublisher = true;

  return {
    connect: function connect(_ref2) {
      var _this = this;

      var port = _ref2.port,
          _ref2$nodes = _ref2.nodes,
          nodes = _ref2$nodes === undefined ? [] : _ref2$nodes,
          _ref2$keywords = _ref2.keywords,
          keywords = _ref2$keywords === undefined ? [] : _ref2$keywords,
          _ref2$asPublisher = _ref2.asPublisher,
          asPublisher = _ref2$asPublisher === undefined ? isPublisher : _ref2$asPublisher,
          _ref2$announceInterva = _ref2.announceInterval,
          announceInterval = _ref2$announceInterva === undefined ? ANNOUNCE_INTERVAL : _ref2$announceInterva;

      isPublisher = asPublisher;

      return new Promise(function (resolve) {
        dht.listen(port, function () {
          nodes.forEach(function (node) {
            return _this.addNode(node);
          });

          if (isPublisher) {
            dht.on('ready', function () {
              _this.announceKeywords(keywords).then(function () {
                timer = _this.setIntervalAnnouncement(keywordsKnown, announceInterval);

                dht.on('node', function (node) {
                  clearInterval(timer);

                  timer = _this.setIntervalAnnouncement(keywordsKnown, announceInterval);
                });

                resolve();
              }).catch(function (err) {
                console.log(err.message);
                resolve();
              });
            });
          }
        });
      });
    },
    setIntervalAnnouncement: function setIntervalAnnouncement(keywords) {
      var _this2 = this;

      var interval = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ANNOUNCE_INTERVAL;

      return setInterval(function () {
        return _this2.announceKeywords(keywords).catch(function (err) {
          return console.log(err.message);
        });
      }, interval);
    },
    addNode: function addNode(node) {
      dht.addNode(node);
    },
    announce: function announce(keywordToStore, weightToStore) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        if (!isPublisher) {
          return reject(new Error('Only publishers can announce'));
        }

        if (keywordsKnown.find(function (_ref3) {
          var keyword = _ref3.keyword,
              weight = _ref3.weight;
          return keyword === keywordToStore && weight === weightToStore;
        })) {
          return resolve();
        }

        var data = { keyword: keywordToStore, weight: weightToStore };

        keywordsKnown.push(data);

        dht.announce({ infoHash: _this3.generateHash(data.keyword), weight: data.weight }, function (err) {
          if (err) {
            console.log('Error response:', err.message);
          }

          return resolve();
        });
      });
    },
    announceKeywords: function announceKeywords(keywords) {
      var _this4 = this;

      return Promise.all(keywords.map(function (payload) {
        if (typeof payload === 'string') {
          return _this4.announce(payload);
        }

        return _this4.announce(payload.keyword, payload.weight);
      }));
    },
    findPeersFor: function findPeersFor(keyword) {
      var _this5 = this;

      return new Promise(function (resolve, reject) {
        dht.lookup(_this5.generateHash(keyword), function (err, nodesWithPeers) {
          console.log(keyword);

          if (err) {
            return reject(err);
          }

          console.log(nodesWithPeers);

          return resolve({ nodesWithPeers: nodesWithPeers });
        });
      });
    },
    generateHash: function generateHash(value) {
      return Buffer.from(value);
    },
    listenPeerAnnouncement: function listenPeerAnnouncement(handler) {
      dht.on('announce', function (peer, keywordHash) {
        handler({ peer: peer, keyword: keywordHash.toString() });
      });
    },
    listenPeerLookup: function listenPeerLookup(handler) {
      var perPeer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      if (perPeer) {
        dht.on('peer', function (peer, keywordHash, from) {
          handler({ peer: peer, keyword: keywordHash.toString(), from: from });
        });
      } else {
        dht.on('peers', function (peers, keywordHash, from) {
          handler({ peers: peers, keyword: keywordHash.toString(), from: from });
        });
      }
    },
    on: function on(event, callback) {
      dht.on(event, callback);
    },
    destroy: function destroy() {
      return dht.destroy();
    },
    toJSON: function toJSON() {
      return dht.toJSON();
    },
    getAddress: function getAddress() {
      return dht.address();
    }
  };
};

module.exports = dhtConnector;
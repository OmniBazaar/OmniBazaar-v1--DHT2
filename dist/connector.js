'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

require('babel-polyfill');

var DHT = require('omnibazaar-bittorrent-dht');

var ANNOUNCE_INTERVAL = 60000; // 1 minute
var LOOKUP_WAIT_TIMEOUT = 5000; // 10 seconds

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

  var initialPort = void 0;
  var initialInterval = void 0;

  var lookupHandlers = {};

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

      initialPort = port;
      initialInterval = announceInterval;
      isPublisher = asPublisher;

      return new Promise(function (resolve, reject) {
        dht.listen(port, function () {
          nodes.forEach(function (node) {
            return _this.addNode(node);
          });

          _this.setupListenPeerLookup();

          if (!isPublisher) {
            resolve();
            return;
          }

          dht.on('ready', _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
            return regeneratorRuntime.wrap(function _callee$(_context) {
              while (1) {
                switch (_context.prev = _context.next) {
                  case 0:
                    _context.prev = 0;
                    _context.next = 3;
                    return _this.announceKeywords(keywords);

                  case 3:

                    timer = _this.setIntervalAnnouncement(keywordsKnown, announceInterval);

                    dht.on('node', function (node) {
                      clearInterval(timer);

                      timer = _this.setIntervalAnnouncement(keywordsKnown, announceInterval);
                    });

                    resolve();
                    _context.next = 12;
                    break;

                  case 8:
                    _context.prev = 8;
                    _context.t0 = _context['catch'](0);

                    console.log('Error when announcing keywords on connect', _context.t0.message);
                    reject(_context.t0);

                  case 12:
                  case 'end':
                    return _context.stop();
                }
              }
            }, _callee, _this, [[0, 8]]);
          })));
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

      return _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
        var key, data;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (isPublisher) {
                  _context2.next = 2;
                  break;
                }

                throw new Error('Only publishers can announce');

              case 2:
                key = keywordToStore.toLowerCase();

                if (!keywordsKnown.find(function (_ref4) {
                  var keyword = _ref4.keyword,
                      weight = _ref4.weight;
                  return keyword === key && weight === weightToStore;
                })) {
                  _context2.next = 5;
                  break;
                }

                return _context2.abrupt('return');

              case 5:
                data = { keyword: key, weight: weightToStore };


                keywordsKnown.push(data);

                return _context2.abrupt('return', new Promise(function (resolve) {
                  dht.announce({ infoHash: _this3.generateHash(data.keyword), weight: data.weight }, function (err) {
                    if (err) {
                      //No nodes to query is too annoying
                      if (err.message !== 'No nodes to query') {
                        console.log('Error response:', err.message);
                      }
                    }

                    resolve();
                  });
                }));

              case 8:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, _this3);
      }))();
    },
    announceKeywords: function announceKeywords() {
      var _this4 = this;

      var keywords = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      return _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4() {
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                keywords.forEach(function () {
                  var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(payload) {
                    return regeneratorRuntime.wrap(function _callee3$(_context3) {
                      while (1) {
                        switch (_context3.prev = _context3.next) {
                          case 0:
                            if (!(typeof payload === 'string')) {
                              _context3.next = 4;
                              break;
                            }

                            _context3.next = 3;
                            return _this4.announce(payload);

                          case 3:
                            return _context3.abrupt('return', _context3.sent);

                          case 4:
                            _context3.next = 6;
                            return _this4.announce(payload.keyword, payload.weight);

                          case 6:
                            return _context3.abrupt('return', _context3.sent);

                          case 7:
                          case 'end':
                            return _context3.stop();
                        }
                      }
                    }, _callee3, _this4);
                  }));

                  return function (_x3) {
                    return _ref5.apply(this, arguments);
                  };
                }());

              case 1:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, _this4);
      }))();
    },
    findPeersFor: function findPeersFor(keyword) {
      var _this5 = this;

      var nomalizedKeyword = keyword.toLowerCase();
      return new Promise(function (resolve) {
        // Lets resolve the promise if 5 secs passes without finding peers(?)
        var lookupTimeOut = setTimeout(function () {
          //console.log(`5 secs has passed without a lookup response for '${keyword}'`);
          //console.log('Assuming no peer was found');

          _this5.removeLookupHandlers(nomalizedKeyword);

          resolve([{ noPeers: true, timedOut: true }]);
        }, LOOKUP_WAIT_TIMEOUT);

        var results = [];

        _this5.addLookupHandler(nomalizedKeyword, function (response) {
          clearTimeout(lookupTimeOut);

          var peers = response.peers;


          if (peers.length) {
            return results.push(response);
          }

          results.push(_extends({ noPeers: true }, response, { peers: null }));
        });

        // this.listenPeerLookup((key => (response) => {
        //   const { peers, keyword } = response;

        //   if (key === keyword) {
        //     clearTimeout(lookupTimeOut);

        //     if (peers.length) {
        //       return results.push(response);
        //     }

        //     return results.push({ noPeers: true, ...response, peers: null });
        //   }
        // })(keyword.toLowerCase()));

        dht.lookup(_this5.generateHash(nomalizedKeyword), function (err) {
          _this5.removeLookupHandlers(nomalizedKeyword);

          if (err) {
            console.log('Error when looking up ' + keyword + ': ', err);
          }

          resolve(results);
        });
      });
    },


    /**
     * Since the DHT itself does not provide any message to `delete` a peer,
     * we destroy the current node in order to connect a new one with out the keyword to remove.
     *
     * @param {string} keywordToRemove - Keyword to remove from the DHT
     * @returns {Promise}
     */
    removePeerFor: function removePeerFor(keywordToRemove) {
      var _this6 = this;

      return _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5() {
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                keywordsKnown = keywordsKnown.filter(function (_ref6) {
                  var keyword = _ref6.keyword;
                  return keyword !== keywordToRemove;
                });

                _context5.next = 3;
                return _this6.discardCurrentKeywordsWith(keywordsKnown);

              case 3:
                return _context5.abrupt('return', _context5.sent);

              case 4:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, _this6);
      }))();
    },
    discardCurrentKeywordsWith: function discardCurrentKeywordsWith() {
      var _this7 = this;

      var newKeywords = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      return _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6() {
        var nodes;
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                nodes = Array.from(dht.nodes);


                _this7.destroy().then(function () {
                  dht = new DHT({
                    host: host,
                    bootstrap: bootstrap
                  });

                  _this7.connect({
                    nodes: nodes,
                    port: initialPort,
                    keywords: newKeywords,
                    asPublisher: isPublisher,
                    announceInterval: initialInterval
                  }).then(function () {
                    return true;
                  });
                });

              case 2:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, _this7);
      }))();
    },
    generateHash: function generateHash(value) {
      return Buffer.from(value);
    },
    setupListenPeerLookup: function setupListenPeerLookup() {
      keywordsKnown = [];
      dht.on('peers', function (peers, keywordHash, from) {
        var keyword = keywordHash.toString();
        if (lookupHandlers[keyword]) {
          lookupHandlers[keyword]({ peers: peers, keyword: keyword, from: from });
        }
      });
    },
    addLookupHandler: function addLookupHandler(keyword, handler) {
      lookupHandlers[keyword] = handler;
    },
    removeLookupHandlers: function removeLookupHandlers(keyword) {
      if (lookupHandlers[keyword]) {
        delete lookupHandlers[keyword];
      }
    },
    listenPeerAnnouncement: function listenPeerAnnouncement(handler) {
      dht.on('announce', function (peer, keywordHash) {
        handler({ peer: peer, keyword: keywordHash.toString() });
      });
    },


    // listenPeerLookup(handler, perPeer = false) {
    //   if (perPeer) {
    //     dht.on('peer', (peer, keywordHash, from) => {
    //       handler({ peer, keyword: keywordHash.toString(), from })
    //     });
    //   } else {
    //     dht.on('peers', (peers, keywordHash, from) => {
    //       handler({ peers, keyword: keywordHash.toString(), from })
    //     });
    //   }
    // },

    on: function on(event, callback) {
      dht.on(event, callback);
    },
    destroy: function destroy() {
      return new Promise(function (resolve, reject) {
        keywordsKnown = [];

        dht.destroy(function (err) {
          if (err) {
            console.log('Error when destroying node', err);
            return reject(err);
          }

          return resolve();
        });
      });
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
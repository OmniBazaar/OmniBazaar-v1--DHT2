'use strict';

const DHT = require('bittorrent-dht');

const ANNOUNCE_INTERVAL = 60000; // 1 minute

const dhtConnector = ({ host = '', bootstrap = [] }) => {
  const dht = new DHT({
    host,
    bootstrap
  });

  let keywordsKnown = [];
  let timer = null;
  let isPublisher = true;

  return {
    connect({
      port,
      nodes = [],
      keywords = [],
      asPublisher = isPublisher,
      announceInterval = ANNOUNCE_INTERVAL
    }) {
      isPublisher = asPublisher;

      return new Promise(resolve => {
        dht.listen(port, () => console.log(`Started DHT on port: ${port}`));

        nodes.forEach(node => this.addNode(node));

        if (isPublisher) {
          dht.on('ready', () => {
            this.announceKeywords(keywords)
              .then(() => {
                keywordsKnown = [...keywords];

                timer = this.setIntervalAnnouncement(
                  keywordsKnown,
                  announceInterval
                );

                dht.on('node', node => {
                  const possibleNode = dht.nodes.get(node.id);

                  clearInterval(timer);

                  timer = this.setIntervalAnnouncement(
                    keywordsKnown,
                    announceInterval
                  );
                });

                resolve();
              })
              .catch((err) => {
                console.log(err.message);
                resolve();
              });
          });
        }
      });
    },

    setIntervalAnnouncement(keywords, interval = ANNOUNCE_INTERVAL) {
      return setInterval(
        () =>
          this.announceKeywords(keywords).catch(err =>
            console.log(err.message)
          ),
        interval
      );
    },

    addNode(node) {
      dht.addNode(node);
    },

    announce(keyword, weight) {
      return new Promise((resolve, reject) => {
        if (!isPublisher) {
          return reject(new Error('Only publishers can announce'));
        }

        if (keywordsKnown.indexOf(keyword) !== -1) {
          return resolve();
        }

        keywordsKnown.push(keyword);

        dht.announce({ infoHash: this.generateHash(keyword), weight }, err => {
          if (err) {
            console.log('Error response:', err.message);
          }

          return resolve();
        });
      });
    },

    announceKeywords(keywords) {
      return Promise.all(keywords.map(keyword => this.announce(keyword)));
    },

    findPeersFor(keyword) {
      return new Promise((resolve, reject) => {
        dht.lookup(this.generateHash(keyword), (err, nodesWithPeers) => {
          if (err) {
            return reject(err);
          }

          return resolve({ nodesWithPeers });
        });
      });
    },

    generateHash(value) {
      return Buffer.from(value);
    },

    listenPeerAnnouncement(handler) {
      dht.on('announce', (peer, keywordHash) => {
        handler({ peer, keyword: keywordHash.toString() })
      });
    },

    listenPeerLookup(handler) {
      dht.on('peer', (peer, keywordHash, from) => {
        handler({ peer, keyword: keywordHash.toString(), from })
      });
    },

    on(event, callback) {
      dht.on(event, callback);
    },

    destroy() {
      return dht.destroy();
    },

    toJSON() {
      return dht.toJSON();
    },

    getAddress() {
      return dht.address();
    }
  };
};

module.exports = dhtConnector;

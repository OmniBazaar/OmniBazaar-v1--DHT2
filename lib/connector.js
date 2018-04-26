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

    announce(keywordToStore, weightToStore) {
      return new Promise((resolve, reject) => {
        if (!isPublisher) {
          return reject(new Error('Only publishers can announce'));
        }

        if (keywordsKnown.find(({ keyword, weight }) => keyword === keywordToStore && weight === weightToStore)) {
          return resolve();
        }

        const data = { keyword: keywordToStore, weight: weightToStore };

        keywordsKnown.push(data);

        dht.announce({ infoHash: this.generateHash(data.keyword), weight: data.weight }, err => {
          if (err) {
            console.log('Error response:', err.message);
          }

          return resolve();
        });
      });
    },

    announceKeywords(keywords) {
      return Promise.all(keywords.map((payload) => {
        if (typeof payload === 'string') {
          return this.announce(payload);
        }

        return this.announce(payload.keyword, payload.weight);
      }));
    },

    findPeersFor(keyword) {
      return new Promise((resolve, reject) => {
        dht.lookup(this.generateHash(keyword), (err, nodesWithPeers) => {
          console.log(keyword);

          if (err) {
            return reject(err);
          }

          console.log(nodesWithPeers);

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

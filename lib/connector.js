'use strict';

require('babel-polyfill');

const DHT = require('omnibazaar-bittorrent-dht');

const ANNOUNCE_INTERVAL = 60000; // 1 minute
const LOOKUP_WAIT_TIMEOUT = 5000; // 10 seconds

const dhtConnector = ({ host = '', bootstrap = [] }) => {
  let dht = new DHT({
    host,
    bootstrap
  });

  let keywordsKnown = [];
  let timer = null;
  let isPublisher = true;

  let initialPort;
  let initialInterval;

  return {
    async connect({
      port,
      nodes = [],
      keywords = [],
      asPublisher = isPublisher,
      announceInterval = ANNOUNCE_INTERVAL
    }) {
      initialPort = port;
      initialInterval = announceInterval;
      isPublisher = asPublisher;

      dht.listen(port, () => {
        nodes.forEach(node => this.addNode(node));

        if (!isPublisher) {
          return;
        }

        dht.on('ready', async () => {
          try {
            await this.announceKeywords(keywords)

            timer = this.setIntervalAnnouncement(
              keywordsKnown,
              announceInterval
            );

            dht.on('node', node => {
              clearInterval(timer);

              timer = this.setIntervalAnnouncement(
                keywordsKnown,
                announceInterval
              );
            });
          } catch (err) {
            console.log('Error when announcing keywords on connect', err.message);
          }

          return;
        });
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

    async announce(keywordToStore, weightToStore) {
      if (!isPublisher) {
        throw new Error('Only publishers can announce');
      }

      const key = keywordToStore.toLowerCase();

      if (keywordsKnown.find(({ keyword, weight }) => keyword === key && weight === weightToStore)) {
        //console.log(`${keywordToStore} with weight of ${weightToStore} has been already announced.`);
        return;
      }

      const data = { keyword: key, weight: weightToStore };

      keywordsKnown.push(data);

      return new Promise((resolve) => {
        dht.announce({ infoHash: this.generateHash(data.keyword), weight: data.weight }, err => {
          if (err) {
            //No nodes to query is too annoying
            if (err.message !== 'No nodes to query') {
              console.log('Error response:', err.message);
            }
          }

          resolve();
        });
      });
    },

    async announceKeywords(keywords = []) {
      keywords.forEach(async (payload) => {
        if (typeof payload === 'string') {
          return await this.announce(payload);
        }

        return await this.announce(payload.keyword, payload.weight);
      });
    },

    findPeersFor(keyword) {
      return new Promise((resolve) => {
        // Lets resolve the promise if 5 secs passes without finding peers(?)
        let lookupTimeOut = setTimeout(() => {
          //console.log(`5 secs has passed without a lookup response for '${keyword}'`);
          //console.log('Assuming no peer was found');

          resolve([{ noPeers: true, timedOut: true }]);
        }, LOOKUP_WAIT_TIMEOUT);

        const results = [];

        this.listenPeerLookup((key => (response) => {
          const { peers, keyword } = response;

          if (key === keyword) {
            clearTimeout(lookupTimeOut);

            if (peers.length) {
              return results.push(response);
            }

            return results.push({ noPeers: true, ...response, peers: null });
          }
        })(keyword.toLowerCase()));

        dht.lookup(this.generateHash(keyword.toLowerCase()), (err) => {
          if (err) {
            console.log(`Error when looking up ${keyword}: `, err);
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
    async removePeerFor(keywordToRemove) {
      keywordsKnown = keywordsKnown
        .filter(({ keyword }) => keyword !== keywordToRemove);

      return await this.discardCurrentKeywordsWith(keywordsKnown);
    },

    async discardCurrentKeywordsWith(newKeywords = []) {
      const nodes = Array.from(dht.nodes);

      this.destroy()
        .then(() => {
          dht = new DHT({
            host,
            bootstrap
          });

          this.connect({
            nodes,
            port: initialPort,
            keywords: newKeywords,
            asPublisher: isPublisher,
            announceInterval: initialInterval,
          })
          .then(() => true);
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

    listenPeerLookup(handler, perPeer = false) {
      if (perPeer) {
        dht.on('peer', (peer, keywordHash, from) => {
          handler({ peer, keyword: keywordHash.toString(), from })
        });
      } else {
        dht.on('peers', (peers, keywordHash, from) => {
          handler({ peers, keyword: keywordHash.toString(), from })
        });
      }
    },

    on(event, callback) {
      dht.on(event, callback);
    },

    destroy() {
      return new Promise((resolve, reject) => {
        keywordsKnown = [];

        dht.destroy((err) => {
          if (err) {
            console.log('Error when destroying node', err);
            return reject(err);
          }

          return resolve();
        });
      });
    },

    toJSON() {
      return dht.toJSON();
    },

    getAddress() {
      return dht.address();
    },
  };
};

module.exports = dhtConnector;

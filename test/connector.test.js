const assert = require('assert');

const dhtConnector = require('./../lib/connector');

describe('#dhtConnector', () => {
  describe('#connect', () => {
    it('should publish all keywords on connect', done => {
      const server = dhtConnector({
        host: '127.0.0.1',
        bootstrap: []
      });
      const keyword = 'testing';

      server
        .connect({
          port: 5000,
          nodes: [],
          keywords: [keyword]
        })
        .catch(err => console.log(err.message));

      server.listenPeerAnnouncement(resp => {
        assert.equal(resp.keyword, keyword);
        assert.equal(resp.peer.port, 5000);

        server.destroy();
        done();
      });
    });
  });

  describe('#announce(keyword, weight)', () => {
    const testKeyword = 'testing';
    let server;

    beforeEach(async () => {
      server = dhtConnector({
        bootstrap: false
      });

      return server
        .connect({
          port: 5000,
          nodes: [],
          keywords: []
        })
        .catch(() => {});
    });

    afterEach(() => {
      server.destroy();
    });

    it('should announce nodes of new keywords', (done) => {
      const server2 = dhtConnector({
        bootstrap: ['127.0.0.1:5000']
      });

      server2
        .connect({
          port: 5001,
          nodes: []
        })
        .catch(() => {});

      server.listenPeerAnnouncement(resp => {
        assert.equal(resp.keyword, testKeyword);
        assert.equal(resp.peer.port, 5001);
        assert.equal(resp.peer.weight, 12);

        server2.destroy();
        done();
      });

      server2.announce(testKeyword, 12);
    });
  });

  describe('#findPeersFor(keyword)', () => {
    const testKeyword = 'testing';
    let server;

    beforeEach(() => {
      server = dhtConnector({
        host: '127.0.0.1',
        bootstrap: []
      });
    });

    afterEach(() => {
      server.destroy();
    });

    it('should find peers for announced keyword', (done) => {
      server
        .connect({
          port: 5000,
          nodes: [],
          keywords: [testKeyword]
        })
        .catch(() => {});

      const client = dhtConnector({
        bootstrap: ['127.0.0.1:5000']
      });

      client
        .connect({
          port: 5001,
          nodes: []
        })
        .catch(() => {});

      client.findPeersFor(testKeyword)
        .then(({ peers, keyword, from }) => {
          assert.deepEqual(peers, [{ host: '127.0.0.1', port: 5000, weight: 0 }]);
          assert.equal(testKeyword, keyword);

          client.destroy();

          done();
        })
        .catch(done);
    });

    it('should return peers with weight for keyword', done => {
      const testWeight = 12;

      server
        .connect({
          port: 5000,
          nodes: [],
          keywords: [{ keyword: testKeyword, weight: testWeight }]
        })
        .catch(() => {});

      const client = dhtConnector({
        bootstrap: ['127.0.0.1:5000']
      });

      client
        .connect({
          port: 5001,
          nodes: []
        })
        .catch(() => {});

      client.findPeersFor(testKeyword)
        .then(({ peers, keyword, from }) => {
          assert.deepEqual(peers, [
            { host: '127.0.0.1', port: 5000, weight: testWeight }
          ]);
          assert.equal(testKeyword, keyword);

          client.destroy();

          done();
        });
    });
  });
});

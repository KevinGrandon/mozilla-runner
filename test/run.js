suite('run', function() {
  var run = require('../lib/run').run;
  var runtime = __dirname + '/fixtures/firefox';
  var assert = require('assert');
  var profile = require('mozilla-profile-builder').firefox.profile;
  var static = require('node-static');

  test('launch firefox', function(done) {
    var profileDir = __dirname + '/fixtures/profile';
    var options = { product: 'firefox', profile: profileDir };
    this.timeout(5000);
    run(runtime, options, function(err, child, bin, argv) {
      assert.ok(!err, err && err.message);

      // verify the binary
      assert.ok(bin.indexOf('firefox-bin') !== 0, 'has bin');

      // verify arguments
      assert.deepEqual(
        argv,
        ['-profile', profileDir, '-no-remote']
      );

      // verify we have a child
      assert.ok(child.kill, 'is process');
      child.kill();
      done();
    });
  });

  test('launch firefox with different screen', function(done) {
    var profileDir = __dirname + '/fixtures/profile';
    var options =
      { product: 'firefox', profile: profileDir,
        screen: {
          width: 1280,
          height: 800,
          dpi: 160
        }
      };
    this.timeout(5000);
    run(runtime, options, function(err, child, bin, argv) {
      assert.ok(!err, err && err.message);

      // verify screen size
      assert.deepEqual(
        argv,
        [
          '-profile', profileDir, '--screen=1280x800@160',
          '-no-remote'
        ]
      );

      // verify we have a child
      assert.ok(child.kill, 'is process');
      child.kill();
      done();
    });
  });

  test('check env overrides', function(done) {
    var profileDir = __dirname + '/fixtures/profile';
    // this should not be seen in the child since we are deleting it
    process.env['BAR'] = 'bar';
    var options = {
      product: 'echostuff',
      envOverrides: {
        FOO: 'foo',
        BAR: null
      }
    };
    var expected = 'FOO is foo and BAR is stop';
    this.timeout(5000);
    run(__dirname + '/fixtures/env-echoer', options,
        function(err, child, bin, argv) {
      assert.ok(!err, err && err.message);

      child.stdout.on('data', function(content) {
        content = content.toString();
        // verify we can go to a given url
        if (content.indexOf(expected) !== -1) {
          child.kill();
          done();
        }
      });
    });
  });

  test('explicit env', function(done) {
    var profileDir = __dirname + '/fixtures/profile';
    // this should not be seen in the child since it is using an explicit env.
    process.env['BAR'] = 'bar';
    var options = {
      product: 'echostuff',
      env: {
        FOO: 'foo',
      }
    };
    var expected = 'FOO is foo and BAR is stop';
    this.timeout(5000);
    run(__dirname + '/fixtures/env-echoer', options,
        function(err, child, bin, argv) {
      assert.ok(!err, err && err.message);

      child.stdout.on('data', function(content) {
        content = content.toString();
        if (content.indexOf(expected) !== -1) {
          child.kill();
          done();
        }
      });
    });
  });

  test('env is expected default if not specified', function(done) {
    var profileDir = __dirname + '/fixtures/profile';
    process.env['FOO'] = 'foo';
    process.env['BAR'] = 'bar';
    var options = {
      product: 'echostuff',
    };
    var expected = 'FOO is foo and BAR is bar stop';
    this.timeout(5000);
    run(__dirname + '/fixtures/env-echoer', options,
        function(err, child, bin, argv) {
      assert.ok(!err, err && err.message);

      child.stdout.on('data', function(content) {
        content = content.toString();
        if (content.indexOf(expected) !== -1) {
          child.kill();
          done();
        }
      });
    });
  });

  suite('launch firefox read dump', function() {
    var server;
    var port = 60033;
    var config = {
      // turn on dump
      'browser.dom.window.dump.enabled': true
    };

    // create server
    setup(function() {
      var file = new (static.Server)(__dirname + '/html');
      server = require('http').createServer(function(req, res) {
        // stolen from node-static
        req.on('end', function() {
          file.serve(req, res);
        }).resume();
      });
      server.listen(port);
    });

    // ensure server gets closed
    teardown(function() {
      server.close();
    });

    // create tmp profile
    var profileDir;
    setup(function(done) {
      profile({ userPrefs: config }, function(err, _profileDir) {
        if (err) return done(err);
        profileDir = _profileDir;
        done();
      });
    });

    var url = 'http://localhost:' + port + '/dump.html';
    var expected = 'WOOT DUMP';
    test('go to url', function(done) {
      var options = { product: 'firefox', profile: profileDir, url: url };
      run(runtime, options, function(err, child) {
        if (err) return done(err);
        child.stdout.on('data', function(content) {
          content = content.toString();
          // verify we can go to a given url
          if (content.indexOf(expected) !== -1) {
            child.kill();
            done();
          }
        });
      });
    });
  });

});

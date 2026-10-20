/* global globalThis */
import { module, test } from 'qunit';

function waitFor(
  selector,
  { timeout = 1000, delay = 10, doc = document } = {}
) {
  return new Promise((resolve, reject) => {
    if (!doc) {
      reject(new Error('No valid document passed'));
      return;
    }
    const wait = (timeout) => {
      setTimeout(() => {
        if (doc.querySelector(selector)) {
          resolve();
        } else {
          const remainingTimeout = (timeout -= delay);
          if (remainingTimeout <= 0) {
            reject(new Error(`Timed out searching for ${selector}`));
          } else {
            wait(remainingTimeout);
          }
        }
      }, delay);
    };

    wait(timeout);
  });
}

function waitForGone(
  selector,
  { timeout = 1000, delay = 10, doc = document } = {}
) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    const check = () => {
      if (!doc.querySelector(selector)) {
        resolve();
      } else if (Date.now() > deadline) {
        reject(new Error(`${selector} still present after ${timeout} ms`));
      } else {
        setTimeout(check, delay);
      }
    };

    check();
  });
}

module('Acceptance | embed', function (hooks) {
  hooks.before(function () {
    // Remove styles for leaking styles test.
    // We cannot remove them from tests/index.html unfortunatly, as Embroider won't allow this
    document.querySelector('link[href$="dummy.css"]').remove();
  });

  hooks.beforeEach(function () {
    // With the way we load the JS when bootstrapping our embedded app every time, Glimmer thinks we are including
    // `@glimmer/validator` twice, which is not the case. Using this workaround here to silence the assertion.
    // This shouldn't be an issue in production as long as we are not loading vendor.js twice, only happening here
    // because of our test setup (needing vendor.js for test infrastructure, but also loading it again in tests during
    // embedded bootstrapping)
    // See also https://github.com/glimmerjs/glimmer-vm/issues/1252
    globalThis[Symbol.for('GLIMMER_VALIDATOR_REGISTRATION')] = false;
  });

  hooks.afterEach(function () {
    document.querySelector('#ember-testing').innerHTML = '';
  });

  module('no shadowDOM', function () {
    test('app loads', async function (assert) {
      const ce = document.createElement('dummy-app');
      document.querySelector('#ember-testing').appendChild(ce);

      await waitFor('dummy-app .title');

      assert.dom('dummy-app .title').hasText('Welcome to Ember');
    });

    test('parent styles do leak into embedded app', async function (assert) {
      const ce = document.createElement('dummy-app');
      document.querySelector('#ember-testing').appendChild(ce);

      await waitFor('dummy-app .title');

      assert.dom('dummy-app .title').hasStyle({
        color: 'rgb(255, 0, 0)',
      });
    });

    test('embedded styles do leak into parent', async function (assert) {
      const ce = document.createElement('dummy-app');
      document.querySelector('#ember-testing').appendChild(ce);

      const parentEl = document.createElement('button');
      parentEl.classList.add('something');
      document.querySelector('#ember-testing').appendChild(parentEl);

      await waitFor('dummy-app .title');

      assert.dom('.something').hasStyle({
        color: 'rgb(0, 0, 255)',
      });
    });

    test('can ignore files', async function (assert) {
      const ce = document.createElement('dummy-app');
      document.querySelector('#ember-testing').appendChild(ce);

      await waitFor('dummy-app .title');

      assert.dom('script[src$="ignore.js"]').doesNotExist();
      assert.dom('link[href$="ignore.css"]').doesNotExist();
    });

    test('supports inline CSS', async function (assert) {
      const ce = document.createElement('dummy-app');
      document.querySelector('#ember-testing').appendChild(ce);

      await waitFor('dummy-app .title');

      assert.dom('dummy-app .inline-red').hasStyle({
        color: 'rgb(255, 0, 0)',
      });
    });

    test('supports inline JS', async function (assert) {
      const ce = document.createElement('dummy-app');
      document.querySelector('#ember-testing').appendChild(ce);

      await waitFor('dummy-app .title');

      assert.ok(
        window.__inline_script__,
        'global variable added by inline script exists.'
      );
    });

    test('supports inline JSON', async function (assert) {
      const ce = document.createElement('dummy-app');
      document.querySelector('#ember-testing').appendChild(ce);

      await waitFor('dummy-app .title');

      assert.dom('script[data-test-json]').exists();
      assert.deepEqual(
        JSON.parse(
          document.querySelector('script[data-test-json]').textContent
        ),
        { foo: 'bar' }
      );
    });
  });

  module('shadowDOM', function () {
    test('app loads', async function (assert) {
      const ce = document.createElement('dummy-app');
      ce.setAttribute('shadow', '');
      document.querySelector('#ember-testing').appendChild(ce);

      await waitFor('dummy-app');
      const shadowRoot = document.querySelector('dummy-app').shadowRoot;
      assert.ok('Expected shadow root', !!shadowRoot);
      await waitFor('.title', { doc: shadowRoot });

      assert.dom('.title', shadowRoot).hasText('Welcome to Ember');
    });

    test("parent styles don't leak into embedded app", async function (assert) {
      const ce = document.createElement('dummy-app');
      ce.setAttribute('shadow', '');
      document.querySelector('#ember-testing').appendChild(ce);

      await waitFor('dummy-app');
      const shadowRoot = document.querySelector('dummy-app').shadowRoot;
      assert.ok('Expected shadow root', !!shadowRoot);
      await waitFor('.title', { doc: shadowRoot });

      assert.dom('.title', shadowRoot).hasStyle({
        color: 'rgb(0, 0, 255)',
      });
    });

    test("embedded styles don't leak into parent", async function (assert) {
      const ce = document.createElement('dummy-app');
      ce.setAttribute('shadow', '');
      document.querySelector('#ember-testing').appendChild(ce);

      const parentEl = document.createElement('button');
      parentEl.classList.add('something');
      document.querySelector('#ember-testing').appendChild(parentEl);

      await waitFor('dummy-app');
      const shadowRoot = document.querySelector('dummy-app').shadowRoot;
      assert.ok('Expected shadow root', !!shadowRoot);
      await waitFor('.title', { doc: shadowRoot });

      assert.dom('.something').hasStyle({
        color: 'rgb(255, 0, 0)',
      });
    });

    test('can ignore files', async function (assert) {
      const ce = document.createElement('dummy-app');
      ce.setAttribute('shadow', '');
      document.querySelector('#ember-testing').appendChild(ce);

      await waitFor('dummy-app');
      const shadowRoot = document.querySelector('dummy-app').shadowRoot;
      assert.ok('Expected shadow root', !!shadowRoot);
      await waitFor('.title', { doc: shadowRoot });

      assert.dom('script[src$="ignore.js"]', shadowRoot).doesNotExist();
      assert.dom('link[href$="ignore.css"]', shadowRoot).doesNotExist();
    });

    test('supports inline CSS', async function (assert) {
      const ce = document.createElement('dummy-app');
      ce.setAttribute('shadow', '');
      document.querySelector('#ember-testing').appendChild(ce);

      await waitFor('dummy-app');
      const shadowRoot = document.querySelector('dummy-app').shadowRoot;
      assert.ok('Expected shadow root', !!shadowRoot);
      await waitFor('.title', { doc: shadowRoot });

      assert.dom('.inline-red', shadowRoot).hasStyle({
        color: 'rgb(255, 0, 0)',
      });
    });

    test('supports inline JS', async function (assert) {
      const ce = document.createElement('dummy-app');
      ce.setAttribute('shadow', '');
      document.querySelector('#ember-testing').appendChild(ce);

      await waitFor('dummy-app');
      const shadowRoot = document.querySelector('dummy-app').shadowRoot;
      assert.ok('Expected shadow root', !!shadowRoot);
      await waitFor('.title', { doc: shadowRoot });

      assert.ok(
        window.__inline_script__,
        'global variable added by inline script exists.'
      );
    });

    test('supports inline JSON', async function (assert) {
      const ce = document.createElement('dummy-app');
      ce.setAttribute('shadow', '');
      document.querySelector('#ember-testing').appendChild(ce);

      await waitFor('dummy-app');
      const shadowRoot = document.querySelector('dummy-app').shadowRoot;
      assert.ok('Expected shadow root', !!shadowRoot);
      await waitFor('.title', { doc: shadowRoot });

      assert.dom('script[data-test-json]', shadowRoot).exists();
      assert.deepEqual(
        JSON.parse(
          shadowRoot.querySelector('script[data-test-json]').textContent
        ),
        { foo: 'bar' }
      );
    });
  });

  module('skeleton', function () {
    // No liquid-fire outlet here, so removal waits for the 3 s grace period.
    const SKELETON = '.candid-embed-skeleton';

    // Opacity of the skeleton's sibling that holds the rendered app.
    function appOpacity(title) {
      const skeleton = title.getRootNode().querySelector(SKELETON);
      const app = Array.from(skeleton.parentNode.children).find((child) =>
        child.contains(title)
      );
      return getComputedStyle(app).opacity;
    }

    test('is shown while loading and removed once the app renders', async function (assert) {
      const ce = document.createElement('dummy-app');
      document.querySelector('#ember-testing').appendChild(ce);

      assert.dom(`dummy-app ${SKELETON}`).exists();

      await waitFor('dummy-app .title');
      assert.strictEqual(
        appOpacity(ce.querySelector('.title')),
        '0',
        'app is hidden behind the skeleton'
      );
      await waitForGone(`dummy-app ${SKELETON}`, { timeout: 6000 });

      assert.dom(`dummy-app ${SKELETON}`).doesNotExist();
      assert.dom('dummy-app .title').hasText('Welcome to Ember');
    });

    test('is shown and removed inside the shadow root', async function (assert) {
      const ce = document.createElement('dummy-app');
      ce.setAttribute('shadow', '');
      document.querySelector('#ember-testing').appendChild(ce);

      const shadowRoot = ce.shadowRoot;
      assert.dom(SKELETON, shadowRoot).exists();

      await waitFor('.title', { doc: shadowRoot });
      assert.strictEqual(
        appOpacity(shadowRoot.querySelector('.title')),
        '0',
        'app is hidden behind the skeleton'
      );
      await waitForGone(SKELETON, { timeout: 6000, doc: shadowRoot });

      assert.dom(SKELETON, shadowRoot).doesNotExist();
      assert.dom('.title', shadowRoot).hasText('Welcome to Ember');
    });
  });

  module('service', function () {
    test('custom arguments are exposed on service', async function (assert) {
      const ce = document.createElement('dummy-app');
      ce.setAttribute('foo', '1');
      ce.setAttribute('bar', '2');
      document.querySelector('#ember-testing').appendChild(ce);

      await waitFor('dummy-app .title');

      assert.dom('[data-test-arg]').exists({ count: 2 });
      assert.dom('[data-test-arg="foo"]').hasText('1');
      assert.dom('[data-test-arg="bar"]').hasText('2');
    });
  });
});

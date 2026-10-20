/* global require */

(function () {
  const CAPTION_DELAY_MS = 4000;
  // Restarts on every loaded script, so it measures time without progress.
  const STALL_TIMEOUT_MS = 45000;
  // Cap on hiding the app while waiting for route content.
  const RENDER_TIMEOUT_MS = 15000;
  const CAPTION_TEXT = 'Loading the wholesale shop…';
  const WAITING_SELECTOR = '.t-waiting-message, .waiting-message';
  const SKELETON_CLASS = 'candid-embed-skeleton';
  const FADE_MS = 350;
  const NO_OUTLET_GRACE_MS = 3000;

  function debug(msg) {
    console.debug('[ember-embedded-snippet] %s', msg);
  }

  function injectScript(script, head, host) {
    return new Promise((resolve, reject) => {
      let scriptTag = document.createElement('script');
      let hasSrc = false;
      for (let [name, value] of Object.entries(script.attributes)) {
        if (name === 'src') {
          value = prependHostIfRequired(value, host);
          hasSrc = true;
          scriptTag.onload = resolve;
          // Otherwise a failed script hangs the boot forever.
          scriptTag.onerror = () => {
            const error = new Error(`Failed to load script: ${value}`);
            error.scriptUrl = value;
            reject(error);
          };
          debug('Injecting script: ' + value);
        }
        scriptTag.setAttribute(name, value);
      }
      if (script.content) {
        scriptTag.textContent = script.content;
      }
      scriptTag.defer = true;
      scriptTag.async = false;

      head.appendChild(scriptTag);
      if (!hasSrc) {
        resolve();
      }
    });
  }

  async function injectScripts(scripts, head, host, onScriptLoad) {
    await Promise.all(
      scripts.map((script) =>
        injectScript(script, head, host).then(() => {
          if (onScriptLoad) onScriptLoad();
        })
      )
    );
  }

  function injectLinks(links, head, host) {
    for (const style of links) {
      let cssSelector = `link[href="${style.attributes.href}"]`;

      if (head.querySelector(cssSelector) !== null) {
        continue;
      }

      let cssLink = document.createElement('link');
      for (let [name, value] of Object.entries(style.attributes)) {
        if (name === 'href') {
          value = prependHostIfRequired(value, host);
          debug('Injecting style: ' + value);
        }
        cssLink.setAttribute(name, value);
      }
      head.appendChild(cssLink);
    }
  }

  function injectStyles(styles, head) {
    for (const style of styles) {
      let styleNode = document.createElement('style');
      for (let [name, value] of Object.entries(style.attributes)) {
        styleNode.setAttribute(name, value);
      }
      if (style.content) {
        styleNode.textContent = style.content;
      }
      head.appendChild(styleNode);
    }
  }

  async function setup(head, host, onScriptLoad) {
    if (!host) {
      // Fetch host from our own script tag
      let scriptTag = document.querySelector('script[src$="/embed.js"]');
      if (!scriptTag)
        throw new Error('ember-embedded-snippet: Cannot find own script tag');

      host = scriptTag.src.replace(/(https?:\/\/.*?)\/.*/g, '$1');
    }

    host = host.replace(/\/$/, '');

    const links = /###LINKS###/;
    const scripts = /###SCRIPTS###/;
    const styles = /###STYLES###/;

    injectLinks(links, head, host);
    injectStyles(styles, head);
    await injectScripts(scripts, head, host, onScriptLoad);
  }

  function prependHostIfRequired(url, host) {
    return url.match(/^https?:\/\/.*/) ? url : host + url;
  }

  async function startApp(rootElement, config = {}) {
    debug(`Starting ember app "###APPNAME###"`);

    return require('###APPNAME###/app').default.create({
      rootElement,
      config,
    });
  }

  // html`<div>Hello ${name}</div>` returns a new element. Values are inserted
  // as raw HTML, so only pass trusted strings.
  function html(strings, ...values) {
    const template = document.createElement('template');
    template.innerHTML = strings
      .reduce(
        (result, string, i) =>
          result + string + (i < values.length ? values[i] : ''),
        ''
      )
      .trim();
    return template.content.firstElementChild;
  }

  // Shown before any bundle loads; its CSS is inline because the app CSS isn't
  // loaded yet.
  function skeletonTemplate() {
    return html`
      <div class="candid-embed-skeleton" data-state="loading">
        <style>
          .candid-embed-skeleton,
          .candid-embed-skeleton * {
            box-sizing: border-box;
          }
          .candid-embed-skeleton {
            min-height: 560px;
            padding: 0 0 48px;
            color: #4b4b5a;
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica,
              Arial, sans-serif;
          }
          .candid-embed-skeleton__bar {
            height: 12px;
            width: 100%;
            background: linear-gradient(
              90deg,
              #e2756a 0%,
              #9aa3c4 55%,
              #7bb3c7 100%
            );
          }
          .candid-embed-skeleton__body {
            display: flex;
            gap: 32px;
            max-width: 1100px;
            margin: 32px auto 0;
            padding: 0 24px;
            animation: candid-embed-skeleton-pulse 1.6s ease-in-out infinite;
          }
          .candid-embed-skeleton__main {
            flex: 1 1 auto;
            min-width: 0;
          }
          .candid-embed-skeleton__card {
            flex: 0 0 240px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 14px;
            padding: 24px 16px;
            border: 1px solid #e5e7ef;
            border-radius: 16px;
            background: #fff;
            box-shadow: 0 8px 24px rgba(20, 20, 60, 0.06);
          }
          .candid-embed-skeleton__line {
            height: 14px;
            width: 70%;
            margin: 0 0 12px;
            border-radius: 7px;
            background: #e9e9f0;
          }
          .candid-embed-skeleton__line--title {
            height: 44px;
            width: 38%;
            margin: 0 0 20px;
            border-radius: 10px;
          }
          .candid-embed-skeleton__about {
            width: 42%;
            margin: 0 0 24px;
          }
          .candid-embed-skeleton__line--heading {
            height: 20px;
            width: 55%;
            margin: 0 0 14px;
          }
          .candid-embed-skeleton__line--text {
            width: 100%;
          }
          .candid-embed-skeleton__line--text-short {
            width: 72%;
            margin: 0;
          }
          .candid-embed-skeleton__line--short {
            width: 50%;
          }
          .candid-embed-skeleton__rule {
            width: 45%;
            height: 1px;
            margin: 24px 0 0;
            background: #e5e7ef;
          }
          .candid-embed-skeleton__eyebrow {
            width: 64px;
            height: 10px;
            border-radius: 5px;
            background: #f3d6cf;
          }
          .candid-embed-skeleton__avatar {
            width: 88px;
            height: 88px;
            border-radius: 50%;
            background: #e9e9f0;
          }
          .candid-embed-skeleton__pill {
            width: 170px;
            height: 42px;
            border-radius: 21px;
            background: #3b2a8f;
            opacity: 0.35;
          }
          .candid-embed-skeleton__status {
            margin: 28px 24px 0;
            text-align: center;
            font-size: 15px;
            line-height: 1.5;
          }
          .candid-embed-skeleton__retry {
            display: block;
            margin: 12px auto 0;
            padding: 10px 24px;
            border: 0;
            border-radius: 21px;
            background: #3b2a8f;
            color: #fff;
            font: inherit;
            font-weight: 600;
            cursor: pointer;
          }
          .candid-embed-skeleton__retry[hidden] {
            display: none;
          }
          .candid-embed-skeleton[data-state='failed']
            .candid-embed-skeleton__body {
            animation: none;
            opacity: 0.35;
          }
          /* Taken out of the flow so the app takes its place underneath. */
          .candid-embed-skeleton[data-state='leaving'] {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            pointer-events: none;
            opacity: 0;
            transition: opacity ${FADE_MS}ms ease-out;
          }
          .candid-embed--loading > :not(.candid-embed-skeleton) {
            opacity: 0;
          }
          .candid-embed--revealing > :not(.candid-embed-skeleton) {
            transition: opacity ${FADE_MS}ms ease-in;
          }
          /* Zero specificity, so the host page's own styles still win. */
          :where(.candid-embed--revealing) {
            display: block;
            position: relative;
          }
          @keyframes candid-embed-skeleton-pulse {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.55;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .candid-embed-skeleton__body {
              animation: none;
            }
            .candid-embed-skeleton[data-state='leaving'],
            .candid-embed--revealing > :not(.candid-embed-skeleton) {
              transition: none;
            }
          }
          @media (max-width: 760px) {
            .candid-embed-skeleton__body {
              flex-direction: column;
              gap: 8px;
            }
            .candid-embed-skeleton__card {
              flex-basis: auto;
              width: 100%;
            }
            .candid-embed-skeleton__line--title {
              width: 100%;
              height: 36px;
              margin: 0 0 12px;
            }
            .candid-embed-skeleton__about,
            .candid-embed-skeleton__rule {
              display: none;
            }
          }
        </style>

        <div class="candid-embed-skeleton__bar" aria-hidden="true"></div>

        <div class="candid-embed-skeleton__body" aria-hidden="true">
          <div class="candid-embed-skeleton__main">
            <div
              class="candid-embed-skeleton__line candid-embed-skeleton__line--title"
            ></div>
            <div class="candid-embed-skeleton__about">
              <div
                class="candid-embed-skeleton__line candid-embed-skeleton__line--heading"
              ></div>
              <div
                class="candid-embed-skeleton__line candid-embed-skeleton__line--text"
              ></div>
              <div
                class="candid-embed-skeleton__line candid-embed-skeleton__line--text-short"
              ></div>
            </div>
            <div class="candid-embed-skeleton__rule"></div>
          </div>

          <div class="candid-embed-skeleton__card">
            <div class="candid-embed-skeleton__eyebrow"></div>
            <div
              class="candid-embed-skeleton__line candid-embed-skeleton__line--short"
            ></div>
            <div class="candid-embed-skeleton__avatar"></div>
            <div class="candid-embed-skeleton__pill"></div>
          </div>
        </div>

        <div class="candid-embed-skeleton__status" role="status">
          <span class="candid-embed-skeleton__message"></span>
          <button type="button" class="candid-embed-skeleton__retry" hidden>
            Try again
          </button>
        </div>
      </div>
    `;
  }

  // States: loading ⇄ stalled, then leaving or failed.
  class Skeleton {
    constructor() {
      this.root = skeletonTemplate();
      this.message = this.root.querySelector('.candid-embed-skeleton__message');
      this.retryButton = this.root.querySelector(
        '.candid-embed-skeleton__retry'
      );
      this.retryButton.addEventListener('click', () =>
        window.location.reload()
      );
      this.timers = [];
    }

    get state() {
      return this.root.dataset.state;
    }

    set state(value) {
      this.root.dataset.state = value;
    }

    // aria-busy only on a separate app root: on container it would mute the
    // status line.
    mount(container, before, appRoot) {
      this.container = container;
      this.appRoot = appRoot !== container ? appRoot : null;
      container.classList.add('candid-embed--loading');
      this.appRoot?.setAttribute('aria-busy', 'true');
      container.insertBefore(this.root, before || null);
      this.timers.push(
        setTimeout(() => this.setStatus(CAPTION_TEXT), CAPTION_DELAY_MS)
      );
    }

    setStatus(text, { retry = false } = {}) {
      this.message.textContent = text;
      this.retryButton.hidden = !retry;
    }

    stalled() {
      if (this.state !== 'loading') return;
      this.state = 'stalled';
      this.setStatus(
        'This is taking longer than usual. Check your connection, or try again.',
        { retry: true }
      );
    }

    progressed() {
      if (this.state !== 'stalled') return;
      this.state = 'loading';
      this.setStatus(CAPTION_TEXT);
    }

    // The app stays hidden: whatever it rendered before failing is broken.
    fail() {
      this.state = 'failed';
      this.clearTimers();
      this.setStatus(
        'The wholesale shop could not be loaded. Please try again.',
        { retry: true }
      );
    }

    dismiss() {
      this.clearTimers();
      this.state = 'leaving';
      this.container.classList.replace(
        'candid-embed--loading',
        'candid-embed--revealing'
      );
      this.appRoot?.removeAttribute('aria-busy');
      const reduced =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = reduced ? 0 : FADE_MS;
      return new Promise((resolve) => {
        setTimeout(() => {
          this.root.remove();
          this.container.classList.remove('candid-embed--revealing');
          resolve();
        }, duration + 50);
      });
    }

    clearTimers() {
      this.timers.forEach((t) => clearTimeout(t));
      this.timers = [];
    }
  }

  // Resolves true once a route renders real content (not the app shell or a
  // waiting message), or false after timeoutMs so the app can't stay hidden.
  function whenRendered(rootElement, timeoutMs) {
    const isAppNode = (node) =>
      node.nodeType === 1 &&
      !['SCRIPT', 'LINK', 'STYLE'].includes(node.tagName) &&
      !node.classList.contains(SKELETON_CLASS);

    return new Promise((resolve) => {
      let graceTimer;
      let graceOver = false;
      const hasRendered = () => {
        if (!Array.from(rootElement.children).some(isAppNode)) return false;
        const outlet = rootElement.querySelector('.liquid-container');
        // Only a waiting message in the route content holds the skeleton.
        if ((outlet || rootElement).querySelector(WAITING_SELECTOR)) {
          return false;
        }
        if (outlet) return outlet.querySelector('.liquid-child > *') !== null;
        if (!graceTimer) {
          graceTimer = setTimeout(() => {
            graceOver = true;
            check();
          }, NO_OUTLET_GRACE_MS);
        }
        return graceOver;
      };
      const observer = new MutationObserver(() => check());
      const deadline = setTimeout(() => finish(false), timeoutMs);
      function finish(rendered) {
        observer.disconnect();
        clearTimeout(graceTimer);
        clearTimeout(deadline);
        resolve(rendered);
      }
      function check() {
        if (hasRendered()) finish(true);
      }
      observer.observe(rootElement, { childList: true, subtree: true });
      check();
    });
  }

  // Waits for the boot promise, which the autoboot creates after DOM ready.
  // Don't call application.boot() instead: the initializers would run twice.
  async function whenBooted(application) {
    if (document.readyState === 'loading') {
      await new Promise((resolve) =>
        document.addEventListener('DOMContentLoaded', resolve, { once: true })
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (application._bootPromise) {
      await application._bootPromise;
    } else {
      debug('No boot promise to wait for; relying on the render check');
    }
  }

  // list all attributes to our CE that we handle by ourself. All others are passed as custom arguments to the app...
  const ownAttributes = ['shadow', 'class'];

  class EmbeddedApp extends HTMLElement {
    #rootElement;
    #application;
    #shadowRoot;
    #destroyTimer;

    async connectedCallback() {
      // Moved in the DOM (disconnect + reconnect in one task): keep the app.
      if (this.#destroyTimer) {
        clearTimeout(this.#destroyTimer);
        this.#destroyTimer = undefined;
        return;
      }
      // Set up only once, like upstream, even after a failed boot.
      if (this.#rootElement) {
        return;
      }

      let head;
      if (this.getAttribute('shadow') !== null) {
        this.#shadowRoot = this.attachShadow({ mode: 'open' });
        const rootParent = document.createElement('div');
        const rootElement = document.createElement('div');
        rootParent.appendChild(rootElement);
        this.#shadowRoot.appendChild(rootParent);
        this.#rootElement = rootElement;
        head = rootParent;
      } else {
        this.#rootElement = this;
        head = this;
      }

      const skeleton = new Skeleton();
      skeleton.mount(
        head,
        head === this ? this.firstChild : this.#rootElement,
        this.#rootElement
      );
      let stallTimer;
      const armStallTimer = () => {
        clearTimeout(stallTimer);
        stallTimer = setTimeout(() => skeleton.stalled(), STALL_TIMEOUT_MS);
      };
      armStallTimer();

      try {
        await setup(head, undefined, () => {
          skeleton.progressed();
          armStallTimer();
        });
        // Removed while loading: don't start an app nothing will destroy.
        if (!this.isConnected) {
          clearTimeout(stallTimer);
          return;
        }

        window.__ember_embedded_snippet_args = this.customArgs;

        this.#application = await startApp(this.#rootElement);
        await whenBooted(this.#application);
        clearTimeout(stallTimer);
        skeleton.progressed();

        const rendered = await whenRendered(
          this.#rootElement,
          RENDER_TIMEOUT_MS
        );
        if (!rendered) {
          debug(
            `No route content after ${RENDER_TIMEOUT_MS} ms, showing the app anyway`
          );
        }
        await skeleton.dismiss();
      } catch (error) {
        clearTimeout(stallTimer);
        skeleton.fail();
        console.error(
          '[ember-embedded-snippet] The embedded app could not start',
          error
        );
        this.dispatchEvent(
          new CustomEvent('embedded-app-error', {
            bubbles: true,
            detail: { error, scriptUrl: error && error.scriptUrl },
          })
        );
      }
    }

    disconnectedCallback() {
      if (this.#destroyTimer) return;
      this.#destroyTimer = setTimeout(() => {
        this.#destroyTimer = undefined;
        if (
          this.#application &&
          !this.#application.isDestroyed &&
          !this.#application.isDestroying
        ) {
          this.#application.destroy();
        }
      }, 0);
    }

    get customArgs() {
      const args = this.getAttributeNames()
        .filter((attr) => !ownAttributes.includes(attr))
        .reduce(
          (args, attr) => ({ ...args, [attr]: this.getAttribute(attr) }),
          {}
        );

      return Object.freeze(args);
    }
  }

  customElements.define('###CENAME###', EmbeddedApp);
})();

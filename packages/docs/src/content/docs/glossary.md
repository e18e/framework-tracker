---
title: Glossary
description: Terminology and concepts used by Framework Tracker.
---

This site describes the terminology and concepts used in the framework tracker.

## Application Architecture

**MPA (Multi-Page Application)** and **SPA (Single-Page Application)** are the
two foundational architectures for web applications. The choice between them
shapes how pages are rendered, how navigation works, and how state is managed.
In practice, many modern frameworks blur the line by supporting hybrid
approaches, for example combining server-rendered pages with client-side
navigation.

The key aspects that distinguish an application architecture are:

- **Navigation model**: Does the browser perform a full page load for each route
  (MPA), or does JavaScript intercept navigation and update the page in-place
  (SPA)?
- **Content loading and processing**: Is HTML assembled on the server and sent
  ready-to-display (MPA), or is it generated in the browser by a JavaScript
  framework consuming raw data fetched from an API (SPA)?
- **State lifetime**: Is in-memory state reset on every navigation (MPA), or
  does it persist across route changes within the same session (SPA)?
- **JavaScript dependency**: Is JavaScript required for the page to be
  meaningful, or is it an optional progressive enhancement on top of
  server-rendered HTML?
- **SEO and initial load**: Is content present in the first HTML response (MPA),
  or does meaningful content only appear after JS downloads and executes (SPA)?

### MPA

In an MPA, each navigation triggers a full page load by the browser and the
server (or CDN) responds with a complete HTML document, so the browser always
receives ready-to-display content. JavaScript is optional and typically used
only for progressive enhancement. In-memory state is lost on every navigation.
Because content is present in the initial HTML response, MPAs are naturally
SEO-friendly.

### SPA

In an SPA, the browser loads a single HTML shell once and all subsequent
navigation is handled client-side by JavaScript, without full page reloads. HTML
is generated in the browser, typically by a JavaScript framework rendering
components on demand. On initial load the browser typically receives a minimal
document and must download and execute JS before content appears. Subsequent
navigations fetch only data, such as via API calls, keeping the page transition
fast. In-memory state persists across navigation. Because the initial HTML shell
contains little content, SPAs require extra effort (SSR, prerendering) for good
SEO. The server only needs to serve static assets.

## Rendering Patterns

A rendering pattern describes how and when content is generated and delivered to
the client, typically the browser. The rendering process can happen on the
client or on a server, and at different stages of the application lifecycle.

Each pattern has different tradeoffs in terms of performance, SEO, UX, resource
usage, robustness, and complexity. The choice of rendering pattern can have a
significant impact on the overall experience and maintainability of the
application.

### SSG

Static Site Generation pre-builds all pages into static HTML files at build time
(ahead of time) by a build tool or framework. The output is a set of
ready-to-serve files, one per route, that can be delivered directly from a CDN
with no server needed at runtime. Because every response is a pre-built file,
load times are fast and infrastructure is simple. Best suited for content that
doesn't change per request.

### SSR

Server-Side Rendering generates HTML on a server for each incoming request (just
in time). This allows dynamic content and per-request logic such as
authentication, personalization, or A/B testing. Unlike SSG, SSR requires a
running server at runtime.

The term SSR is often used together with [hydration](#hydration). However,
classic SSR works without hydration: the server sends functional HTML that
relies on native browser capabilities (links, forms) rather than a JavaScript
framework. This is the traditional web model where JavaScript is only used for
progressive enhancement, not for rendering core content.

### CSR

Client-Side Rendering sends the browser a minimal HTML skeleton and a JavaScript
bundle instead of ready-made HTML from a server. The JS framework then fetches
data, builds the DOM, and controls all rendering on the client side.

This enables highly dynamic interfaces where the page can update without full
reloads. The tradeoff is a slower initial load: nothing meaningful appears until
the JavaScript has downloaded and executed, and SEO is weaker by default because
the initial HTML response contains little content.

### Hydration

Hydration is the process of making server-rendered HTML interactive on the
client. After the browser receives the static HTML produced by [SSR](#ssr), a
JavaScript framework re-attaches event handlers, restores component state, and
wires up reactivity, turning an inert document into a fully interactive
application. During hydration the framework typically re-executes the component
tree against the existing DOM rather than replacing it.

What happens after hydration depends on the [application architecture](#application-architecture).
For a [SPA](#spa), once hydration completes the JavaScript framework takes over
routing and rendering, so subsequent navigations are handled client-side. In
[MPA](#mpa) setups, hydration only activates specific components without
changing the navigation model: page transitions still trigger full server
requests.

The tradeoff is that hydration requires downloading and executing the same
component code that was already run on the server, which can delay interactivity
on slow devices or large pages. Techniques like
[partial hydration](#partial-hydration),
[progressive hydration](#progressive-hydration), and
[islands architecture](#islands) aim to reduce this cost.

### Partial Hydration

Partial hydration is a technique where only specific components on a page are
hydrated on the client, rather than hydrating the entire component tree. Static
parts of the page remain as plain HTML and never load any JavaScript, while
interactive components are selectively hydrated. This reduces the amount of
JavaScript the browser needs to download, parse, and execute.

### Progressive Hydration

Progressive hydration defers the hydration of individual components until they
are actually needed, rather than hydrating everything at once on page load.
Components can be hydrated based on triggers such as the component scrolling
into the viewport, the browser becoming idle, or the user interacting with the
component for the first time. This spreads the cost of [hydration](#hydration)
over time.

### Islands

Islands architecture is a pattern where interactive UI components, called
"islands", are hydrated independently within an otherwise static HTML page. The
static content is rendered at build time or on the server with zero JavaScript,
and only the islands ship client-side code. Each island hydrates on its own,
without depending on a top-level application shell.

### ISR

Incremental Static Regeneration is a hybrid of [SSG](#ssg) and [SSR](#ssr)
where statically generated pages are regenerated in the background after a
configured time interval or on-demand trigger, without requiring a full site
rebuild. When a request arrives for a stale page, the cached version is served
immediately while a fresh version is generated in the background for subsequent
requests.

### PPR

Partial Prerendering splits a single route into a static shell that is served
instantly and dynamic holes that are streamed in at request time. The static
parts of the page, any content known at build time, are prerendered and cached,
while personalized or data-dependent sections are rendered on-demand and
streamed into the page via Suspense boundaries.

### Streaming

Streaming is a rendering approach where server-rendered HTML is sent to the
browser in chunks as each part becomes ready, rather than waiting for the entire
page to finish rendering. The browser can begin parsing and displaying content
as soon as the first bytes arrive, improving time-to-first-byte and perceived
performance.

### RSC

Server Components are components that execute exclusively on the server. Unlike
traditional [SSR](#ssr), where component code is sent to the client for
[hydration](#hydration), Server Components send only their rendered output,
never their source code, to the client. They can directly access server-side
resources such as databases and file systems without exposing those details to
the browser.

### ESR

Edge-Side Rendering moves the rendering step from a central origin server to
edge servers distributed geographically close to the user. Instead of every
request traveling to a single data center, the nearest edge node renders the
HTML, reducing latency and improving time-to-first-byte.

# Mastro Template Basic for Node.js

This is a basic TypeScript template for [Mastro](https://mastrojs.github.io) when using [Node.js](https://nodejs.org).

Click the green **Use this template** button in the top right to create your own copy of this repository. Then clone the **Code** to your computer.

## Run locally

If you have multiple projects on your computer that require different Node.js versions, you should install a tool to manage those version for you; for example [Volta](https://volta.sh/) (see [pnpm Support](https://docs.volta.sh/advanced/pnpm)).

Mastro requires Node.js >=24 (unless you want to install a [`URLPattern` polyfill](https://www.npmjs.com/package/urlpattern-polyfill)).

[JSR recommends](https://jsr.io/docs/npm-compatibility#installing-and-using-jsr-packages) to use `pnpm`.

The first time, you need to:

    pnpm install

After that, to start the server:

    pnpm run start

and open <http://localhost:8000> in your browser.

To generate the whole static site (this will create a `generated` folder):

    pnpm run generate

## Next steps

To see how Mastro works, [follow the guide](https://mastrojs.github.io/guide/server-side-components-and-routing/).

To make sure you're using the latest Mastro packages:

    pnpm update "@mastrojs/*" --latest


## Deploy to production

- [Deploy static site](https://mastrojs.github.io/guide/deploy/#deploy-static-site-with-ci%2Fcd)
- [Deploy server](https://mastrojs.github.io/guide/deploy/#deploy-server-to-production)

import EmbroiderRouter from '@embroider/router'

import config from '#config'

export default class Router extends EmbroiderRouter {
  location = config.locationType
  rootURL = config.rootURL
}

Router.map(function () {
  this.route('ssr-throughput')
  this.route('server-side-rendered')
  this.route('server-side-rendered-detail', {
    path: '/server-side-rendered/:id',
  })
  this.route('server-side-rendered-plain-links')
  this.route('client-side-rendered')
  this.route('client-side-rendered-detail', {
    path: '/client-side-rendered/:id',
  })
  this.route('initial-load')
})

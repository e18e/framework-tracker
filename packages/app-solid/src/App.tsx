import { pageRoutes } from 'virtual:file-routes'
import { createRouter } from '@solidjs/router'
import { fileRoutes } from '@solidjs/router/fs'
import { Loading } from 'solid-js'

const Router = createRouter({ routes: fileRoutes(pageRoutes) })

export default function App() {
  return <Router>{(props) => <Loading>{props.children}</Loading>}</Router>
}

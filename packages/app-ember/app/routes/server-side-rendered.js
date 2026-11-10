import Route from '@ember/routing/route'
import { loadTableData } from '#utils/table-data.js'

export default class extends Route {
  model() {
    return loadTableData()
  }
}

import { observable, WebUIElement } from '@microsoft/webui-framework'

class ClientTable extends WebUIElement {
  @observable entries: { id: string; name: string }[] = []

  protected override hydratedCallback(): void {
    this.entries = Array.from({ length: 1000 }, () => ({
      id: crypto.randomUUID(),
      name: crypto.randomUUID(),
    }))
  }
}

ClientTable.define('client-table')

import { observable, WebUIElement } from '@microsoft/webui-framework'

class ClientDetail extends WebUIElement {
  @observable id = ''

  protected override hydratedCallback(): void {
    this.id = decodeURIComponent(location.pathname.split('/').at(-1) ?? '')
  }
}

ClientDetail.define('client-detail')

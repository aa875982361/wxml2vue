import { wrapWxApiAsync, wrapWxApiSync } from "./common"
class SocketTask {
  webSocket: WebSocket
  public get readyState() {
    return this.webSocket.readyState
  }
  constructor({ url, protocols }) {
    this.webSocket = new WebSocket(url, protocols)
  }
  close({ code, reason }) { return wrapWxApiSync(this.webSocket.close)(code, reason) }
  onClose(cb) {this.webSocket.onclose = cb}
  onError(cb) {this.webSocket.onerror = cb}
  onMessage(cb) {this.webSocket.onmessage = cb}
  onOpen(cb) { this.webSocket.onopen = cb }
  send({ data, success, fail, complete }) {
    try {
      this.webSocket.send(data)
      success?.("ok")
    } catch (e) {
      fail?.(e)
    } finally {
      complete?.("complete")
    }
  }
}
export const connectSocket = (opt) => {
  return new SocketTask(opt)
}
export default {
  connectSocket: wrapWxApiSync(connectSocket)
}
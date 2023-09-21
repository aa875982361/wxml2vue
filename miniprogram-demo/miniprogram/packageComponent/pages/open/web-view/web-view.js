Page({
  data: {
    theme: 'light'
  },
  onShareAppMessage() {
    return {
      title: 'webview',
      path: 'packageComponent/pages/open/web-view/web-view'
    }
  },
  onUnload() {
    if (wx.offThemeChange) {
      wx.offThemeChange()
    }
  },
  onLoad() {
    this.setData({
      theme: wx.getSystemInfoSync().theme || 'light'
    })

    if (wx.onThemeChange) {
      wx.onThemeChange(({theme}) => {
        this.setData({theme})
      })
    }
  }
})

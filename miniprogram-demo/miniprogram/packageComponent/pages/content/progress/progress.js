Page({
  data: {
    theme: 'light'
  },
  onShareAppMessage() {
    return {
      title: 'progress',
      path: 'packageComponent/pages/content/progress/progress'
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

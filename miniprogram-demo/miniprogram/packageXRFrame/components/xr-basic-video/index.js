Component({
  behaviors: [require('../common/share-behavior').default],
  properties: {
    a: Number,
  },
  data: {
    loaded: false
  },
  lifetimes: {},
  methods: {
    handleReady({detail}) {
      const xrScene = this.scene = detail.value;
      console.log('xr-scene', xrScene);
    },
    handleAssetsProgress: function({detail}) {
      console.log('assets progress', detail.value);
    },
    handleAssetsLoaded: function({detail}) {
      console.log('assets loaded', detail.value);
      this.setData({loaded: true});
    },
    handleTouchCube: async function() {
      const xrSystem = wx.getXrFrameSystem();
      const video = this.scene.assets.getAsset('video-texture', 'cat');

      if (!video) {
        return;
      }

      if (video.state === xrSystem.EVideoState.Playing) {
        video.pause();
      } else if (video.state === xrSystem.EVideoState.Paused) {
        video.resume();
      }
    }
  }
})
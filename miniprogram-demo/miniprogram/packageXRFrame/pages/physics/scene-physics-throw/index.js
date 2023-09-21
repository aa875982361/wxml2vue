var sceneReadyBehavior = require('../../behavior-scene/scene-ready');
var handleDecodedXML = require('../../behavior-scene/util').handleDecodedXML;

var xmlCode = ``;

Page({
  behaviors:[sceneReadyBehavior],
  data: {
    xmlCode: '<div class="codeWrap">' + handleDecodedXML(xmlCode) + '</div>',
    arDetected: false,
    throwing: false
  },
  handleARDetected() {
    this.setData({
      arDetected: true
    });
  },
  handleThrowStart() {
    this.setData({
      throwing: true
    });
  },
  handleThrowEnd() {
    this.setData({
      throwing: false
    });
  }
});

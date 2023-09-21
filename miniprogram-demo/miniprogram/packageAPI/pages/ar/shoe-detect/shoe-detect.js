import arBehavior from '../behavior/behavior-ar'
import xrFrameBehavior from '../behavior/behavior-xrFrame'

// VK 投影矩阵参数定义
const NEAR = 0.01
const FAR = 1000

let loggerOnce = false;

Component({
  behaviors: [arBehavior, xrFrameBehavior],
  data: {
    theme: 'light',
    cameraPosition: 0,
    buttonDisable: true,
  },
  hintBoxList: [], // 提示点集合
  lifetimes: {
    /**
     * 生命周期函数--监听页面加载
     */
    detached() {
      console.log("页面detached")
      if (wx.offThemeChange) {
        wx.offThemeChange()
      }
    },
    ready() {
      console.log("页面准备完全")
      this.setData({
        theme: wx.getSystemInfoSync().theme || 'light'
      })

      if (wx.onThemeChange) {
        wx.onThemeChange(({
          theme
        }) => {
          this.setData({
            theme
          })
        })
      }
    },
  },
  methods: {
    // 对应案例的初始化逻辑，由统一的 behavior 触发
    init() {
      // 初始化VK
      // start完毕后，进行更新渲染循环
      this.initVK();
    },
    // 缩放 xr-frame TRS
    scaleTrs(trs, scale) {
      trs.scale.x = scale;
      trs.scale.y = scale;
      trs.scale.z = scale;
    },
    getHintBox(xrFrameSystem, scene, wrap) {
      // 初始化提示点
      const geometryCube = scene.assets.getAsset('geometry', 'cube');
      const effectCube = scene.assets.getAsset('effect', 'standard');
      const boxScale = 0.2;
      const hintBoxList = [];
      for (let i = 0; i < 8; i++) {
        const colorFloat =  i / 16;
        const el = scene.createElement(xrFrameSystem.XRNode, {
          position: "0 0 0",
          scale: `${boxScale} ${boxScale} ${boxScale}`,
        });
        const elTrs = el.getComponent(xrFrameSystem.Transform);
        const mat = scene.createMaterial(effectCube);
        mat.setVector('u_baseColorFactor', xrFrameSystem.Vector4.createFromNumber(colorFloat + 0.3, 0.2, 0.2, 1.0));
        mat.renderQueue = 9990;
        mat.setRenderState('depthTestOn', false);

        const mesh = el.addComponent(xrFrameSystem.Mesh, {
          geometry: geometryCube,
          material: mat,
        });

        wrap.addChild( el );
        hintBoxList.push( elTrs );
      }

      return hintBoxList;
    },
    updateHintBoxVisible(hintBoxList, visible) {
      if (hintBoxList && hintBoxList.length > 0) {
        // 存在提示列表，则更新点信息
        for (let i = 0; i < hintBoxList.length; i++) {
          const hintBox = hintBoxList[i];
          hintBox.visible = visible;
        }
      }
    },
    updateHintBoxPosition(hintBoxList, points3d) {
      if (hintBoxList && hintBoxList.length > 0) {
        // console.log('ready to set', hintBoxList);
        // 存在提示列表，则更新点信息
        for (let i = 0; i < hintBoxList.length; i++) {
          const hintBox = hintBoxList[i];
          hintBox.position.x = points3d[i].x;
          hintBox.position.y = points3d[i].y;
          hintBox.position.z = points3d[i].z;
        }
      }
    },
    initVK() {
      // VKSession 配置
      const session = this.session = wx.createVKSession({
          track: {
              shoe: {
                  mode: 1
              }
          },
          cameraPosition: 0,
          version: 'v1',
          gl: this.gl
      })

      try{

      // VKSession start
      session.start(err => {
        if (err) return console.error('VK error: ', err)

        console.log('@@@@@@@@ VKSession.version', session.version)

        // 开启 shoeMask
        // session.updateMaskMode({useMask: true});

        //  VKSession EVENT resize
        session.on('resize', () => {
            this.calcCanvasSize();
        })

        // VKSession EVENT addAnchors
        session.on('addAnchors', anchors => {
            // console.log("addAnchor", anchors)
        })

        // VKSession EVENT updateAnchors
        session.on('updateAnchors', anchors => {
          // console.log("updateAnchors")

          if (anchors.length === 1) {
            // 只有一双的情况下，可以做一个简单的显示性检测，进行非 remove 事件下的隐藏
            const anchorSingle = anchors[0];
            const shoedirecSingle = anchorSingle.shoedirec;

            if (shoedirecSingle === 0) {
              // 只有左脚，此时尝试隐藏右脚
              if (this.modelShowRight && this.modelTrsRight) {
                // 右脚
                this.scaleTrs(this.modelTrsRight, 0);
                this.updateHintBoxVisible(this.hintBoxListRight, false);
                this.modelShowRight = false;
              }
            } else if (shoedirecSingle === 1) {
              // 只有右脚，此时尝试隐藏左脚
              if (this.modelShowLeft && this.modelTrsLeft) {
                // 左脚
                this.scaleTrs(this.modelTrsLeft, 0);
                this.updateHintBoxVisible(this.hintBoxListLeft, false);
                this.modelShowLeft = false;
              }
            }

          }

          for (let i = 0; i < anchors.length; i++ ) {
            const anchor = anchors[i];
            // console.log('transform', anchor.transform);
            // console.log('points3d', anchor.points3d);
            const modelScale = 240;
            
            if (anchor.shoedirec === 0) {
              // 左脚
              this.shoeTransformLeft = anchor.transform;
              this.points3dLeft = anchor.points3d;

              if (!this.modelShowLeft && this.modelTrsLeft) {
                this.scaleTrs(this.modelTrsLeft, modelScale);
                this.updateHintBoxVisible(this.hintBoxListLeft, true);
                this.modelShowLeft = true;
              }
            } else if (anchor.shoedirec === 1) {
              // 右脚
              this.shoeTransformRight = anchor.transform;
              this.points3dRight = anchor.points3d;

              if (!this.modelShowRight && this.modelTrsRight) {
                this.scaleTrs(this.modelTrsRight, modelScale);
                this.updateHintBoxVisible(this.hintBoxListRight, true);
                this.modelShowRight = true;
              }
            }

          }

        })
        
        // VKSession removeAnchors
        // 识别目标丢失时，会不断触发
        session.on('removeAnchors', anchors => {
          // console.log("removeAnchors")

          // Hide
          if (this.modelShowLeft && this.modelTrsLeft) {
            // 左脚
            this.scaleTrs(this.modelTrsLeft, 0);
            this.updateHintBoxVisible(this.hintBoxListLeft, false);
            this.modelShowLeft = false;
          }
          if (this.modelShowRight && this.modelTrsRight) {
            // 右脚
            this.scaleTrs(this.modelTrsRight, 0);
            this.updateHintBoxVisible(this.hintBoxListRight, false);
            this.modelShowRight = false;
          }
        })

        console.log('ready to initloop')
        // start 初始化完毕后，进行更新渲染循环
        this.initLoop();
      });

      } catch(e) {
      }
    },
    // 针对 xr-frame 的初始化逻辑
    async initXRFrame() {
      const xrFrameSystem = wx.getXrFrameSystem();
      const scene = this.xrScene;
      const {rootShadow} = scene;
      
      // 初始化YUV相机配置
      this.initXRYUVCamera();

      // 左右鞋子分别处理
      // === 左边鞋子流程 ===
      // 初始化挂载点
      this.modelWrapLeft = scene.createElement(xrFrameSystem.XRNode);
      this.modelWrapTrsLeft = this.modelWrapLeft.getComponent(xrFrameSystem.Transform);
      rootShadow.addChild( this.modelWrapLeft );

      console.log('modelWrapLeft ready');

      // 加载鞋子模型
      const shoeModelLeft = await scene.assets.loadAsset({
        type: 'gltf',
        assetId: `gltf-shoe-left`,
        src: 'https://mmbizwxaminiprogram-1258344707.cos.ap-guangzhou.myqcloud.com/xr-frame/demo/shoe-1-left.glb',
      })
      console.log('shoeModelLeft', shoeModelLeft.value);
      const elLeft = scene.createElement(xrFrameSystem.XRGLTF, {
        model: "gltf-shoe-left",
        position: "0 0 0",
        scale: "0 0 0",
      });
      this.modelLeft = elLeft;
      this.modelTrsLeft = elLeft.getComponent(xrFrameSystem.Transform);
      this.modelShowLeft = false;
      this.modelWrapLeft.addChild(elLeft);
      console.log('this.modelTrsLeft', this.modelTrsLeft);
      console.log('shoeModelLeft ready');

      // 加载提示点
      this.hintBoxListLeft = this.getHintBox(xrFrameSystem, scene, this.modelWrapLeft);

      // === 右边鞋子流程 ===
      // 初始化挂载点
      this.modelWrapRight = scene.createElement(xrFrameSystem.XRNode);
      this.modelWrapTrsRight = this.modelWrapRight.getComponent(xrFrameSystem.Transform);
      rootShadow.addChild( this.modelWrapRight );

      console.log('modelWrapRight ready');

      // 加载鞋子模型
      const shoeModelRight = await scene.assets.loadAsset({
        type: 'gltf',
        assetId: `gltf-shoe-right`,
        src: 'https://mmbizwxaminiprogram-1258344707.cos.ap-guangzhou.myqcloud.com/xr-frame/demo/shoe-1-right.glb',
      })
      console.log('shoeModelRight', shoeModelRight.value);
      const elRight = scene.createElement(xrFrameSystem.XRGLTF, {
        model: "gltf-shoe-right",
        position: "0 0 0",
        scale: "0 0 0",
      });
      this.modelRight = elRight;
      this.modelTrsRight = elRight.getComponent(xrFrameSystem.Transform);
      this.modelShowRight = false;
      this.modelWrapRight.addChild(elRight);
      console.log('this.modelTrsRight', this.modelTrsRight);
      console.log('shoeModelRight ready');

      // 加载提示点
      this.hintBoxListRight = this.getHintBox(xrFrameSystem, scene, this.modelWrapRight);

    },
    loop() {
      // console.log('loop')

      // 获取 VKFrame
      const frame = this.session.getVKFrame(this.data.domWidth, this.data.domHeight)

      // 成功获取 VKFrame 才进行
      if(!frame) { return; }

      // 腿部分割
      // const getLegSegmentBuffer = frame.getLegSegmentBuffer();

      // 更新相机 YUV 数据
      this.updataXRYUV(frame);

      // 获取 VKCamera
      const VKCamera = frame.camera

      // 更新 xrFrame 相机矩阵
      this.updataXRCameraMatrix(VKCamera, NEAR, FAR);

      // 存在model，更新矩阵
      // 左边鞋子流程
      if (this.modelWrapLeft && this.points3dLeft && this.shoeTransformLeft) {
        const xrFrameSystem = wx.getXrFrameSystem();

        if (!this.DT) { this.DT = new xrFrameSystem.Matrix4(); }
        if (!this.DT2) { this.DT2 = new xrFrameSystem.Matrix4(); }

        // 目前VK返回的是行主序矩阵
        // xrframe 矩阵存储为列主序
        this.DT.setArray(this.shoeTransformLeft);
        this.DT.transpose(this.DT2);
        this.modelWrapTrsLeft.setLocalMatrix(this.DT2);

        // 放置鞋子
        this.modelTrsLeft.position.x = (this.points3dLeft[3].x + this.points3dLeft[4].x ) / 2;
        this.modelTrsLeft.position.y = (this.points3dLeft[3].y + this.points3dLeft[4].y ) / 2;
        this.modelTrsLeft.position.y -= 0.2; // 额外下移0.2，适配鞋底
        this.modelTrsLeft.position.z = (this.points3dLeft[0].z + this.points3dLeft[1].z ) / 2;

        this.updateHintBoxPosition(this.hintBoxListLeft, this.points3dLeft);

        // debug 用信息
        if (!loggerOnce) {
          // console.log('xrCamera._viewMatrix', this.xrCamera._viewMatrix.toArray());
          // console.log('xrCamera._projMatrix', this.xrCamera._projMatrix.toArray());
          
          // VK 直接数值
          // console.log('joints',  Array.from(this.points3d))
          // console.log('viewMatrix',  Array.from(VKCamera.viewMatrix))
          // console.log('projectionMatrix',  Array.from(VKCamera.getProjectionMatrix(NEAR, FAR)))
          // console.log('anchorTransform',  Array.from(this.shoeTransform));
          loggerOnce = true;
        }
      }
      // 右边鞋子流程
      if (this.modelWrapRight && this.points3dRight && this.shoeTransformRight) {
        const xrFrameSystem = wx.getXrFrameSystem();

        if (!this.DT) { this.DT = new xrFrameSystem.Matrix4(); }
        if (!this.DT2) { this.DT2 = new xrFrameSystem.Matrix4(); }

        // 目前VK返回的是行主序矩阵
        // xrframe 矩阵存储为列主序
        this.DT.setArray(this.shoeTransformRight);
        this.DT.transpose(this.DT2);
        this.modelWrapTrsRight.setLocalMatrix(this.DT2);

        // 放置鞋子
        this.modelTrsRight.position.x = (this.points3dRight[3].x + this.points3dRight[4].x ) / 2;
        this.modelTrsRight.position.y = (this.points3dRight[3].y + this.points3dRight[4].y ) / 2;
        this.modelTrsRight.position.y -= 0.2; // 额外下移0.2，适配鞋底
        this.modelTrsRight.position.z = (this.points3dRight[0].z + this.points3dRight[1].z ) / 2;

        this.updateHintBoxPosition(this.hintBoxListRight, this.points3dRight);

        // debug 用信息
        if (!loggerOnce) {
          // console.log('xrCamera._viewMatrix', this.xrCamera._viewMatrix.toArray());
          // console.log('xrCamera._projMatrix', this.xrCamera._projMatrix.toArray());
          
          // VK 直接数值
          // console.log('joints',  Array.from(this.points3d))
          // console.log('viewMatrix',  Array.from(VKCamera.viewMatrix))
          // console.log('projectionMatrix',  Array.from(VKCamera.getProjectionMatrix(NEAR, FAR)))
          // console.log('anchorTransform',  Array.from(this.shoeTransform));
          loggerOnce = true;
        }
      }
    },
  },
})
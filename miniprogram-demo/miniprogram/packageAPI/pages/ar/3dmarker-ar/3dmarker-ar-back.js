import arBehavior from '../behavior/behavior-ar'
import xrFrameBehavior from '../behavior/behavior-xrFrame'


// protobuf 相关逻辑
let protobuf = require("./protobuf/protobuf.js");
let json = require("./proto/arModelProto.js");
let root = protobuf.Root.fromJSON(json)
let message = root.lookupType("ARModelData");


// VK 投影矩阵参数定义
const NEAR = 0.01
const FAR = 1000

Component({
  behaviors: [arBehavior, xrFrameBehavior],
  data: {
    theme: 'light',
    widthScale: 1,      // canvas宽度缩放值
    heightScale: 0.6,   // canvas高度缩放值
    hintBoxList: [],  // 显示提示盒子列表
    usingMarkerId: false, // 使用中的markerId
  },
  markerIndex: 0,  // 使用的 marker 索引
  hintInfo: undefined, // 提示框信息
  selectCosid: 0, // 选中的cosid
  selectResp: undefined,  // 选中的回调信息
  parsedMapUrl: undefined, // 使用中的mapUrl
  parsedGlbUrl: undefined,// 使用中的glbUrl
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
          wx.onThemeChange(({theme}) => {
            this.setData({theme})
          })
        }
      },
  },
  methods: {
    // 对应案例的初始化逻辑，由统一的 behavior 触发
    init() {
      // 初始化 Three.js，用于模型相关的渲染
      this.initTHREE()

      // 初始化 GL，基于 Three.js 的 Context，用于相机YUV渲染
      this.initYUV()

      // 初始化VK
      // start完毕后，进行更新渲染循环
      this.initVK();

      this.markerIndex = 0;

      // 添加 识别坐标系
      this.add3DAxis();
    },
    initVK() {
      // VKSession 配置
      const session = this.session = wx.createVKSession({
        track: {
          plane: {
            mode: 3
          },
          marker: true,
        },
        version: 'v1',
        gl: this.gl
      });

      session.start(err => {
        if (err) return console.error('VK error: ', err)

        console.log('@@@@@@@@ VKSession.version', session.version)

        //  VKSession EVENT resize
        session.on('resize', () => {
          this.calcCanvasSize();
        })

        // VKSession EVENT addAnchors
        session.on('addAnchors', anchors => {
          console.log("addAnchor", anchors);
          this.xAxis.visible = true;
          this.yAxis.visible = true;
          this.zAxis.visible = true;
          if (this.model) {
            this.model.visible = true;
          }
        })

        // VKSession EVENT updateAnchors
        session.on('updateAnchors', anchors => {
          // marker 模式下，目前仅有一个识别目标，可以直接取
          const anchor = anchors[0];
          const markerId = anchor.id;
          const size = anchor.size;
          this.hintInfo = {
            markerId: markerId,
            size: size
          }
        })
        
        // VKSession removeAnchors
        // 识别目标丢失时，会触发一次
        session.on('removeAnchors', anchors => {
          this.xAxis.visible = false;
          this.yAxis.visible = false;
          this.zAxis.visible = false;
          if (this.model) {
            this.model.visible = false;
          }
          if (this.data.hintBoxList && this.data.hintBoxList.length > 0) {
            // 清理信息
            this.hintInfo = undefined;
            // 存在列表的情况，去除remove
            this.setData({
              hintBoxList: []
            });
          }
        });


        console.log('ready to initloop')
        // start 初始化完毕后，进行更新渲染循环
        this.initLoop();
      });

    },
    loop() {
      // console.log('loop')

      // 获取 VKFrame
      const frame = this.session.getVKFrame(this.canvas.width, this.canvas.height)

      // 成功获取 VKFrame 才进行
      if(!frame) { return; }

      // 更新相机 YUV 数据
      this.renderYUV(frame)

      // 获取 VKCamera
      const VKCamera = frame.camera

      // 相机
      if (VKCamera) {
        // 接管 ThreeJs 相机矩阵更新，Marker模式下，主要由视图和投影矩阵改变渲染效果
        this.camera.matrixAutoUpdate = false

        // 视图矩阵
        this.camera.matrixWorldInverse.fromArray(VKCamera.viewMatrix);
        this.camera.matrixWorld.getInverse(this.camera.matrixWorldInverse);

        // 投影矩阵
        const projectionMatrix = VKCamera.getProjectionMatrix(NEAR, FAR)
        this.camera.projectionMatrix.fromArray(projectionMatrix)
        this.camera.projectionMatrixInverse.getInverse(this.camera.projectionMatrix)
      }

      // 绘制而为提示框的逻辑
      if (this.hintInfo) {
        // 存在提示信息，则更新
        const THREE = this.THREE;

        // 原点偏移矩阵，VK情况下，marker 点对应就是 0 0 0，世界矩阵可以认为是一个单位矩阵
        // marker 右侧点可以理解是 0.5 0 0
        const center = new THREE.Vector3();
        const right = new THREE.Vector3(0.5, 0, 0);

        // 获取设备空间坐标
        const devicePos = center.clone().project(this.camera);

        // 转换坐标系，从 (-1, 1) 转到 (0, 100)，同时移到左上角 0 0，右下角 1 1
        const screenPos = new THREE.Vector3(0, 0, 0);
        screenPos.x = devicePos.x * 50 + 50;
        screenPos.y = 50 - devicePos.y * 50;

        // 获取右侧点信息
        const deviceRightPos = right.clone().project(this.camera);
        const screenRightPos = new THREE.Vector3(0, 0, 0);
        screenRightPos.x = deviceRightPos.x * 50 + 50;

        const markerHalfWidth = screenRightPos.x - screenPos.x;
        
        this.setData({
          hintBoxList: [
            {
              markerId: this.hintInfo.markerId,
              left: screenPos.x - markerHalfWidth,
              top: screenPos.y - markerHalfWidth,
              width: markerHalfWidth * this.data.domWidth * 2 / 100,
              height: markerHalfWidth * this.data.domWidth * 2 / 100,
            }
          ]
        });
      }

      this.renderer.autoClearColor = false
      this.renderer.state.setCullFace(this.THREE.CullFaceBack)
      this.renderer.render(this.scene, this.camera)
      this.renderer.state.setCullFace(this.THREE.CullFaceNone)
    },
    add3DAxis() {
      // 添加marker需要的 三维包围框
      const THREE = this.THREE;
      const scene = this.scene;

      const red = new THREE.MeshPhysicalMaterial( {
        metalness: 0.0, roughness: 0.1, color: 0xff0000,
      } );
      const green = new THREE.MeshPhysicalMaterial( {
        metalness: 0.0, roughness: 0.1, color: 0x00ff00,
      } );
      const blue = new THREE.MeshPhysicalMaterial( {
        metalness: 0.0, roughness: 0.1, color: 0x0000ff,
      } );
      const geometry = new THREE.BoxGeometry( 1, 1, 1 );

      const axisScale = 2.0;
      const lineScale = 0.05;

      const xAxis = new THREE.Mesh( geometry, red );
      xAxis.position.set(axisScale / 2, 0, 0 );
      xAxis.rotation.set(0, 0, 0 )
      xAxis.scale.set(axisScale, lineScale, lineScale);
      scene.add( xAxis );
      xAxis.visible = false;
      this.xAxis = xAxis;

      const yAxis = new THREE.Mesh( geometry, green );
      yAxis.position.set(0.0, axisScale / 2, 0 );
      yAxis.rotation.set(0, 0, 0 )
      yAxis.scale.set(lineScale, axisScale, lineScale);
      scene.add( yAxis );
      yAxis.visible = false;
      this.yAxis = yAxis;

      const zAxis = new THREE.Mesh( geometry, blue );
      zAxis.position.set(0, 0, axisScale / 2 );
      zAxis.rotation.set(0, 0, 0 )
      zAxis.scale.set(lineScale, lineScale, axisScale);
      scene.add( zAxis );
      zAxis.visible = false;
      this.zAxis = zAxis;

      console.log('add3DAxis is finish')
    },
    async parseAddMarker() {
      // 目前未选中cosid 跳过
      if (!this.selectCosid) {
        console.log("目前未选中cosid，请选中后重试");
        return;
      }
      // 存在marker的情况下，无法继续添加marker
      if (this.data.usingMarkerId) {
        console.log("已添加 marker，请删除后重试");
        return;
      }

      const resp = this.selectResp;
      console.log("开始添加 marker");
      console.log("获取的模型的cosID为", this.selectCosid);
      console.log(this.selectResp);
      var filePath = wx.env.USER_DATA_PATH + '/temp'
      console.log('请求地址');
      console.log(resp.result.respBody.url)
      
      // 开始下载文件
      wx.downloadFile({
        filePath: filePath,
        url: resp.result.respBody.url,
        success: (res) => {
          console.log("下载回调", res);
          const fs = wx.getFileSystemManager()
          fs.readFile({
            filePath: res.filePath,
            position: 0,
            success: (res) => {
              console.log("读文件回调，结果返回为", res)
              wx.hideLoading();

              // 开始解析具体信息 protobuf
              try{
                console.log('开始解析回调')
                var data = message.decode(res.data);
                console.log("反序列化完成");
                console.log(data);
              } catch(e){
                wx.hideLoading();
                console.log("模型数据解析有误")
                console.log(e)
                if(e instanceof protobuf.util.ProtocolError){
                  // missing required field
                  console.log('missing required field')
                }else{
                  // wire format is invalid
                  console.log('wire format is invalid')
                }
                throw e;
              }
              // 解析完毕，进行 buffer 具体处理
              // map文件
              const byteOffset = data.meshModel.byteOffset
              const byteLength = data.meshModel.byteLength
              const mapContent = data.meshModel.buffer.slice(byteOffset, byteOffset + byteLength)
              console.log("byteOffset:", byteOffset)
              console.log("byteLength:", byteLength)
              // 写入文件后的地址
              const mapUrl = this.saveLocalFile(mapContent, 'model.map');
              console.log("map文件的本地路径", mapUrl)
              this.parsedMapUrl = mapUrl;

              // 添加marker
              const markerId = this.session.addMarker(mapUrl);
              console.log('add Marker', markerId, mapUrl)
              this.setData({
                usingMarkerId: markerId
              });

              // glb文件
              if (data.meshBlob && data.meshBlob.byteLength !== 0) {
                // 简单过滤下无模型情况
                const glbByteOffset = data.meshBlob.byteOffset
                const glbByteLength = data.meshBlob.byteLength
                const glbContent = data.meshBlob.buffer.slice(glbByteOffset, glbByteOffset + glbByteLength)
                const glbUrl = this.saveLocalFile(glbContent, 'result.glb');
                console.log("glb文件的本地路径", glbUrl)
                this.parsedGlbUrl = glbUrl;

                // @optional
                // 后续为添加渲染产物模型的逻辑 
                // Three 场景相关
                const THREE = this.THREE;
                // 控制容器节点
                this.modelWrap = new THREE.Object3D();
                this.scene.add( this.modelWrap );

                // 加载模模型
                const loader = this.loader = new THREE.GLTFLoader()
                loader.parse( glbContent, './', ( gltf ) =>{
                  console.log('gltf loaded', gltf.scene);

                  // 设置模型索引以及缩放比
                  this.model = gltf.scene;
                  this.model.position.set(0, 0, 0);
                  // 默认缩放设置到0.1
                  this.model.scale.set(0.1, 0.1, 0.1);
                  this.model.visible = false;

                  console.log('gltf set', this.model);

                  // 模型加载到场上
                  this.modelWrap.add(this.model);
                });
              }

            },
            fail(res) {
              wx.hideLoading();
              wx.showToast({
                title: res.errMsg,
                icon: 'none',
                duration: 2000
              })
            }
          })
        },
        fail(res) {
          wx.hideLoading();
          wx.showToast({
            title: res.errMsg,
            icon: 'none',
            duration: 2000
          })
          console.error(res)
        }
      })

    },
    saveLocalFile(bufferContent, name) {
      var url = `${wx.env.USER_DATA_PATH}/${name}`

      const fs = wx.getFileSystemManager()
      fs.writeFileSync(
        url,
        bufferContent,
        'utf8'
      )

      return url
    },
    removeMarker() {
      // 清理所有 marker
      this.session.removeMarker(this.data.usingMarkerId)
      this.setData({
        usingMarkerId: null
      })
      // 清理提示状态
      this.xAxis.visible = false;
      this.yAxis.visible = false;
      this.zAxis.visible = false;
      if (this.model) {
        this.model.visible = false;
      }
    },
    getAllMarker() {
      console.log(this.session.getAllMarker())
    },
    changeSelect(e) {
      console.log('触发选择更改');
      console.log(e.detail);

      this.selectCosid = e.detail.cosid;
      this.selectResp = e.detail.modelResp;
    },
    saveMap(){
      if (!this.parsedMapUrl) {
        console.log('不存在使用中的map地址')
        return;
      }
      wx.shareFileMessage({
        filePath: this.parsedMapUrl,
      });
    },
    saveGlTF() {
      if (!this.parsedGlbUrl) {
        console.log('不存在使用中的glb地址')
        return;
      }

      wx.shareFileMessage({
        filePath: this.parsedGlbUrl,
      });
    },
  },
})
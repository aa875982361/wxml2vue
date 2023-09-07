import { wxApis } from "./wxApiList"

declare const routeTo: (url: string, isReplace?: boolean) => void
declare const getCurrentPages: () => any[]
const apis = (require as any).context("./wxApis", false, /\.js$/)
const _wxApis = {}
apis.keys().forEach((key) => {
  if (key === "index.js") return
  Object.assign(_wxApis, apis(key).default)
})

const global = window as any

/** 选择文件的路径映射文件 */
const selectFileMap = new Map<string, File>()

const axios = require('axios');

const systemInfo = {
  SDKVersion: "2.10.4",
  batteryLevel: 100,
  benchmarkLevel: 1,
  brand: "devtools",
  devicePixelRatio: 3,
  fontSizeSetting: 16,
  language: "zh",
  model: "iPhone X",
  pixelRatio: 3,
  platform: "devtools",
  safeArea: {
    bottom: 812,
    height: 768,
    left: 0,
    right: 375,
    top: 44,
    width: 375,
  },
  screenHeight: 812,
  screenWidth: 375,
  statusBarHeight: 44,
  system: "iOS 10.0.1",
  version: "7.0.4",
  windowHeight: 812,
  windowWidth: 375,
}

class Cloud {
  constructor(){

  }
  init(){
    return Promise.resolve()
  }
  callFunction(opt){
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const {name, data = {}, success, fail} = opt
        if(name === "getRedDotListV2"){
          const { redDotQueryParamList:codeParamsList = [] } = data
          const data2 = codeParamsList.map((item) => {
            return {
              ...item,
              expireDate: undefined,
              cycleDay: undefined,
              cname: "注意！该红点全部未读",
              invokerNumber: 0,
            }
          })
          const result = {
            code: 200,
            data: data2
          }
          if(success){
            success({result})
          }
          return resolve({result})
        }
        console.log("opt", opt)
        // 调用接口云函数
        axios({
          url: "https://apicustomservice.qunjielong.com/cloud",
          method: "POST",
          data: {
            name,
            data
          },
        })
          .then((res) => {
            const { data } = res
            if (success) {
              success(data)
            }
            return resolve(data)
          })
          .catch((err) => {
            if (fail) {
              fail(err)
            }
            return reject(err)
          })
        
      })
    })
  }
  CDN(){

  }
  uploadFile(){

  }
  CloudID(){

  }
}

const wxApisObj = {

  ...wxApis.reduce((obj, key)=>{
    obj[key] = function(...args){
      console.log("调用了wx的方法：", key, args)
    }
    return obj
  }, {}),

  showModal(opt){
    console.log("调用了wx的方法：", "showModal", opt)
    if(opt.success){
      setTimeout(() => {
        opt.success({
          "errMsg": "showModel:ok",
          content: "",
          confirm: true,
          cancel: false,
        })
      })
    }
  },

  pageScrollTo(opt){
    console.log("pageScrollTo", opt)
    const {scrollTop, duration = 300} = opt || {}
    const delay = duration / 10 >> 0
    const clientHeight = document.documentElement.clientHeight;
    let currentScrollTop = document.documentElement.scrollTop
    let oneTimeScrollTop = ((scrollTop  - currentScrollTop) / 10) >> 0
    function scroll(timeNumber: number){
      if(timeNumber <= 0){
        return
      }
      let currentScrollTop = document.documentElement.scrollTop
      window.scrollTo(0, currentScrollTop + oneTimeScrollTop);
      // 一次次滚动
      // document.documentElement.scrollTop = document.body.scrollTop = currentScrollTop + oneTimeScrollTop
      setTimeout(() => {
        // 下次再看看滚动到特定的位置没有
        scroll(timeNumber - 1)
      }, delay)
    }
    scroll(10)
  },

  requestSubscribeMessage(opt){
    console.log("调用了wx的方法：", "requestSubscribeMessage", opt)

    if(opt.success){
      const tmplIds = opt.tmplIds || []
      const resTmpIdObj = tmplIds.reduce((pre, next) => {
        pre[next] = "accept"
        return pre
      }, {})
      setTimeout(() => {
        opt.success({
          "errMsg": "requestSubscribeMessage:ok",
          ...resTmpIdObj,
        })
      })
    }
  },

  getSetting(opt){
    console.log("调用了wx的方法：", "getSetting", opt)
    if(opt.success){
      setTimeout(() => {
        opt.success({"errMsg":"getSetting:ok","authSetting":{"scope.address":true,"scope.invoice":true,"scope.invoiceTitle":true,"scope.userInfo":true}})
      }, 100)
    }
  },

  getMenuButtonBoundingClientRect(){
    return {
      "width":87,
      "height":32,
      "left":320,
      "top":24,
      "right":407,
      "bottom":56
    }
  },
  redirectTo(opt: any){
    console.log("redirectTo", opt)
    const pages = getCurrentPages()
    const curPage = pages[pages.length - 1]
    console.log("redirectTo redirectTo", curPage)
    if(curPage){
      // 1. 先销毁当前页面
      curPage.$destroy()
      pages.splice(pages.length - 1, 1)
      // body 删除标签
      document.body.removeChild(curPage.$el)
    }
    try {
      // 2. 去到目标页面
      routeTo(opt.url, true)
      opt?.success && opt?.success()
    } catch (error) {
      console.error("redirectTo error")
      console.error(error)
      opt?.fail && opt?.fail()
    }
  },
  reLaunch(opt: any) {
    console.log("reLaunch", opt)
    const pages = getCurrentPages()
    pages.map(curPage => {
      // 1. 先销毁当前页面
      curPage.$destroy()
      pages.splice(pages.length - 1, 1)
      // body 删除标签
      document.body.removeChild(curPage.$el)
    })
    // 去到第一个页面栈 然后替换
    history.go(pages.length - 1)
    try {
      // 2. 去到目标页面
      routeTo(opt.url, true)
      opt?.success && opt?.success()
    } catch (error) {
      console.error("redirectTo error")
      console.error(error)
      opt?.fail && opt?.fail()
    }
  },
  navigateBack(opt){
    const pages = getCurrentPages()
    const prePage = pages[pages.length - 2] 
    const currentPage = pages[pages.length - 1]
    console.log("navigateBack", prePage)
    if(prePage){
      const currentElement = currentPage.$el
      // 销毁当前页面
      currentPage.$destroy()
      // 页面栈删除
      pages.splice(pages.length - 1, 1)
      // 从body中移除
      document.body.removeChild(currentElement)
      prePage.$el.setAttribute("id", "app")
      // 先重置上一个面的滚动位置
      const preScrollTop = +prePage.$el.getAttribute("scroll-top")
      // 解除隐藏状态
      prePage.$el.setAttribute("style", "")
      // 设置滚动位置
      // document.documentElement.scrollTop = isNaN(preScrollTop) ? 0 : preScrollTop
      window.scrollTo(0, isNaN(preScrollTop) ? 0 : preScrollTop);
      // 触发页面onshow
      prePage.onShow && prePage.onShow()
    }
    opt?.success && opt?.success()
  },
  navigateTo(opt: any){
    routeTo((opt as any)?.url.replace(/^\//, ""))
  },

  cloud: {
    Cloud,
  },
  getFileSystemManager(){
    return ["access", "mkdir", "readdir", "appendFile", "writeFile", "unlink"].reduce((pre, next) => {
      pre[next] = function(){
        console.log("getFileSystemManager", next)
      }
      return pre
    }, {})
  },

  getRealtimeLogManager: null,

  getAccountInfoSync(){
    return {
      "miniProgram":{
        "appId":wx.getStorageSync("appid") || "wxc766d2ba080c439e",
        "envVersion":"develop",
        "version":""
      }
    }
  },
  createCanvasContext(id){
    const canvas = document.createElement('canvas');
    canvas.setAttribute("id", id.replace(/^#/, ""))
    const ctx = canvas.getContext('2d');
    return ctx
  },
  getImageInfo(opt: any) {
    const { src:url, success, fail} = opt
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const image = new Image();
      
      image.onload = function() {
        canvas.width = image.width;
        canvas.height = image.height;
        ctx && ctx.drawImage(image, 0, 0);
        const result = {
          width: image.width,
          height: image.height,
          path: url,
          // 其他图片信息，根据需求自行添加
        }
        success && success(result)
        resolve(result);
      }
      
      image.onerror = function(e) {
        fail && fail(e)
        reject(new Error('Failed to load image: ' + url));
      }
      if(url.indexOf("/tmp") === 0){
        // 通过加载文件
        const reader = new FileReader();
        const file = selectFileMap.get(url)
        reader.onload = function(e) {
          image.src = e.target.result as string;
        };
        reader.readAsDataURL(file);
      }else{
        image.src = url;
      }
    });
  },

  /**
   * 选择图片
   * @param opt 
   */
  chooseImage(opt: any) {
    const fileInput = document.getElementById('fileInput');
    fileInput.setAttribute('multiple', opt.count > 1 ? '' : null);
    fileInput.click();
    fileInput.onchange = function(event) {
      const files = Array.from((event.target as any).files).slice(0, opt.count);
      // 给每个文件对象构建一个缓存文件路径 映射文件对象
      const tempFiles: Array<{path: string, size: number}> = files.map((file: File) => {
        // 生成一个随机路径
        const tempFilePath = "/tmp/" + (+new Date()) + (Math.random() * 1000 >> 0) + "/" + file.name 
        // 全局加上映射
        selectFileMap.set(tempFilePath, file)
        // 返回文件路径
        return {
          path: tempFilePath,
          size: file.size
        }
      })
      // 文件路径列表
      const tempFilePaths = tempFiles.map((file) => {
        return file.path
      })
      opt.success({ tempFilePaths, tempFiles });
    };
  },

  uploadFile(opt: any){
    const {
      url,
      filePath,
      name,
      formData,
      success,
      fail
    } = opt
    // 拿到真正的文件
    const file = selectFileMap.get(filePath)
    // 如果没有文件 则报错
    if(!file){
      console.error("文件路径不存在", filePath)
      return
    }
    
    // 创建一个 FormData 对象，用于构建要发送给服务器的数据
    const realFormData = new FormData();

    // 叠加其他配置数据
    Object.keys(formData).map((key) => {
      if(key === "name"){
        realFormData.append(key, file.name)
        return
      }
      realFormData.append(key, formData[key])
    })
    // 设置文件
    realFormData.append(name, file, file.name);
    
    // 创建一个 XMLHttpRequest 对象
    const xhr = new XMLHttpRequest();
    
    // 设置请求类型和URL
    xhr.open('POST', url, true);
    
    // 发送 FormData 对象作为请求体
    xhr.send(realFormData);
    
    // 监听上传进度
    xhr.upload.onprogress = function(event) {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        console.log('上传进度：' + percentComplete.toFixed(2) + '%');
      }
    };
    
    // 监听请求完成事件
    xhr.onload = function() {
      if (xhr.status === 200) {
        console.log('上传成功');
        success && success()
      } else {
        console.log('上传失败');
        fail && fail()
      }
    };
  },

  getUpdateManager(){
    return {
      onCheckForUpdate: () => {},
      onUpdateReady: () => {},
      onUpdateFailed: () => {}
    }
  },

  getNetworkType({success, fail, complete}){
    var res = {networkType: 'wifi'}
    success && success(res);
    complete && complete(res);
  },

  getLaunchOptionsSync(){
    return {}
  },

  getStorageSync: (key: string) => {
    const str =  localStorage.getItem(key)
    if(!str){
      return
    }
    try {
      const data = JSON.parse(str)
      return data.data
    } catch (error) {
      return str
    }
  },

  setStorageSync: (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify({
      type: typeof data,
      data
    }))
    return
  },

  removeStorageSync: (key: string) => {
    localStorage.removeItem(key)
  },

  getStorage: (opt) => {
    const str =  localStorage.getItem(opt.key)
    if(!str){
      return
    }
    const data = JSON.parse(str)
    return data.data
  },

  setStorage: (opt) => {
    localStorage.setItem(opt.key, JSON.stringify({
      type: typeof opt.data,
      data: opt.data
    }))
    return Promise.resolve()
  },

  removeStorage: (opt) => {
    const removeStorage = new Promise((resolve, reject) => {
      try {
        localStorage.removeItem(opt.key)
        resolve({ errMsg: "" })
      } catch (e) {
        reject({ errMsg: e })
      } finally {
        resolve({ errMsg: "" })
      }
    })
    execPromise(opt, removeStorage)
  },

  canIUse: (functionName) => {
    if ((this as any)[functionName]) {
      return true
    }
    return false
  },

  getSystemInfoSync: () => {
    return systemInfo
  },

  getSystemInfo: (opt) => {
    if(opt.success){
      opt.success(systemInfo)
    }
  },

  request: (options) => {
    const { url, method, header, data, success, fail } = options
    axios({
      url, method, data,
      headers: {
        ...header,
        // Authorization: "eyJhbGciOiJIUzI1NiJ9.eyJ1aWQiOjU0NzE3NDQsImV4cCI6MTU5NjY4MjY4MH0.OvV-mrkO2C_9Y3FI3p99rDphmMzCohWRfm3Nk5uLthI",
      },
      // baseURL: url.startsWith("http")
      //   ? process.env.NODE_ENV === "dev"
      //     ? "http://mina.test.office.qunjielong.com/"
      //     : "https://apipro.qunjielong.com/"
      //   : "",
    })
      .then((res) => {
        const { data, status, headers } = res
        if (success) {
          success({
            data,
            statusCode: status,
            header: headers,
          })
        }
      })
      .catch((err) => {
        if (fail && err.response) {
          fail(err.response)
        }else{
          setTimeout(() => {
            console.error("reuqest error", options, err)
          })
        }
      })
  },
  env: {

  },
  getStorageInfo: (option) => {
    return {}
  },
  showShareMenu: () => {

  },
  ..._wxApis,
}

/**
 * 执行异步方法
 * @param opt 传入的方法参数
 * @param fuc 执行的promise方法
 */
const execPromise = function (opt, fuc) {
  const sucCallback = opt.success
  const failCallback = opt.fail
  const completeCallback = opt.complete
  fuc
    .then((res) => { if (sucCallback) { sucCallback(res) } })
    .catch((e) => { if (failCallback) { failCallback(e) } })
    .then(() => { if (completeCallback) { completeCallback() } })
}

export const wx = Object.assign(global.wx || {}, wxApisObj)
global.wx = wx;
global.__wxConfig = {}
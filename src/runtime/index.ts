import 'vue2-touch-events'
import "./wx"
import { changeRpx2Rem } from '../utils'
import space from '../space'
import { ComponentInstance, VNode } from 'vue'
import { createIntersectionObserver } from './wxApis/wxml'

declare const Vue: any;
declare const wx: any;
// 注释
(window as any)._forData = undefined

const app: any = {
  globalData: {
    systemInfo:{
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
  }
}
let currentTemplate = ""
let currentName = ""
let pages = new Map<string, { template: string, page: any, wxs: any, components: any, importTemplates: any}>()
// 页面路由
let pageComponentRoutes:Record<string, Vue.Component> = {}
let currentWxs = {}
let currentUsingComponents = {}
let allComponentsMap = {}
let currentImportTemplates = []

Vue.config.errorhandler = function(err, vm){
  console.log("vue err", err, vm)
}
// 过滤器 处理rpx 转为rem
Vue.filter('changeRpxToRemFilter', function (value) {
  if (!value) return ''
  value = value.toString()
  return changeRpx2Rem(value)
})
// 注册shadow命令 将组件变成shadow-dom
// Vue.use(shadow)
// 注册space命令 处理空格符
Vue.use(space)

const getUrlQuery = () => {
  const url = window.location.href
  if (!url) { return }
  const querys = url.split("?")[1]
  if (!querys) { return }
  querys.split("&").forEach((param) => {
    const [key, value] = param.split("=")
    wx.setStorageSync(key, value)
  }, {})
}
// 获取页面生命周期对应的组件回调列表
const getPageLifeKeyName = (pageLifeName) => {
  return "com_"+pageLifeName+"_callback_list"
}

getUrlQuery();
const App = (options) => {
  if (!options) { 
    return
  }
  for (const key in options) {
    const value = options[key]
    if(key === "globalData"){
      const globalData = {
        ...app[key],
        ...value
      }
      app.globalData = globalData
      options.globalData = globalData
      continue
    }
    app[key] = value
  }
}

const registerPage = (name, template, page, wxs, components, importTemplates) => {
  // console.log("Register page ->", name)
  pages.set(name, {
    template, page, wxs, components, importTemplates
  })
}

export const registerTemplate = (name, template, wxs, components, importTemplates) => {
  currentName = name
  currentTemplate = template
  currentWxs = wxs
  currentUsingComponents = components
  currentImportTemplates = importTemplates
}


function bindChild(preObj){
  if(typeof preObj === "object" && preObj){
    var isArray = Array.isArray(preObj);
    var keys = isArray ? preObj : Object.keys(preObj);
    for(var i=0; i<keys.length; i++){
      var key = isArray ? i : keys[i];
      this.$set(preObj, key, preObj[key])
      bindChild.call(this, preObj[key])
    }
  }
}

/**
* 双key节点模式
* @param {*} origin 
* @param {*} other  {text: 2}
*/
const assign = function(origin, other = {}, isSet = false){
  Object.keys(other).forEach(keyStr=>{
    var preObj = origin;
    // 判断是否有.和[] 如果没有则直接赋值
    if(!/\.|\[|\]/.test(keyStr)){
      preKey = keyStr
      setObjectValue.call(this, preObj, preKey, other[keyStr], false)
    }else{
      // 如果有.或中括号[]
      var preKey = "";
      var prePreKey = "";
      var isArray ;
      for(var i = 0; i < keyStr.length; i++){
        // 检查字符
        var char = keyStr[i]
        switch(char){
          case '.':
          case '[':
            if(!prePreKey){
              prePreKey = preKey;
              preKey = "";
              break;
            }
            preKey = preKey.replace(/\"|\'/g, '')
            if(typeof preObj[prePreKey] === "undefined"){
              isArray = !isNaN(+Number(preKey))
              preObj[prePreKey] = isArray ? [] : {}
              // isSet && this.$set(preObj, prePreKey, isArray ? [] : {})
              // 不是数组 是对象 并且前一个对象上没有这个属性
            }
            preObj =  preObj[prePreKey]
            prePreKey = preKey;
            preKey = "";
            break;
          case ']':
            break
          default:
            // 如果是正常字符 则与前面的字符拼接
            preKey += char;
        }
      }
      if(prePreKey !== "" || preKey !== ""){
        if(typeof preObj[prePreKey] === "undefined"){
          isArray = !isNaN(+Number(preKey))
           preObj[prePreKey] = isArray ? [] : {}
          //  isSet && this.$set(preObj, prePreKey, isArray ? [] : {})
        }
        preObj = preObj[prePreKey]
        setObjectValue.call(this, preObj, preKey, other[keyStr], isSet)
      }
    }
  })
}

function setObjectValue(preObj: any, preKey: string, value: any, isSet: boolean){
  if (isSet && !(Object.getOwnPropertyDescriptor(preObj, preKey)?.get)){
    if(preKey in preObj){
      delete preObj[preKey]
    }
    this.$set(preObj, preKey, value)
  }else {
    preObj[preKey] = value
  }
}
/**
 * 模拟小程序的setData实现
 * @param obj 设置的data
 * @param callback 回调函数
 */
const setData = function(obj, callback) {
  if(!this.wxs){
    this.wxs = {}
  }
  try {
    // 渲染层数据
    assign.call(this, this.wxs, JSON.parse(JSON.stringify(obj)), true)
    // 逻辑层数据
    assign.call(this, this.data, JSON.parse(JSON.stringify(obj)), false)
  } catch (error) {
    console.log("setData Object.assign error", error)
  }
  this.$forceUpdate()
  // setData 是异步操作
  if (typeof callback === 'function') {
    this.$nextTick(callback)
    // callback()
  }
}

declare const _forData: any
declare const wxs
const _sz = function(...args){
  if(args.length < 1){
    return undefined
  }
  try {
    let base = args[0]
    // 遍历参数列表
    for(let i = 1; i<args.length; i++){
      const key = args[i]
      const tempValue = base[key]
      if(typeof tempValue === "undefined" || tempValue === null){
        return undefined
      }
      // 继续找值 知道找到一个undefined
      base = tempValue
    }
    return base
  } catch (error) {
    // 所有没定义的都返回undefined
    console.log("_sz err", error)
    return undefined
  }
};
(window as any)._sz = _sz

const toKebab = (str: string): string => {
  let result = str.replace(/[A-Z]/g, function ($0) {
		return "-" + $0.toLowerCase()
  })
  if (result[0] === "-") {
    result = result.slice(1);
  }
  return result
}
const triggerEvent = function(name, e) {
  // console.log("triggerEvent", name, e)
  // 组件没初始化 不往外抛事件
  if(!this._afterReadyFuncList){
    this._afterReadyFuncList = []
  }
  if(!this._isReadyStatus){
    this._afterReadyFuncList.push(() => {
      this.$emit(toKebab(name), e)
    })
    return
  }
  // 做一层驼峰转化
  this.$emit(toKebab(name), e)
}

function handleProxyEvent(targetEvent = {}, newEvent = {}){
  const keys = Object.keys(newEvent)
  const proxy = new Proxy(targetEvent, {
    get: function(target, name: string){
      // 接触currentTarget对象的dataset属性
      // 用户访问的event.currentTarget.dataset 
      // 其实访问的是我自定义的dataset对象
      if(keys.indexOf(name) >=0 ){
        return newEvent[name]
      }
      return target[name]
    }
  })
  return proxy;
}

const getHandleMethodEvent = function(e, args) {
  const {funcName = "", dataset = {}} = args

  // 其实访问的是我自定义的dataset对象
  const currentTarget = handleProxyEvent(e.currentTarget, {
    dataset,
  })
  // 劫持event对象的currentTarget
  const event = handleProxyEvent(e, {
    currentTarget,
    dataset,
  })
  if(this.__importTemplate__){
    let parent = this.$parent;
    while(parent){
      if(typeof parent[funcName] === "function"){
        parent[funcName](event)
        break;
      }
      parent = parent.$parent;
    }
  }else{
    if(typeof this[funcName] === "function"){
      this[funcName](event)
    }else{
      console.warn(`funcName： ${funcName} 不是一个function`);
    }
  }
}
const matchSelector = (el: Element, selector: string) => {
  const selectorContent = selector.substring(1)
  if (!el) { return false }
  if (selector.startsWith(".")) {
    return el.classList.contains(selectorContent)
  } else if (selector.startsWith("#")) {
    return el.id === selectorContent
  } else {
    return false
  }
}
const traverseVueInstanceTree = (selector: string, root: ComponentInstance) => {
  if (matchSelector(root.$el, selector)) {
    return root
  }
  for (let i = 0;i < root.$children.length;i++) {
    const found = traverseVueInstanceTree(selector, root.$children[i])
    if (found) {
      return found
    }
  }
  return false
}
const selectComponent = function(selector) {
  // console.log(selector, this)
  const el: Element & { __vue__:ComponentInstance } = document.querySelector(selector)
  return el && el.__vue__ || null
}
const getComponentMethodEvent = function(name: string, e, dataset) {
  const params = {
    detail: e,
    dataset,
    currentTarget: {
      dataset
    },
    target: {
      dataset
    }
  }
  // inport 导入模板的情况
  if(this.__importTemplate__){
    let parent = this.$parent;
    while(parent){
      if(typeof parent[name] === "function"){
        parent[name](params)
        return;
      }
      parent = parent.$parent;
    }
  }
  // 等待ready执行完成 再调用事件方法
  if(!this._afterReadyFuncList){
    this._afterReadyFuncList = []
  }
  if(!this._isReadyStatus){
    this._afterReadyFuncList.push(() => {
      typeof this[name] === "function" && this[name](params)
    })
    return
  }
  typeof this[name] === "function" && this[name](params)
}

const getInputReturn = function(name: string, key: string, dataset: any ,e: any) {
  // 代理dataset
  const returnInput = this[name](e)
  if(typeof returnInput === "undefined"){
    // 没有返回值
    return
  }
  return returnInput
}

const Page = (page) => {
  registerPage(currentName, currentTemplate, page, currentWxs, currentUsingComponents, currentImportTemplates)
}

const extractMethodsAndProps = (obj, result = [{}, {}]) => {
  const methodsAndProps = Object.keys(obj).reduce(([o, p], key) => {
    if(key === "data"){
      return [o, p]
    }
    const value = obj[key]
    if (typeof value === 'function') {
      o[key] = wrapEventFunc(value)
    } else {
      p[key] = value
    }
    return [o, p]
  }, result)
  if (!obj || !obj.__proto__) {
    return methodsAndProps
  } else {
    return extractMethodsAndProps(obj.__proto__, methodsAndProps)
  }
}

function deepCopy(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  // 如果不是数组或者其他对象 则不深拷贝
  if(Object.getPrototypeOf(obj) !== Object.prototype || !Array.isArray(obj)){
    return obj
  }
  // 根据obj的类型创建空对象或数组
  const copy = Array.isArray(obj) ? [] : {};
  
  // 遍历obj的所有属性进行递归拷贝
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      copy[key] = deepCopy(obj[key]);
    }
  }
  
  return copy;
}


const wrapEventFunc = (func) => {
  return function (...args) {
    const e = args[0]
    if (e instanceof Event) {
      return func.call(
        this,
        wrapEventToWXEvent(e),
        ...args.slice(1)
      )
    } else {
      return func.call(this, ...args)
    }
  }
}

const wrapEventToWXEvent = (e) => {
  const dataset = e.dataset || e.currentTarget.dataset || e.target.dataset
  return {
    detail: { value: e.target.value },
    target: {
      dataset,
      id: e.target.id || "",
      offsetLeft: e.target.offsetLeft,
      offsetTop: e.target.offsetTop,
    },
    currentTarget: {
      dataset,
      id: e.currentTarget.id || "",
      offsetLeft: e.currentTarget.offsetLeft,
      offsetTop: e.currentTarget.offsetTop,
    },
    original: e,
    timeStamp: e.timeStamp,
    type: e.type === "touchend" ? "tap" : e.type,
    _userTap: true,
  }
}

const getApp = () => {
  return app
}

export const Component = (com) => {
  const t = currentTemplate
  const caps = currentName.split('/')
  const cname = caps[caps.length - 1]
  // console.log("------> Component", cname)
  const props = convertVueComponentProps(com.properties)
  const watch = Object.keys(props).reduce((current, next)=>{
    if (props[next] ) {
      let isFirst = true
      current[next] = {
        immediate: true,
        deep: true,
        handler: function(){
          const args = Array.prototype.slice.call(arguments)
          // 先set一遍到data
          // this.setData({
          //   [next]: args[0]
          // })
          // 如果渲染数据里面有render
          if(this.wxs){
            this.wxs[next] = args[0]
            this.data[next] = args[0]
          }
          try {
            if(isFirst && typeof args[0] === "undefined"){
              // 首次 且没赋值 则不触发
              return
            }
            props[next].observer && props[next].observer.apply(this, args)
            isFirst = false
          } catch (error) {
            console.error("触发监听函数失败", next)
            console.log(error)
          }
        }
      }
    }
    return current
  }, {})
  const wxs = currentWxs;
  let dependenceComponents = parseComponents(currentUsingComponents);
  // 增加导入的template模板，即无状态组件
  dependenceComponents = addImportTemplate(dependenceComponents, currentImportTemplates, parseWxs(wxs))
  const behaviors = (com.behaviors || []).reduce((pre, oneBehaviors)=>{
    // 聚合behavior的方法
    pre.methods = {
      ...(pre.methods || {}),
      ...(oneBehaviors.methods || {}),
    }
    return pre
  }, {})
  const currentComponent = {
    template: t,
    components: dependenceComponents,
    props: {
      ...props,
    },
    methods: Object.assign(
      com.methods || {},
      {
        _sz,
        setData,
        triggerEvent,
        getHandleMethodEvent,
        getInputReturn,
        getComponentMethodEvent,
        createIntersectionObserver,
        selectComponent,
        ...(behaviors.methods || {})
      },
    ),
    /** TODO:
     * 1. 合并生命周期
     * 2. v-bind 语法：在 2vue 的项目中改
     */
    data: function() {
      /** 兼容 this.data 语法 */
      const renderData = JSON.parse(JSON.stringify(com.data || {}))
      Object.keys(this.$props).map(propKey => {
        renderData[propKey] = this.$props[propKey]
      })
      this.renderData = renderData
      this.data = renderData
      this._forData = undefined
      return {
        ...(JSON.parse(JSON.stringify(com.data || {}))),
        wxs: {
          _sz,
          ...renderData,
          ...(parseWxs(wxs) || {})
        }
      }
    },
    watch,
    beforeCreate: function() {
      
      // 小程序组件可以使用页面的生命周期 如何才能挂载到页面的生命周期上呢？
      const pageLifetimes = com.pageLifetimes 
      const usePageLife = (pageLifetimes && Object.keys(pageLifetimes)) || []
      if(usePageLife.length > 0){
        const curPages = getCurrentPages()
        const curPage:any = curPages[curPages.length - 1]
        usePageLife.map((pageLifeName:string) => {
          let cbList = curPage[getPageLifeKeyName(pageLifeName)]
          if(!cbList){
            cbList = []
            curPage[getPageLifeKeyName(pageLifeName)] = cbList
          }
          // 获得组件设置的页面回调
          const cb = com.pageLifetimes[pageLifeName].bind(this)
          if(cbList.indexOf(cb) === -1){
            return
          }
          // 加入页面回调
          cbList.push(cb)
        })
      }
      this.externalClasses = com.externalClasses || []
      // 这里会获取不到组件的方法 需要做个兼容
      // 也不能直接在creaded方法里面运行 因为有些初始化逻辑在
      if(!this.methods && com.methods){
        this.methods = Object.keys(com.methods).reduce((pre, next) => {
          pre[next] = com.methods[next]
          this[next] = com.methods[next].bind(this)
          return pre
        }, {})
      }
      if (com.created) {
        com.created.call(this)
      }
    },
    created: function() {
      // 复制一遍props的数据到this.data
      // if(this.methods._iniFunc){
      //   this.methods._iniFunc.call(this)
      // }
    },
    beforeMount: function() {
      if (com.attached) {
        try {
          com.attached.call(this)
        } catch (error) {
          console.error("组件 attached 运行失败")
          console.error(error)          
        }
      }
    },
    mounted: function() {
      if (com.ready) {
        com.ready.call(this)
      }
      // 检查一下有没有页面show的方法
      if(com.pageLifetimes?.show){
        com.pageLifetimes?.show.call(this)
      }
      // 运行拦截的事件
      this._isReadyStatus = true
      this._afterReadyFuncList?.map((func) => {
        func.call(this)
      })
    },
    updated: function() {
      if (com.moved) {
        com.moved.call(this)
      }
    },
    destroyed: function() {
      if (com.destroyed) {
        com.destroyed.call(this)
      }
    },
  }
  // 先缓存下来 不直接在全局注册 
  Vue.component(cname, currentComponent)
  allComponentsMap[currentName] = currentComponent
}
/**
 * 导入无状态组件
 * @param componentList 原有组件列表
 * @param importTemplates 无状态组件列表
 */
function addImportTemplate(componentList = {}, importTemplates = [], wxs = {}){
  importTemplates.forEach(component=>{
    componentList[component.name] = {
      ...component,
      props: {
        tdata: {
          type: Object,
          default: ()=>{
            return {}
          }
        }
      },
      beforeCreate(){
        this.__importTemplate__ = true;
      },
      methods: Object.assign({}, { _sz, setData, triggerEvent, getHandleMethodEvent, getInputReturn, getComponentMethodEvent }),
      data(){
        this.data = {}
        this._forData = undefined
        return {
          wxs: {
            _sz,
            ...wxs,
          },
        }
      },
      watch: {
        tdata: {
          immediate: true,
          deep: true,
          handler(value = {}){
            this.setData(value)
          }
        }
      }
    }
  })
  return componentList;
}

function getDefaultValue(type){
  switch(type){
    case Array:
      return function(){
        return []
      }
    case Object:
      return function(){
        return null
      }
    case Function:
      return function(){
        return function(){
          
        }
      }
    case String:
      return ''
    case Boolean:
      return false;
    case Number:
      return 0
    default:
      return undefined;
  }
}

export const convertVueComponentProps = (props) => {
  if (!props) { return {} }
  return Object.keys(props).reduce((o, key) => {
    try {
      const prop = props[key]
      prop.default = prop.value
      delete prop.value
      o[key] = prop
    } catch (error) {
      console.log("error", error)
    }
    return o
  }, {})
}

function throttle(fn, delay){
  var timer = null;
  return function(){
    if(timer){
      return;
    }
    var args = Array.prototype.slice.call(arguments);
    var that = this;
    timer = setTimeout(function(){
      fn.apply(that, args);
      timer = null;
    }, delay)
  }
}

// 可视区域的高度
function getWindowHeight() {
  return document.documentElement.clientHeight;
}

// 滚动高度
// 对有doctype申明的页面使用document.documentElement.scrollTop，
// safari特例独行：使用 window.pageYOffset
function getScrollHeight() {
  return Math.max(document.documentElement.scrollTop,window.pageYOffset||0)
}

// 文档高度
function getDocumentTop() {
  return document.documentElement.offsetHeight;
}

export const handleScroll = function (vdom) {
  return function (e) {
    // 拿到当前的页面实例
    const currentPages = getCurrentPages()
    const currentPage = currentPages[currentPages.length - 1]
    if(currentPage !== vdom){
      // 如果不是当前页面实例 则不需要管
      return
    }
    const scrollTop = getScrollHeight()
    const windowHeight = getWindowHeight()
    const documentTop = getDocumentTop()
    let isBottom = ( scrollTop +  windowHeight) >=  (documentTop - 100)
    if(isBottom && vdom.onReachBottom){
      // console.log('触底了',new Date())
      vdom.onReachBottom()
    }
    vdom.onPageScroll && vdom.onPageScroll({
      scrollTop
    })
  };
};

let isFirst = true

export const routeTo = (url: string, isReplace:boolean = false) => {
  if (isFirst) {
    app.onLaunch({ 
      scene: 1001,
      path: "",
      query: {
      } 
    })
    isFirst = false
  }
  // 删掉首个/
  url = url?.replace(/^\//, "")
  const urlObj = getQuery(url)
  urlObj.queryObj = {
    hideWrapper: true,
    ...urlObj.queryObj,
  }
  if(!pages.has(urlObj.realUrl)){
    console.error("当前页面未编译，需要增加页面逻辑")
    console.log("path", urlObj.realUrl)
    console.log("urlObj", urlObj)
    console.log("url", url)
    wx.showToast({
      title: "页面暂未编译"
    })
    return
  }
  const { template, page, wxs: rawWxs, components: rawComponents, importTemplates } = pages.get(urlObj.realUrl)!

  const [pageMethods, props] = extractMethodsAndProps(page)
  const methods = Object.assign(pageMethods, { _sz, setData, getHandleMethodEvent, getInputReturn, getComponentMethodEvent, selectComponent,   createIntersectionObserver })
  const wxs = parseWxs(rawWxs) || {};
  const initData = {
    customFailPage: false,
    failMessage: "我也不知道这个failMessage是什么 后面再看",
    keyword: "",
    shareContent: {},
    reward: {},
    isHelpSaleLeader: undefined
  }
  let dependenceComponents = parseComponents(rawComponents)
  // 增加导入的template模板，即无状态组件
  dependenceComponents = addImportTemplate(dependenceComponents, importTemplates, wxs)
  // 获取当前app
  const appElement = document.getElementById("app")
  if(appElement){
    const scrollTop = getScrollHeight()
    const vdom = appElement['__vue__']
    // 保存当前的滚动状态
    appElement.setAttribute("scroll-top", "" + scrollTop)
    appElement.setAttribute("id", `app-${CurrentPages.length}`)
    appElement.setAttribute("style", `position: absolute; display:none; z-index:${CurrentPages.length};`)
    if(vdom){
      // 触发页面的 onHide
      vdom.onHide && vdom.onHide()
    }
  }
  const newAppElement = document.createElement("div")
  newAppElement.setAttribute("id", "app")
  document.body.appendChild(newAppElement)
  // 重置滚动状态为顶部
  document.documentElement.scrollTop = 0
  // 赋值
  newAppElement && (newAppElement.innerHTML = template)
  if(isReplace){
    history.replaceState({id: `app-${CurrentPages.length}`}, "")
  }else{
    // 先加入到历史列表里面
    history.pushState({id: `app-${CurrentPages.length}`}, "")
  }

  const curPage = new Vue({
    el: newAppElement,
    components: dependenceComponents,
    data: function(): any{
      const pageDataDeepClone = JSON.parse(JSON.stringify(page.data || {}))
      this._forData = undefined
      const realData = {
        ...initData,
        ...pageDataDeepClone,
      }
    
      const res = {
        ...pageDataDeepClone,
        data: {
          ...realData,
        },
        wxs: {
          _sz,
          ...realData,
          ...wxs,
        }
      }
      return res
    },
    methods,
    created: function() {
      // Object.assign(this, JSON.parse(JSON.stringify(props)));
      const copyProps = deepCopy(props)
      Object.assign(this, copyProps)
      this.originUrl = url
      this.route = urlObj.realUrl
      // 加到页面栈
      CurrentPages.push(this)
      this.options = urlObj.queryObj || {}
      if (this.onLoad) {
        this.onLoad(urlObj.queryObj)
      }
    },
    mounted: function() {
      if (this.onReady) {
        this.onReady()
      }
      this.handleScroll = throttle(handleScroll(this), 500)
      if (this.onShow) {
        this.onShow()
      }
      this._isReadyStatus = true
      this._afterReadyFuncList?.map((func) => {
        func.call(this)
      })
      // 监听滚动
      window.addEventListener('scroll',this.handleScroll,true)
      // onhide 的时候 需要解除监听
    },
    updated: function(){
    },
    destroyed: function() {
      if (this.onUnload) {
        this.onUnload()
      }
      window.removeEventListener("scroll",this.handleScroll,true)
    }
  })

}

export const parseComponents = (rawComponents: Object) =>{
  if(typeof rawComponents !== "object"){
    return {}
  }
  let components = {}
  components = Object.keys(rawComponents).reduce((components, cname)=>{
    let path = rawComponents[cname];
    if(!path){
      console.warn("请检查usingComponent的配置，存在控制");
      return components;
    }
    // 如果名字相同则不需要处理
    const pathSplitList = path.split("/")
    if(pathSplitList.length > 0 && pathSplitList[pathSplitList.length-1] === cname){
      return components;
    }
    if(path.indexOf('/') === 0){
      path = path.substring(1)
    }
    
    components[cname] = () => {
      let component = allComponentsMap[path]
      if(!component){
        console.warn("没找到对应的component 请检查组件路径");
      }
      return component;
    }
    return components
  }, {})
  return components
}

export const getWxsByPath = (wxsPath: string): any => {
  return ((window as any).wxs[wxsPath])
}

const parseWxs = (rawWxs = {}) => {
  const wxs = Object.keys(rawWxs).reduce((w, key) => {
    try {
      const xs = rawWxs[key]
      if (xs.id) {
        xs.id = xs.id.replace(/\\/g, "/");
        w[key] = (window as any).wxs[xs.id]
      } else {
        w[key] = (new Function(`
          var module = { exports: {} };
          ${xs.js};
          return module.exports
        `))()
      }
    } catch (error) {
      console.error("转换wxs失败", error)
    }
    return w
  }, {})
  return wxs
}

const getQuery = (url): { realUrl: string, queryObj: { [x: string]: any}} => {
    const realUrl = url.split("?")[0]
    const queryStr = url.split("?")[1]
    const queryObj = {}
    if (!queryStr) { return { realUrl, queryObj } }
    queryStr.split("&").forEach((item) => {
      const query = item.split("=")
      queryObj[query[0]] = query[1]
    })
    return { realUrl, queryObj }
  }

const getRegExp = (regRule: string, decorator?: string) => {
  return decorator
    ? new RegExp(regRule, decorator)
    : new RegExp(regRule)
}

const Behavior = (params) => {
  return params
}

const CurrentPages = []

const getCurrentPages = () => {
  return CurrentPages
}

export default { App, Page, getApp, Component, routeTo, getWxsByPath, getRegExp, Behavior, getCurrentPages }

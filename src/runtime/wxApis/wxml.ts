import { wrapWxApiSync } from "./common"

class SelectorQuery {
  private nodesRef
  private root: any = document
  private nodesRefList: NodesRef[] = []
  constructor(_root: any = document) {
    if(_root){
      this.root = _root
    }
    this.nodesRefList = []
  }
  select(s: string) {
    s = s.replace(">>>", "")
    const nodesRef = new NodesRef(
      this.root.querySelector(s),
      this
    )
    this.nodesRefList.push(nodesRef)
    return nodesRef
  }
  selectViewport() {
    const nodesRef = new NodesRef(
      document.body,
      this
    )
    this.nodesRefList.push(nodesRef)
    return nodesRef
  }
  exec(cb) {
    if(!cb){
      cb = () => {}
    }
    let resultList: any[] = []
    this.nodesRefList.map(nodesRef => {
      const tempList = nodesRef.exec()
      resultList = resultList.concat(tempList)
    })
    cb(resultList)
  }
  in(vdom: any): SelectorQuery{
    return new SelectorQuery(vdom.$el)
  }
}
class NodesRef {
  public execQueue: (() => void)[] = []
  constructor(
    private node: HTMLElement,
    private query: SelectorQuery,
    ) {}
  fields() {
    return {}
  }
  boundingClientRect(cb) {
    const exec = () => {
      if(!this.node){
        return
      }
      const { left, right, top, bottom, width, height, } = this.node.getBoundingClientRect()
      const res = {
        left, right, top, bottom, width, height, id: this.node.id, dataset: this.node.dataset
      }
      cb?.(res)
      return res
    }
    this.execQueue.push(exec)
    return this
  }
  scrollOffset(cb) {
    const exec = () => {
      if(!this.node){
        return
      }
      const { left, right, top, bottom, width, height, } = this.node.getBoundingClientRect()
      const res = {
        scrollLeft: left,
        scrollTop: top,
        left, right, top, bottom, width, height, id: this.node.id, dataset: this.node.dataset
      }
      cb?.(res)
      return res
    }
    this.execQueue.push(exec)
  }
  exec(cb?: any) {
    if(!cb){
      cb = () => {}
    }
    const resultList = this.execQueue.map((item) => item())
    cb(resultList)
    return resultList
  }
}
export const createSelectorQuery = () => {
  return new SelectorQuery()
}

interface MarginObj {
  top: number,
  bottom: number,
  left: number,
  right: number
}
interface MyIntersectionObserverOptions {
  thresholds:	number[],	//[0]	否	一个数值数组，包含所有阈值。	
  initialRatio: number,	// 0	否	初始的相交比例，如果调用时检测到的相交比例与这个值不相等且达到阈值，则会触发一次监听器的回调函数。	
  observeAll: boolean	// false	否	是否同时观测多个目标节点（而非一个），如果设为 true ，observe 的 targetSelector 将选中多个节点（注意：同时选中过多节点将影响渲染性能）
}
class MyIntersectionObserver {
  private obs?:IntersectionObserver
  private root
  private options
  private marginObj: any = {}
  private obsTargetList: Element[] = []
  constructor(root?, options?: MyIntersectionObserverOptions){
    this.root = root || document.body
    this.options = options || {}
    this.marginObj = {}
    this.obsTargetList = []
  }
  relativeToViewport(marginObj: MarginObj){
    this.marginObj = marginObj
    return this
  }
  observe(elementQueryId: string, callBackFunc: (obj: any) => void){
    console.log("MyIntersectionObserver observe", elementQueryId);
    
    const marginObj = this.marginObj
    const intersectionObserver = new IntersectionObserver((entries: IntersectionObserverEntry[], obs) => {
      console.log("intersectionObserver cb", entries, obs)
      entries.map((entry) =>{
        const dataset = (entry?.target as any)?.dataset || {}
        const realDataset = {}
        console.log("dataset", dataset)
        Object.keys(dataset).map(key => {
          const value = dataset[key]
          const toNumberValue = Number(value)
          if(!isNaN(toNumberValue)){
            realDataset[key] = toNumberValue
            return 
          }else if (value === "true"){
            realDataset[key] = true
          }else if (value === "false"){
            realDataset[key] = false
          }else{
            realDataset[key] = value
          }
        })
        const obj = {
          dataset:realDataset, 
          intersectionRatio: entry.intersectionRatio, 
          boundingClientRect: entry.boundingClientRect,
          relativeRect: {},
          time: entry.time
        }
        console.log("intersectionObserver callBackFunc", obj);
        
        callBackFunc(obj)
      })
    }, {
      // ['root']: document.body,
      rootMargin: `${marginObj.top || 0}px ${marginObj.right || 0}px ${marginObj.bottom || 0}px ${marginObj.left || 0}px`,
      [this.options?.threshold && 'threshold']: this.options?.threshold,
    })
    this.obs = intersectionObserver
    this.tryObs(elementQueryId)
  }
  tryObs(elementQueryId, time = 3){
    const elements = document.querySelectorAll(elementQueryId) || []
    if(this.obs && elements.length > 0){
      console.log("tryObs add", elements);
      elements.forEach((element) => {
        if(this.obsTargetList.indexOf(element) !== -1){
          return
        }
        this.obsTargetList.push(element)
        this.obs!.observe(element)
      })
    }else{
      console.error("tryObs error element null", elementQueryId)
      if(time < 1){
        return
      }
      setTimeout(() => {
        this.tryObs(elementQueryId, time - 1)
      }, 300)
    }
  }
  disconnect(){
    if(this.obs){
      // 解除监听
      this.obsTargetList.map(targetElement => {
        this.obs?.unobserve(targetElement)
      })
      this.obs.disconnect()
      this.obsTargetList = []
    }
  }
}

export const createIntersectionObserver = function(root) {
  let rootElement = document.body
  if(root && root.$el){
    rootElement = root.$el
  }else if(this && this.$el){
    rootElement = this.$el
  }
  return new MyIntersectionObserver(rootElement)
}


export default {
  createSelectorQuery: wrapWxApiSync(createSelectorQuery),
  createIntersectionObserver: wrapWxApiSync(createIntersectionObserver)
}
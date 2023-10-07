const path = require("path")
import fs = require("fs")
import { parse, DefaultTreeDocument, DefaultTreeTextNode, DefaultTreeElement, DefaultTreeNode, Attribute } from "parse5"
import { TAGS_MAP, EVENTS } from "../constants"
import { replaceCamelAttribute } from "../runtime/parser-attributes"
import { convertToSFunction } from "./acorn"


interface TreeNode extends DefaultTreeElement {
  attrsMap: Map<string, Attribute>,
  isIf: boolean,
  isElseIf: boolean,
  isElse: boolean,
  nextElseTemplateId: number,
  templateId: number,
}

interface IContext {
  lines: string[],
  ngTemplateCounter: number,
  template: string,
  wxs: any[],
  path?: string,
  cwd?: string,
  dependenceComponent?: any,
  templateList?: any,
  linesStack?: any[],
  uid: string,
}

interface ITemplate {
  name: string,
  template: string,
  wxs: any[]
}

export const replaceAttrList: Set<string> = new Set([
  "wx:for-item", "wx:for-index", "confirm-type", "wx:key"
])

export const StyleAndClass: Set<string> = new Set([
  "style", "class", "placeholder", "title"
])

export const longTapList: Set<string> = new Set([
  "bindlongtap", "bind:longtap", "bindlongpress", "bind:longpress", "catchlongtap", "catch:longtap", "catchlongpress", "catch:longpress",
])

export const tapList: Set<string> = new Set([
  "bindtap", "bind:tap", "catchtap", "catch:tap", "catch:touchstart", "catchtouchstart", "bindtouchstart", "bind:touchstart"
])

export const commonAttrList: Set<string> = new Set([
  "disabled", "maxlength" ,"autofocus"
])

export const dataSetEventName: Set<string> = new  Set([
  "data-tap"
])

export const specialAttrList: Set<string> = new Set([
  "focus", "type"
])

export const inputAttrList: Set<string> = new Set([
  "bindinput", "bind:input", "bindblur", "bind:blur", "bindfocus", "bind:focus", "bindconfirm", "bind:confirm"
])

// 记录自定义组件存在的class属性
const DIYComponentsHasClassAttr = {}

/**
 * wxml文件预处理 包含删除注释， 处理没有闭合的标签，属性驼峰转中划线
 * @param wxmlString 
 */
function baseHandleWxml(wxmlString: string){
  // 删除注释 否则有坑
  // 错误用例：<!-- <icon class="seq-sign-icon icon-rank flexShrink" /> -->
  wxmlString = wxmlString.replace(/<!--.*?-->/g, "")
  // 处理没有闭合标签
  wxmlString = wxmlString.replace(/\<\s*([^\s\/\>]+)[^\>]+?\/\s*\>/g, (a, b) => {
    return a.replace(/\s*\/>/, '>') + `</${b}>`
  })

  wxmlString = wxmlString.replace(/<(\w[-\w]+) (.*?)\/>/g, (all, $1, $2) => {
    // 处理自己结束的标签 比如 <detail-intro />
    return `<${$1} ${$2}></${$1}>`
  })
  
  // console.log("驼峰转化前", wxmlString)
  wxmlString = wxmlString.replace(/<[\w\-]+\s+(?:[^<\/>]+?(?:=(\"|\')(.*?)\1)?)+\s*\/?>/g, (a) => {
    // console.log("驼峰转化 ", a)
    return a && a.length && /[A-Z]/g.test(a) ? replaceCamelAttribute(a) : a
  })
  // console.log("驼峰转化后", wxmlString)
  return wxmlString
}

/**
 * 转化wxml页面或组件为vue能识别的依法
 * @param wxmlString wxml字符串
 * @param filePath 文件路径
 * @param dependenceComponent 依赖的组件
 */
export const convertWxmlToVueTemplate = (wxmlString: string, filePath: string = "", dependenceComponent: any, cwd: string, uid: string): IContext => {
  wxmlString = baseHandleWxml(wxmlString);
  wxmlString = wxmlString.replace(/<template/g, "<vue-template")
  wxmlString = wxmlString.replace(/\/template>/g, "/vue-template>")

  // 解析字符串为ast语法树
  const ast = parse(wxmlString) as any
  // 初始化对象
  const ctx = { lines: [], ngTemplateCounter: 0, template: "", wxs: [], path: filePath, dependenceComponent, cwd, uid, templateList: {} }
  // 拿到根节点
  const htmlNode = getHtmlNode(ast)
  // 初步处理node节点为一个flagement
  const fragment: TreeNode[] = preprocessNodes(htmlNode.childNodes[1].childNodes, ctx)
  // 转化fragement
  wxmlFragment2Vue(fragment, ctx)
  ctx.template = ctx.lines.join("")
  return ctx
}
/**
 * 转化import进入页面的template
 * @param importWxmlString 
 */
export const convertWxmlTemplateToVueTemplate = (wxmlString: string, dependenceComponent: any, uid: string): Array<ITemplate> => {
  wxmlString = baseHandleWxml(wxmlString);
  wxmlString = wxmlString.replace(/template/g, "vue-template")
  
  // 解析字符串为ast语法树
  const ast = parse(wxmlString) as any
  // 初始化对象
  const ctx = { lines: [], ngTemplateCounter: 0, template: "", wxs: [], templateList: {}, linesStack: [], dependenceComponent, uid }
  // 拿到根节点
  const htmlNode = getHtmlNode(ast)
  // 初步处理node节点为一个flagement
  const fragment: TreeNode[] = preprocessNodes(htmlNode.childNodes[1].childNodes, ctx)
  // 转化fragement
  wxmlFragment2Vue(fragment, ctx)
  const templateList:any[] = []
  Object.keys(ctx.templateList).forEach(name=>{
    const template = {
      name,
      template: `${ctx.templateList[name].join("").replace(/vue-template/g, "div")}`,
      wxs: ctx.wxs
    }
    // console.log("ctx templateList", name);
    templateList.push(template)
  })
  return templateList
}

/**
 * 输出自定义组件存在class的位置列表
 * @param func 处理记录好的自定义组件存在class对象的函数
 */
export const outputDIYComponentsHasClassAttr = (func)=>{
  typeof func === "function" && func(DIYComponentsHasClassAttr)
}

const getHtmlNode = (ast) => {
  for (const node of ast.childNodes) {
    if (node.nodeName === "html") {
      return node
    }
  }
}

const preprocessNodes = (tree: TreeNode[], ctx: IContext): TreeNode[] => {
  let prev: null | TreeNode
  for (const node of tree) {
    node.attrsMap = new Map()
    if (node.attrs) {
      for (const attr of node.attrs) {
        node.attrsMap.set(attr.name, attr)
      }
      if (node.attrsMap.get("wx:if")) {
        node.isIf = true
      } else if (node.attrsMap.get("wx:elif")){
        node.isElseIf = true
      } else if (node.attrsMap.get("wx:else")) {
        node.isElse = true
      }
    }
    if (node.childNodes) {
      preprocessNodes(node.childNodes as TreeNode[], ctx)
    }
    if ((node.isElse || node.isElseIf) && prev) {
      node.templateId = ++ctx.ngTemplateCounter
      prev.nextElseTemplateId = node.templateId
    }
    if (isNormalNode(node)) {
      prev = node
    }
  }
  return tree
}

export const wxmlFragment2Vue = (fragment: TreeNode[], ctx: IContext) => {
  for (const node of fragment) {
    if (node.nodeName === "wxs") {
      ctx.wxs.push(node)
    } else if ((node.nodeName === "vue-template") && node.attrsMap.get("name")?.value){
      const name = node.attrsMap.get("name").value
      node.nodeName = "vue-template"
      // console.log("vue-template name", name, node);
      if(!ctx.linesStack){
        ctx.linesStack = []
      }
      // 定义一个 name对应的数组，存储template的内部节点
      const lines = ctx.templateList[name] || (ctx.templateList[name] = [])
      // 将上一个lines 放进栈里
      ctx.linesStack.push(ctx.lines)
      ctx.lines = lines;
      ctx.lines.push(`<vue-template>`)
      wxmlFragment2Vue(node.childNodes as any, ctx)
      ctx.lines.push(getParsedWxmlEndTagName(node))
      // 回退到上一个收集template的节点
      ctx.lines = ctx.linesStack.pop()
    } else if (!node.nodeName.startsWith("#")) {
      ctx.lines.push(parseWxmlNodeToVueStartTag(node, ctx))
      wxmlFragment2Vue(node.childNodes as any, ctx)
      ctx.lines.push(getParsedWxmlEndTagName(node, (node.nodeName === "vue-template" ? toKebab(parseTemplateName(node)) : '')))
    } else {
      if (node.nodeName === "#text") {
        // console.log("node.nodeName === #text", (node as any).value)
        let val = (node as any).value
        val && (val = val.replace(/`/g, '~'))
        ctx.lines.push(val?.replace(/{{(.*?)}}/g, (all, $1)=>{
          return `{{${convertToSFunction($1, false)}}}`
        }))
      } else {
        ctx.lines.push(`<!--${(node as any).data}-->`)
      }
    }
  }
}

const parseWxmlNodeToVueStartTag = (node: TreeNode,  ctx: IContext): string => {
  let tagName = getTagNameByWxmlNode(node)
  const isDiyComponet = !!ctx.dependenceComponent[tagName];
  let attrsStr = parseWxmlNodeToAttrsString(node, tagName, ctx, isDiyComponet)
  const typeAttrStr = getTypeAttrStr(node.nodeName, tagName)
  const hasShadow = isDiyComponet ? `:shadow="'${ctx.dependenceComponent[tagName]}'"` : ""
  if(node.nodeName === "vue-template" && parseTemplateName(node)){
    tagName = toKebab(parseTemplateName(node))
  }
  if(tagName === "include"){
    
    let srcPath = ""
    for(let i=0; i<node.attrs.length; i++){
      if(node.attrs[i].name === "src"){
        srcPath = node.attrs[i].value
      }
    }
    // console.log("include", ctx.path, srcPath)
    if(!srcPath){
      console.log("存在include标签 没有src", ctx.path)
      return  ""
    }
    // 组合文件路径
    let targetFilePath = path.join(ctx.cwd, "./" + ctx.path, "../" + srcPath)
    if(targetFilePath.indexOf("/") !== 0 ){
      targetFilePath = "/"+targetFilePath
    }
    if(!fs.existsSync(targetFilePath)){
      console.log("文件不存在",targetFilePath,  ctx.path)
      throw Error("文件不存在")
    }
    const wxmlStr = fs.readFileSync(targetFilePath, { encoding: "utf-8" })
    // if(targetFilePath.indexOf("order-operation") !== -1 || targetFilePath.indexOf("order-refund-time-limit") !== -1){
    //   console.log("include targetFilePath", targetFilePath)
    //   console.log("wxmlStr", wxmlStr)
    // }
    return convertWxmlToVueTemplate(wxmlStr, targetFilePath, {}, "", ctx.uid).template
  }
  return `<${tagName} ${hasShadow} ${typeAttrStr} ${attrsStr}>`
}

const getTypeAttrStr = (originalNodeName, tagName) => {
  if (originalNodeName === "checkbox") {
    return `type="checkbox"`
  }
  return ""
}

const getIfElseAttr = (node: TreeNode): string => {
  return getNgIfElseAttrValue(node.attrsMap.get("wx:elif"), node)
}

const getParsedWxmlEndTagName = (node: TreeNode, tagName?: string): string => {
  return `</${tagName || getTagNameByWxmlNode(node)}>`
}

const getTagNameByWxmlNode = (node: TreeNode) => {
  return TAGS_MAP[node.nodeName] || node.nodeName
}

const parseTemplateName = (node: TreeNode): string =>{
  let name = "";
  for (const attr of node.attrs) {
    if(attr.name === "name" || attr.name === "is"){
      name = attr.value
      return name;
    }
  }
  return name
}

const parseWxmlNodeToAttrsString = (node: TreeNode, tagName: string, ctx: IContext, isDiyComponet: boolean): string => {
  const attrsList: string[] = []
  for (const attr of node.attrs) {

    attrsList.push(parseWxmlAttrToVueAttrStr(attr, node, tagName, ctx, isDiyComponet))
  }
  return attrsList.join(" ")
}

const parseWxmlAttrToVueAttrStr = (attr: Attribute, node: TreeNode, tagName: string, ctx: IContext, isDiyComponet: boolean): string => {
  const n = attr.name
  if(n === "class"){
    attr.value = `${ctx.uid} ${attr.value}`
  }
  const isDataObj = tagName === "vue-template" && n === "data"
  const v = attr.value ? stripDelimiters(attr.value, isDataObj) : true

  if(StyleAndClass.has(n)){
    return parseWxmlStyle(attr)
  }
  else if (n === "wx:for") {
    const test = parseWxmlWxFor(attr, node, tagName)
    return test
  } else if (n === "wx:if") {
    return `v-if="${v}"`
  } else if (n === "wx:elif") {
    return `v-else-if="${v}"`
  } else if (n === "wx:else") {
    return `v-else`
  } else if (tapList.has(n) || longTapList.has(n)) {
    return parseWxmlTap(attr, node, n)
  } else if (tagName === "input" && n === "value" ) {
    return `:value="${v}"`
  } else if (!isDiyComponet && inputAttrList.has(n)) {
    return parseWxmlInput(attr, node)
  } else if (tagName === "input" && n === "bindchange") {
    return `v-on:change="${attr.value}"`
  } else if (replaceAttrList.has(n)) {
    return ""
  } else if (commonAttrList.has(n)) {
    return `:${n}="${v}"`
  } else if(n === "data-tap"){
    return `:data-click="${v}"`
  // } else if (specialAttrList.has(n)) { // input 事件不处理
  //   return parseWxmlSpecialAttr(attr, node)
  } else if (attr.name.indexOf("bind") === 0 || attr.name.indexOf("catch") === 0) {
    let functionName = attr.name.replace(/bind:?/, "").replace(/catch:?/, "")
    const dataSetList = getCurrentTargetDataSet(node)
    return `@${functionName}="getComponentMethodEvent(${v}, $event, { ${dataSetList.join(",")} })"`
  } else if (tagName === "vue-template" && attr.name === "data"){
    // console.log("data:", v)
    return `:t${attr.name}="${v}"`
  } else if ((tagName === "vue-template" && attr.name === "is") || (tagName === "vue-template" && attr.name === "name")){
    return ""
  } else if (tagName === "span" && n === "space") {
    // 处理 space="nbsp" 的情况 增加自定义指令
    return `v-space="${v}"`
  }
  return v ? `:${attr.name}="${v}"` : attr.name
}

const parseWxmlStyle = (attr: Attribute) :string => {
  var value: string = attr.value;
  // 示例属性值 join-box {{system}} {{isIPhoneX ? 'iphoneX-area' : ''}}
  // 我的想法是将 {{}} 转化为 ()表达式，然后将结果相加
  // {{ => '+(   }} => )+'
  // FIX:// 如果表达式有双引号 会出错
  // value = value.replace(/\"/g, "'")
  // // 方案一 分步替换
  // value = value.replace(/\{\{/g, "'+(")
  // value = value.replace(/\}\}/g, ")+'")
  // // 方案二 正则全匹配 还有些bug 暂不使用 
  // // value = value.replace(/\{\{(.*)\}\}/g, (_, b)=> `'+(${b})+'`)
  // value = `'${value}'`
  // 转换字符为表达式
  value = stripDelimiters(value, false)
  if(attr.name === "style" && value.indexOf("rpx")>0){
    value = `(${value}) | changeRpxToRemFilter`
  }
  return `:${attr.name}="${value}"`
}

const parseWxmlWxFor = (attr: Attribute, node: TreeNode, tagName: string) :string => {
  const attrsMap = node.attrsMap
  const itemKeyAttr = attrsMap.get("wx:for-item")
  const indexKeyAttr = attrsMap.get("wx:for-index")
  const wxKeyAttr = attrsMap.get("wx:key")
  const itemStr = itemKeyAttr ? itemKeyAttr.value : "item"
  const indexStr = indexKeyAttr ? indexKeyAttr.value : "index"
  const keyStr = !wxKeyAttr || wxKeyAttr.value === "*this" ? indexStr : `${itemStr}['${wxKeyAttr.value}']`
  return `v-for="(${itemStr}, ${indexStr}) in ${stripDelimiters(attr.value)}" ${(!attrsMap.get("key") && tagName !== 'template') ? (':key="'+keyStr+'"') : ''}`
}

const bindRE = /bind:?/
const catchRE = /catch:?/
const captureBindRE = /capture-bind:?/
const captureCatchRE = /capture-catch:?/

function transformEventName(name) {
  return '@' + (EVENTS[name] || name)
}

function convertToCamelCase(str: string): string {
  return str.replace(/[_-]\w/g, match => match[1].toUpperCase());
}

const parseWxmlTap = (attr: Attribute, node: TreeNode,name: string = "tap"): string => {
  const dataSetList = getCurrentTargetDataSet(node)
  let event = name
  if (name.indexOf('bind') === 0 ) {
    event = transformEventName(name.replace(bindRE, ''))
  } else if (name.indexOf('catch') === 0) {
    event = transformEventName(name.replace(catchRE, '')) + '.stop.prevent'
  } else if (name.indexOf('capture-bind') === 0) {
    event = transformEventName(name.replace(captureBindRE, '')) + '.capture'
  } else if (name.indexOf('capture-catch') === 0) {
    event = transformEventName(name.replace(captureCatchRE, '')) + '.stop.prevent.capture'
  }
  return `${event}="getHandleMethodEvent($event,{funcName:(${stripDelimiters(attr.value)}), dataset: {${dataSetList.join(",")}}})"`
}

const parseWxmlInput = (attr: Attribute, node: TreeNode): string => {
  const v = stripDelimiters(attr.value)
  const n = attr.name
  const attrsMap = node.attrsMap
  const valueAttr = attrsMap.get("value")
  const inputKey = valueAttr ? valueAttr.value : ""
  const type = n.replace(/(bind)(:?)/g, '')
  let realKey = checkIsHasDelimiters(inputKey) && type === 'input' ? stripDelimiters(inputKey) : ""
  if(realKey.indexOf("'") === -1){
    realKey = `'${realKey}'`
  }
  // console.log("realKey", realKey, inputKey, type)
  // console.log("");
  
  const dataSetList = getCurrentTargetDataSet(node)
  return `@${type}="getInputReturn(${v}, ${realKey}, { ${dataSetList.join(",")} }, $event)"`
}

const parseWxmlSpecialAttr = (attr: Attribute, node: TreeNode): string => {
  const n = attr.name
  const v = stripDelimiters(attr.value)
  const attrsMap = node.attrsMap
  if (n === "focus") {
    return `:autofocus="${v}"`
  // } else if (n === "password") {
  //   // TOOD: 暂时不考虑密码类型
  // } else if (n === "type" && node.nodeName === "input") { // digit/idcard/number 都用数字键盘 + confirm-type支持search【好像没用】
  //   const isHasConfirmType = attrsMap.has("confirm-type")
  //   return `:type="!${v} || ${v} === 'text' ? ${isHasConfirmType && attrsMap.get("confirm-type").value === "search"} ? 'search' : 'text' : 'number'"`
  }else if ( n === "type"){
    return `:type="${v}"`
  }
  return ""
}

const getCurrentTargetDataSet = (node: TreeNode): string[] => {
  const eventNameMap = {
    "tap": "click",
  }
  const attrsMap = node.attrsMap
  const dataSetList = []
  attrsMap.forEach((item, key) => {
    if (!key.indexOf("data-")) {
      const newKey = toCamel(key.slice(5))
      dataSetList.push(`${eventNameMap[newKey]|| newKey}: ${stripDelimiters(item.value)}`)
    }
  })
  return dataSetList
}

const getNgIfElseAttrValue = (attr: Attribute, node: TreeNode): string => {
  return `${stripDelimiters(attr.value)}${node.nextElseTemplateId ? `; else elseBlock${node.nextElseTemplateId}` : ''}`
}

const checkIsHasDelimiters = (val: string): boolean => {
  return val.search(/(^\{\{)|(\}\}$)/g) > -1
}

const stripDelimiters = (val: string, isDataObj: boolean = false): string => {
  val && (val = val.replace(/'/g, '"'))
  val && (val = val.replace(/`/g, '~'))
  if(val.indexOf("{{") === -1){
    // 存粹字符 没有表达式
    return `'${val}'`
  }
  // 如果只有一对 {{}} 并且是头尾
  if(val.indexOf("{{") == 0 && val.slice(2).indexOf("{{") === -1 && /}}$/.test(val)){
    const result = val.replace(/(\{\{)|(\}\})/g, '').replace(/"/g, "'")
    // console.log("ssss", result)
    return convertToSFunction(result, isDataObj)
  }
  // 如果有一对以上的 或者不是头尾 {{}} 则需要用表达式连接 比如 class="wrapper {{a ? 'test': 't2'}}"

  const result = "'" + val.replace(/{{(.*?)}}/g, (all, $1 = '') => {
    return `'+(${$1})+'`
  }).replace(/"/g, '\"') + "'"
  // console.log("result22", result)
  return convertToSFunction(result, false)
}

const isNormalNode = (node: TreeNode): boolean => {
  return !node.nodeName.startsWith("#")
}

const isElseOrIfElseNode = (node: TreeNode): boolean => {
  return node.isElse || node.isElseIf
}

const toCamel = (str: string): string => {
  return str.split("-").map((item) => item.toLowerCase()).join("-").replace(/([^-])(?:-+([^-]))/g, function ($0, $1, $2) {
    return $1 + $2.toUpperCase()
  })
}

const toKebab = (str: string): string => {
  let result = str.replace(/[A-Z]/g, function ($0) {
		return "-" + $0.toLowerCase()
  })
  if (result[0] === "-") {
    result = result.slice(1);
  }
  return result
}

var wxml = `<view
wx:if="{{((seqTypeObj.isStartGroupChild || seqTypeObj.isLeaderHelpChild) && !form.isAllowLeaderEditTitle) || isShowNeedPhoneModal || isShowSelectSeqModal || isShowFormContentListModal || isShowAllLeaderSeqTipModal || isShowChangeTabOrderModal || isUnableUsePublish  }}"
class="publish-theme-input {{system === 'ios' ? 'left' : ''}}"
>{{form.activityName}}</view>
<textarea
wx:else
class="publish-theme-input {{system === 'ios' ? 'left' : ''}}"
type="text"
placeholder="请输入接龙主题（必填）"
placeholder-class="placeHolderTextClass"
show-confirm-bar='{{false}}'
maxlength="100"
auto-height="{{true}}"
value="{{isShowRealData && isReady ? form.activityName : ''}}"
bindblur="handleTitleInput"
bindinput="handleTitleInput">
</textarea>
</view>`
// var res = convertWxmlToVueTemplate(wxml, "", {})
// console.log("res", res.template)

// console.log(parseWxmlStyle({name: "class", value: "join-box {{system}} {{isIPhoneX ? 'iphoneX-area' : ''}}"}));



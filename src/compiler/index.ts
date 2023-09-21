const path = require("path")
const fs = require("fs")
const webpack = require("webpack")
import { convertWxmlToVueTemplate, outputDIYComponentsHasClassAttr, convertWxmlTemplateToVueTemplate } from "./convertWxmlToNgTemplate"
import { changeRpx2Rem } from "../utils"

const d = path.resolve(process.cwd())
console.log("d", d);

let cwd = ""
const allComponents = new Map()

const suid = () => {
  // I generate the UID from two parts here 
  // to ensure the random number provide enough bits.
  var firstPart = (Math.random() * 46656) | 0;
  var secondPart = (Math.random() * 46656) | 0;
  const firsts = ("000" + firstPart.toString(36)).slice(-3);
  const seconds = ("000" + secondPart.toString(36)).slice(-3);
  return 'w' + firsts + seconds;
}

const scopeCssAndHTML = (css: string, html: string, isComponent: boolean, uid: string) => {
  // const uid = suid()
  let preCss = "";
  let importReg = /\@import\s*url\((\'|\")(.*?)(\'|\")\);/g
  css = css.replace(importReg, (a) => {
    preCss += a;
    return ""
  })
  css = css.replace(/([^\{\}\n]+)(\{[\s\S]*?\})/g, (a, b, c) => {
    return `${b.split(",").map(key=> `.${uid}${key}`).join(",")}${c}`
  })
  css = preCss + css;
  const tag = isComponent ? "span" : "div"
  const clickEvent = isComponent ? '@click="$emit(\'click\', $event)"' : ""
  html = `<${tag} ${clickEvent}>${html}</${tag}>`
  return [css, html]
}

const toh5 = (callback: Function) => {
  if (callback) {
    callback()
  }
}

const getNgc = () => {
  return {
    convertWxmlToVueTemplate,
    convertWxmlTemplateToVueTemplate,
  }
}

const genMiniJS = (miniApp: MiniAppInfo) => {
  console.log("genMiniJS");
  
  let jsStr = '';
  let cssStr = ''
  let basejsStr = `
const ngc = require("wxminiapp2vue");
const { runtime, wx } = ngc;
Object.assign(window, runtime);
Object.assign(window, { wx });
require('./app.js')

window.wxs = {}
`;
[...miniApp.wxs.entries()].forEach(([key, value]) => {
  basejsStr += `
window.wxs["${key.replace(/\\/g, '/')}"] = (function() {
  const module = { exports: {} };
  ${value.js};
  return module.exports;
})()\n
`
})



  const gen = ( [name, c]: [string, PageComponent]) => {
    // console.log("c.importTemplates", c.importTemplates);
    const list = c.path.split("/")
    // console.log('gen===>', c.path)
    fs.writeFileSync(c.path + "-c.js", `
    const ngc = require("wxminiapp2vue");
    ngc.registerTemplate("${c.path}", \`${c.template}\`,\n ${JSON.stringify(c.wxsDeps)}, \n${JSON.stringify(c.dependenceComponent || {})},\n ${JSON.stringify(c.importTemplates || {})});
    require("./${list[list.length - 1]}");
`)
    
    // 拼接全部css
    cssStr += c.cssContent + "\n";
    jsStr += `
ngc.componentInitFunctionMap["${c.path}"] = async function(){
  return require.ensure([], function() {
    /**
     * Path: ${c.path}
     * */
        `
    jsStr += `require("${c.path}-c");\n`
    jsStr += `
  }, "${list[list.length - 1]}")
}
ngc.componentDependenceMap["${c.path}"] = [${Object.keys(c.dependenceComponent).map((cname: string) => {
  return `"${c.dependenceComponent[cname].replace(/^\//, '')}"`
}).join(",")}]
///////////////////////////////////////////////////////////////////////////
    `
  }

  // jsStr = basejsStr;
  // for (const cc of miniApp.components) {
  //   gen(cc)
  // }
  // for (const cc of miniApp.pages) {
  //   gen(cc)
  // }
  // fs.writeFileSync(path.join(cwd, "miniapp.js"), jsStr, "utf-8")
  /** 下面是单个页面的 */
  // for (const cc of miniApp.pages) {
  //   genPage(cc)
  // }
  /** 多页面聚合 */
  genPages(miniApp.pages)
  function genPage([name, c]: [string, PageComponent]){
    // 处理baseStr 内的app.js的引用 改为相对路径
    // let p = path.join(cwd,'/dist/', c.path)
    // console.log("path", p, appJsPath)
    // let relativePath = path.relative(p+"/../", appJsPath);
    // // 重置jsStr 每个页面都用基础的js
    // jsStr = basejsStr.replace("./app.js", relativePath)
    jsStr = basejsStr;
    // 分析依赖的component 
    // 全部的依赖
    const dependenceComponents = [];
    // 需要迭代找出全部的组件依赖 组件里面还可能存在组件依赖
    let tempList = [c.deps];
    let deps:any = undefined;
    // 遍历依赖的组件列表
    while(tempList.length > 0){
      deps = tempList.shift();
      for(let [cname, component] of deps){
        console.log("cname", cname)
        // 如果组件还有依赖 则继续迭代寻找依赖
        if(component.deps && component.deps.size >0){
          tempList.push(component.deps)
        }
        // 将依赖的组件加入到全部依赖的组件列表上
        let index = dependenceComponents.indexOf(component)
        if( index !== -1){
          dependenceComponents.splice(index, 1);
        }
        
        dependenceComponents.push(component)
      }
    }
    // console.log("deepenComonents", dependenceComponents.length);
    
    dependenceComponents.forEach(c=>console.log(c.path));
    // console.log("componentlist", dependenceComponents.length)
    // 写入依赖的组件 从后往前写
    for(let i=dependenceComponents.length-1; i>=0; i--){
      gen(["", dependenceComponents[i]])
    }
    gen(["", c])
    // let dir = path.dirname(p)
    // fs.mkdirSync(dir, { recursive: true })
    // fs.writeFileSync(p + ".js", jsStr, "utf-8")
    // genHtml(p + ".html");
    fs.writeFileSync(path.join(cwd, "miniapp.js"), jsStr, "utf-8")
  }
  function genPages(pages){
    // 处理baseStr 内的app.js的引用 改为相对路径
    // let p = path.join(cwd,'/dist/', c.path)
    // console.log("path", p, appJsPath)
    // let relativePath = path.relative(p+"/../", appJsPath);
    // // 重置jsStr 每个页面都用基础的js
    // jsStr = basejsStr.replace("./app.js", relativePath)
    jsStr = basejsStr;
    // 分析依赖的component 
    // 全部的依赖
    const dependenceComponents: any[] = [];
    // 需要迭代找出全部的组件依赖 组件里面还可能存在组件依赖
    for (const [name, c] of pages){
      let tempList = [c.deps];
      let deps: any = undefined;
      // 遍历依赖的组件列表
      while(tempList.length > 0){
        deps = tempList.shift();
        for(let [cname, component] of deps){
          // 如果组件还有依赖 则继续迭代寻找依赖
          // console.log("cname", cname)
          // 将依赖的组件加入到全部依赖的组件列表上
          let index = dependenceComponents.indexOf(component)
          if( index !== -1){
            dependenceComponents.splice(index, 1);
            // continue
          }else if(component.deps && component.deps.size >0){
            tempList.push(component.deps)
          }
          
          dependenceComponents.push(component)
        }
      }
      // console.log("deepenComonents", dependenceComponents.length);
      
      // dependenceComponents.forEach(c=>console.log(c.path));
      // console.log("componentlist", dependenceComponents.length)
      // gen(["", c])
      // 放到列表最前面 最后才写入页面
      dependenceComponents.unshift(c)
    }
    // 写入依赖的组件 从后往前写
    for(let i=dependenceComponents.length-1; i>=0; i--){
      gen(["", dependenceComponents[i]])
    }
    // let dir = path.dirname(p)
    // fs.mkdirSync(dir, { recursive: true })
    // fs.writeFileSync(p + ".js", jsStr, "utf-8")
    // genHtml(p + ".html");
    fs.writeFileSync(path.join(cwd, "miniapp.js"), jsStr, "utf-8")
    fs.writeFileSync(path.join(cwd, "main.css"), cssStr, "utf-8")
  }
}

// 收集依赖的wxss文件
const DependenceWxss = []

class PageComponent {
  public absPath = ""
  public path = ""
  public json: any = {}
  public isComponent = false
  public template = ""
  public jsContent = ""
  public cssContent = ""
  public deps = new Map()
  public rawWxs: any[] = []
  public wxsDeps: any = {}
  public dependenceComponent: any = {}
  public importTemplates: any = []

  constructor () {
  }

  load() {
    const ngc = getNgc()
    // console.log(this.path)
    this.path = this.path.replace(/\\/g, '/')
    this.absPath = this.absPath.replace(/\\/g, '/')
    try {
      // console.log("读取wxml文件", this.absPath)
      let wxml = fs.readFileSync(this.absPath + ".wxml", "utf-8")
      // import 进来的template标签
      let importTemplates = []
      // 局部css作用域的id
      const uid = suid()
      // 处理import 标签
      wxml = wxml.replace(/\<import\s*src=("|')(.*?)("|')\s*((\/\>)|(\>\<\/import\>))/g, (a, b, c)=>{
        const importFileAbsPath = path.resolve(this.absPath, "../", c)
        // 读取import的wxml文件
        const importWxml =  fs.readFileSync(`${importFileAbsPath}${importFileAbsPath.indexOf("wxml")>0 ? '' : '.wxml'}`, "utf-8")
        // 将wxml文件转化为template列表，分别存储起来
        const oneImportTemplate = convertWxmlTemplateToVueTemplate(importWxml, this.dependenceComponent, uid)
        // console.log("oneImportTemplate", oneImportTemplate)
        importTemplates = importTemplates.concat(oneImportTemplate.map(template=>{
          const { wxs = []} = template;
          const tempPage = new PageComponent()
          const tempMiniapp = new MiniAppInfo();
          tempPage.rawWxs = wxs;
          tempPage.wxsDeps = []
          tempPage.absPath = importFileAbsPath;
          tempMiniapp.parseWxsDepsByPc(tempPage);
          // console.log("tempPage wxsDeps", tempPage.wxsDeps);
          return {
            ...template,
            wxs: tempPage.wxsDeps
          }
        }))
        return "";
      })
      // console.log("解析wxml", this.absPath, this.absPath.indexOf("detail-group-buy") >= 0 && wxml);
      const parsedWxml = ngc.convertWxmlToVueTemplate(wxml, this.path, this.dependenceComponent, cwd, uid)
      // console.log("解析完成", this.absPath.indexOf("detail-group-buy") >= 0 && parsedWxml.template);
      this.template = parsedWxml.template
      this.rawWxs = parsedWxml.wxs
      this.jsContent = fs.readFileSync(this.absPath + ".js", "utf-8")
      const wxssPath = this.absPath + ".wxss"
      this.cssContent = fs.existsSync(wxssPath) ? convertWxssToCss(fs.readFileSync(wxssPath, "utf-8"), this.absPath, true) : ""

      const [css, template] = scopeCssAndHTML(this.cssContent, this.template, this.isComponent, uid)
      // const [css, template] = [this.cssContent, this.template]
      this.cssContent = css
      this.template = template
      this.importTemplates = importTemplates
    } catch (e) {
      setTimeout(() => {
        console.log("编译组件失败", this.path, )
        throw e
      })
    }
  }
}

/** 
 * https://blog.csdn.net/sinat_23076629/article/details/81131472
 * 支不支持 @wxs?
 * */
const convertWxssToCss = (wxss, absPath: string = "", deleteDep:boolean = false) => {
  let css = wxss
  // component的样式在小程序里面需要import进来，但是在h5里面已经全局加载，不需要再引入 
  // 下面的正则是为了去除全局样式的引入
  let commonWxssReg = /@import\s(\"|')(.*?)\/styles\/(common|flex)(.wxss)?(\"|');/g
  css = css.replace(commonWxssReg, "")
  // import 的查找 如果wxss里面有import 就把import的文件名称收集起来，后面同一处理
  let importReg = /\@import\s*(\'|")(.*?)(\.wxss)?(\'|");/g
  css = css.replace(importReg, (all, _, matchPart)=>{
    if(/^\w/.test(matchPart)){
      matchPart = "./" + matchPart;
    }
    let importWxssAbsPath = path.resolve(absPath, '../', matchPart)
    // console.log("importWxssAbsPath", importWxssAbsPath);
    // return `@import url('${matchPart}.css');`
    // 这里要返回 导入的css 除了全局的
    // 读取wxss文件，然后转换为css文件
    const importCssStr = fs.readFileSync(importWxssAbsPath + ".wxss",  "utf-8")
    // 转换
    return convertWxssToCss(importCssStr, importWxssAbsPath)
  })
  css = changeRpx2Rem(css)
  // css = css.replace("::-webkit-scrollbar", "::-webkit-scrollbar-unused")
  return css
}

class MiniAppInfo {
  public root: string = ""
  public components = new Map()
  public pages = new Map()
  public wxs = new Map()

  constructor() {
  }

  /** 解析wxss */
  parseAppWxss(){
    console.log("root", this.root);
    let cssContent = convertWxssToCss(fs.readFileSync(this.root + "/app.wxss", "utf-8"), this.root+'/app')
    const p = path.join("dist/styles", '/app')
    const dir = path.dirname(p)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(p + ".css", `${cssContent}`)
  }

  /**
   * 根据appjson 编译需要编译的页面 change2h5Page
   * @param appJson 
   */
  parseByAppJson(appJson: any) {
    // 先处理主目录下的wxss
    this.parseAppWxss();
    let pages = appJson.change2h5Page || []
    const isCompileAllPage = true
    if(isCompileAllPage){
      pages = appJson.pages || []
      // 处理分包页面
      if (appJson.subpackages) {
        for (const subpackage of appJson.subpackages) {
          const root = subpackage.root
          const subpages = subpackage.pages
          for (const p of subpages) {
            pages.push(`${root}/${p}`)
          }
        }
      }
    }
    if(!pages || pages.length === 0){
      throw new Error("app.json 没有配置编译页面 change2h5Page，请增加配置，确认需要编译的页面。")
    }
    this.parsePagesByPaths(pages)
  }

  parsePagesByPaths(pages: string[]) {
    for (const page of pages) {
      this.parsePageByPath(page)
    }
  }

  /**
   * 编译一个特定页面
   * @param page 
   */
  parsePageByPath(page: string) {
    // 拿到页面json
    const pageJson = require(path.resolve(this.root, page + ".json"))
    // 新建一个页面对象
    const pc = new PageComponent()
    // 设置页面绝对路径
    pc.absPath = path.resolve(page)
    pc.path = page
    pc.json = pageJson
    // 解析页面依赖的组件
    pc.deps = this.parseDeps(pc)
    // 解析整个页面 包含wxml wxss
    pc.load()
    // 解析页面组件依赖的wxs
    this.parseWxsDepsByPc(pc)
    // console.log("parsePageByPath pagePath", page)
    // 设置整个小程序页面，以及对应的页面配置
    this.pages.set(page, pc)
  }

  parseDeps(pc: PageComponent) {
    const deps = new Map()
    const coms = pc.json.usingComponents
    if (coms) {
      Object.keys(pc.json.usingComponents).forEach((key) => {
        const cp = coms[key]
        if(cp.startsWith("plugin:")){
          return
        }
        const p = cp.startsWith(".")
          ? path.resolve(path.join(path.dirname(pc.absPath), cp))
          : path.resolve(path.join(this.root, cp))
        if(p === pc.absPath){
          return
        }
        pc.dependenceComponent[key] = p.replace(this.root, "")
        deps.set(key, this.parseComponentByPath(p))
      })
    }
    return deps
  }

  parseComponentByPath(p: string) {
    const comJson = require(p + ".json")
    const rp = this.replaceDirname(p)
    // console.log("parseComponentByPath", rp);
    
    if (!this.components.has(rp)) {
      // 判断全局是否有解析过 有解析过 则返回
      if(allComponents.has(rp)){
        this.components.set(rp, allComponents.get(rp))
        return allComponents.get(rp)
      }
      const cc = new PageComponent()
      allComponents.set(rp, cc)
      cc.absPath = p
      cc.path = rp
      cc.json = comJson
      cc.dependenceComponent = {}
      cc.deps = this.parseDeps(cc)
      cc.isComponent = true
      cc.load()
      this.parseWxsDepsByPc(cc)
      this.components.set(rp, cc)
    }
    return this.components.get(rp)
  }

  parseWxsDepsByPc(pc: any) {
    pc.rawWxs.forEach((rawWxs: any) => {
      pc.wxsDeps[rawWxs.attrsMap.get("module").value] = this.parseWxs(rawWxs, pc.absPath)
    })
  }

  parseWxs(rawWxs: any, absPath: string) {
    if (rawWxs.attrsMap.has("src")) {
      const src = rawWxs.attrsMap.get("src")
      const rWxsPath = this.parseWxsWithPath(absPath, src.value)
      return { id: rWxsPath, }
    } else {
      return { js: rawWxs.childNodes[0].value, }
    }
  }

  parseWxsWithPath(absPath: string, p: string): string {
    const wxsPath = path.resolve(path.join(path.dirname(absPath), p))
    const rWxsPath = this.replaceDirname(wxsPath)
    if (!this.wxs.has(rWxsPath)) {
      let jscontent = fs.readFileSync(wxsPath, "utf-8")
      jscontent = this.parseRequireWxs(wxsPath, jscontent)
      this.wxs.set(rWxsPath, { js: jscontent })
    }
    return rWxsPath
  }

  replaceDirname(p: string) {
    return p.replace(this.root, "").replace(/^[\/\\]/g, "")
  }

  parseRequireWxs(wxsPath: string, content: string): string {
    content = content.replace(/require\(['"]([\s\S]+?)['"]\)/g, (a: string, b: string): string => {
      // console.log(wxsPath, a, b)
      this.parseWxsWithPath(wxsPath, b)
      // const wxsName = this.replaceDirname(wxsPath)
      const wxsName = this.replaceDirname(path.resolve(path.dirname(wxsPath), b))
      // console.log("wxsName", wxsName) 
      return `getWxsByPath("${wxsName.replace(/\\/g, "/")}")`
    })
    return content
  }
}

const genHtml = (htmlPath?: string) => {
  let html = fs.readFileSync(path.resolve(__dirname, "miniapp.html"), "utf-8")
  // 如果蛇者了htmlpath的路径 则需要转化 因为不是在当前目录了
  if(htmlPath){
    const distPath = path.resolve(cwd, './dist')
    const realativePath = path.relative(path.resolve(htmlPath, "../"), distPath)
    html = html.replace(/\.\/dist/g, realativePath)
  }else{
    htmlPath = "./miniapp.html"
  }
  fs.writeFileSync(htmlPath, html, "utf-8")
}

const copyWebSdkJS = () => {
  fs.copyFileSync(path.resolve(path.join(__dirname, '../vendors/remoteWxApi/web-sdk.js')), path.join(cwd, "dist/web-sdk.js"))
}

const copyVueMinJS = () => {
  fs.copyFileSync(path.resolve(path.join(__dirname, '../vendors/vue.js')), path.join(cwd, "dist/vue.js"))
}

const copyVue2TouchEventsJS = () => {
  fs.copyFileSync(path.resolve(path.join(__dirname, '../vendors/vue2-touch-events.js')), path.join(cwd, "dist/vue2-touch-events.js"))
}
const copyVant = () => {
  fs.copyFileSync(path.resolve(path.join(__dirname, '../vendors/vant.min.js')), path.join(cwd, "dist/vant.min.js"))
  fs.copyFileSync(path.resolve(path.join(__dirname, '../vendors/vant.css')), path.join(cwd, "dist/vant.css"))
}

const copyFlexibleJS = () => {
  fs.copyFileSync(path.resolve(path.join(__dirname, '../vendors/flexible.js')), path.join(cwd, "dist/flexible.js"))
}

const copyWeuiCss = () => {
  fs.copyFileSync(path.resolve(path.join(__dirname, '../../kbone-ui-lib/weui/weui.css')), path.join(cwd, "dist/weui.css"))
}

const copyWxComponents = () => {
  fs.copyFileSync(path.resolve(path.join(__dirname, '../vendors/wx-components.dev.js')), path.join(cwd, "dist/wx-components.dev.js"))
  fs.copyFileSync(path.resolve(path.join(__dirname, '../vendors/wx-components.js')), path.join(cwd, "dist/wx-components.js"))

  fs.copyFileSync(path.resolve(path.join(__dirname, '../vendors/wx-components-all.dev.js')), path.join(cwd, "dist/wx-components-all.dev.js"))
  fs.copyFileSync(path.resolve(path.join(__dirname, '../vendors/wx-components-all.js')), path.join(cwd, "dist/wx-components-all.js"))
}

const handleDIYComponentsHasClassAttr = (map)=>{
  fs.writeFileSync(path.join(cwd, "outputDIYComponentsHasClassAttr.json"), JSON.stringify(map, null, 2), "utf-8")
}

const main = () => {
  let p = process.argv[2]
  if (!path.isAbsolute(p)) {
    p = path.resolve(path.join(process.cwd(), p))
  }
  cwd = p
  // 编译需要转换的小程序页面
  compile(p)
  console.log("compile success")
  outputDIYComponentsHasClassAttr(handleDIYComponentsHasClassAttr)
  makeBundle(p)
}
/**
 * 编译需要转换的小程序页面
 * @param p 
 */
const compile = (p: string): void => {
  // 读取app.json
  const appJson = require(path.join(p, "app.json"))
  // 构建一个小程序的对象
  const miniApp = new MiniAppInfo()
  // 设置根路径
  miniApp.root = p
  // 解析app.json 根据app.json找到需要编译的页面，根据页面找到依赖的组件，并编译
  miniApp.parseByAppJson(appJson)
  // 生成小程序运行js
  genMiniJS(miniApp)     
  // 生成小程序渲染页面 miniapp.html 
  // 这个页面引入了vue 引入了小程序运行逻辑
  genHtml()
  // 复制vue的运行库
  copyVueMinJS()
  // 复制websdk文件
  // copyWebSdkJS()
  // 复制vue的事件转换
  copyVue2TouchEventsJS()
  // 复制vant依赖库
  copyVant()
  // 复制移动端的适配方案 设置适合的rem
  copyFlexibleJS()
  // 复制weui的css 兼容一些基础样式
  // copyWeuiCss()
  copyWxComponents()
}

const makeBundle = (p: string): void => {
  console.log("p", p);
  console.log("app.js", path.join(p, "app.js"));
  console.log("miniapp.js", path.join(p, "miniapp.js"));
  
  // console.log(path.join(p, "miniapp.js"))
  webpack({
    entry: {
      h5: path.resolve(path.join(__dirname, '../../dist/compiler/h5.js')),
      app: path.join(p, "app.js"),
      miniapp: path.join(p, "miniapp.js"),
    },
    resolve: {
      modules: ['node_modules', p ],
      alias: {
        'wxminiapp2vue': path.resolve(path.join(__dirname, '../../dist/index.js'))
      }
    },
    optimization: {
      /* disable minimize */
      minimize: false,
      splitChunks: {
        cacheGroups: {
          commons: {
            name: "commons",
            chunks: "initial",
            minChunks: 2,
            minSize: 0
          }
        }
      },
      chunkIds: "named" // To keep filename consistent between different modes (for example building only)
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    output: {
      // filename: 'main.js',
      publicPath: '/dist/',
      path: path.resolve(p, 'dist'),
    },
  }, (err: Error, stats: any) => {
    if (err) { throw err }
    const errors = stats.compilation.errors
    console.log(errors.length, "===>")
    for (const er of errors) {
      console.log(er, "===>")
    }
  })
}

main()

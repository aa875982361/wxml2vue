import Vue from 'vue'
import { VNode } from 'vue/types/umd'

function makeShadow(el: Element, stylePath?: string, vm?: any) {
    makeAbstractShadow(el, el.childNodes, stylePath, vm)
}
function makeAbstractShadow(rootEl: Element, childNodes: NodeList, stylePath?: string, vm?: any) {
    (rootEl as any).style.display = "inline"
    const fragment = document.createDocumentFragment()
    for (const node of childNodes) {
        fragment.appendChild(node)
    }
    const slots: any = vm?.componentInstance?.$slots;
    if(Object.keys(slots).length > 0){
        Object.keys(slots).forEach(name=>{
            // 拿到插槽对应的节点列表 拿到的是vNode 列表
            var vNodeList = slots[name] || [];
            name = name === 'default' ? "" : name;
            // 设置空插槽的name
            var emptySlot = document.createElement("slot")
            if(name){
                emptySlot.setAttribute("name", name)
            }
            for(var i=0; i<vNodeList.length; i++){
                // 拿到vnode节点
                var vnode = vNodeList[i];
                // 拿到真实dom对应节点
                var vdom: Element = vnode.elm;
                // 拿到真实dom的父节点
                if(!vnode || !vdom){
                    continue
                }
                var vdomParent = vdom.parentNode
                // 替换真实dom对应节点为空的slot节点
                vdomParent.replaceChild(emptySlot, vdom);
                // 替换之后需要把vdom节点加个名字，并且加到shadowdom外面
                if(name){
                    vdom.setAttribute("slot", name)
                }
                rootEl.appendChild(vdom)
            }
        })
    }
    
    const shadowroot = rootEl.attachShadow({ mode: 'open' })
    shadowroot.appendChild(fragment)
    // 如果存在样式引入
    if(stylePath){
      const linkWeui = document.createElement("link");
      linkWeui.setAttribute("rel", "stylesheet")
      linkWeui.setAttribute("type", "text/css")
      linkWeui.setAttribute("href", "/dist/weui.css")
      linkWeui.media = 'all';
      shadowroot.appendChild(linkWeui)
      const link = document.createElement("link");
      link.setAttribute("rel", "stylesheet")
      link.setAttribute("type", "text/css")
      link.setAttribute("href", stylePath)
      link.media = 'all';
      shadowroot.appendChild(link)
    }
}
/**
 * 更新节点 将slot抽离出来
 * @param rootEl 
 * @param vm 
 * @param oldVm 
 */
function updateShadow(rootEl: Element, vm: VNode, oldVm: VNode){
    const shadowRoot = rootEl.shadowRoot;
    const slots: any = vm?.componentInstance?.$slots || {};
    // 先明确问题 为什么没展示出来
    // 还不是真的没有更新到
    if(vm.tag.indexOf("rich-text-show") > 0){
        console.log("vm innerhtml", vm?.elm)
        debugger
    }
}

function data() {
    return {
        pabstract: false,
        pstatic: false
    }
}

const ShadowRoot = Vue.extend({
    render(h) {
        return h(this.tag, {}, [
            this.pstatic ? this.$slots.default : h(this.slotTag, { attrs: { id: this.slotId }, 'class': this.slotClass }, [
                this.$slots.default
            ])
        ])
    },
    props: {
        abstract: {
            type: Boolean,
            default: false
        },
        static: {
            type: Boolean,
            default: false,
        },
        tag: {
            type: String,
            default: 'div',
        },
        slotTag: {
            type: String,
            default: 'div',
        },
        slotClass: {
            type: String,
        },
        slotId: {
            type: String
        }
    },
    data,
    beforeMount() {
        this.pabstract = this.abstract
        this.pstatic = this.static
    },
    mounted() {
        if (this.pabstract) {
            makeAbstractShadow(this.$el.parentElement!, this.$el.childNodes)
        } else {
            makeShadow(this.$el)
        }
    },
})

function install(vue: typeof Vue) {
    vue.component('shadow-root', ShadowRoot)

    vue.directive('shadow', {
        bind(el: HTMLElement, binding, vm) {
            const stylePath = binding.value ? `/dist/styles${binding.value}.css` : undefined
            makeShadow(el, stylePath, vm)
        },
        componentUpdated(el: HTMLElement, binding, vm, oldVm) {
            updateShadow(el, vm, oldVm)
        }
    })
}
if (typeof window != null && (window as any).Vue) {
    install((window as any).Vue)
}

export { ShadowRoot, ShadowRoot as shadow_root, install }
export default { ShadowRoot, shadow_root: ShadowRoot, install }
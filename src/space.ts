import Vue from 'vue'
import { VNode } from 'vue/types/umd'

function install(vue: typeof Vue) {
    vue.directive('space', {
        bind(el: HTMLElement, binding, vm: VNode) {
          var value = binding.value;
          var reg = new RegExp(`&amp;${value};`, "g");
          (el as any).$$spaceReg = reg;
          (el as any).$$spaceValue = `&${value};`;
          el.innerHTML = el.innerHTML.replace(reg, (el as any).$$spaceValue)
        },
        componentUpdated(el: HTMLElement, binding, vm){
          el.innerHTML = el.innerHTML.replace((el as any).$$spaceReg, (el as any).$$spaceValue)
        }
    })
}
if (typeof window != null && (window as any).Vue) {
    install((window as any).Vue)
}

export { install }
export default { install }
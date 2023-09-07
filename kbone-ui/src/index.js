import {ismp} from './utils/util'
import KView from '../packages/KView/'
import KCoverView from '../packages/KCoverView'
import KButton from '../packages/KButton/'
import KButtonArea from '../packages/KButtonArea/'
import {
    KFlex,
    KFlexItem
} from '../packages/KFlex'
import KScrollView from '../packages/KScrollView'
import {
    KRadio,
    KCells,
    KCell,
    KCheckbox,
    KCheckboxGroup,
    KRadioGroup,
    KSwitch,
    KInput,
    KSlider,
} from '../packages/KForm'
import KActionSheet from '../packages/KActionSheet/'
import KDialog from '../packages/KDialog/'
import KToast from '../packages/KToast/'
import KProgress from '../packages/KProgress/'
import KToptips from '../packages/KToptips/'
import KIcon from '../packages/KIcon/'
import {
    KPickerView,
    KPickerViewColumn,
} from '../packages/KPicker/'
import {
    KSwiper,
    KSwiperItem
} from '../packages/KSwiper/'
import {KMovableView, KMovableArea} from '../packages/KMovable'

const components = [
    KView,
    KButton,
    KButtonArea,
    KFlex,
    KFlexItem,
    KScrollView,
    KRadio,
    KCells,
    KCell,
    KCheckbox,
    KCheckboxGroup,
    KSwitch,
    KRadioGroup,
    KInput,
    KSlider,
    KActionSheet,
    KDialog,
    KToast,
    KProgress,
    KToptips,
    KPickerView,
    KPickerViewColumn,
    KSwiper,
    KSwiperItem,
    KIcon,
    KMovableArea,
    KMovableView,
    KCoverView,
]

const install = function(Vue, opts = {}) {
    components.forEach(component => {
        Vue.component(component.name, component)
    })
    // register variable for mp and h5
    Vue.prototype.$kbone = {
        size: opts.size || '',
        zIndex: opts.zIndex || 2000
    }

    Vue.prototype.$ismp = false && typeof Page === 'function' && typeof Component === 'function' 
    // 兼容只支持浏览器的情况  我们有Page的函数 以及 Component的函数 所以这个条件不能正确判断是处于哪个环境
    // 我们目前只需要
}


// if (typeof window !== 'undefined' && window.Vue) {
//     window.Vue.use(WeUI)
// }

export default {
    version: '0.5.9',
    ismp,
    install,
    KView,
    KButton,
    KButtonArea,
    KFlex,
    KFlexItem,
    KScrollView,
    KRadio,
    KCells,
    KCell,
    KCheckbox,
    KCheckboxGroup,
    KSwitch,
    KRadioGroup,
    KInput,
    KSlider,
    KActionSheet,
    KDialog,
    KToast,
    KProgress,
    KToptips,
    KPickerView,
    KPickerViewColumn,
    KSwiper,
    KSwiperItem,
    KIcon,
    KMovableArea,
    KMovableView,
}

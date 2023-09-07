<template>
  <i
    :class="['weui-icon-base',classObject]"
  />
</template>
<script>
export default {
    name: 'KIcon',
    props: {
        type: {
            type: String,
            // success ,info ,waiting ,circle ,warn ,download ,info ,cancel ,clear ,search
            default: ''
        },
        size: {
            type: String,
            default: 'small'
        }
    },
    computed: {
        classObject() {
            return {
                [this.type && ('weui-icon-' + this.type)]: this.type !== 'loading',
                'weui-loading': this.type === 'loading',
                'weui-icon_msg': this.size === 'large'
            }
        }
    }
}
</script>


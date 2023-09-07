<template>
  <KView class="weui-cell weui-cell_switch">
    <KView v-if="label" class="weui-cell__bd">
      {{ label }}
    </KView>
    <KView class="weui-cell__ft" v-touch:tap="handleChange">
      <label class="weui-switch-cp">
        <wx-switch 
          v-if="ismp"
          :disabled="disabled"
          :checked="isChecked"
          class="weui-switch-cp__input"
          @change="handleChange"
        />
        <input
          v-else
          :disabled="disabled"
          :checked="isChecked"
          type="checkbox"
          class="weui-switch-cp__input"
        />
        <KView
          :class="{'is-checked':isChecked}"
          class="weui-switch-cp__box" />
      </label>
    </KView>
  </KView>
</template>

<script>
import {ismp} from "@utils/util";

export default {
    name: 'KSwitch',
    props: {
        label: {
            type: String,
        },
        value: {
            type: Boolean,
            required: true
        },
        disabled: {
            type: Boolean
        }
    },
    data() {
        return {
            isChecked: this.value,
            ismp
        }
    },
    methods: {
        handleChange(e) {
            if (this.disabled) {
                return
            }
            this.isChecked = !this.isChecked;
            this.$emit('input', this.isChecked)
            this.$emit('change', {
                detail: {
                  value: this.isChecked
                }
            })
        }
    }
}
</script>


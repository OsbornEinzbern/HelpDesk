<template>
  <div class="base-node" :style="nodeStyle">
    <div class="handles-wrapper" v-if="data.showTargetHandle || data.showSourceHandle">
      <Handle 
        v-if="data.showTargetHandle" 
        type="target" 
        :position="Position.Left" 
        class="custom-handle" 
      />
      <Handle 
        v-if="data.showSourceHandle" 
        type="source" 
        :position="Position.Right" 
        class="custom-handle" 
      />
    </div>
    <span>{{ data.label }}</span>
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'

const props = defineProps({
  data: Object,
  style: Object,
  selected: Boolean,
})

// Стили, которые всегда применяются к узлу
const nodeStyle = computed(() => ({
  borderRadius: '8px',
  border: props.selected ? '2px solid #ff7c11' : 'none', 
}))
</script>

<style scoped>
.custom-handle {
  pointer-events: auto;
  width: 22px;
  height: 21px;
  background-color: #2e3fae;
  border: 2px solid #ffffff;
  border-radius: 50%;
}

.custom-handle:hover {
  background-color: #ff7c11;
}
</style>
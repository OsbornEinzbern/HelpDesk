<template>
  <div v-if="visible" class="info-modal-overlay" @click.self="close">
    <div class="info-modal" :style="{ width: width }">
      <div class="info-modal-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="close" title="Закрыть">
            <Icon :icon="uiIcons?.icons.close" class="close-btn-icon" width="30" height="30" />
        </button>
      </div>
      <div class="info-modal-body" v-html="content"></div>
      <div class="info-modal-footer">
        <button class="info-modal-btn" @click="close">Понятно</button>
      </div>
    </div>
  </div>
    <UIIcons ref="uiIcons" />
</template>

<script setup>
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'

const uiIcons = ref()
const visible = ref(false)
const title = ref('')
const content = ref('')
const width = ref('500px')

const open = (options) => {
  title.value = options.title || 'Информация'
  content.value = options.content || ''
  width.value = options.width || '500px'
  visible.value = true
}

const close = () => {
  visible.value = false
}

defineExpose({ open, close })
</script>

<style scoped>
.info-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2300;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.info-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #e0e0e0;
}

.info-modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.info-modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  transition: all 0.2s;
}

.info-modal-close:hover {
  color: #333;
}

.info-modal-body {
  padding: 20px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgb(138, 138, 138) rgba(0, 0, 0, 0);
  flex: 1;
}

.info-modal-body :deep(h4) {
  margin: 16px 0 8px 0;
  color: #192e43;
}

.info-modal-body :deep(h4:first-child) {
  margin-top: 0;
}

.info-modal-body :deep(p) {
  margin: 8px 0;
  line-height: 1.5;
  color: #555;
}

.info-modal-body :deep(ul) {
  margin: 8px 0;
  padding-left: 20px;
}

.info-modal-body :deep(li) {
  margin: 6px 0;
  line-height: 1.4;
  color: #555;
}

.info-modal-body :deep(.warning-box) {
  background: #fff3cd;
  border: 1px solid #ffecb5;
  border-radius: 8px;
  padding: 12px;
  margin: 16px 0 0 0;
  color: #856404;
}

.info-modal-footer {
  padding: 10px 14px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
}

.info-modal-btn {
  background: #2f81e5;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.info-modal-btn:hover {
  background: #216dba;
  transform: scale(1.02);
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  color: rgb(46, 46, 46);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin-left: 6px;
}

.close-btn:hover {
  transform: scale(1.1);
}

.close-btn-icon:hover {
  color: rgb(255, 19, 19);
}
</style>
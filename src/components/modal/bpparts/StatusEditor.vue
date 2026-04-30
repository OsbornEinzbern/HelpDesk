<template>
  <div class="status-editor" :class="{ 'view-mode': readonly }">
    <div class="org-grid">
      <div class="diagram-column">
        <div class="diagram-container">
          <VueFlow
            :nodes="nodes"
            :edges="edges"
            :node-types="nodeTypes"
            :default-zoom="1.4"
            :min-zoom="0.4"
            :max-zoom="3.7"
            :nodes-draggable="!readonly"
            :nodes-connectable="!readonly"
            :elements-selectable="!readonly"
            @connect="onConnect"
            @nodes-change="onNodesChange"
            @edges-change="onEdgesChange"
            @node-click="onNodeClick"
            @edge-click="onEdgeClick"
            @pane-click="onPaneClick"
            class="flow-diagram"
          >
            <Background pattern-color="#aaa" :gap="16" />
            <Controls />
          </VueFlow>
        </div>
      </div>

      <div class="details-column">
        <div class="editor-header">
          <h3>Редактор статусов</h3>
          <div class="header-buttons">
            <button class="info-btn" @click="showInfo" title="Подсказка" v-if="!readonly">
              <Icon :icon="uiIcons?.icons.info" class="info-btn-icon" width="24" height="24" />
            </button>
            <button v-if="!readonly && statusErrors.length" class="error-btn" @click="showErrors" title="Ошибки валидации">
              <Icon :icon="uiIcons?.icons.warning" width="20" height="20" />
              <span class="error-count">{{ statusErrors.length }}</span>
            </button>
          </div>
        </div>
        
        <div class="status-list-editor">
          <div 
            v-for="status in statuses" 
            :key="status.id"
            class="status-item-editor"
            :class="{ 'is-constant': isConstantStatus(status.id) }"
          >
            <div class="status-header">
              <div class="status-color" :style="{ backgroundColor: status.color }"></div>
              <!-- Режим редактирования -->
              <template v-if="!readonly">
                <UIInput
                  v-model="status.name"
                  :disabled="isNameLocked(status.id)"
                  placeholder="Название статуса"
                  :maxLength="30"
                  @update:model-value="onStatusNameChange(status, $event)"
                />
                <button 
                  v-if="!isConstantStatus(status.id)"
                  class="remove-status-btn" 
                  @click="removeStatus(status.id)"
                  title="Удалить статус"
                >
                  <Icon :icon="uiIcons?.icons.delete" width="20" height="20" />
                </button>
              </template>
              <!-- Режим просмотра -->
              <template v-else>
                <div class="status-name-view">{{ status.name }}</div>
              </template>
            </div>
            
            <div class="status-transitions-editor">
              <!-- Режим редактирования -->
              <template v-if="!readonly">
                <div class="transitions-group" v-if="status.name !== 'Создана'">
                  <label>Предыдущие статусы:</label>
                  <UIComboBox
                    v-model="status.previousStatusesIds"
                    :options="getAvailablePreviousStatuses(status.id)"
                    option-label="name"
                    option-value="id"
                    :multiple="true"
                    placeholder="Выберите предыдущие статусы"
                    @update:model-value="updatePreviousStatuses(status, $event)"
                  />
                </div>
                <div class="transitions-group">
                  <label>Следующие статусы:</label>
                  <UIComboBox
                    v-model="status.nextStatusesIds"
                    :options="getAvailableNextStatuses(status.id)"
                    option-label="name"
                    option-value="id"
                    :multiple="true"
                    placeholder="Выберите следующие статусы"
                    @update:model-value="updateNextStatuses(status, $event)"
                  />
                </div>
              </template>
              <!-- Режим просмотра -->
              <template v-else>
                <div class="transitions-group-view" v-if="getPreviousStatusesNames(status.id).length">
                  <label>Предыдущие статусы:</label>
                  <div class="transitions-value">{{ getPreviousStatusesNames(status.id).join(', ') }}</div>
                </div>
                <div class="transitions-group-view" v-if="getNextStatusesNames(status.id).length">
                  <label>Следующие статусы:</label>
                  <div class="transitions-value">{{ getNextStatusesNames(status.id).join(', ') }}</div>
                </div>
              </template>
            </div>
          </div>
          
          <button v-if="!readonly" class="add-status-btn" @click="addNewStatus">
            <Icon :icon="uiIcons?.icons.add" width="18" height="18" />
            Добавить статус
          </button>
        </div>
      </div>
    </div>
    <UIIcons ref="uiIcons" />

    <InfoNotification ref="infoNotification" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { VueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import UIInput from '@/components/common/UI/UIInput.vue'
import UIComboBox from '@/components/common/UI/UIComboBox.vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import InfoNotification from '@/components/notifications/InfoNotification.vue'
import DefaultNode from '@/components/modal/nodes/DefaultNode.vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  readonly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'validity-change'])

const uiIcons = ref()
const infoNotification = ref()

// Константные статусы
const CONSTANT_STATUSES = [
  { id: '1', name: 'Создана', color: '#4a90e2', isConstant: true, previousStatuses: [], nextStatuses: [] },
  { id: '2', name: 'Закрыта', color: '#16bd00', isConstant: true, previousStatuses: [], nextStatuses: [] }
]

const statuses = ref([])
const nextId = ref(3)
const nodes = ref([])
const edges = ref([])
const selectedNodeId = ref(null)
const selectedEdgeId = ref(null)

const nodeTypes = {
  default: DefaultNode,
}

// Генерация ID
function generateId() {
  return String(nextId.value++)
}

// Инициализация статусов
function initializeStatuses() {
  if (props.modelValue && props.modelValue.length) {
    statuses.value = JSON.parse(JSON.stringify(props.modelValue))
    const maxId = Math.max(...statuses.value.map(s => {
      const match = s.id.match(/\d+/)
      return match ? parseInt(match[0]) : 0
    }), 2)
    nextId.value = maxId + 1
  } else {
    statuses.value = JSON.parse(JSON.stringify(CONSTANT_STATUSES))
  }
  statuses.value.forEach(status => {
    status.previousStatusesIds = status.previousStatuses || []
    status.nextStatusesIds = status.nextStatuses || []
    if (!status.position) {
      status.position = getDefaultPosition(status.id)
    }
  })
  updateDiagram()
}

// Обновление диаграммы
function updateDiagram() {
  const newNodes = []
  const newEdges = []
  const addedEdges = new Set()
  
  statuses.value.forEach(status => {
    const isSelected = selectedNodeId.value === status.id
    let showTarget = true
    let showSource = true
    let widthC = 200
    
    if (status.name === 'Создана') {
      showTarget = false
      widthC = 160
    }
    
    newNodes.push({
      id: status.id,
      position: status.position || getDefaultPosition(status.id),
      width: widthC,
      style: {
        backgroundColor: status.color || '#4a90e2',
        color: '#fff',
        border: `2px solid ${isSelected ? '#f39c12' : (status.color || '#4a90e2')}`,
        borderRadius: '6px',
        textAlign: 'center',
        alignItems: 'center',
        fontSize: '16px',
        fontWeight: '500',
        boxShadow: isSelected ? '0 0 0 3px rgba(243, 156, 18, 0.3)' : 'none',
      },
      data: {
        ...status,
        label: status.name,
        color: status.color,
        showTargetHandle: !props.readonly && showTarget,
        showSourceHandle: !props.readonly && showSource
      },
    })
  })
  
  statuses.value.forEach(status => {
    if (status.nextStatuses && Array.isArray(status.nextStatuses)) {
      status.nextStatuses.forEach(nextStatusId => {
        const edgeKey = `${status.id}-${nextStatusId}`
        if (!addedEdges.has(edgeKey)) {
          addedEdges.add(edgeKey)
          const isSelected = selectedEdgeId.value === edgeKey
          
          newEdges.push({
            id: edgeKey,
            source: status.id,
            target: nextStatusId,
            type: 'smoothstep',
            animated: false,
            markerEnd: {
              type: MarkerType.Arrow,
              width: 14,
              height: 14,
              color: status.color,
            },
            style: { 
              stroke: status.color, 
              strokeWidth: isSelected ? 4 : 3,
              transition: 'all 0.02s'
            },
            label: '',
            labelStyle: { fill: '#212121', fontSize: 11 }
          })
        }
      })
    }
  })
  
  nodes.value = newNodes
  edges.value = newEdges
  
  if (!props.readonly) {
    validate()
  }
}

// Позиция по умолчанию
function getDefaultPosition(statusId) {
  const id = typeof statusId === 'string' ? parseInt(statusId) : statusId
  if (id === 1) return { x: 50, y: 50 }
  if (id === 2) return { x: 750, y: 450 }
  if (id > 10) {
    return { x: 920, y: (id - 9) * 30 }
  } else {
    return { x: 750, y: id * 30 }
  }
}

// Валидация статусов
const statusErrors = ref([])

function validate() {
  if (props.readonly) {
    statusErrors.value = []
    emit('validity-change', true)
    return true
  }
  
  const errors = []
  
  // Проверка названий
  const names = statuses.value.map(s => s.name?.trim().toLowerCase()).filter(Boolean)
  if (names.length !== new Set(names).size) {
    errors.push('Названия статусов должны быть уникальными')
  }
  
  // Проверка на пустые названия
  if (statuses.value.some(s => !s.name || !s.name.trim())) {
    errors.push('Все статусы должны иметь названия')
  }
  
  // Проверка связей
  for (const status of statuses.value) {
    const hasPrevious = status.previousStatuses && status.previousStatuses.length > 0
    const hasNext = status.nextStatuses && status.nextStatuses.length > 0
    
    if (status.name === 'Создана') {
      if (!hasNext) errors.push(`У статуса "${status.name}" должна быть хотя бы одна исходящая связь`)
    } else if (status.name === 'Закрыта') {
      if (!hasPrevious) errors.push(`У статуса "${status.name}" должна быть хотя бы одна входящая связь`)
    } else {
      if (!hasPrevious || !hasNext) {
        errors.push(`Статус "${status.name}" должен иметь и входящие, и исходящие связи`)
      }
    }
  }
  
  // Проверка что только "Закрыта" конечный
  for (const status of statuses.value) {
    if (status.name !== 'Закрыта' && (!status.nextStatuses || status.nextStatuses.length === 0)) {
      errors.push(`Только статус "Закрыта" может быть конечным. Статус "${status.name}" не имеет исходящих связей`)
      break
    }
  }
  
  statusErrors.value = errors
  const isValid = errors.length === 0
  emit('validity-change', isValid)
  return isValid
}

// Показать ошибки в модальном окне
function showErrors() {
  if (statusErrors.value.length === 0) return
  
  infoNotification.value.open({
    title: 'Ошибки валидации статусов',
    content: `
      <div class="error-list">
        ${statusErrors.value.map(error => `<div class="error-item-modal">⚠️ ${error}</div>`).join('')}
      </div>
    `,
    type: 'error',
    width: '500px'
  })
}

// Показать подсказку
function showInfo() {
  infoNotification.value.open({
    title: 'Как создать бизнес процесс',
    content: `
      <div class="info-content">
        <h4>Что такое бизнес процесс?</h4>
        <p>Бизнес процесс - это последовательность статусов, через которые проходит заявка от создания до закрытия.</p>
        
        <h4>Правила создания:</h4>
        <ul>
          <li><strong>Создана</strong> - начальный статус (не может иметь входящих связей)</li>
          <li><strong>Закрыта</strong> - конечный статус</li>
          <li>Каждый промежуточный статус должен иметь <strong>как входящие, так и исходящие связи</strong></li>
          <li>У статуса <strong>"Создана"</strong> должна быть хотя бы одна исходящая связь</li>
          <li>У статуса <strong>"Закрыта"</strong> должна быть хотя бы одна входящая связь</li>
          <li><strong>Только "Закрыта"</strong> может быть конечным статусом</li>
          <li><strong>Для возврата</strong> заявки в работу нужно указать переход с "Закрыта" на промежуточный статус</li>
          <li>Названия статусов должны быть <strong>уникальными</strong></li>
          <li>Все статусы должны иметь названия</li>
        </ul>
        
        <h4>Как редактировать:</h4>
        <ul>
          <li>📝 <strong>Кликните на статус</strong> на диаграмме, чтобы выделить его</li>
          <li>🔗 <strong>Перетащите</strong> из правого кружка одного статуса в левый кружок другого, чтобы создать связь</li>
          <li>❌ <strong>Кликните на связь</strong> и нажмите Backspace, чтобы удалить</li>
          <li>✏️ <strong>Изменить название</strong> можно в панели справа</li>
          <li>🎨 <strong>Цвет</strong> генерируется автоматически из названия</li>
          <li>🗑️ <strong>Удалить статус</strong> можно кнопкой корзины</li>
          <li>📦 <strong>Переместить статус</strong> можно перетаскивая его на диаграмме</li>
        </ul>
        
        <div class="warning-box">
          ⚠️ <strong>Важно:</strong> Без правильно настроенных связей бизнес процесс не сможет работать!
        </div>
      </div>
    `,
    type: 'info',
    width: '600px'
  })
}

// Обработчики изменений
function onStatusNameChange(status, newValue) {
  if (props.readonly) return
  
  const trimmedName = newValue?.trim()
  if (!trimmedName) return
  
  const duplicate = statuses.value.find(s => s.id !== status.id && s.name?.trim().toLowerCase() === trimmedName.toLowerCase())
  if (duplicate) {
    status.name = `${trimmedName} 1`
  } else {
    status.name = trimmedName
  }
  
  updateNodeLabelAndColor(status)
  validate()
  emitUpdate()
}

function updatePreviousStatuses(status, selectedObjects) {
  if (props.readonly) return
  
  const newPreviousStatuses = selectedObjects.map(obj => String(obj.id))
  
  const removedStatuses = status.previousStatuses?.filter(id => !newPreviousStatuses.includes(id)) || []
  removedStatuses.forEach(removedId => {
    const removedStatus = statuses.value.find(s => s.id === removedId)
    if (removedStatus?.nextStatuses) {
      const index = removedStatus.nextStatuses.indexOf(status.id)
      if (index !== -1) {
        removedStatus.nextStatuses.splice(index, 1)
        removedStatus.nextStatusesIds = [...removedStatus.nextStatuses]
      }
    }
  })
  
  const addedStatuses = newPreviousStatuses.filter(id => !status.previousStatuses?.includes(id))
  addedStatuses.forEach(addedId => {
    const addedStatus = statuses.value.find(s => s.id === addedId)
    if (addedStatus) {
      if (!addedStatus.nextStatuses) addedStatus.nextStatuses = []
      if (!addedStatus.nextStatuses.includes(status.id)) {
        addedStatus.nextStatuses.push(status.id)
        addedStatus.nextStatusesIds = [...addedStatus.nextStatuses]
      }
    }
  })
  
  status.previousStatuses = newPreviousStatuses
  updateDiagram()
  validate()
  emitUpdate()
}

function updateNextStatuses(status, selectedObjects) {
  if (props.readonly) return
  
  const newNextStatuses = selectedObjects.map(obj => String(obj.id))
  
  const removedStatuses = status.nextStatuses?.filter(id => !newNextStatuses.includes(id)) || []
  removedStatuses.forEach(removedId => {
    const removedStatus = statuses.value.find(s => s.id === removedId)
    if (removedStatus?.previousStatuses) {
      const index = removedStatus.previousStatuses.indexOf(status.id)
      if (index !== -1) {
        removedStatus.previousStatuses.splice(index, 1)
        removedStatus.previousStatusesIds = [...removedStatus.previousStatuses]
      }
    }
  })
  
  const addedStatuses = newNextStatuses.filter(id => !status.nextStatuses?.includes(id))
  addedStatuses.forEach(addedId => {
    const addedStatus = statuses.value.find(s => s.id === addedId)
    if (addedStatus) {
      if (!addedStatus.previousStatuses) addedStatus.previousStatuses = []
      if (!addedStatus.previousStatuses.includes(status.id)) {
        addedStatus.previousStatuses.push(status.id)
        addedStatus.previousStatusesIds = [...addedStatus.previousStatuses]
      }
    }
  })
  
  status.nextStatuses = newNextStatuses
  updateDiagram()
  validate()
  emitUpdate()
}

// Доступные статусы для переходов
function getAvailablePreviousStatuses(currentStatusId) {
  if (!statuses.value.length) return []
  const currentStatus = statuses.value.find(s => s.id === currentStatusId)
  if (currentStatus?.name === 'Создана') return []
  
  return statuses.value
    .filter(s => s.id !== currentStatusId && s.name !== 'Создана')
    .map(s => ({ name: s.name, id: s.id }))
}

function getAvailableNextStatuses(currentStatusId) {
  if (!statuses.value.length) return []
  const currentStatus = statuses.value.find(s => s.id === currentStatusId)
  
  return statuses.value
    .filter(s => s.id !== currentStatusId && s.name !== 'Создана')
    .map(s => ({ name: s.name, id: s.id }))
}

// Вспомогательные функции для режима просмотра
function getPreviousStatusesNames(statusId) {
  const status = statuses.value.find(s => s.id === statusId)
  if (!status || !status.previousStatuses) return []
  return status.previousStatuses.map(prevId => {
    const prevStatus = statuses.value.find(s => s.id === prevId)
    return prevStatus ? prevStatus.name : ''
  }).filter(Boolean)
}

function getNextStatusesNames(statusId) {
  const status = statuses.value.find(s => s.id === statusId)
  if (!status || !status.nextStatuses) return []
  return status.nextStatuses.map(nextId => {
    const nextStatus = statuses.value.find(s => s.id === nextId)
    return nextStatus ? nextStatus.name : ''
  }).filter(Boolean)
}

// Добавление/удаление статусов
function addNewStatus() {
  if (props.readonly) return
  
  const baseName = 'Новый статус'
  let newStatusName = baseName
  let counter = 1
  while (statuses.value.some(s => s.name === newStatusName)) {
    counter++
    newStatusName = `${baseName} ${counter}`
  }
  
  const usedColors = statuses.value.map(s => s.color).filter(c => c)
  const newId = generateId()
  const newStatus = {
    id: newId,
    name: newStatusName,
    color: getColorFromName(newStatusName, usedColors),
    position: getDefaultPosition(parseInt(newId)),
    isConstant: false,
    previousStatuses: [],
    nextStatuses: [],
    previousStatusesIds: [],
    nextStatusesIds: []
  }
  statuses.value.push(newStatus)
  updateDiagram()
  validate()
  emitUpdate()
}

function removeStatus(statusId) {
  if (props.readonly) return
  if (isConstantStatus(statusId)) return
  
  statuses.value.forEach(status => {
    if (status.previousStatuses) {
      status.previousStatuses = status.previousStatuses.filter(id => id !== statusId)
    }
    if (status.nextStatuses) {
      status.nextStatuses = status.nextStatuses.filter(id => id !== statusId)
    }
  })
  
  const index = statuses.value.findIndex(s => s.id === statusId)
  if (index !== -1) {
    statuses.value.splice(index, 1)
  }
  
  updateDiagram()
  validate()
  emitUpdate()
}

// Vue Flow обработчики
function onConnect(connection) {
  if (props.readonly) return
  
  const { source, target } = connection
  const sourceStatus = statuses.value.find(s => String(s.id) === String(source))
  const targetStatus = statuses.value.find(s => String(s.id) === String(target))
  
  if (!sourceStatus || !targetStatus) return
  if (targetStatus.name === 'Создана') return
  if (source === target) return
  if (sourceStatus.nextStatuses?.includes(target)) return
  
  if (!sourceStatus.nextStatuses) sourceStatus.nextStatuses = []
  if (!targetStatus.previousStatuses) targetStatus.previousStatuses = []
  
  if (!sourceStatus.nextStatuses.includes(target)) {
    sourceStatus.nextStatuses.push(target)
  }
  if (!targetStatus.previousStatuses.includes(source)) {
    targetStatus.previousStatuses.push(source)
  }
  
  sourceStatus.nextStatusesIds = [...sourceStatus.nextStatuses]
  targetStatus.previousStatusesIds = [...targetStatus.previousStatuses]
  
  updateDiagram()
  validate()
  emitUpdate()
}

function onNodesChange(changes) {
  if (props.readonly) return
  
  changes.forEach(change => {
    if (change.type === 'position' && change.id) {
      const status = statuses.value.find(s => s.id === change.id)
      if (status && change.position) {
        status.position = { x: change.position.x, y: change.position.y }
      }
    }
  })
}

function onEdgesChange(changes) {
  if (props.readonly) return
  
  changes.forEach(change => {
    if (change.type === 'remove') {
      const removedEdge = edges.value.find(e => e.id === change.id)
      if (removedEdge) {
        const sourceStatus = statuses.value.find(s => s.id === removedEdge.source)
        const targetStatus = statuses.value.find(s => s.id === removedEdge.target)
        
        if (sourceStatus?.nextStatuses) {
          const index = sourceStatus.nextStatuses.indexOf(removedEdge.target)
          if (index !== -1) {
            sourceStatus.nextStatuses.splice(index, 1)
            sourceStatus.nextStatusesIds = [...sourceStatus.nextStatuses]
          }
        }
        if (targetStatus?.previousStatuses) {
          const index = targetStatus.previousStatuses.indexOf(removedEdge.source)
          if (index !== -1) {
            targetStatus.previousStatuses.splice(index, 1)
            targetStatus.previousStatusesIds = [...targetStatus.previousStatuses]
          }
        }
        updateDiagram()
        validate()
        emitUpdate()
      }
    }
  })
}

function onNodeClick({ id }) {
  if (props.readonly) return
  selectedNodeId.value = id
  selectedEdgeId.value = null
  updateDiagram()
}

function onEdgeClick(edge) {
  if (props.readonly) return
  selectedEdgeId.value = edge.id
  selectedNodeId.value = null
  updateDiagram()
}

function onPaneClick() {
  if (props.readonly) return
  selectedNodeId.value = null
  selectedEdgeId.value = null
  updateDiagram()
}

function updateNodeLabelAndColor(status) {
  const nodeIndex = nodes.value.findIndex(n => String(n.id) === String(status.id))
  if (nodeIndex !== -1) {
    const otherColors = statuses.value
      .filter(s => String(s.id) !== String(status.id))
      .map(s => s.color)
      .filter(c => c)
    
    nodes.value[nodeIndex].data.label = status.name
    const newColor = getColorFromName(status.name, otherColors)
    nodes.value[nodeIndex].data.color = newColor
    status.color = newColor
    nodes.value = [...nodes.value]
  }
}

function getColorFromName(name, usedColors = []) {
  if (!name) return '#4a90e2'
  
  const colors = [
    '#1caae2', '#1ec35d', '#938900', '#8d00c5', '#16bd00', '#bd0000',
    '#ce1f79', '#2438cd', '#3c3b67', '#dc3000', '#17b289', '#a6d000',
    '#960943', '#974c07', '#e48c08', '#d2c100', '#4d14b6', '#72cc0b',
  ]
  
  if (usedColors.length === 0 || usedColors.length >= colors.length) {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i)
    }
    return colors[Math.abs(hash) % colors.length]
  }
  
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
  }
  
  let colorIndex = Math.abs(hash) % colors.length
  let selectedColor = colors[colorIndex]
  let attempts = 0
  
  while (usedColors.includes(selectedColor) && attempts < colors.length * 2) {
    colorIndex = (colorIndex + 1) % colors.length
    selectedColor = colors[colorIndex]
    attempts++
  }
  
  return selectedColor
}

function isConstantStatus(statusId) {
  return statusId === '1' || statusId === '2'
}

function isNameLocked(statusId) {
  return statusId === '1' || statusId === '2'
}

function emitUpdate() {
  if (props.readonly) return
  
  const dataToSave = statuses.value.map(({ id, name, color, position, previousStatuses, nextStatuses, isConstant }) => ({
    id, name, color, position: position || null,
    previousStatuses: previousStatuses || [],
    nextStatuses: nextStatuses || [],
    is_constant: isConstant || false
  }))
  emit('update:modelValue', dataToSave)
}

// Сброс формы
function resetForm() {
  if (props.readonly) return
  statuses.value = JSON.parse(JSON.stringify(CONSTANT_STATUSES))
  nextId.value = 3
  updateDiagram()
  validate()
  emitUpdate()
}

defineExpose({
  validate,
  resetForm,
  getStatuses: () => statuses.value,
  setStatuses: (data) => {
    if (data && data.length) {
      statuses.value = JSON.parse(JSON.stringify(data))
      const maxId = Math.max(...statuses.value.map(s => {
        const match = s.id.match(/\d+/)
        return match ? parseInt(match[0]) : 0
      }), 2)
      nextId.value = maxId + 1
      updateDiagram()
      if (!props.readonly) validate()
    }
  }
})

// Инициализация
onMounted(() => {
  initializeStatuses()
})

// Следим за изменением readonly
watch(() => props.readonly, () => {
  updateDiagram()
})
</script>

<style scoped>

.colors{
  color: #1caae2;
  color: #1ec35d;
  color: #938900;
  color: #8d00c5;
  color: #16bd00;
  color: #bd0000;
  color: #ce1f79;
  color: #2438cd;
  color: #3c3b67;
  color: #dc3000;
  color: #e48c08;
  color: #a6d000;
  color: #960943;
  color: #974c07;
  color: #17b289;
  color: #d2c100;
  color: #4d14b6;
  color: #72cc0b;
}

.org-modal-backdrop {
  position: fixed; 
  inset: 0; 
  z-index: 2200; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  background: rgba(0,0,0,0.45);
}

.org-modal {
  width: 90%; 
  max-width: 1400px;
  height: 85vh;
  max-height: 85vh;
  overflow-y: hidden;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 30px 80px rgba(3,20,50,0.35);
  display: flex;
  flex-direction: column;
}

.org-modal__body {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.modal-header {
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 15;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 20px;
  border-bottom: 2px solid #969696;
  border-radius: 12px 12px 0 0;
}

.modal-title {
  font-size: 18px;
  margin: 0;
  color: #0b1630;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-btn {
  background: rgba(234, 234, 234, 0.1);
  color: rgb(46, 46, 46);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.info-btn:hover {
  transform: scale(1.05);
}

.info-btn-icon:hover {
  color: rgb(99, 99, 99);
}

.org-grid {
  display: grid;
  grid-template-columns: 10fr 3fr;
  gap: 12px;
  min-height: calc(60vh);
}

.diagram-column {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: #fafafa;
  max-height: calc(75vh);
}

.diagram-container {
  width: 100%;
  height: calc(75vh);
  min-height: 0;
}

.flow-diagram {
  width: 100%;
  height: 100%;
  min-height: calc(60vh);
  background: #fafafa;
}

.header-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.details-column {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  background: white;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgb(138, 138, 138) rgba(0, 0, 0, 0);
  min-height: calc(60vh);
  max-height: calc(75vh);
  display: flex;
  flex-direction: column;
}

.status-info h3,
.status-editor h3 {
  margin: 0 0 6px 0;
  font-size: 16px;
  color: #333;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  margin-bottom: 10px;
}

.editor-header h3 {
  margin: 0;
  font-size: 16px;
  line-height: 24px;
}

.add-status-btn {
  background: none;
  display: flex;
  text-align: center;
  align-items: center;
  justify-content: center;
  border: 1px dashed #178aee;
  color: #178aee;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.add-status-btn:hover {
  border-color: #2478d1;
  background-color: #e2f0ff;
  color: #2478d1;
}

.status-list-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item-view {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: all 0.2s;
}

.status-item-view:hover {
  background: #e9ecef;
  transform: translateX(4px);
}

.status-badge {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
  font-size: 16px;
  flex-shrink: 0;
}

.status-details {
  flex: 1;
}

.status-name {
  font-weight: 600;
  color: #212121;
  margin-bottom: 4px;
}

.status-transitions {
  font-size: 12px;
  color: #666;
}

.transitions-label {
  display: inline-block;
  margin-right: 12px;
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-list-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.status-item-editor {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  background: #f8f9fa;
  transition: all 0.2s;
}

.status-color-picker {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #ddd;
  cursor: pointer;
  flex-shrink: 0;
}

.status-color-picker:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.status-color {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid #ddd;
}

.status-header :deep(.ui-input-wrapper) {
  flex: 1;
}

.status-header :deep(.ui-input-field) {
  height: 32px !important;
  min-height: 32px !important;
}

.remove-status-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  color: #dc3545;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.remove-status-btn:hover {
  background: rgba(220, 53, 69, 0.1);
  transform: scale(1.05);
}

.status-transitions-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.transitions-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.transitions-group label {
  font-size: 12px;
  font-weight: 600;
  color: #555;
}

.btn {
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid rgba(0,0,0,0.08);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
}

.btn:hover {
  transform: scale(1.03);
}

.btn.danger { 
  background: #ef4444; 
  color: #fff; 
  border: none; 
}

.error-btn {
  background: rgba(239, 131, 68, 0.1);
  color: #ef9144;
  border: 1px solid #ef7544;
  border-radius: 20px;
  padding: 4px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.error-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  transform: scale(1.02);
}

.error-count {
  font-weight: 600;
  background: #ef8b44;
  color: white;
  border-radius: 12px;
  padding: 0 6px;
  font-size: 11px;
  line-height: 18px;
}

.org-modal__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-top: 16px;
  margin-top: auto;
}

.right-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

@media (max-width: 1200px) {
  .org-grid {
    grid-template-columns: 1fr;
  }
  
  .org-modal {
    width: calc(100% - 24px);
  }
  
  .diagram-container {
    min-height: 400px;
  }
  
  .flow-diagram {
    min-height: 400px;
  }
}
</style>
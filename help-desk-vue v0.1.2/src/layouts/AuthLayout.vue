<!-- src/layouts/AuthLayout.vue -->
<template>
  <div class="auth-layout">
    <CommonHeader>
      <template #default>Авторизация</template>
      <template #breadcrumbs><slot name="breadcrumbs" /></template>
      <template #actions><slot name="headerActions" /></template>
    </CommonHeader>

    <main class="auth-main">
      <slot />
    </main>
  </div>
</template>

<script setup>
import CommonHeader from '@/components/common/AppLayout/CommonHeader.vue'
</script>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f7fafc;
}

/* Контент выравнивается по верхнему краю, не по центру */
.auth-main {
  margin-top: 72px; /* учитывать фиксированную шапку */
  display: flex;
  justify-content: center; /* горизонтально центрируем карточку */
  align-items: flex-start;  /* ВАЖНО: выравнивание по верхнему краю */
  padding: 32px;
  box-sizing: border-box;
}
</style>

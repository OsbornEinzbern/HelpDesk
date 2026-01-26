<template>
  <!-- Используем AdminLayout для всех страниц -->
  <AdminLayout>
    <RouterView />
  </AdminLayout>
</template>

<script setup>
import AdminLayout from '@/layouts/AdminLayout.vue'
</script>

<style>
/* Импорт глобальных стилей */
@import '@/assets/styles/main.css';
</style>

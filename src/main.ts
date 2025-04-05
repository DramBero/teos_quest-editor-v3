
import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import Vue3DraggableResizable from 'vue3-draggable-resizable';
import 'vue3-draggable-resizable/dist/Vue3DraggableResizable.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(Vue3DraggableResizable);

app.mount('#app');

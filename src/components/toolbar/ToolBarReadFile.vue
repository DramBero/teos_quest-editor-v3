<template>
  <div class="text-reader__wrapper" :class="{ 'text-reader__wrapper_dep': dep }">
    <label class="text-reader">
      <input type="file" accept=".esp,.esm" @change="loadTextFromFile" />
      {{ !dep ? 'Load active plugin' : 'Load dependency' }}
    </label>
    {{ !dep ? getActivePluginName : fileName }}
    {{ fileSize || '' }}
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import init, { load_objects } from '@/tes3_wasm/tes3_wasm.js';
import { importPlugin } from '@/api/idb.js';

interface Props {
  dep?: string;
}
const props = defineProps<Props>();

const fileName = ref<string>('');
const fileSize = ref<string | null>(null);

const getActivePluginName = computed(() => {
  return 'test';
  // return this.$store.getters['getActiveHeader'].TMP_dep;
})

function formatBytes(bytes: number, decimals: number = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

onMounted(async () => {
  await init();
})

async function loadTextFromFile(event: InputEvent) {
  try {
    const element = event.target as HTMLInputElement;
    if (!element.files) return;
    const file: FileList = element.files;
    if (!file.length) return;
    const buffer = await file[0].arrayBuffer();
    fileSize.value = formatBytes(file[0].size);
    fileName.value = file[0].name;
    const bytes = new Uint8Array(buffer);
    const objects = await load_objects(bytes);
    if (!props.dep) {
      importPlugin(objects, fileName.value, true);
    }
  } catch (error) {
    console.error(error);
  }
}

/* export default {
  methods: {
    loadTextFromFile(ev) {
      const file = ev.target.files[0];
      this.fileName = ev.target.files[0].name;
      if (!this.dep) this.$store.commit('setActivePluginTitle', this.fileName.split('.')[0]);
      this.fileSize = this.formatBytes(ev.target.files[0].size);
      const reader = new FileReader();
      reader.onprogress = (e) => {
        //console.log(e.loaded, e.total)
      };
      reader.onload = (e) => {
        // TEST ENCODING

        var legacy = require('legacy-encoding');

        let plugin = legacy.decode(e.target.result, 'cp1251', {mode: 'replacement'})

        const { encode, decode } = require('single-byte');
 
        const buffer = encode('windows-1252', e.target.result);
        const plugin = decode('windows-1251', buffer)


        console.log(plugin)

        // TEST ENCODING

        let plugin = e.target.result;

        if (!this.dep) {
          this.$store.dispatch('parseLocalPlugin', [JSON.parse(plugin), this.fileName]);
        } else {
          this.$store.dispatch('parseDependency', [JSON.parse(plugin), this.dep]);
        }
      };
      reader.readAsText(file);
    },
  },
}; */
</script>

<style lang="scss">
input[type='file'] {
  display: none;
}
.text-reader {
  &__wrapper {
    display: flex;
    gap: 15px;
    align-items: center;
    flex-direction: row-reverse;
    justify-content: space-between;
  }
  cursor: pointer;
  background: rgba(0, 0, 0, 0.65);
  color: rgb(202, 165, 96);
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding: 10px 15px;
  border-radius: 4px;
  transition: all 0.1s ease-in;
  &:hover {
    color: white;
    .add-quest__button {
      fill: white;
    }
  }
  &__button {
    transition: all 0.1s ease-in;
    fill: rgb(202, 165, 96);
  }
}
</style>

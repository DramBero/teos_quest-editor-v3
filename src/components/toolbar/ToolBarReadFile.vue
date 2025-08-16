<template>
  <div class="text-reader__wrapper" :class="{ 'text-reader__wrapper_dep': dep }">
    <button class="text-reader" @click="handleDelete">
      <span v-if="loaded">Delete</span>
      <SVGSpinners90RingWithBg v-else/>
    </button>
    <label class="text-reader">
      <input type="file" accept=".esp,.esm" @change="loadTextFromFile" :disabled="!loaded"/>
      <span v-if="loaded">
        {{ isDepLoaded ? 'Change' : 'Load' }}
      </span>
      <span v-else>{{ stage }}<SVGSpinners90RingWithBg /></span>
    </label>
    {{ isDepLoaded ? 'Loaded' : 'Not loaded' }}
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import init, { load_objects } from '@/tes3_wasm/tes3_wasm.js';
import { importPlugin, getActiveHeader, getHeader, deleteDB } from '@/api/idb.js';
import { usePluginHeader } from '@/stores/pluginHeader';
import SVGSpinners90RingWithBg from '~icons/svg-spinners/90-ring-with-bg';
import { useReloadTrigger } from '@/stores/reloadTrigger';

interface Props {
  dep?: string;
}
const props = defineProps<Props>();

const deleteLoaded = ref<boolean>(true);
async function handleDelete() {
  loaded.value = false;
  await deleteDB(props.dep || 'activePlugin');
  loaded.value = true;
}

const fileName = ref<string>('');
const fileSize = ref<string | null>(null);

const loaded = ref<boolean>(true);



const isDepLoaded = ref<boolean>(false);
watch(loaded, async (newValue) => {
  if (newValue === true) {
    try {
      const response = await getHeader(props.dep || 'activePlugin');
      isDepLoaded.value = Boolean(response);
    } catch (error) {
      console.error(error);
    }
  } else {
    isDepLoaded.value = false;
  }
}, {
  immediate: true,
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

const headerStore = usePluginHeader();
const stage = ref<string>('');

const reloadTriggerStore = useReloadTrigger();
async function loadTextFromFile(event: InputEvent) {
  try {
    stage.value = '0%';
    loaded.value = false;
    const element = event.target as HTMLInputElement;
    if (!element.files) return;
    const file: FileList = element.files;
    if (!file.length) return;
    fileSize.value = formatBytes(file[0].size);
    stage.value = '10%';
    fileName.value = file[0].name;

    const buffer = await file[0].arrayBuffer();
    stage.value = '80%';
    const bytes = new Uint8Array(buffer);
    stage.value = '85%';
    const objects = await load_objects(bytes);
    stage.value = '90%';

    if (!props.dep) {
      await importPlugin(objects, fileName.value, true);
      stage.value = '98%';
      const headerResponse = await getActiveHeader();
      headerStore.setPluginHeader(headerResponse);
    } else {
      await importPlugin(objects, props.dep, false);
    }
    reloadTriggerStore.triggerReload();
    stage.value = '';
  } catch (error) {
    console.error(error);
  } finally {
    loaded.value = true;
  }
}

const getActivePluginName = computed(() => {
  return headerStore.getPluginHeader?.TMP_dep || '';
})

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
  &__wrapper {
    display: flex;
    gap: 15px;
    align-items: center;
    flex-direction: row-reverse;
    justify-content: space-between;
  }
  &__button {
    transition: all 0.1s ease-in;
    fill: rgb(202, 165, 96);
  }
}
</style>

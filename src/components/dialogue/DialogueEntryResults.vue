<template>
  <div v-if="code">
    <div class="results" :class="{ results_lua: language === 'Lua (MWSE)' }">
      <span class="script-language" :class="{ 'script-language_lua': language === 'Lua (MWSE)' }">{{
        language
      }}</span>
      <CodeEditor
        v-model="luaCode"
        :read_only="!editMode"
        :hide_header="true"
        :height="'100%'"
        :width="'100%'"
        font_size="14px"
        :border_radius="'0'"
      >
      </CodeEditor>
      <!--       <prism-editor
        class="editor-code"
        v-model="luaCode"
        :readonly="!editMode"
        :wordwrap="false"
        :highlight="language === 'Lua' ? highlighterLua : highlighterBasic"
        lineNumbers
      ></prism-editor> -->
    </div>
  </div>
</template>

<script>
import hljs from 'highlight.js';
import CodeEditor from 'simple-code-editor';

export default {
  components: {
    CodeEditor,
  },
  props: {
    code: {
      type: String,
    },
    language: {
      type: String,
    },
    editMode: {
      type: Boolean,
    },
  },
  data() {
    return {
      luaCode: '',
    };
  },
  beforeMount() {
    this.luaCode = this.code;
  },
  methods: {
    highlighterLua(code) {
      return highlight(code, languages.lua);
    },
    highlighterBasic(code) {
      return highlight(code, languages.javascript);
    },
  },
};
</script>

<style lang="scss">
.editor-code {
  .prism-editor {
    &__line-numbers {
      padding-right: 10px;
    }
  }
}
.results {
  border: 1px solid rgba(170, 169, 98, 0.5);
  font-family: 'Consolas';
  background: rgb(32, 32, 22);
  //line-height: 20px;
  position: relative;
  //overflow-x: scroll;
  //white-space: pre-line;
  min-width: 50%;
  border-radius: 4px;
  font-size: 12px;
  padding: 0px;
  margin: 10px 30px;
  &:focus {
    background: rgb(59, 59, 59);
  }
  &_lua {
    border: 1px solid rgba(98, 150, 170, 0.5);
    background: rgb(17, 30, 36);
    .dialogue-answers-answer-results__result {
      color: rgb(159, 169, 223);
    }
  }
  &__result {
    overflow-x: scroll;
    display: block;
    padding: 0 10px;
  }
}

.script-language {
  background: rgba(170, 169, 98, 0.2);
  width: 100%;
  display: block;
  color: rgb(237, 238, 167);
  padding: 5px 10px;
  //margin-bottom: 5px;
  font-size: 16px;
  font-weight: 500;
  &_lua {
    color: rgb(167, 236, 238);
    background: rgba(98, 150, 170, 0.2);
  }
}
</style>

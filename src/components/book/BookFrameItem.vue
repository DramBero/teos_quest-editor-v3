<template>
  <div class="book">
    <div class="book-title" @click="toggleCollapse">
      {{ book.name }}
    </div>
    <div v-show="isCollapsed">
      <div class="book-entry">
        <div class="book-entry__text" v-html="book.text"></div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    book: Object,
  },
  data() {
    return {
      isCollapsed: false,
    };
  },
  methods: {
    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
    },
  },
};
</script>

<style lang="scss">
button,
input[type='submit'],
input[type='reset'] {
  background: none;
  color: inherit;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  outline: inherit;
}

.book {
  font-family: 'Pelagiad', 'Sans serif';
  border-radius: 8px;
  line-height: 23px;
  font-size: 20px;
  padding: 15px;
  margin: 5px;
  background-color: rgba(255, 255, 255, 0.3);

  &-title {
    color: rgb(150, 50, 30);
    width: 100%;
    font-size: 23px;
    text-align: left;
    user-select: none;
    padding: 5px 0 8px 0;

    &:hover {
      color: rgb(180, 80, 60);
    }
  }

  &-entry {
    background-color: rgba(255, 255, 255, 0.5);
    // border-radius: 8px;
    // margin: 5px 0;
    display: flex;

    &_finished {
      background-color: rgba(145, 215, 145, 0.5);
    }

    &__text {
      flex-grow: 1;
      padding: 10px;
    }

    &__index {
      min-width: 50px;
      max-width: 50px;
      background-color: rgba(255, 255, 255, 0.3);
      border-radius: 0 8px 8px 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}
</style>

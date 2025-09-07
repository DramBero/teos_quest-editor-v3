<template>
  <div class="magic-effects">
    <div 
      v-for="effect, effectIndex in props.effects"
      :key="effectIndex"
      class="magic-effect"
    >
      <div class="magic-effect-left">
        <div class="magic-effect__name">
          {{ effect.magic_effect }}
          <div class="magic-effect__range">
            - {{ effect.range.replace('On', '') }}
          </div>
        </div>
        <span v-if="effect.attribute && effect.attribute !== 'None'" class="magic-effect__attribute">
          {{ effect.attribute }}
        </span>
        <span v-if="effect.skill && effect.skill !== 'None'" class="magic-effect__attribute">
          {{ effect.skill }}
        </span>
      </div>
      <div class="magic-effect-right">
        <div class="magic-effect__stat">
          <GameIconsSandsOfTime />
          {{ effect.duration }}s
        </div>
        <div class="magic-effect__stat">
          <GameIconsPowerLightning />
          {{ getMagnitude(effect) }}
        </div>
        <div class="magic-effect__stat" v-if="effect.area">
          <GameIconsCircle />
          {{ effect.area }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import GameIconsSandsOfTime from '~icons/game-icons/sands-of-time';
import GameIconsCircle from '~icons/game-icons/circle';
import GameIconsPowerLightning from '~icons/game-icons/power-lightning';


interface Effect {
  magic_effect: String;
  skill: String;
  attribute: String;
  range: String;
  area: Number;
  duration: Number;
  min_magnitude: Number;
  max_magnitude: Number;
}

const props = defineProps<{
    effects: Effect[];
}>();

function getMagnitude(effect: Effect) {
  if (effect.min_magnitude === effect.max_magnitude) {
    return effect.min_magnitude;
  } else {
    return `${effect.min_magnitude} - ${effect.max_magnitude}`;
  }
}
</script>

<style lang="scss">
.magic-effects {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.magic-effect {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: rgb(202, 165, 96);
  background-color: rgba(0, 0, 0, 0.3);
  border: solid 1px rgba(0, 0, 0, 0.1);
  padding: 5px 10px;
  width: 100%;
  &__name {
    font-size: 20px;
    display: flex;
    align-items: flex-end;
    gap: 5px;
  }
  &__range {
    color: rgba(255, 255, 255, 0.7);
    font-size: 15px;
  }
  &__attribute {
    color: rgba(255, 255, 255, 0.7);
  }
  &__stat {
    display: flex;
    align-items: center;
    gap: 5px;
    svg {
      width: 18px;
      height: 18px;
    }
  }
  &-left {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
  }
  &-right {
    color: rgba(255, 255, 255, 0.7);
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 17px;
    align-items: flex-end;
  }
}
</style>
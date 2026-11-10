import { TABLE_DATA_ID } from '#utils/table-data.js'

/**
 * Escape `<` so that a value cannot close the script element.
 */
function toJSON(rows) {
  return JSON.stringify(rows).replaceAll('<', '\\u003c')
}

<template>
  <script type="application/json" id={{TABLE_DATA_ID}}>
    {{toJSON @rows}}
  </script>
</template>

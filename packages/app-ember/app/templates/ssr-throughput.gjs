import TableData from '#components/table-data.gjs'

<template>
  <table>
    <tbody>
      {{#each @model as |entry|}}
        <tr>
          <td>{{entry.id}}</td>
          <td>{{entry.name}}</td>
        </tr>
      {{/each}}
    </tbody>
  </table>
  <TableData @rows={{@model}} />
</template>

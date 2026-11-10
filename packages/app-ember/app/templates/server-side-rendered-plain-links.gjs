import TableData from '#components/table-data.gjs'

<template>
  <table>
    <tbody>
      {{#each @model as |entry|}}
        <tr>
          <td>{{entry.id}}</td>
          <td>{{entry.name}}</td>
          <td>
            <a href="/server-side-rendered/{{entry.id}}">View →</a>
          </td>
        </tr>
      {{/each}}
    </tbody>
  </table>
  <TableData @rows={{@model}} />
</template>

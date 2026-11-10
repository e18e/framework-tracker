import { LinkTo } from '@ember/routing'
import TableData from '#components/table-data.gjs'

<template>
  <table>
    <tbody>
      {{#each @model as |entry|}}
        <tr>
          <td>{{entry.id}}</td>
          <td>{{entry.name}}</td>
          <td>
            <LinkTo
              @route="server-side-rendered-detail"
              @model={{entry.id}}
            >View →</LinkTo>
          </td>
        </tr>
      {{/each}}
    </tbody>
  </table>
  <TableData @rows={{@model}} />
</template>

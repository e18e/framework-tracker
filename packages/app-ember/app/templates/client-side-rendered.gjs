import { LinkTo } from '@ember/routing'

<template>
  {{#if @model}}
    <table>
      <tbody>
        {{#each @model as |entry|}}
          <tr>
            <td>{{entry.id}}</td>
            <td>{{entry.name}}</td>
            <td>
              <LinkTo
                @route="client-side-rendered-detail"
                @model={{entry.id}}
              >View →</LinkTo>
            </td>
          </tr>
        {{/each}}
      </tbody>
    </table>
  {{/if}}
</template>

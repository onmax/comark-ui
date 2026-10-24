A `#fragment` link that matches no heading id or `{#id}` in the document it points at: the same one, another file (`./setup.md#install`), or a page a route serves (`/guide/setup/#install`). The message lists the ids that document has and the closest one. Fragments on external links aren't checked.

Ids come from the same `headingIds` you render with; pass it if you change Comark's default, or `'nested'` ids look broken.

::incorrect
```md
# Pigeon census

Read the [method](#methods) first.

## Method
```
::

::correct
```md
# Pigeon census

Read the [method](#method) first.

## Method
```
::

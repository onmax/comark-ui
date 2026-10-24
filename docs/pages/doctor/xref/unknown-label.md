A `:ref` to a label that nothing in the document has renders as the bare id in brackets, such as `[fig-pidgeon]`, instead of a link. This usually means a typo, or a label on an element comark-xref doesn't number: labels start with `fig-` for images and figures, or `tbl-` for tables wrapped in `::table`.

::incorrect
```md
![A pigeon on the deploy dashboard](pigeon.png){#fig-pigeon}

See :ref{#fig-pidgeon} for where it sat.
```
::

::correct
```md
![A pigeon on the deploy dashboard](pigeon.png){#fig-pigeon}

See :ref{#fig-pigeon} for where it sat.
```
::

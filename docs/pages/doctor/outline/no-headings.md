`::toc` lists the page's headings from h2 down to `depth`, h3 by default. A page with none of them, such as one with only an h1 title or only h4 headings, gets an empty block that renders nothing.

::incorrect
```md
# Pigeon tracker

::toc
::

Pigeons are counted every morning.
```
::

::correct
```md
# Pigeon tracker

::toc
::

## Counting

Pigeons are counted every morning.

## Reporting
```
::

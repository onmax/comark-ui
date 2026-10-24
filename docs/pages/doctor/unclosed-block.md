A `::` block needs a closing line with the same number of colons. Comark closes a block left open at the end of the document, or at the next closer of a block around it, so everything after it moves inside. Code and HTML blocks are skipped, since Comark reads them as text.

::incorrect
```md
::div{.note}
Ducks were counted before the deploy.

The pigeons weren't.
```
::

::correct
```md
::div{.note}
Ducks were counted before the deploy.
::

The pigeons weren't.
```
::

An embed loads its player inside the page, so it takes only `https://` links. Any other link, `http://` included, renders nothing.

::incorrect
```md
::embed{url="http://example.com/pigeons" title="The pigeon census"}
::
```
::

::correct
```md
::embed{url="https://example.com/pigeons" title="The pigeon census"}
::
```
::

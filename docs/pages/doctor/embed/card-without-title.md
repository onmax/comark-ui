A link with no player renders as a card, and a card doesn't fetch the page's title, so without `title` it shows only the host.

::incorrect
```md
::embed{url="https://example.com/pigeons"}
::
```
::

::correct
```md
::embed{url="https://example.com/pigeons" title="The pigeon census"}
::
```
::

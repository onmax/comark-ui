`::palette` has no props: its tiles come from its list alone, and it lays them out to fit the page. A prop such as `title` or `columns` is ignored, so write a title as a heading before the block.

::incorrect
```md
::palette{title="Duck pond"}
- Pond blue: #3b82f6
- Duck yellow: #facc15
::
```
::

::correct
```md
## Duck pond

::palette
- Pond blue: #3b82f6
- Duck yellow: #facc15
::
```
::

Includes may nest 8 levels deep, or as many as the `depth` option allows. The include past the limit is dropped. Here `nest/1.md` includes `nest/2.md`, and so on down to `nest/9.md`, one level too many.

::incorrect
```md
:include{src="nest/1.md"}
```
::

::correct
```md
:include{src="nest/2.md"}
```
::

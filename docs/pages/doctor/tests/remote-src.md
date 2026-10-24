`::tests` reads its report from a file under the root, while the document is parsed. It doesn't download one, so a `src` that's a URL renders nothing. Save the report next to the document, as CI writes it, and point `src` at that file.

::incorrect
```md
::tests{src="https://ci.example.com/pond/junit.xml"}
::
```
::

::correct
```md
::tests{src="junit.xml"}
::
```
::

A `::tests` with a `src` reads its report from that file, so anything written inside the block is dropped. Keep the report in one place: point `src` at the file, or paste the XML in a fence and remove `src`.

::incorrect
````md
::tests{src="junit.xml"}
```xml
<testsuite><testcase name="counts the ducks"/></testsuite>
```
::
````
::

::correct
```md
::tests{src="junit.xml"}
::
```
::

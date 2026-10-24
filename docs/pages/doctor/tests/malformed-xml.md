A report whose XML isn't well-formed can't be counted, so the block renders nothing. The message gives the line. A report cut short, because the test run was killed while writing it, is the usual cause: run the tests again to rewrite it.

::incorrect
````md
::tests
```xml
<testsuite>
  <testcase name="counts the ducks">
</testsuite>
```
::
````
::

::correct
````md
::tests
```xml
<testsuite>
  <testcase name="counts the ducks"/>
</testsuite>
```
::
````
::

`::tests` reads JUnit reports, whose root is `<testsuites>` or `<testsuite>`. Any other XML, such as a coverage report, renders nothing. Most runners write JUnit with a reporter option, such as Vitest's `--reporter=junit`.

::incorrect
````md
::tests
```xml
<coverage line-rate="0.9"/>
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

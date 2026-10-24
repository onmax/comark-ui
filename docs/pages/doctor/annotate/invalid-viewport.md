`viewport` is the size the screenshot was captured at, in pixels. It places each annotation's number against the image's real shape, and lets a compare check that both sides match. Anything but `WIDTHxHEIGHT` is ignored.

::incorrect
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks" viewport="1440 by 900"}
::
```
::

::correct
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks" viewport="1440x900"}
::
```
::

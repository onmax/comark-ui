`href` links a screenshot's label to the page it captured. Anything but an http:// or https:// URL with a host, such as a bare domain or a path, is left out, so the label links nowhere.

::incorrect
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks" href="pond.example.com/map"}
::
```
::

::correct
```md
::screenshot{src="/pond.png" alt="The pond map with three ducks" href="https://pond.example.com/map"}
::
```
::

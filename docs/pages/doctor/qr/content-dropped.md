`:qr` draws only the code for its `value`, so text in its brackets is dropped. A link written there isn't encoded either. Put the link in `value`, and the words around the `:qr`.

::incorrect
```md
:qr[Scan for the duck census]{value="https://ducks.example.com/census"}
```
::

::correct
```md
Scan for the duck census: :qr{value="https://ducks.example.com/census"}
```
::

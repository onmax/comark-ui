A formula's `html` is the markup comark-mathml typesets from TeX, so the renderers print it as it is. A `:formula` written by hand with its own `html` is ignored, and it shows its `tex`, if it has one. Write the TeX between `$` signs instead.

::incorrect
```md
The pond holds :formula{html="<math><mi>n</mi></math>"} ducks.
```
::

::correct
```md
The pond holds $n$ ducks.
```
::

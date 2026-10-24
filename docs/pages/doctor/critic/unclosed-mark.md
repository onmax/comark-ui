A CriticMarkup mark opens and closes inside one paragraph. One with no closing half, such as `{++` without `++}`, stays in the page as written, braces and all, and the text after it isn't marked. To write the characters themselves, escape the brace: `\{++`.

::incorrect
```md
Feed the ducks {++twice a day before the deploy.
```
::

::correct
```md
Feed the ducks {++twice a day++} before the deploy.
```
::

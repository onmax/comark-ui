A `:ref` always reads as its label's number, such as "Figure 2", so the text written in its brackets is dropped. Write the words around the reference instead.

::incorrect
```md
![The pond after the cleanup](pond.png){#fig-pond}

Compare it with :ref[the clean pond]{#fig-pond}.
```
::

::correct
```md
![The pond after the cleanup](pond.png){#fig-pond}

Compare it with the clean pond in :ref{#fig-pond}.
```
::

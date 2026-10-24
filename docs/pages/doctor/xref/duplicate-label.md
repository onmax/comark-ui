comark-xref numbers each label once. When two figures or two tables share a label, the second gets the first's number, and every `:ref` to it links to the first, so a reader who follows "Figure 1" lands on the wrong screenshot.

A shared label is also a shared id, so [`comark/duplicate-id`](/doctor/duplicate-id/) reports the same element. Rename the second label, and both go away:

```md
![The duck pond at dawn](dawn.png){#fig-pond}

![The duck pond at dusk](dusk.png){#fig-pond-dusk}

At dusk, :ref{#fig-pond-dusk}, the ducks sleep on the north bank.
```

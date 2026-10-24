GitHub draws five callouts: `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, and `[!CAUTION]`. A quote marked with any other type, such as `[!INFO]` or `[!DANGER]` from another Markdown flavor, renders as a plain quote with the marker left in as text, here and on GitHub.

::incorrect
```md
> [!INFO]
> The pond freezes over in January, so move the ducks by Christmas.
```
::

::correct
```md
> [!NOTE]
> The pond freezes over in January, so move the ducks by Christmas.
```
::

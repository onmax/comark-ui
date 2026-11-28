`url` is the post's full address, which the platform's logo links to and which picks the platform. An address without `https://` is dropped, so the card links nowhere. `avatar` is a picture's https address, a path, or a `data:image/` URI; one with any other scheme, such as `javascript:`, is dropped, and the card shows the author's initial.

::incorrect
```md
::post{url="x.com/jack/status/20" author="jack"}
just setting up my twttr
::
```
::

::correct
```md
::post{url="https://x.com/jack/status/20" author="jack"}
just setting up my twttr
::
```
::

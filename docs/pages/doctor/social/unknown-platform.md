`platform` picks the card's logo and the order of its counts, and comark-social knows `x`, `bluesky`, `mastodon`, `threads`, `linkedin`, and `generic`. Any other name falls back to the platform `url` points at, or to `generic`. X is `x`, not `twitter`.

::incorrect
```md
::post{platform="twitter" author="Ada"}
Shipped it.
::
```
::

::correct
```md
::post{platform="x" author="Ada"}
Shipped it.
::
```
::

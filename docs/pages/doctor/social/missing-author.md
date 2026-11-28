A card names who wrote the post. Write `author`, the name the platform shows, or `handle` alone. With the `fetch` option, a post with a `url` on X, Bluesky, or Mastodon gets both from the platform.

::incorrect
```md
::post{platform="bluesky"}
Shipped it.
::
```
::

::correct
```md
::post{platform="bluesky" author="Ada" handle="ada.bsky.social"}
Shipped it.
::
```
::

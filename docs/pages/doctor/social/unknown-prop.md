`::post` reads `platform`, `url`, `author`, `handle`, `avatar`, `time`, and the counts `replies`, `reposts`, `quotes`, `likes`, `views`, and `bookmarks`, and `::thread` reads `url` and `focal`. Both ignore every other prop. The counts are named once for every platform, so a Mastodon post's boosts are `reposts` and its favourites `likes`.

::incorrect
```md
::post{platform="mastodon" author="Ada" boosts="12"}
Shipped it.
::
```
::

::correct
```md
::post{platform="mastodon" author="Ada" reposts="12"}
Shipped it.
::
```
::

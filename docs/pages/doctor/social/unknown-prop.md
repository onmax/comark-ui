`::post` reads `platform`, `url`, `author`, `handle`, `avatar`, `time`, and the counts `replies`, `reposts`, `quotes`, `likes`, `views`, and `bookmarks`, and ignores every other prop. The counts are named once for every platform, so a Mastodon post's boosts are `reposts` and its favourites `likes`. A `::conversation` reads `me`, `platform`, `title`, and `request`, and each `:::message` in it `from`, `avatar`, and `time`.

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

`::git-graph` reads `title`, `reverse`, and `max-count`, and ignores every other prop. `reverse` and `max-count` are named after `git log`'s `--reverse` and `-n`, so `order` or `limit` do nothing.

::incorrect
````md
::git-graph{order="oldest"}
```
* 5b8cb33 ef1419c (HEAD -> main) Stop polling closed flows (#815)
| * 869bb73 ef1419c (release/2.3) Bundle the enterprise SKU
|/
* ef1419c Alert links keep their filters (#812)
```
::
````
::

::correct
````md
::git-graph{reverse}
```
* 5b8cb33 ef1419c (HEAD -> main) Stop polling closed flows (#815)
| * 869bb73 ef1419c (release/2.3) Bundle the enterprise SKU
|/
* ef1419c Alert links keep their filters (#812)
```
::
````
::

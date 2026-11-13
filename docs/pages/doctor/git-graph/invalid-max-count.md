`max-count` keeps the newest commits, as `git log -n` does, and folds the rest into one row. It takes a whole number from 1; anything else is ignored and every commit shows.

::incorrect
````md
::git-graph{max-count="two"}
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
::git-graph{max-count=2}
```
* 5b8cb33 ef1419c (HEAD -> main) Stop polling closed flows (#815)
| * 869bb73 ef1419c (release/2.3) Bundle the enterprise SKU
|/
* ef1419c Alert links keep their filters (#812)
```
::
````
::

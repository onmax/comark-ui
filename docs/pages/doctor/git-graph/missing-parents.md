Without `--parents`, `git log` prints each commit without the commits it came from, so the block can't tell a branch from the next commit on main and draws them all in one line. Run the command again with `--parents`: each line then lists the parents after the commit's own hash.

::incorrect
````md
```git-graph
* 5b8cb33 (HEAD -> main) Stop polling closed flows (#815)
| * 869bb73 (release/2.3) Bundle the enterprise SKU
|/
* ef1419c Alert links keep their filters (#812)
```
````
::

::correct
````md
```git-graph
* 5b8cb33 ef1419c (HEAD -> main) Stop polling closed flows (#815)
| * 869bb73 ef1419c (release/2.3) Bundle the enterprise SKU
|/
* ef1419c Alert links keep their filters (#812)
```
````
::

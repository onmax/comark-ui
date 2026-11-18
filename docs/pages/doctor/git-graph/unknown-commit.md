A `#commit-<sha>` slot puts its Markdown under the commit whose hash starts with `<sha>`. A hash the `git log` above doesn't show has no row, so the note isn't drawn. Copy the hash from the log, at least four characters of it, or widen the `git log` so it includes that commit.

::incorrect
````md
::git-graph
```
* 5b8cb33 ef1419c (HEAD -> main) Stop polling closed flows (#815)
* ef1419c Alert links keep their filters (#812)
```

#commit-1d45d26
Applies clean to `release/2.3`
::
````
::

::correct
````md
::git-graph
```
* 5b8cb33 ef1419c (HEAD -> main) Stop polling closed flows (#815)
* ef1419c Alert links keep their filters (#812)
```

#commit-5b8cb33
Applies clean to `release/2.3`
::
````
::

`git cherry` and `git cherry-pick` name commits by hash, and the block marks them on their rows. A commit the `git log` above doesn't show has no row, so its result isn't drawn. Widen the `git log`: name the branch the commit is on, or drop a range that stops before it.

::incorrect
````md
::git-graph
```
$ git log --graph --oneline --decorate --parents main release/2.3
* 5b8cb33 ef1419c (HEAD -> main) Stop polling closed flows (#815)
| * 869bb73 ef1419c (release/2.3) Bundle the enterprise SKU
|/
* ef1419c Alert links keep their filters (#812)
$ git cherry -v release/2.3 main
- 1d45d26a8e0c7b9f2a3d4e5f60718293a4b5c6d7 Quiet expected 4xx errors (#818)
```
::
````
::

::correct
````md
::git-graph
```
$ git log --graph --oneline --decorate --parents main release/2.3
* 5b8cb33 ef1419c (HEAD -> main) Stop polling closed flows (#815)
| * 869bb73 ef1419c (release/2.3) Bundle the enterprise SKU
|/
* ef1419c Alert links keep their filters (#812)
$ git cherry -v release/2.3 main
- 5b8cb33d496b0c10e1c1b804b19ff486f5a676f8 Stop polling closed flows (#815)
```
::
````
::

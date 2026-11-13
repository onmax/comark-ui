A `git switch`, `git cherry`, or `git cherry-pick` in the transcript names a branch, and the block draws its picks in that branch's lane. A branch the `git log` above leaves out has no lane, so its picks aren't drawn. Add the branch to the `git log` command, or run it with `--all`.

::incorrect
````md
::git-graph
```
$ git log --graph --oneline --decorate --parents main
* 5b8cb33 ef1419c (HEAD -> main) Stop polling closed flows (#815)
* ef1419c Alert links keep their filters (#812)
$ git switch release/2.3
Switched to branch 'release/2.3'
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
$ git switch release/2.3
Switched to branch 'release/2.3'
```
::
````
::

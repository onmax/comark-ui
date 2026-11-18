The block reads only what `git log` printed. The output of any other command in the transcript, such as `git cherry -v` or a `git cherry-pick` dry run, isn't drawn. Leave those commands out, and say what happened to a commit in a `#commit-<sha>` slot instead.

::incorrect
````md
::git-graph
```
* 5b8cb33 ef1419c (HEAD -> main) Stop polling closed flows (#815)
| * 869bb73 ef1419c (release/2.3) Bundle the enterprise SKU
|/
* ef1419c Alert links keep their filters (#812)
$ git switch release/2.3
$ git cherry-pick 5b8cb33
[release/2.3 8525458] Stop polling closed flows (#815)
```
::
````
::

::correct
````md
::git-graph
```
* 5b8cb33 ef1419c (HEAD -> main) Stop polling closed flows (#815)
| * 869bb73 ef1419c (release/2.3) Bundle the enterprise SKU
|/
* ef1419c Alert links keep their filters (#812)
```

#commit-5b8cb33
Applies clean to `release/2.3`
::
````
::

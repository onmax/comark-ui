A git graph draws the commits it reads from pasted `git log` output, so a ```` ```git-graph ```` fence or a `::git-graph` with no log draws nothing, and the fence stays a code block. Run `git log --graph --oneline --decorate --parents`, with `--all` or the branches to show, and paste what it prints in the fence.

::incorrect
````md
```git-graph [Release branches]
```
````
::

::correct
````md
```git-graph [Release branches]
* 5b8cb33 ef1419c (HEAD -> main) Stop polling closed flows (#815)
| * 869bb73 ef1419c (release/2.3) Bundle the enterprise SKU
|/
* ef1419c Alert links keep their filters (#812)
```
````
::

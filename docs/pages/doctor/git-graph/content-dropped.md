A `::git-graph` draws only the git output in its fence, so text written beside the fence is dropped. Write it outside the block, or in a `#footer` slot, which shows under the graph.

::incorrect
````md
::git-graph
Pick these onto release/2.3 before Friday.
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
::git-graph
```
* 5b8cb33 ef1419c (HEAD -> main) Stop polling closed flows (#815)
| * 869bb73 ef1419c (release/2.3) Bundle the enterprise SKU
|/
* ef1419c Alert links keep their filters (#812)
```

#footer
Pick these onto release/2.3 before Friday.
::
````
::

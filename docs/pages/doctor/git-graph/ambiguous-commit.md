A `#commit-<sha>` slot needs a prefix that identifies one commit in the pasted log, even if `max-count` hides other matching commits. Copy more characters from the intended commit's hash to make the prefix unique.

::incorrect
````md
::git-graph{max-count=1}
```
* a123bc0 a123ab0 (HEAD -> main) Stop polling
* a123ab0 Keep alert filters
```

#commit-a123
Approved
::
````
::

::correct
````md
::git-graph{max-count=1}
```
* a123bc0 a123ab0 (HEAD -> main) Stop polling
* a123ab0 Keep alert filters
```

#commit-a123bc0
Approved
::
````
::

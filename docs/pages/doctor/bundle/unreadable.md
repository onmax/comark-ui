A path ending in `.json` is read as a Sonda report, with gzip sizes turned on; any other path as a build folder with JavaScript chunks. A file that is neither renders nothing. Point the prop at the build's output folder, or turn on Sonda's JSON report with `gzip: true`.

::incorrect
```md
::bundle{src="reports/stats.json"}
::
```
::

::correct
```md
::bundle{src="reports/pr.json"}
::
```
::

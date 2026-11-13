`better` colors a heatmap's cells from red through amber to green when its numbers rate something: `better="higher"` when a high number is good, such as a score, and `better="lower"` when a low one is, such as an error rate. Other charts have no cells to color.

::incorrect
```md
::chart{type="heatmap" better="more" title="Score per section"}
| agent | features | auth |
| --- | --: | --: |
| first | 10 | 6.2 |
| second | 9 | 4.6 |
::
```
::

::correct
```md
::chart{type="heatmap" better="higher" title="Score per section"}
| agent | features | auth |
| --- | --: | --: |
| first | 10 | 6.2 |
| second | 9 | 4.6 |
::
```
::
